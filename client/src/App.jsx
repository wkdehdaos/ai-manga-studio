import { useState, useRef, useCallback, useEffect } from 'react';
import WebtoonView from './components/WebtoonView';
import DrawingToolbar from './components/DrawingToolbar';
import PageStrip from './components/PageStrip';
import RightPanel from './components/RightPanel';
import AIChat from './components/AIChat';
import { generateImage } from './lib/api';

export const STYLE_PRESETS = [
  { label: '소년만화 흑백 잉크', prompt: 'shounen manga style, black and white ink, bold linework, screentone shading, dynamic poses, high contrast' },
  { label: '순정만화 파스텔',    prompt: 'shoujo manga style, soft pastel colors, delicate linework, sparkles, romantic dreamy atmosphere' },
  { label: '세이넨 다크판타지',  prompt: 'seinen manga style, dark fantasy, detailed crosshatching, gritty atmosphere, muted earth tones' },
  { label: '명랑 코미디 카툰',   prompt: 'yonkoma comic style, bright cheerful colors, chibi characters, exaggerated expressions, bold outlines' },
];

let _lid = 10;
const nid = () => ++_lid;

function makeDefaultLayers() {
  return [
    { id: nid(), name: '배경',   visible: true, opacity: 1 },
    { id: nid(), name: '스케치', visible: true, opacity: 0.5 },
    { id: nid(), name: '잉킹',   visible: true, opacity: 1 },
  ];
}

function makePage() {
  const layers = makeDefaultLayers();
  return { layers, activeLayerId: layers[2].id, layerData: null, thumbnail: null, aiResult: null };
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename; a.click();
}

// ── Panel toggle tab ───────────────────────────────────────────────────────────
function PanelTab({ side, open, onToggle }) {
  const isLeft = side === 'left';
  return (
    <button
      onClick={onToggle}
      title={open ? '패널 닫기' : '패널 열기'}
      style={{
        flexShrink: 0, width: '16px',
        background: '#2a2a2a',
        border: 'none',
        borderLeft:  isLeft  ? 'none' : '1px solid #1a1a1a',
        borderRight: isLeft  ? '1px solid #1a1a1a' : 'none',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#555', padding: 0,
        transition: 'color 0.15s, background 0.15s',
        zIndex: 5,
        touchAction: 'manipulation',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.background = '#383838'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = '#2a2a2a'; }}
    >
      {/* Chevron - direction flips based on panel state */}
      <svg width="8" height="16" viewBox="0 0 8 16" fill="currentColor"
        style={{ transform: isLeft ? (open ? 'none' : 'scaleX(-1)') : (open ? 'none' : 'scaleX(-1)'), transition: 'transform 0.2s' }}>
        {isLeft
          ? <polyline points="6,2 2,8 6,14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          : <polyline points="2,2 6,8 2,14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        }
      </svg>
    </button>
  );
}

