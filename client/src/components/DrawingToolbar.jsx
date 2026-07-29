import { Pen, Eraser, Undo2, Redo2, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import { STYLE_PRESETS } from '../App';

const TOOLS = [
  { id: 'pen',    icon: <Pen size={15} />,    label: '펜 (B)' },
  { id: 'eraser', icon: <Eraser size={15} />, label: '지우개 (E)' },
];

export default function DrawingToolbar({
  tool, setTool,
  onUndo, onRedo,
  onAI, aiLoading,
  styleIndex, setStyleIndex,
  zoom, setZoom,
}) {
  const zoomIn    = () => setZoom(z => parseFloat(Math.min(4,    (z + 0.25).toFixed(2))));
  const zoomOut   = () => setZoom(z => parseFloat(Math.max(0.25, (z - 0.25).toFixed(2))));
  const zoomReset = () => setZoom(1);

  return (
    <div className="flex-shrink-0 flex items-center gap-1 px-2"
      style={{ height: '44px', background: '#383838', borderBottom: '1px solid #222' }}>

      {/* Logo */}
      <span style={{ fontSize: '12px', fontWeight: 900, color: '#fff', marginRight: '6px', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
        AI <span style={{ color: '#f97316' }}>Manga</span>
      </span>

      <Sep />

      {/* Drawing tools */}
      {TOOLS.map(t => (
        <ToolBtn key={t.id} active={tool === t.id} onClick={() => setTool(t.id)} title={t.label}>
          {t.icon}
        </ToolBtn>
      ))}

      <Sep />

      {/* Undo / Redo */}
      <ToolBtn active={false} onClick={onUndo} title="실행취소 (Ctrl+Z)"><Undo2 size={15} /></ToolBtn>
      <ToolBtn active={false} onClick={onRedo} title="다시실행 (Ctrl+Y)"><Redo2 size={15} /></ToolBtn>

      <Sep />

      {/* Zoom */}
      <ToolBtn active={false} onClick={zoomOut} title="축소 (Ctrl+-)"><ZoomOut size={15} /></ToolBtn>
      <button onClick={zoomReset} title="원래 크기 (Ctrl+0)"
        style={{
          height: '26px', minWidth: '44px', padding: '0 4px',
          background: '#4a4a4a', border: '1px solid #555',
          color: '#ddd', fontSize: '11px', fontWeight: 700,
          borderRadius: '4px', cursor: 'pointer',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#5a5a5a'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#4a4a4a'; }}
      >
        {Math.round(zoom * 100)}%
      </button>
      <ToolBtn active={false} onClick={zoomIn} title="확대 (Ctrl++)"><ZoomIn size={15} /></ToolBtn>

      <div style={{ flex: 1 }} />

      {/* Style preset */}
      <select
        value={styleIndex}
        onChange={e => setStyleIndex(Number(e.target.value))}
        style={{
          background: '#4a4a4a', border: '1px solid #555',
          color: '#fff', fontSize: '11px',
          borderRadius: '4px', padding: '3px 6px',
          height: '28px', outline: 'none',
        }}
      >
        {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
      </select>

      {/* AI Complete */}
      <button
        onClick={onAI}
        disabled={aiLoading}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '0 14px', height: '30px', marginLeft: '8px',
          background: aiLoading ? '#9a3d00' : '#f97316',
          color: '#fff', fontWeight: 900, fontSize: '12px',
          border: '1.5px solid #000', borderRadius: '4px',
          boxShadow: '2px 2px 0 rgba(0,0,0,0.5)',
          cursor: aiLoading ? 'not-allowed' : 'pointer',
          opacity: aiLoading ? 0.7 : 1,
          transition: 'background 0.1s',
          flexShrink: 0,
        }}
      >
        <Sparkles size={13} />
        {aiLoading ? 'AI 완성 중…' : 'AI 완성'}
      </button>
    </div>
  );
}

function Sep() {
  return <div style={{ width: '1px', height: '24px', background: '#555', margin: '0 3px', flexShrink: 0 }} />;
}

function ToolBtn({ active, onClick, title, children }) {
  return (
    <button onClick={onClick} title={title}
      style={{
        width: '32px', height: '32px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '4px', border: 'none', flexShrink: 0,
        background: active ? '#f97316' : 'transparent',
        color: active ? '#fff' : '#aaa',
        cursor: 'pointer',
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#555'; e.currentTarget.style.color = '#fff'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; } }}
    >
      {children}
    </button>
  );
}
