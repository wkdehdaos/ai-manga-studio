import {
  Pen, Eraser, Undo2, Redo2, Sparkles, ZoomIn, ZoomOut,
  Minus, Square, Circle, MoveRight,
  PaintBucket, Type, Pipette,
  Download, FolderDown,
} from 'lucide-react';
import { STYLE_PRESETS } from '../App';

const FREEHAND = [
  { id: 'pen',       icon: <Pen size={13} />,        label: '펜 (B)' },
  { id: 'eraser',    icon: <Eraser size={13} />,     label: '지우개 (E)' },
];

const SHAPES = [
  { id: 'line',   icon: <Minus size={13} />,    label: '직선 (L)' },
  { id: 'arrow',  icon: <MoveRight size={13} />, label: '화살표' },
  { id: 'rect',   icon: <Square size={13} />,   label: '사각형 (R)' },
  { id: 'circle', icon: <Circle size={13} />,   label: '원 (O)' },
];

const EXTRAS = [
  { id: 'fill',      icon: <PaintBucket size={13} />, label: '페인트 통 (G)' },
  { id: 'text',      icon: <Type size={13} />,        label: '텍스트 (T)' },
  { id: 'eyedropper',icon: <Pipette size={13} />,     label: '스포이드 (I)' },
];

const SHAPE_IDS = new Set(SHAPES.map(s => s.id));

export default function DrawingToolbar({
  tool, setTool,
  onUndo, onRedo,
  onAI, aiLoading,
  styleIndex, setStyleIndex,
  zoom, setZoom,
  fillShapes, setFillShapes,
  onSavePage, onSaveAll,
}) {
  const zoomIn    = () => setZoom(z => parseFloat(Math.min(4,    (z + 0.25).toFixed(2))));
  const zoomOut   = () => setZoom(z => parseFloat(Math.max(0.25, (z - 0.25).toFixed(2))));
  const zoomReset = () => setZoom(1);

  return (
    <div className="flex-shrink-0 flex items-center gap-0.5 px-2"
      style={{ height: '44px', background: '#383838', borderBottom: '1px solid #222', overflowX: 'auto' }}>

      {/* Logo */}
      <span style={{ fontSize: '12px', fontWeight: 900, color: '#fff', marginRight: '6px', letterSpacing: '-0.5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
        AI <span style={{ color: '#f97316' }}>Manga</span>
      </span>

      <Sep />

      {/* Freehand */}
      {FREEHAND.map(t => (
        <ToolBtn key={t.id} active={tool === t.id} onClick={() => setTool(t.id)} title={t.label}>
          {t.icon}
        </ToolBtn>
      ))}

      <Sep />

      {/* Shape tools */}
      {SHAPES.map(t => (
        <ToolBtn key={t.id} active={tool === t.id} onClick={() => setTool(t.id)} title={t.label}>
          {t.icon}
        </ToolBtn>
      ))}

      {/* Fill toggle — visible when a fillable shape is active */}
      {SHAPE_IDS.has(tool) && tool !== 'line' && tool !== 'arrow' && (
        <button
          onClick={() => setFillShapes(v => !v)}
          title={fillShapes ? '채우기 ON' : '채우기 OFF'}
          style={{
            height: '22px', padding: '0 5px', marginLeft: '2px',
            background: fillShapes ? '#f97316' : '#4a4a4a',
            border: `1px solid ${fillShapes ? '#000' : '#555'}`,
            color: '#fff', fontSize: '10px', fontWeight: 700,
            borderRadius: '3px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          채우기
        </button>
      )}

      <Sep />

      {/* Extra tools: fill, text, eyedropper */}
      {EXTRAS.map(t => (
        <ToolBtn key={t.id} active={tool === t.id} onClick={() => setTool(t.id)} title={t.label}>
          {t.icon}
        </ToolBtn>
      ))}

      <Sep />

      {/* Undo / Redo */}
      <ToolBtn active={false} onClick={onUndo} title="실행취소 (Ctrl+Z)"><Undo2 size={13} /></ToolBtn>
      <ToolBtn active={false} onClick={onRedo} title="다시실행 (Ctrl+Y)"><Redo2 size={13} /></ToolBtn>

      <Sep />

      {/* Zoom */}
      <ToolBtn active={false} onClick={zoomOut} title="축소 (Ctrl+-)"><ZoomOut size={13} /></ToolBtn>
      <button onClick={zoomReset} title="원래 크기 (Ctrl+0)"
        style={{
          height: '24px', minWidth: '38px', padding: '0 4px',
          background: '#4a4a4a', border: '1px solid #555',
          color: '#ddd', fontSize: '11px', fontWeight: 700,
          borderRadius: '4px', cursor: 'pointer', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#5a5a5a'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#4a4a4a'; }}
      >
        {Math.round(zoom * 100)}%
      </button>
      <ToolBtn active={false} onClick={zoomIn} title="확대 (Ctrl++)"><ZoomIn size={13} /></ToolBtn>

      <Sep />

      {/* Save */}
      <ToolBtn active={false} onClick={onSavePage} title="현재 페이지 저장 (PNG)">
        <Download size={13} />
      </ToolBtn>
      <ToolBtn active={false} onClick={onSaveAll} title="전체 페이지 저장 (PNG × 여러 장)">
        <FolderDown size={13} />
      </ToolBtn>

      <div style={{ flex: 1, minWidth: '8px' }} />

      {/* Style preset */}
      <select value={styleIndex} onChange={e => setStyleIndex(Number(e.target.value))}
        style={{ background: '#4a4a4a', border: '1px solid #555', color: '#fff', fontSize: '11px', borderRadius: '4px', padding: '3px 6px', height: '28px', outline: 'none', flexShrink: 0 }}>
        {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
      </select>

      {/* AI Complete */}
      <button onClick={onAI} disabled={aiLoading}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '0 12px', height: '30px', marginLeft: '8px',
          background: aiLoading ? '#9a3d00' : '#f97316',
          color: '#fff', fontWeight: 900, fontSize: '12px',
          border: '1.5px solid #000', borderRadius: '4px',
          boxShadow: '2px 2px 0 rgba(0,0,0,0.5)',
          cursor: aiLoading ? 'not-allowed' : 'pointer',
          opacity: aiLoading ? 0.7 : 1, flexShrink: 0,
        }}>
        <Sparkles size={13} />
        {aiLoading ? 'AI 완성 중…' : 'AI 완성'}
      </button>
    </div>
  );
}

function Sep() {
  return <div style={{ width: '1px', height: '22px', background: '#555', margin: '0 3px', flexShrink: 0 }} />;
}

function ToolBtn({ active, onClick, title, children }) {
  return (
    <button onClick={onClick} title={title}
      style={{
        width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '4px', border: 'none', flexShrink: 0,
        background: active ? '#f97316' : 'transparent',
        color: active ? '#fff' : '#aaa', cursor: 'pointer',
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#555'; e.currentTarget.style.color = '#fff'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; } }}
    >
      {children}
    </button>
  );
}
