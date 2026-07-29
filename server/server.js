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

// Text-to-image
async function openaiText(prompt) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024' }),
  });
  if (!response.ok) throw new Error(`OpenAI 오류: ${await response.text()}`);
  const data = await response.json();
  return `data:image/png;base64,${data.data[0].b64_json}`;
}

// Sketch-to-image (img2img)
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

// POST /api/generate-image
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

app.get('/health', (_req, res) => res.json({ ok: true }));

// Serve React PWA (client)
const publicDir = join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (_req, res) => res.sendFile(join(publicDir, 'index.html')));

app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
