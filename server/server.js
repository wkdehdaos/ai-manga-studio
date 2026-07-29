import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : true;
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 3001;

function requireKey(res) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: 'OPENAI_API_KEY가 서버 환경변수에 없습니다' });
    return false;
  }
  return true;
}

// ─── Image generation helpers ─────────────────────────────────────────────────

async function openaiText(prompt) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024' }),
  });
  if (!response.ok) throw new Error(`OpenAI 오류: ${await response.text()}`);
  const data = await response.json();
  return `data:image/png;base64,${data.data[0].b64_json}`;
}

async function openaiSketch(prompt, sketchDataUrl) {
  const base64 = sketchDataUrl.replace(/^data:image\/\w+;base64,/, '');
  const blob = new Blob([Buffer.from(base64, 'base64')], { type: 'image/png' });
  const form = new FormData();
  form.append('image', blob, 'sketch.png');
  form.append('prompt', prompt);
  form.append('model', 'gpt-image-1');
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  if (!response.ok) throw new Error(`OpenAI edits 오류: ${await response.text()}`);
  const data = await response.json();
  return `data:image/png;base64,${data.data[0].b64_json}`;
}

// ─── POST /api/generate-image ─────────────────────────────────────────────────

app.post('/api/generate-image', async (req, res) => {
  if (!requireKey(res)) return;
  const { mode, prompt, sketchDataUrl } = req.body;
  try {
    const image = (mode === 'sketch' && sketchDataUrl)
      ? await openaiSketch(prompt, sketchDataUrl)
      : await openaiText(prompt);
    return res.json({ image });
  } catch (err) {
    console.error('[generate-image]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/chat ───────────────────────────────────────────────────────────
// Chat with AI; AI can trigger image generation by including [DRAW: prompt] in reply.

const SYSTEM_PROMPT = `당신은 AI 망가/스케치 스튜디오의 그림 어시스턴트입니다.
사용자가 그리고 싶은 장면을 설명하거나 그림에 대해 질문하면 친근하게 한국어로 답변하세요.
사용자가 무언가를 '그려줘', '그려', '만들어줘', '생성해줘' 등 이미지 생성을 원하면,
반드시 답변 마지막에 다음 형식으로 영어 이미지 프롬프트를 추가하세요:
[DRAW: manga illustration of ..., detailed, high quality]

이미지 프롬프트는 영어로, manga/webtoon 스타일을 기본으로 작성하세요.
이미지 생성 없이 답변만 할 때는 [DRAW:...] 없이 답변하세요.`;

app.post('/api/chat', async (req, res) => {
  if (!requireKey(res)) return;
  const { messages } = req.body;

  try {
    // 1. Get AI text reply
    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 600,
        temperature: 0.8,
      }),
    });
    if (!chatRes.ok) throw new Error(`Chat API 오류: ${await chatRes.text()}`);
    const chatData = await chatRes.json();
    const rawReply = chatData.choices[0].message.content;

    // 2. Check for [DRAW: ...] tag
    const drawMatch = rawReply.match(/\[DRAW:\s*([^\]]+)\]/i);
    const reply = rawReply.replace(/\[DRAW:[^\]]*\]/i, '').trim();
    let imageUrl = null;

    if (drawMatch) {
      const imagePrompt = drawMatch[1].trim();
      try {
        imageUrl = await openaiText(imagePrompt);
      } catch (imgErr) {
        console.error('[chat image gen]', imgErr.message);
      }
    }

    return res.json({ reply, imageUrl });
  } catch (err) {
    console.error('[chat]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── Health + Static ──────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true }));

const publicDir = join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (_req, res) => res.sendFile(join(publicDir, 'index.html')));

app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
