import { forwardRef, useRef, useEffect, useCallback, useImperativeHandle } from 'react';

const W = 600, H = 848;

const DrawingCanvas = forwardRef(function DrawingCanvas(
  { layers, activeLayerId, tool, color, brushSize, brushOpacity = 1, initialLayerData, onStrokeEnd },
  ref
) {
  const displayRef = useRef(null);
  const layerMapRef = useRef(new Map());
  const layersRef = useRef(layers);
  const activeRef = useRef(activeLayerId);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const brushOpacityRef = useRef(brushOpacity);
  const drawing = useRef(false);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { activeRef.current = activeLayerId; }, [activeLayerId]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { brushOpacityRef.current = brushOpacity; }, [brushOpacity]);

  const composite = useCallback(() => {
    const dc = displayRef.current;
    if (!dc) return;
    const ctx = dc.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    for (const layer of layersRef.current) {
      if (!layer.visible) continue;
      const lc = layerMapRef.current.get(layer.id);
      if (!lc) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(lc, 0, 0);
      ctx.restore();
    }
  }, []);

  const scheduleComposite = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      composite();
      rafRef.current = null;
    });
  }, [composite]);

  useEffect(() => {
    for (const layer of layers) {
      const lc = document.createElement('canvas');
      lc.width = W; lc.height = H;
      layerMapRef.current.set(layer.id, lc);
    }

    if (initialLayerData && Object.keys(initialLayerData).length > 0) {
      let done = 0;
      const entries = Object.entries(initialLayerData);
      for (const [id, dataUrl] of entries) {
        const lc = layerMapRef.current.get(Number(id));
        if (!lc || !dataUrl) { if (++done === entries.length) composite(); continue; }
        const img = new Image();
        img.onload = () => { lc.getContext('2d').drawImage(img, 0, 0); if (++done === entries.length) composite(); };
        img.onerror = () => { if (++done === entries.length) composite(); };
        img.src = dataUrl;
      }
    } else {
      const bgLc = layerMapRef.current.get(layers[0]?.id);
      if (bgLc) {
        const ctx = bgLc.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, W, H);
      }
      composite();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    for (const layer of layers) {
      if (!layerMapRef.current.has(layer.id)) {
        const lc = document.createElement('canvas');
        lc.width = W; lc.height = H;
        layerMapRef.current.set(layer.id, lc);
      }
    }
    scheduleComposite();
  }, [layers, scheduleComposite]);

  const getPos = (e) => {
    const dc = displayRef.current;
    const rect = dc.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height),
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const saveUndo = useCallback(() => {
    const lc = layerMapRef.current.get(activeRef.current);
    if (!lc) return;
    undoStack.current.push({ id: activeRef.current, data: lc.getContext('2d').getImageData(0, 0, W, H) });
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    displayRef.current?.setPointerCapture(e.pointerId);
    saveUndo();
    drawing.current = true;
    const lc = layerMapRef.current.get(activeRef.current);
    if (!lc) return;
    const { x, y } = getPos(e);
    const ctx = lc.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [saveUndo]);

  const onPointerMove = useCallback((e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const lc = layerMapRef.current.get(activeRef.current);
    if (!lc) return;
    const ctx = lc.getContext('2d');
    const { x, y, pressure } = getPos(e);
    ctx.lineWidth = brushSizeRef.current * (0.4 + pressure * 0.6);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (toolRef.current === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.globalAlpha = 1;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = colorRef.current;
      ctx.globalAlpha = brushOpacityRef.current;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    scheduleComposite();
  }, [scheduleComposite]);

  const onPointerUp = useCallback((e) => {
    if (!drawing.current) return;
    drawing.current = false;
    const lc = layerMapRef.current.get(activeRef.current);
    if (lc) {
      const ctx = lc.getContext('2d');
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.beginPath();
    }
    displayRef.current?.releasePointerCapture(e?.pointerId);
    onStrokeEnd?.();
  }, [onStrokeEnd]);

  useImperativeHandle(ref, () => ({
    undo() {
      const last = undoStack.current.pop();
      if (!last) return;
      const lc = layerMapRef.current.get(last.id);
      if (!lc) return;
      redoStack.current.push({ id: last.id, data: lc.getContext('2d').getImageData(0, 0, W, H) });
      lc.getContext('2d').putImageData(last.data, 0, 0);
      composite();
    },
    redo() {
      const last = redoStack.current.pop();
      if (!last) return;
      const lc = layerMapRef.current.get(last.id);
      if (!lc) return;
      undoStack.current.push({ id: last.id, data: lc.getContext('2d').getImageData(0, 0, W, H) });
      lc.getContext('2d').putImageData(last.data, 0, 0);
      composite();
    },
    flatten() {
      const fc = document.createElement('canvas');
      fc.width = W; fc.height = H;
      const fctx = fc.getContext('2d');
      fctx.fillStyle = '#fff';
      fctx.fillRect(0, 0, W, H);
      for (const layer of layersRef.current) {
        if (!layer.visible) continue;
        const lc = layerMapRef.current.get(layer.id);
        if (!lc) continue;
        fctx.save();
        fctx.globalAlpha = layer.opacity;
        fctx.drawImage(lc, 0, 0);
        fctx.restore();
      }
      return fc.toDataURL('image/png');
    },
    getLayerData() {
      const data = {};
      for (const [id, lc] of layerMapRef.current) {
        data[id] = lc.toDataURL();
      }
      return data;
    },
    removeLayer(id) {
      layerMapRef.current.delete(id);
      composite();
    },
    clearLayer(id) {
      const lc = layerMapRef.current.get(id);
      if (!lc) return;
      lc.getContext('2d').clearRect(0, 0, W, H);
      composite();
    },
  }), [composite]);

  return (
    <div style={{ position: 'relative', width: '100%', lineHeight: 0 }}>
      <canvas
        ref={displayRef}
        width={W}
        height={H}
        style={{
          display: 'block',
          width: '100%',
          aspectRatio: `${W}/${H}`,
          cursor: tool === 'eraser' ? 'cell' : 'crosshair',
          touchAction: 'none',
          boxShadow: '0 6px 30px rgba(0,0,0,0.6)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
    </div>
  );
});

export default DrawingCanvas;
