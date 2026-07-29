import { useRef, useEffect, useCallback, useState } from 'react';

// ─── color math ──────────────────────────────────────────────────────────────

function hsbToRgb(h, s, b) {
  s /= 100; b /= 100;
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = b * (1 - s);
  const q = b * (1 - f * s);
  const t = b * (1 - (1 - f) * s);
  const m = [[b,t,p],[q,b,p],[p,b,t],[p,q,b],[t,p,b],[b,p,q]][i];
  return m.map(v => Math.round(v * 255));
}

function rgbToHsb(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r)      h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else                h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [Math.round(h), max ? Math.round(d / max * 100) : 0, Math.round(max * 100)];
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ─── drag helper ─────────────────────────────────────────────────────────────

function useDrag(onMove) {
  const active = useRef(false);
  const onDown = useCallback((e) => {
    e.preventDefault();
    active.current = true;
    onMove(e);
    const move = (ev) => { if (active.current) onMove(ev); };
    const up   = () => { active.current = false; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup',   up);
  }, [onMove]);
  return onDown;
}

// ─── component ───────────────────────────────────────────────────────────────

const RECENT_MAX = 14;

export default function ColorPicker({ color, onChange, onClose }) {
  // Parse initial color
  const initHsb = () => rgbToHsb(...hexToRgb(color));
  const [[h, s, b], setHsb] = useState(initHsb);
  const [hexInput, setHexInput]   = useState(color);
  const [recent, setRecent]       = useState([]);

  const sbRef  = useRef(null);
  const hueRef = useRef(null);

  // Sync hex input when hsb changes
  useEffect(() => {
    const hex = rgbToHex(...hsbToRgb(h, s, b));
    setHexInput(hex);
    onChange(hex);
  }, [h, s, b]); // eslint-disable-line

  // Add to recent when picker closes
  useEffect(() => {
    return () => {
      const hex = rgbToHex(...hsbToRgb(h, s, b));
      setRecent(prev => {
        const next = [hex, ...prev.filter(c => c !== hex)].slice(0, RECENT_MAX);
        return next;
      });
    };
  }, []); // eslint-disable-line

  // ── SB square interaction ─────────────────────────────────────────────────
  const onSBMove = useCallback((e) => {
    const rect = sbRef.current?.getBoundingClientRect(); if (!rect) return;
    const sx = Math.max(0, Math.min(1, (e.clientX - rect.left)  / rect.width));
    const sy = Math.max(0, Math.min(1, (e.clientY - rect.top)   / rect.height));
    setHsb(([ch]) => [ch, Math.round(sx * 100), Math.round((1 - sy) * 100)]);
  }, []);

  // ── Hue strip interaction ─────────────────────────────────────────────────
  const onHueMove = useCallback((e) => {
    const rect = hueRef.current?.getBoundingClientRect(); if (!rect) return;
    const hx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHsb(([, cs, cb]) => [Math.round(hx * 360), cs, cb]);
  }, []);

  const sbDown  = useDrag(onSBMove);
  const hueDown = useDrag(onHueMove);

  const hexColor = rgbToHex(...hsbToRgb(h, s, b));
  const pureHue  = rgbToHex(...hsbToRgb(h, 100, 100));

  // SB cursor position
  const cx = `${s}%`;
  const cy = `${100 - b}%`;

  return (
    <div
      style={{
        position: 'absolute', bottom: 0, right: '100%', marginRight: '8px',
        width: '240px',
        background: '#2a2a2a', border: '1px solid #555', borderRadius: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        zIndex: 200, overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 0' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#bbb' }}>색상 선택</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
      </div>

      {/* ── SB Square ── */}
      <div style={{ padding: '10px 12px 0' }}>
        <div
          ref={sbRef}
          onPointerDown={sbDown}
          style={{
            position: 'relative', width: '100%', paddingBottom: '75%',
            borderRadius: '6px', overflow: 'hidden', cursor: 'crosshair',
            background: pureHue,
          }}
        >
          {/* White → hue (left → right) */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, #fff, transparent)',
          }} />
          {/* Black overlay (top → bottom) */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent, #000)',
          }} />
          {/* Cursor circle */}
          <div style={{
            position: 'absolute',
            left: cx, top: cy,
            transform: 'translate(-50%, -50%)',
            width: '14px', height: '14px',
            borderRadius: '50%',
            border: '2px solid #fff',
            boxShadow: '0 0 0 1.5px rgba(0,0,0,0.6)',
            background: hexColor,
            pointerEvents: 'none',
          }} />
        </div>
      </div>

      {/* ── Hue Strip ── */}
      <div style={{ padding: '10px 12px 0' }}>
        <div
          ref={hueRef}
          onPointerDown={hueDown}
          style={{
            position: 'relative', width: '100%', height: '18px',
            borderRadius: '9px', cursor: 'pointer',
            background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
          }}
        >
          {/* Hue cursor */}
          <div style={{
            position: 'absolute',
            left: `${(h / 360) * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '18px', height: '18px',
            borderRadius: '50%',
            border: '2px solid #fff',
            boxShadow: '0 0 0 1.5px rgba(0,0,0,0.6)',
            background: pureHue,
            pointerEvents: 'none',
          }} />
        </div>
      </div>

      {/* ── Color Preview + Hex ── */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Preview swatch */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '6px',
          background: hexColor,
          border: '1px solid #555',
          flexShrink: 0,
        }} />
        {/* Hex input */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>HEX</div>
          <input
            value={hexInput}
            onChange={e => setHexInput(e.target.value)}
            onBlur={() => {
              const m = /^#?([a-f\d]{6})$/i.exec(hexInput.trim());
              if (m) {
                const hex = '#' + m[1].toLowerCase();
                const [r, g, bv] = hexToRgb(hex);
                setHsb(rgbToHsb(r, g, bv));
              }
            }}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); }}
            style={{
              width: '100%', padding: '4px 6px',
              background: '#1a1a1a', border: '1px solid #555',
              color: '#eee', fontSize: '12px', fontFamily: 'monospace',
              borderRadius: '4px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        {/* HSB values */}
        <div style={{ fontSize: '10px', color: '#777', lineHeight: '1.6', flexShrink: 0, textAlign: 'right' }}>
          <div>H {h}°</div>
          <div>S {s}%</div>
          <div>B {b}%</div>
        </div>
      </div>

      {/* ── Preset Swatches ── */}
      <div style={{ padding: '0 12px 8px' }}>
        <div style={{ fontSize: '10px', color: '#555', marginBottom: '5px' }}>기본 색</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {PRESETS.map(c => (
            <button key={c} title={c}
              onClick={() => { const [r,g,bv]=hexToRgb(c); setHsb(rgbToHsb(r,g,bv)); }}
              style={{
                width: '18px', height: '18px', borderRadius: '4px',
                background: c, border: hexColor === c ? '2px solid #fff' : '1px solid #444',
                cursor: 'pointer', padding: 0, boxSizing: 'border-box',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Recent Colors ── */}
      {recent.length > 0 && (
        <div style={{ padding: '0 12px 10px', borderTop: '1px solid #383838' }}>
          <div style={{ fontSize: '10px', color: '#555', margin: '6px 0 5px' }}>최근 색</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {recent.map((c, i) => (
              <button key={i} title={c}
                onClick={() => { const [r,g,bv]=hexToRgb(c); setHsb(rgbToHsb(r,g,bv)); }}
                style={{
                  width: '18px', height: '18px', borderRadius: '4px',
                  background: c, border: hexColor === c ? '2px solid #fff' : '1px solid #444',
                  cursor: 'pointer', padding: 0, boxSizing: 'border-box',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PRESETS = [
  '#000000', '#ffffff', '#888888', '#ff3b30', '#ff9500', '#ffcc00',
  '#34c759', '#5ac8fa', '#007aff', '#5856d6', '#ff2d55', '#af52de',
  '#8b4513', '#1a1a2e', '#f0f0f0', '#d4a5a5', '#a5d4a5', '#a5a5d4',
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
];
