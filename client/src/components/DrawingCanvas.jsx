import { forwardRef, useRef, useEffect, useCallback, useImperativeHandle, useState } from 'react';

const W = 600, H = 848;

const SHAPE_TOOLS = new Set(['line', 'rect', 'circle', 'arrow']);

// ─── helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function floodFill(displayCtx, layerCtx, startX, startY, fillColor, opacity, tolerance = 25) {
  startX = Math.round(startX); startY = Math.round(startY);
  if (startX < 0 || startX >= W || startY < 0 || startY >= H) return;

  const [fillR, fillG, fillB] = hexToRgb(fillColor);
  const fillA = Math.round(opacity * 255);

  // Read boundary from composite (what user sees)
  const cData = displayCtx.getImageData(0, 0, W, H).data;
  // Write to active layer
  const layerImgData = layerCtx.getImageData(0, 0, W, H);
  const lData = layerImgData.data;

  const si = (startY * W + startX) * 4;
  const tr = cData[si], tg = cData[si + 1], tb = cData[si + 2];

  if (tr === fillR && tg === fillG && tb === fillB) return;

  const visited = new Uint8Array(W * H);
  const stack = [startY * W + startX];
  visited[stack[0]] = 1;

  while (stack.length) {
    const pos = stack.pop();
    const x = pos % W, y = (pos / W) | 0;
    const li = pos * 4;
    lData[li] = fillR; lData[li + 1] = fillG; lData[li + 2] = fillB; lData[li + 3] = fillA;

    const neighbors = [
      x > 0     ? pos - 1 : -1,
      x < W - 1 ? pos + 1 : -1,
      y > 0     ? pos - W : -1,
      y < H - 1 ? pos + W : -1,
    ];
    for (const n of neighbors) {
      if (n < 0 || visited[n]) continue;
      const ni = n * 4;
      if (Math.abs(cData[ni]-tr) + Math.abs(cData[ni+1]-tg) + Math.abs(cData[ni+2]-tb) <= tolerance * 3) {
        visited[n] = 1;
        stack.push(n);
      }
    }
  }

  layerCtx.putImageData(layerImgData, 0, 0);
}

function drawShape(ctx, tool, s, e, color, size, opacity, fill) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  const dx = e.x - s.x, dy = e.y - s.y;

  if (tool === 'line') {
    ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
  } else if (tool === 'arrow') {
    const angle = Math.atan2(dy, dx);
    const hl = Math.max(size * 4, 16);
    ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x - hl * Math.cos(angle - 0.4), e.y - hl * Math.sin(angle - 0.4));
    ctx.lineTo(e.x - hl * Math.cos(angle + 0.4), e.y - hl * Math.sin(angle + 0.4));
    ctx.closePath(); ctx.fill();
  } else if (tool === 'rect') {
    fill ? ctx.fillRect(s.x, s.y, dx, dy) : ctx.strokeRect(s.x, s.y, dx, dy);
  } else if (tool === 'circle') {
    const cx = (s.x + e.x) / 2, cy = (s.y + e.y) / 2;
    const rx = Math.max(Math.abs(dx) / 2, 1), ry = Math.max(Math.abs(dy) / 2, 1);
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    fill ? ctx.fill() : ctx.stroke();
  }
  ctx.restore();
}

// ─── component ───────────────────────────────────────────────────────────────

