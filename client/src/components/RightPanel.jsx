import { useRef } from 'react';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';

const PALETTE = [
  '#000000', '#ffffff', '#d9d9d9', '#888888',
  '#cc0000', '#ff6600', '#ffcc00', '#33cc33',
  '#0066ff', '#9933ff', '#ff66cc', '#663300',
];

export default function RightPanel({
  brushSize, setBrushSize,
  brushOpacity, setBrushOpacity,
  color, setColor,
  layers, activeLayerId, onSetActiveLayer,
  onAddLayer, onDeleteLayer, onToggleVisibility, onSetOpacity,
}) {
  const colorInputRef = useRef(null);
  const previewSize = Math.min(Math.max(brushSize * 1.5, 3), 36);

  return (
    <div
      className="flex-shrink-0 flex flex-col overflow-hidden"
      style={{ width: '168px', background: '#383838', borderLeft: '1px solid #222' }}
    >
      {/* ─── Brush Size ─── */}
      <Section label="브러시">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Circle preview */}
          <div style={{
            flexShrink: 0, width: '44px', height: '44px',
            borderRadius: '50%', border: '2px solid #555',
            background: '#2a2a2a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: previewSize, height: previewSize,
              borderRadius: '50%', background: color,
            }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <SliderRow label={null} value={brushSize} min={1} max={80} step={1} unit="" onChange={setBrushSize} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '9px', color: '#666', flexShrink: 0 }}>불투명</span>
              <input type="range" min={0.05} max={1} step={0.05} value={brushOpacity}
                onChange={e => setBrushOpacity(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#f97316', height: '2px' }} />
              <span style={{ fontSize: '9px', color: '#aaa', width: '22px', textAlign: 'right' }}>{Math.round(brushOpacity * 100)}%</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ fontSize: '9px', color: '#666' }}>크기</span>
          <input type="range" min={1} max={80} step={1} value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#f97316', margin: '0 6px', height: '2px' }} />
          <span style={{ fontSize: '11px', color: '#fff', width: '24px', textAlign: 'right' }}>{brushSize}</span>
        </div>
      </Section>

      {/* ─── Color ─── */}
      <Section label="색상">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          {/* Current color circle */}
          <button
            onClick={() => colorInputRef.current?.click()}
            title="색상 선택"
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: color, border: '3px solid #555',
              cursor: 'pointer', flexShrink: 0,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
              transition: 'transform 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          />
          <input
            ref={colorInputRef}
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
          />
          {/* Palette grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '3px', width: '100%' }}>
            {PALETTE.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                title={c}
                style={{
                  width: '100%', aspectRatio: '1',
                  borderRadius: '3px', background: c,
                  border: color === c ? '2px solid #f97316' : '1px solid #555',
                  cursor: 'pointer',
                  transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.1s, border 0.1s',
                }}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Layers ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: '1px solid #222' }}>
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px 4px',
        }}>
          <span style={{ fontSize: '9px', color: '#666', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>레이어</span>
          <button
            onClick={onAddLayer}
            title="레이어 추가"
            style={{
              width: '18px', height: '18px', borderRadius: '3px',
              background: 'transparent', border: 'none',
              color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#4a4a4a'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#666'; }}
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Layer list — reversed so top layer is at top */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse' }}>
          {layers.map(layer => (
            <LayerRow
              key={layer.id}
              layer={layer}
              active={activeLayerId === layer.id}
              canDelete={layers.length > 1}
              onSelect={() => onSetActiveLayer(layer.id)}
              onToggle={() => onToggleVisibility(layer.id)}
              onDelete={() => onDeleteLayer(layer.id)}
              onSetOpacity={(v) => onSetOpacity(layer.id, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ flexShrink: 0, padding: '10px', borderBottom: '1px solid #222' }}>
      <div style={{ fontSize: '9px', color: '#666', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function SliderRow({ label, value, min, max, step, unit, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {label && <span style={{ fontSize: '9px', color: '#666', flexShrink: 0, width: '24px' }}>{label}</span>}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: '#f97316', height: '2px' }} />
      <span style={{ fontSize: '9px', color: '#aaa', width: '22px', textAlign: 'right' }}>{value}{unit}</span>
    </div>
  );
}

function LayerRow({ layer, active, canDelete, onSelect, onToggle, onDelete, onSetOpacity }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '5px 8px',
        cursor: 'pointer',
        background: active ? '#4d4d4d' : 'transparent',
        borderLeft: `2px solid ${active ? '#f97316' : 'transparent'}`,
        transition: 'background 0.1s',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#424242'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Visibility toggle */}
      <button
        onClick={e => { e.stopPropagation(); onToggle(); }}
        title={layer.visible ? '숨기기' : '보이기'}
        style={{
          flexShrink: 0, width: '16px', height: '16px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: layer.visible ? '#aaa' : '#555',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {layer.visible ? <Eye size={11} /> : <EyeOff size={11} />}
      </button>

      {/* Layer thumbnail placeholder */}
      <div style={{
        flexShrink: 0, width: '26px', height: '34px',
        background: '#fff', border: '1px solid #555',
        borderRadius: '1px', overflow: 'hidden',
      }} />

      {/* Name + opacity */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '10px', color: active ? '#fff' : '#bbb', fontWeight: active ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {layer.name}
        </span>
        <input
          type="range" min={0} max={1} step={0.05} value={layer.opacity}
          onClick={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); onSetOpacity(Number(e.target.value)); }}
          style={{ width: '100%', accentColor: '#f97316', height: '2px', cursor: 'pointer' }}
        />
      </div>

      {/* Delete */}
      {canDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          title="레이어 삭제"
          style={{
            flexShrink: 0, width: '14px', height: '14px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
        >
          <Trash2 size={9} />
        </button>
      )}
    </div>
  );
}
