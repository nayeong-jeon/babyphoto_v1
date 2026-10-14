# babyphoto_v1
아기사진 만들기

## GitHub Pages 미리보기

- 주 사이트: https://babyphoto-v1.pages.dev/
- GitHub Pages 미러: https://nayeong-jeon.github.io/babyphoto_v1/

GitHub Pages는 `main` 브랜치의 루트에서 정적 사이트를 제공합니다. 이 미리보기에서는 화면과 브라우저 안에 저장되는 후기를 이용할 수 있지만, AI 사진 생성용 Node API는 호스팅하지 않습니다. 사진 생성 데모를 사용하려면 아래 지침대로 Node 서버를 실행하세요.

## 검색엔진 등록

- 검색엔진 크롤링을 허용하는 `robots.txt`와 대표 페이지 URL을 담은 `sitemap.xml`을 사이트 루트에서 제공합니다.
- 한국어, 영어, 중국어(간체) 페이지는 각각 `https://babyphoto-v1.pages.dev/`, `https://babyphoto-v1.pages.dev/?lang=en`, `https://babyphoto-v1.pages.dev/?lang=zh`에서 볼 수 있습니다. 언어별 제목·설명·대표 URL·hreflang·FAQ 구조화 데이터를 제공하고, 사이트맵에 각 언어 URL을 등록합니다.
- GEO(생성형 검색 최적화)를 위해 방문자가 실제로 궁금해할 질문과 답을 페이지에 명시하고, 서비스 범위·테스트 결제·사진 전송 및 저장 방식을 구체적으로 설명합니다. 후기와 평점은 공개 검증이 가능한 상태가 아니므로 외부 평판이나 실사용자 추천으로 표시하지 않습니다.
- Google Search Console에서 `https://babyphoto-v1.pages.dev/` 속성에 `https://babyphoto-v1.pages.dev/sitemap.xml` 사이트맵을 제출하고 색인 상태를 모니터링하세요. 소유권 확인과 색인 요청은 사이트 관리자가 직접 해야 하며, 검색결과 노출이나 순위는 보장되지 않습니다.
- 검색 노출은 색인·AI 답변 인용을 보장하지 않습니다. 페이지 내용을 실제 서비스 상태와 일치하게 최신화하고, 공개 후 Search Console에서 언어별 URL의 크롤링·색인 상태를 확인하세요. 외부 리뷰나 언급은 실제로 확보된 경우에만 반영하세요.
- 검색 최적화는 유용하고 정확한 콘텐츠와 실제 사용자 경험을 대신하지 않습니다. 이 사이트는 현재 단일 페이지 데모입니다.

자세한 내용은 [Google 검색엔진 최적화(SEO) 기본 가이드](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ko)를 참고하세요.

## OpenAI 사진 생성 데모 시작하기

1. Node.js 20.6 이상을 준비합니다.
2. `.env.example`을 `.env`로 복사한 뒤 OpenAI API 키를 설정합니다.
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```
3. 서버를 실행합니다.
   ```bash
   node --env-file=.env server.mjs
   ```
4. 브라우저에서 `http://localhost:8001`을 엽니다. 이미 실행 중인 정적 서버 대신 이 주소에서 앱과 AI API를 함께 제공합니다.

서버는 OpenAI 이미지 편집 API(`gpt-image-2.5-sunburst`)로 선택한 참고 사진 최대 3장과 프롬프트를 전달하고, 요청한 수량의 결과를 생성합니다. 생성된 결과는 브라우저 사진 보관함에 자동 저장됩니다. API 키가 없거나 AI 서버가 실행되지 않은 경우 테스트 주문을 기록하지 않습니다. OpenAI 계정에서 해당 이미지 모델에 접근할 수 있어야 합니다. 자세한 내용은 [OpenAI 이미지 생성 안내](https://developers.openai.com/api/docs/guides/image-generation)와 [Images API 레퍼런스](https://developers.openai.com/api/reference/resources/images)를 참고하세요.

## 비용·개인정보·배포 주의

- 결제 UI는 테스트 전용입니다. 사용자에게 실제 금액을 청구하지 않지만, 사진 생성을 호출하면 **운영자의 OpenAI API 계정에는 사용료가 발생**합니다. OpenAI 계정에서 사용량과 예산 한도를 관리하세요.
- 사진 생성 전에 동의를 받아 참고 사진과 프롬프트를 OpenAI API로 보냅니다. 생성 결과는 브라우저 IndexedDB에 저장하고, 서버 디스크에는 저장하지 않습니다.
- 회원가입·로그인은 데모이며 계정 및 주문 정보는 브라우저 `localStorage`에만 있습니다. 인증·결제는 서버에서 검증되지 않으므로 이 상태로 인터넷에 공개하거나 실제 결제 서비스로 사용하면 안 됩니다.
- 후기와 작성자명도 현재 브라우저의 `localStorage`에만 저장되며 다른 방문자와 공유되지 않습니다. 방문자 간 공유 후기를 운영하려면 별도의 서버 저장소와 스팸·개인정보 관리가 필요합니다.
- GitHub Pages는 정적 호스팅이므로 사진 생성 API, 실제 결제, 서버 계정 기능을 제공하지 않습니다.
- 서버는 기본적으로 `127.0.0.1`에만 바인딩됩니다. 공개 서비스에는 인증된 백엔드, 실제 결제 검증, 요청별 사용량 제한, 접근 제어가 적용된 파일 저장소와 개인정보 보관·삭제 정책이 필요합니다.
- `.env`에는 비밀 키를 저장합니다. 이 파일을 공유하거나 저장소에 커밋하지 마세요. `.gitignore`가 `.env`를 제외합니다.