const DrawingCanvas = forwardRef(function DrawingCanvas(
  { layers, activeLayerId, tool, color, brushSize, brushOpacity = 1, fillShapes = false,
    initialLayerData, onStrokeEnd, onColorPick },
  ref
) {
  const displayRef = useRef(null);
  const previewRef = useRef(null);
  const layerMapRef = useRef(new Map());

  // Always-current refs (avoid stale closures in pointer handlers)
  const layersRef = useRef(layers);
  const activeRef = useRef(activeLayerId);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(brushSize);
  const opacRef = useRef(brushOpacity);
  const fillRef = useRef(fillShapes);

  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { activeRef.current = activeLayerId; }, [activeLayerId]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { sizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { opacRef.current = brushOpacity; }, [brushOpacity]);
  useEffect(() => { fillRef.current = fillShapes; }, [fillShapes]);

  const drawing = useRef(false);
  const shapeStart = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const rafRef = useRef(null);

  // Text tool state
  const [textPos, setTextPos] = useState(null); // { pctX, pctY, canvasX, canvasY }

  // ── composite ──────────────────────────────────────────────────────────────
  const composite = useCallback(() => {
    const dc = displayRef.current; if (!dc) return;
    const ctx = dc.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    for (const layer of layersRef.current) {
      if (!layer.visible) continue;
      const lc = layerMapRef.current.get(layer.id); if (!lc) continue;
      ctx.save(); ctx.globalAlpha = layer.opacity; ctx.drawImage(lc, 0, 0); ctx.restore();
    }
  }, []);

  const scheduleComposite = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => { composite(); rafRef.current = null; });
  }, [composite]);

  // ── init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    for (const layer of layers) {
      const lc = document.createElement('canvas'); lc.width = W; lc.height = H;
      layerMapRef.current.set(layer.id, lc);
    }
    if (initialLayerData && Object.keys(initialLayerData).length > 0) {
      let done = 0; const entries = Object.entries(initialLayerData);
      for (const [id, dataUrl] of entries) {
        const lc = layerMapRef.current.get(Number(id));
        if (!lc || !dataUrl) { if (++done === entries.length) composite(); continue; }
        const img = new Image();
        img.onload = () => { lc.getContext('2d').drawImage(img, 0, 0); if (++done === entries.length) composite(); };
        img.onerror = () => { if (++done === entries.length) composite(); };
        img.src = dataUrl;
      }
    } else {
      const bg = layerMapRef.current.get(layers[0]?.id);
      if (bg) { const ctx = bg.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
      composite();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    for (const layer of layers) {
      if (!layerMapRef.current.has(layer.id)) {
        const lc = document.createElement('canvas'); lc.width = W; lc.height = H;
        layerMapRef.current.set(layer.id, lc);
      }
    }
    scheduleComposite();
  }, [layers, scheduleComposite]);

  // ── utils ─────────────────────────────────────────────────────────────────
  const getPos = (e) => {
    const rect = displayRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top)  * (H / rect.height),
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const saveUndo = useCallback(() => {
    const lc = layerMapRef.current.get(activeRef.current); if (!lc) return;
    undoStack.current.push({ id: activeRef.current, data: lc.getContext('2d').getImageData(0, 0, W, H) });
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  // ── pointer handlers ──────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    displayRef.current?.setPointerCapture(e.pointerId);
    const pos = getPos(e);

    // Eyedropper
    if (toolRef.current === 'eyedropper') {
      const dc = displayRef.current;
      const pixel = dc.getContext('2d').getImageData(Math.round(pos.x), Math.round(pos.y), 1, 1).data;
      onColorPick?.(rgbToHex(pixel[0], pixel[1], pixel[2]));
      return;
    }

    // Flood fill
    if (toolRef.current === 'fill') {
      saveUndo();
      const dc = displayRef.current;
      const lc = layerMapRef.current.get(activeRef.current); if (!lc) return;
      floodFill(dc.getContext('2d'), lc.getContext('2d'), pos.x, pos.y, colorRef.current, opacRef.current);
      composite();
      onStrokeEnd?.();
      return;
    }

    // Text
    if (toolRef.current === 'text') {
      const rect = displayRef.current.getBoundingClientRect();
      setTextPos({
        pctX: (pos.x / W) * 100,
        pctY: (pos.y / H) * 100,
        canvasX: pos.x,
        canvasY: pos.y,
        screenFontSize: sizeRef.current * 4 * (rect.width / W),
      });
      return;
    }

    // Shapes
    if (SHAPE_TOOLS.has(toolRef.current)) {
      saveUndo(); shapeStart.current = pos; drawing.current = true; return;
    }

    // Freehand pen / eraser
    saveUndo(); drawing.current = true;
    const lc = layerMapRef.current.get(activeRef.current); if (!lc) return;
    const ctx = lc.getContext('2d');
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  }, [saveUndo, composite, onStrokeEnd, onColorPick]);

  const onPointerMove = useCallback((e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const pos = getPos(e);

    if (SHAPE_TOOLS.has(toolRef.current) && shapeStart.current) {
      const pc = previewRef.current; if (!pc) return;
      const pctx = pc.getContext('2d');
      pctx.clearRect(0, 0, W, H);
      drawShape(pctx, toolRef.current, shapeStart.current, pos, colorRef.current, sizeRef.current, opacRef.current, fillRef.current);
      return;
    }

    const lc = layerMapRef.current.get(activeRef.current); if (!lc) return;
    const ctx = lc.getContext('2d');
    const { x, y, pressure } = pos;
    ctx.lineWidth = sizeRef.current * (0.4 + pressure * 0.6);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (toolRef.current === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)'; ctx.globalAlpha = 1;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = colorRef.current; ctx.globalAlpha = opacRef.current;
    }
    ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
    scheduleComposite();
  }, [scheduleComposite]);

  const onPointerUp = useCallback((e) => {
    if (!drawing.current) return;
    drawing.current = false;
    displayRef.current?.releasePointerCapture(e?.pointerId);

    if (SHAPE_TOOLS.has(toolRef.current) && shapeStart.current) {
      const pos = getPos(e);
      const lc = layerMapRef.current.get(activeRef.current);
      if (lc) drawShape(lc.getContext('2d'), toolRef.current, shapeStart.current, pos, colorRef.current, sizeRef.current, opacRef.current, fillRef.current);
      shapeStart.current = null;
      previewRef.current?.getContext('2d').clearRect(0, 0, W, H);
      composite(); onStrokeEnd?.(); return;
    }

    const lc = layerMapRef.current.get(activeRef.current);
    if (lc) {
      const ctx = lc.getContext('2d');
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.beginPath();
    }
    onStrokeEnd?.();
  }, [composite, onStrokeEnd]);

  // ── text commit ───────────────────────────────────────────────────────────
  const commitText = useCallback((text) => {
    if (text && textPos) {
      const lc = layerMapRef.current.get(activeRef.current);
      if (lc) {
        saveUndo();
        const ctx = lc.getContext('2d');
        const fs = sizeRef.current * 4;
        ctx.font = `bold ${fs}px sans-serif`;
        ctx.fillStyle = colorRef.current;
        ctx.globalAlpha = opacRef.current;
        ctx.fillText(text, textPos.canvasX, textPos.canvasY + fs);
        ctx.globalAlpha = 1;
        composite(); onStrokeEnd?.();
      }
    }
    setTextPos(null);
  }, [textPos, saveUndo, composite, onStrokeEnd]);

  // ── imperative handle ─────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    undo() {
      const last = undoStack.current.pop(); if (!last) return;
      const lc = layerMapRef.current.get(last.id); if (!lc) return;
      redoStack.current.push({ id: last.id, data: lc.getContext('2d').getImageData(0, 0, W, H) });
      lc.getContext('2d').putImageData(last.data, 0, 0); composite();
    },
    redo() {
      const last = redoStack.current.pop(); if (!last) return;
      const lc = layerMapRef.current.get(last.id); if (!lc) return;
      undoStack.current.push({ id: last.id, data: lc.getContext('2d').getImageData(0, 0, W, H) });
      lc.getContext('2d').putImageData(last.data, 0, 0); composite();
    },
    flatten() {
      const fc = document.createElement('canvas'); fc.width = W; fc.height = H;
      const fctx = fc.getContext('2d'); fctx.fillStyle = '#fff'; fctx.fillRect(0, 0, W, H);
      for (const layer of layersRef.current) {
        if (!layer.visible) continue;
        const lc = layerMapRef.current.get(layer.id); if (!lc) continue;
        fctx.save(); fctx.globalAlpha = layer.opacity; fctx.drawImage(lc, 0, 0); fctx.restore();
      }
      return fc.toDataURL('image/png');
    },
    getLayerData() {
      const data = {};
      for (const [id, lc] of layerMapRef.current) data[id] = lc.toDataURL();
      return data;
    },
    removeLayer(id) { layerMapRef.current.delete(id); composite(); },
    clearLayer(id) {
      const lc = layerMapRef.current.get(id);
      if (lc) { lc.getContext('2d').clearRect(0, 0, W, H); composite(); }
    },
  }), [composite]);

  const cursor = tool === 'eraser' ? 'cell'
    : tool === 'eyedropper' ? 'crosshair'
    : tool === 'fill' ? 'cell'
    : tool === 'text' ? 'text'
    : 'crosshair';

  const canvasStyle = { display: 'block', width: '100%', aspectRatio: `${W}/${H}`, touchAction: 'none' };

  return (
    <div style={{ position: 'relative', width: '100%', lineHeight: 0, cursor, boxShadow: '0 6px 30px rgba(0,0,0,0.6)' }}>
      <canvas ref={displayRef} width={W} height={H} style={canvasStyle}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerLeave={onPointerUp} />

      {/* Shape preview overlay */}
      <canvas ref={previewRef} width={W} height={H}
        style={{ ...canvasStyle, position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />

      {/* Text input overlay */}
      {textPos && (
        <div style={{
          position: 'absolute',
          left: `${textPos.pctX}%`, top: `${textPos.pctY}%`,
          transform: 'translate(-4px, 0)',
          zIndex: 10,
        }}>
          <input
            autoFocus
            placeholder="텍스트 입력 후 Enter"
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: '2px solid #f97316',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: `${Math.round(textPos.screenFontSize)}px`,
              color: color,
              fontWeight: 'bold',
              fontFamily: 'sans-serif',
              outline: 'none',
              minWidth: '80px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') commitText(e.target.value);
              if (e.key === 'Escape') setTextPos(null);
              e.stopPropagation();
            }}
            onBlur={e => commitText(e.target.value)}
          />
        </div>
      )}
    </div>
  );
});

export default DrawingCanvas;
