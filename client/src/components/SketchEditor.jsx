import { useState } from 'react';
import { RefreshCw, Download, Eye, PenLine, ChevronDown, Settings } from 'lucide-react';
import SketchCanvas from './SketchCanvas';
import SpeechBubble from './SpeechBubble';
import { STYLE_PRESETS, PROVIDERS } from '../App';

export default function SketchEditor({
  panel, panelIndex, totalPanels,
  styleIndex, setStyleIndex,
  provider, setProvider,
  strength, setStrength,
  generating,
  onSketchChange, onPromptChange, onGenerate, onUpdate,
}) {
  const [viewResult, setViewResult] = useState(false);
  const [showExtra, setShowExtra] = useState(false);

  const showingResult = viewResult && !!panel.imageUrl;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900">
        <span className="text-sm font-black text-white">
          컷 <span className="text-orange-500">{panelIndex + 1}</span>
          <span className="text-neutral-600 font-normal"> / {totalPanels}</span>
        </span>
        <div className="flex items-center gap-2">
          {panel.imageUrl && (
            <button
              onClick={() => setViewResult(v => !v)}
              className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border border-neutral-700 transition-colors ${showingResult ? 'bg-orange-500 text-white border-orange-500' : 'text-neutral-400 hover:text-white bg-neutral-800'}`}
            >
              {showingResult ? <PenLine size={11} /> : <Eye size={11} />}
              {showingResult ? '스케치로' : 'AI 결과'}
            </button>
          )}
          {panel.imageUrl && (
            <a
              href={panel.imageUrl}
              download={`panel-${panelIndex + 1}.png`}
              className="flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-orange-400 px-2 py-1 rounded bg-neutral-800 border border-neutral-700"
            >
              <Download size={11} /> 저장
            </a>
          )}
        </div>
      </div>

      {/* Canvas / Result area */}
      <div className="flex-1 min-h-0 p-3">
        {showingResult ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={panel.imageUrl}
              alt={`컷 ${panelIndex + 1} 결과`}
              className="max-w-full max-h-full object-contain rounded border-2 border-neutral-700"
            />
            <SpeechBubble dialogues={panel.dialogues} />
          </div>
        ) : (
          <SketchCanvas
            key={panelIndex}
            initialDataUrl={panel.sketchDataUrl}
            onExport={onSketchChange}
            fillHeight
          />
        )}

        {generating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-white">
              <RefreshCw size={40} className="animate-spin text-orange-500" />
              <span className="font-black text-sm">AI가 완성하는 중…</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex-shrink-0 border-t border-neutral-800 bg-neutral-900 px-3 pt-3 pb-4 flex flex-col gap-2">
        {panel.error && (
          <div className="text-red-400 text-xs font-bold bg-red-950/60 rounded px-2 py-1.5 border border-red-900">
            {panel.error}
          </div>
        )}

        {/* Style + Provider row */}
        <div className="flex gap-2">
          <select
            value={styleIndex}
            onChange={e => setStyleIndex(Number(e.target.value))}
            className="flex-1 bg-neutral-800 border border-neutral-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-orange-500 min-w-0"
          >
            {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
          </select>
          <div className="relative">
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-orange-500 appearance-none pr-6 cursor-pointer"
            >
              {PROVIDERS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
            <Settings size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
          </div>
        </div>

        {/* Strength slider */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-neutral-400 whitespace-nowrap w-16">다듬기 강도</span>
          <input
            type="range" min={0.1} max={0.9} step={0.05} value={strength}
            onChange={e => setStrength(Number(e.target.value))}
            className="flex-1 accent-orange-500"
          />
          <span className="text-xs font-bold text-white w-8 text-right">{Math.round(strength * 100)}%</span>
        </div>

        {/* Extra prompt (collapsible) */}
        <div>
          <button
            onClick={() => setShowExtra(v => !v)}
            className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-300 font-bold transition-colors"
          >
            <ChevronDown size={11} className={`transition-transform ${showExtra ? 'rotate-180' : ''}`} />
            추가 프롬프트 (선택)
          </button>
          {showExtra && (
            <input
              value={panel.imagePrompt || ''}
              onChange={e => onPromptChange(e.target.value)}
              placeholder="예: 달빛 배경, 어두운 분위기"
              className="mt-1 w-full bg-neutral-800 border border-neutral-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-orange-500 placeholder-neutral-600"
            />
          )}
        </div>

        {/* Generate button */}
        <button
          onClick={onGenerate}
          disabled={generating}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] transition-colors"
        >
          {generating ? 'AI 완성 중…' : panel.imageUrl ? '다시 완성하기' : 'AI로 완성'}
        </button>
      </div>
    </div>
  );
}
