# AI Manga Studio

스토리를 입력하면 AI가 웹툰 각본을 만들고, 각 컷을 AI 자동 생성 또는 직접 스케치로 완성하는 도구입니다.

## 구조

```
ai-manga-studio/
├── server/   # Node.js + Express (API 프록시)
└── client/   # React + Vite + Tailwind CSS
```

## 빠른 시작

### 1. 서버 설정

```bash
cd server
npm install
cp .env.example .env
```

`.env` 파일을 열어 사용할 API 키를 채워 넣으세요:

| 변수 | 설명 |
|------|------|
| `ANTHROPIC_API_KEY` | 각본 생성 (필수) |
| `STABILITY_API_KEY` | Stability AI 이미지 생성 |
| `OPENAI_API_KEY` | OpenAI gpt-image-1 이미지 생성 |
| `REPLICATE_API_TOKEN` | Replicate 이미지 생성 |
| `REPLICATE_MODEL_VERSION` | 사용할 Replicate 모델 버전 ID |

### 2. 서버 실행

```bash
# server/ 디렉토리에서
npm run dev
# → http://localhost:3001
```

### 3. 클라이언트 실행 (새 터미널)

```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

## 기능

- **각본 자동 생성**: Claude Sonnet이 스토리를 N개 컷으로 나눠 장면/나레이션/대사 생성
- **AI 자동 생성**: 장면 설명 프롬프트로 이미지 생성 (text-to-image)
- **내가 스케치**: 캔버스에 밑그림을 그리고 "다듬기 강도" 슬라이더로 AI가 재해석하는 범위 조절 (img2img)
- **말풍선 오버레이**: 대사가 있는 컷은 이미지 위에 말풍선 자동 표시
- **프롬프트 수정**: 각 컷마다 이미지 프롬프트를 직접 수정 가능
- **이미지 다운로드**: 생성된 이미지를 PNG로 저장

## 지원 이미지 제공사

| 제공사 | text-to-image | sketch-to-image |
|--------|:---:|:---:|
| Stability AI | ✅ | ✅ (control/sketch) |
| OpenAI | ✅ | ✅ (images/edits) |
| Replicate | ✅ | ✅ (prompt_strength) |

> API 키가 설정되지 않은 제공사를 선택하면 명확한 오류 메시지가 표시됩니다.
