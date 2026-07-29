import { useState, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Download, ImageIcon } from 'lucide-react';
import SketchCanvas from './SketchCanvas';
import SpeechBubble from './SpeechBubble';
import { generateImage } from '../lib/api';

export default function PanelCard({ panel, index, provider, stylePrompt, onUpdate }) {
  const [mode, setMode] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [sketchDataUrl, setSketchDataUrl] = useState(null);
  const [strength, setStrength] = useState(0.7);

  const buildPrompt = () =>
    [stylePrompt, panel.imagePrompt].filter(Boolean).join(', ');

  const handleGenerateAuto = useCallback(async () => {
    setLoading(true);
    onUpdate(index, { error: null });
    try {
      const result = await generateImage({ mode: 'text', provider, prompt: buildPrompt() });
      onUpdate(index, { imageUrl: result.image, error: null });
    } catch (err) {
      onUpdate(index, { error: err.message });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel.imagePrompt, provider, stylePrompt, index, onUpdate]);

  const handleGenerateSketch = useCallback(async () => {
    if (!sketchDataUrl) return;
    setLoading(true);
    onUpdate(index, { error: null });
    try {
      const result = await generateImage({
        mode: 'sketch',
        provider,
        prompt: buildPrompt(),
        sketchDataUrl,
        strength,
      });
      onUpdate(index, { imageUrl: result.image, error: null });
    } catch (err) {
      onUpdate(index, { error: err.message });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sketchDataUrl, panel.imagePrompt, provider, stylePrompt, strength, index, onUpdate]);

  const { imageUrl, error, narration, dialogues } = panel;

  return (
    <div className="bg-white border-4 border-black rounded overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,0.85)]">
      {/* header bar */}
      <div className="flex items-center justify-between bg-black px-4 py-2">
        <span className="font-black text-orange-400 text-xl">#{index + 1}</span>
        {imageUrl && (
          <a
            href={imageUrl}
            download={`panel-${index + 1}.png`}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-orange-400 transition-colors"
          >
            <Download size={13} /> 다운로드
          </a>
        )}
      </div>

      {/* narration */}
      {narration && (
        <div className="bg-neutral-100 border-b-2 border-black px-4 py-2 text-sm text-neutral-700 italic">
          {narration}
        </div>
      )}

      {/* mode tabs */}
      <div className="flex border-b-2 border-black">
        {['auto', 'sketch'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-sm font-black transition-colors border-r last:border-r-0 border-black ${
              mode === m
                ? 'bg-orange-500 text-white'
                : 'bg-white text-black hover:bg-orange-50'
            }`}
          >
            {m === 'auto' ? 'AI 자동 생성' : '내가 스케치'}
          </button>
        ))}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {mode === 'auto' ? (
          <>
            <ImageArea imageUrl={imageUrl} loading={loading} error={error} dialogues={dialogues} index={index} />
            <button
              onClick={handleGenerateAuto}
              disabled={loading}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] transition-colors"
            >
              {loading ? '생성 중…' : imageUrl ? '재생성' : 'AI로 생성'}
            </button>
          </>
        ) : (
          <>
            <SketchCanvas onExport={setSketchDataUrl} />

            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-neutral-700 whitespace-nowrap">다듬기 강도</span>
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
                className="flex-1 accent-orange-500"
              />
              <span className="text-sm font-bold text-neutral-700 w-9 text-right">
                {Math.round(strength * 100)}%
              </span>
            </div>

            {(imageUrl || loading || error) && (
              <ImageArea imageUrl={imageUrl} loading={loading} error={error} dialogues={dialogues} index={index} />
            )}

            <button
              onClick={handleGenerateSketch}
              disabled={loading || !sketchDataUrl}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] transition-colors"
            >
              {loading ? '다듬는 중…' : 'AI로 다듬기'}
            </button>
          </>
        )}

        {/* prompt accordion */}
        <div className="border-t-2 border-neutral-200 pt-3">
          <button
            onClick={() => setShowPrompt((p) => !p)}
            className="flex items-center gap-1 text-xs text-neutral-500 font-bold hover:text-neutral-800 transition-colors"
          >
            {showPrompt ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            프롬프트 {showPrompt ? '닫기' : '보기 / 수정'}
          </button>
          {showPrompt && (
            <textarea
              value={panel.imagePrompt || ''}
              onChange={(e) => onUpdate(index, { imagePrompt: e.target.value })}
              rows={3}
              className="mt-2 w-full text-xs border-2 border-neutral-300 rounded p-2 resize-none font-mono focus:outline-none focus:border-orange-400"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ImageArea({ imageUrl, loading, error, dialogues, index }) {
  return (
    <div className="relative w-full aspect-square bg-neutral-100 border-2 border-black rounded overflow-hidden flex items-center justify-center">
      {loading ? (
        <div className="flex flex-col items-center gap-2 text-neutral-500">
          <RefreshCw size={36} className="animate-spin text-orange-500" />
          <span className="text-sm font-bold">생성 중…</span>
        </div>
      ) : imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={`컷 ${index + 1}`}
            className="w-full h-full object-cover"
          />
          <SpeechBubble dialogues={dialogues} />
        </>
      ) : error ? (
        <div className="text-red-600 text-sm text-center p-4 font-bold">{error}</div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-neutral-400">
          <ImageIcon size={36} />
          <span className="text-sm">이미지를 생성해보세요</span>
        </div>
      )}
    </div>
  );
}
