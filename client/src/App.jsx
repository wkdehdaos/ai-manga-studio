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
  const webtoonRef = useRef(null);

  const cur = pages[activePage];

  const updateCur = useCallback((updates) => {
    setPages(prev => prev.map((p, i) => i === activePage ? { ...p, ...updates } : p));
  }, [activePage]);

  const switchPage = useCallback((idx) => {
    setActivePage(idx); webtoonRef.current?.scrollToPage(idx);
  }, []);

  const addPage = useCallback(() => { setPages(prev => [...prev, makePage()]); }, []);

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

  // ── Save ──────────────────────────────────────────────────────────────────
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

  // ── Eyedropper callback ───────────────────────────────────────────────────
  const handleColorPick = useCallback((hex) => {
    setColor(hex);
    setTool('pen'); // revert to pen after picking
  }, []);

  // ── AI ────────────────────────────────────────────────────────────────────
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

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
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
    <div className="flex flex-col overflow-hidden" style={{ height: '100dvh', background: '#505050' }}>
      <DrawingToolbar
        tool={tool} setTool={setTool}
        onUndo={() => webtoonRef.current?.undo()}
        onRedo={() => webtoonRef.current?.redo()}
        onAI={handleAI} aiLoading={aiLoading}
        styleIndex={styleIndex} setStyleIndex={setStyleIndex}
        zoom={zoom} setZoom={setZoom}
        fillShapes={fillShapes} setFillShapes={setFillShapes}
        onSavePage={handleSavePage} onSaveAll={handleSaveAll}
        showChat={showChat} setShowChat={setShowChat}
      />
      <div className="flex flex-1 overflow-hidden">
        <PageStrip
          pages={pages} activePage={activePage}
          onSelect={switchPage} onAdd={addPage} onDelete={deletePage}
        />
        <WebtoonView
          ref={webtoonRef}
          pages={pages} activePage={activePage} setActivePage={setActivePage}
          tool={tool} color={color} brushSize={brushSize} brushOpacity={brushOpacity}
          fillShapes={fillShapes} zoom={zoom} setZoom={setZoom}
          onThumbnailUpdate={handleThumbnailUpdate}
          onColorPick={handleColorPick}
        />
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
