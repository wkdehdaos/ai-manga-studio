// In development: Vite proxies /api → http://localhost:3001
// In production: set VITE_API_URL to your Railway server URL
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export async function generateScript(payload) {
  const res = await fetch(`${BASE}/script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '각본 생성 실패');
  return data;
}

export async function generateImage(payload) {
  const res = await fetch(`${BASE}/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '이미지 생성 실패');
  return data;
}
