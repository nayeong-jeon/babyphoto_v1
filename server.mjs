import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8001);
const maxRequestBytes = 64 * 1024 * 1024;
const maxImageBytes = 15 * 1024 * 1024;
const generationRequests = new Map();
function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxRequestBytes) {
      const error = new Error("Request body too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON body");
    error.status = 400;
    throw error;
  }
}

function allowGeneration(address) {
  const now = Date.now();
  const requests = (generationRequests.get(address) || []).filter((time) => now - time < 60_000);
  if (requests.length >= 3) return false;
  requests.push(now);
  generationRequests.set(address, requests);
  return true;
}

function validateInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const quantity = Number(body.quantity);
  if (!prompt || prompt.length > 1500 || !Number.isInteger(quantity) || quantity < 1 || quantity > 3) return null;
  if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > 3) return null;

  const images = [];
  for (const image of body.images) {
    if (!image || typeof image !== "object" || typeof image.dataUrl !== "string") return null;
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(image.dataUrl);
    if (!match) return null;
    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.length > maxImageBytes || bytes.toString("base64") !== match[2]) return null;
    images.push({ image_url: image.dataUrl });
  }
  return { prompt, quantity, images };
}

async function handleGenerate(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "method_not_allowed" });
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 503, { error: "ai_not_configured" });
    return;
  }
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    sendJson(response, 415, { error: "invalid_request" });
    return;
  }
  const address = request.socket.remoteAddress || "unknown";
  if (!allowGeneration(address)) {
    sendJson(response, 429, { error: "rate_limited" });
    return;
  }

  try {
    const input = validateInput(await readJson(request));
    if (!input) {
      sendJson(response, 400, { error: "invalid_request" });
      return;
    }
    const apiResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-image-2.5-sunburst",
        prompt: input.prompt,
        images: input.images,
        n: input.quantity,
        size: "1024x1536",
        quality: "medium",
        output_format: "jpeg",
        output_compression: 90,
        moderation: "auto"
      }),
      signal: AbortSignal.timeout(240_000)
    });

    if (!apiResponse.ok) {
      const error = apiResponse.status === 401
        ? "invalid_api_key"
        : apiResponse.status === 403
          ? "model_access_denied"
          : apiResponse.status === 429
            ? "provider_rate_limited"
            : "generation_failed";
      sendJson(response, apiResponse.status === 429 ? 429 : 502, { error });
      return;
    }

    const result = await apiResponse.json();
    const images = result.data?.map((image) => image.b64_json).filter((image) => typeof image === "string" && image.length > 0) || [];
    if (images.length !== input.quantity) {
      sendJson(response, 502, { error: "incomplete_generation" });
      return;
    }
    sendJson(response, 200, { images, mimeType: `image/${result.output_format || "jpeg"}` });
  } catch (error) {
    if (error.status) {
      sendJson(response, error.status, { error: error.status === 413 ? "request_too_large" : "invalid_request" });
      return;
    }
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      sendJson(response, 504, { error: "generation_timed_out" });
      return;
    }
    sendJson(response, 502, { error: "generation_failed" });
  }
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname;
  if (pathname === "/api/status" && request.method === "GET") {
    sendJson(response, 200, {
      configured: Boolean(process.env.OPENAI_API_KEY),
      model: "gpt-image-2.5-sunburst"
    });
    return;
  }
  if (pathname === "/api/generate") {
    await handleGenerate(request, response);
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "method_not_allowed" });
    return;
  }

  if (pathname !== "/" && pathname !== "/index.html") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const filePath = resolve(root, "index.html");
  if (!filePath.startsWith(`${root}${sep}`)) {
    response.writeHead(404);
    response.end();
    return;
  }
  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache"
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`FirstBloom demo server listening at http://${host}:${port}`);
});

server.on("error", (error) => {
  console.error(`Unable to start FirstBloom server: ${error.message}`);
  process.exitCode = 1;
});