export default function App() {
  const [pages, setPages] = useState(() => [makePage(), makePage(), makePage(), makePage()]);
  const [activePage, setActivePage] = useState(0);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#1a1a1a');
  const [brushSize, setBrushSize] = useState(6);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [styleIndex, setStyleIndex] = useState(0);
  const [fillShapes, setFillShapes] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResultUrl, setAiResultUrl] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showPageStrip, setShowPageStrip] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const webtoonRef = useRef(null);

  const cur = pages[activePage];

  const updateCur = useCallback((updates) => {
    setPages(prev => prev.map((p, i) => i === activePage ? { ...p, ...updates } : p));
  }, [activePage]);

  const switchPage = useCallback((idx) => {
    setActivePage(idx); webtoonRef.current?.scrollToPage(idx);
  }, []);

  const addPage    = useCallback(() => { setPages(prev => [...prev, makePage()]); }, []);
  const deletePage = useCallback((idx) => {
    if (pages.length <= 1) return;
    setPages(prev => prev.filter((_, i) => i !== idx));
    setActivePage(prev => Math.min(prev, pages.length - 2));
  }, [pages.length]);

  const setActiveLayerId = useCallback((id) => updateCur({ activeLayerId: id }), [updateCur]);

  const addLayer = useCallback(() => {
    const l = { id: nid(), name: `레이어 ${cur.layers.length + 1}`, visible: true, opacity: 1 };
    updateCur({ layers: [...cur.layers, l], activeLayerId: l.id });
  }, [cur.layers, updateCur]);

  const deleteLayer = useCallback((id) => {
    if (cur.layers.length <= 1) return;
    webtoonRef.current?.removeLayer(id);
    const next = cur.layers.filter(l => l.id !== id);
    updateCur({ layers: next, activeLayerId: cur.activeLayerId === id ? next[next.length - 1].id : cur.activeLayerId });
  }, [cur, updateCur]);

  const toggleVisibility = useCallback((id) => {
    updateCur({ layers: cur.layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l) });
  }, [cur.layers, updateCur]);

  const setLayerOpacity = useCallback((id, opacity) => {
    updateCur({ layers: cur.layers.map(l => l.id === id ? { ...l, opacity } : l) });
  }, [cur.layers, updateCur]);

  const handleThumbnailUpdate = useCallback((idx, url) => {
    setPages(prev => prev.map((p, i) => i === idx ? { ...p, thumbnail: url } : p));
  }, []);

  const handleSavePage = useCallback(() => {
    const dataUrl = webtoonRef.current?.flatten();
    if (!dataUrl) return;
    downloadDataUrl(dataUrl, `manga-page-${activePage + 1}.png`);
  }, [activePage]);

  const handleSaveAll = useCallback(() => {
    const all = webtoonRef.current?.flattenAll();
    if (!all) return;
    all.forEach(({ index, dataUrl }) => {
      if (!dataUrl) return;
      setTimeout(() => downloadDataUrl(dataUrl, `manga-page-${index + 1}.png`), index * 400);
    });
  }, []);

  const handleColorPick = useCallback((hex) => {
    setColor(hex); setTool('pen');
  }, []);

  const handleAI = useCallback(async () => {
    setAiLoading(true);
    try {
      const sketchDataUrl = webtoonRef.current?.flatten();
      if (!sketchDataUrl) throw new Error('캔버스를 찾을 수 없습니다');
      const result = await generateImage({ mode: 'sketch', prompt: STYLE_PRESETS[styleIndex].prompt, sketchDataUrl });
      setAiResultUrl(result.image);
      updateCur({ aiResult: result.image });
    } catch (err) {
      alert(err.message);
    } finally {
      setAiLoading(false);
    }
  }, [styleIndex, updateCur]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); webtoonRef.current?.undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); webtoonRef.current?.redo(); }
      if (e.ctrlKey && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(z => parseFloat(Math.min(4, z + 0.25).toFixed(2))); }
      if (e.ctrlKey && e.key === '-') { e.preventDefault(); setZoom(z => parseFloat(Math.max(0.25, z - 0.25).toFixed(2))); }
      if (e.ctrlKey && e.key === '0') { e.preventDefault(); setZoom(1); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSavePage(); }
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key === 'b') setTool('pen');
        if (e.key === 'e') setTool('eraser');
        if (e.key === 'l') setTool('line');
        if (e.key === 'r') setTool('rect');
        if (e.key === 'o') setTool('circle');
        if (e.key === 'g') setTool('fill');
        if (e.key === 't') setTool('text');
        if (e.key === 'i') setTool('eyedropper');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSavePage]);

  return (
    <div className="flex flex-col overflow-hidden"
      style={{
        height: '100dvh',
        background: '#505050',
        // Safe area for iPad notch / home indicator
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        boxSizing: 'border-box',
      }}>

      <DrawingToolbar
        tool={tool} setTool={setTool}
        onUndo={() => webtoonRef.current?.undo()}
        onRedo={() => webtoonRef.current?.redo()}
        onAI={handleAI} aiLoading={aiLoading}
        styleIndex={styleIndex} setStyleIndex={setStyleIndex}
        zoom={zoom} setZoom={setZoom}
        fillShapes={fillShapes} setFillShapes={setFillShapes}
        onSavePage={handleSavePage} onSaveAll={handleSaveAll}
      />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Page strip ─────────────────────────────────────────────────── */}
        <div style={{
          width: showPageStrip ? '60px' : '0',
          transition: 'width 0.22s ease',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          <div style={{ width: '60px', height: '100%' }}>
            <PageStrip pages={pages} activePage={activePage}
              onSelect={switchPage} onAdd={addPage} onDelete={deletePage} />
          </div>
        </div>

        <PanelTab side="left" open={showPageStrip} onToggle={() => setShowPageStrip(v => !v)} />

        {/* ── Canvas ─────────────────────────────────────────────────────── */}
        <WebtoonView
          ref={webtoonRef}
          pages={pages} activePage={activePage} setActivePage={setActivePage}
          tool={tool} color={color} brushSize={brushSize} brushOpacity={brushOpacity}
          fillShapes={fillShapes} zoom={zoom} setZoom={setZoom}
          onThumbnailUpdate={handleThumbnailUpdate}
          onColorPick={handleColorPick}
        />

        <PanelTab side="right" open={showRightPanel} onToggle={() => setShowRightPanel(v => !v)} />

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <div style={{
          width: showRightPanel ? '168px' : '0',
          transition: 'width 0.22s ease',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          <div style={{ width: '168px', height: '100%' }}>
            <RightPanel
              brushSize={brushSize} setBrushSize={setBrushSize}
              brushOpacity={brushOpacity} setBrushOpacity={setBrushOpacity}
              color={color} setColor={setColor}
              layers={cur.layers} activeLayerId={cur.activeLayerId}
              onSetActiveLayer={setActiveLayerId}
              onAddLayer={addLayer} onDeleteLayer={deleteLayer}
              onToggleVisibility={toggleVisibility} onSetOpacity={setLayerOpacity}
            />
          </div>
        </div>
      </div>

      {/* ── AI Chat FAB ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setShowChat(v => !v)}
        title="AI와 대화하기"
        style={{
          position: 'fixed',
          bottom: `calc(24px + env(safe-area-inset-bottom, 0px))`,
          left: showChat ? '408px' : '88px',
          width: '52px', height: '52px', borderRadius: '50%',
          background: showChat ? '#ea580c' : '#f97316',
          border: '2px solid rgba(0,0,0,0.3)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 160, transition: 'left 0.25s, background 0.15s',
          fontSize: '22px', lineHeight: 1,
          touchAction: 'manipulation',
        }}
      >
        {showChat ? '✕' : '💬'}
      </button>

      {showChat && (
        <AIChat
          onImageGenerated={(url) => { setAiResultUrl(url); }}
          onClose={() => setShowChat(false)}
        />
      )}

      {aiResultUrl && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '196px',
          width: '240px', background: '#2a2a2a', border: '1px solid #555',
          borderRadius: '8px', overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)', zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid #444' }}>
            <span style={{ fontSize: '11px', color: '#f97316', fontWeight: 900 }}>AI 완성 결과</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <a href={aiResultUrl} download="ai-result.png"
                style={{ fontSize: '10px', color: '#aaa', textDecoration: 'none', background: '#3a3a3a', padding: '2px 6px', borderRadius: '3px' }}>
                저장
              </a>
              <button onClick={() => setAiResultUrl(null)}
                style={{ fontSize: '14px', color: '#666', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>
                ✕
              </button>
            </div>
          </div>
          <img src={aiResultUrl} alt="AI 결과" style={{ width: '100%', display: 'block' }} />
        </div>
      )}
    </div>
  );
}
