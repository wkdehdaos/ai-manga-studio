import { forwardRef, useRef, useEffect, useImperativeHandle, useCallback } from 'react';
import DrawingCanvas from './DrawingCanvas';

const BASE_W = 600;

const WebtoonView = forwardRef(function WebtoonView({
  pages,
  activePage,
  setActivePage,
  tool,
  color,
  brushSize,
  brushOpacity,
  fillShapes,
  zoom,
  setZoom,
  onThumbnailUpdate,
  onColorPick,
}, ref) {
  const containerRef = useRef(null);
  const canvasRefs = useRef([]);
  const pageDivRefs = useRef([]);
  const thumbTimers = useRef([]);
  const prevLength = useRef(pages.length);

  useImperativeHandle(ref, () => ({
    scrollToPage(idx) {
      pageDivRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    undo()  { canvasRefs.current[activePage]?.undo(); },
    redo()  { canvasRefs.current[activePage]?.redo(); },
    flatten()      { return canvasRefs.current[activePage]?.flatten(); },
    flattenAll()   {
      return canvasRefs.current.map((r, i) => ({ index: i, dataUrl: r?.flatten() ?? null }));
    },
    getLayerData() { return canvasRefs.current[activePage]?.getLayerData(); },
    removeLayer(id){ canvasRefs.current[activePage]?.removeLayer(id); },
    clearLayer(id) { canvasRefs.current[activePage]?.clearLayer(id); },
  }), [activePage]);

  // Auto-scroll when a page is appended
  useEffect(() => {
    if (pages.length > prevLength.current) {
      setTimeout(() => {
        pageDivRefs.current[pages.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
    prevLength.current = pages.length;
  }, [pages.length]);

  // Ctrl+Wheel → zoom
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const handler = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(z => parseFloat(Math.max(0.25, Math.min(4, z + (e.deltaY > 0 ? -0.1 : 0.1))).toFixed(2)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [setZoom]);

  // IntersectionObserver: track active page
  useEffect(() => {
    const container = containerRef.current; if (!container) return;
    const ratios = new Map();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        ratios.set(Number(entry.target.dataset.idx), entry.intersectionRatio);
      }
      let max = -1, best = -1;
      for (const [idx, r] of ratios) { if (r > max) { max = r; best = idx; } }
      if (best >= 0 && max > 0.05) setActivePage(best);
    }, { root: container, threshold: [0, 0.05, 0.25, 0.5, 0.75, 1] });

    pageDivRefs.current.filter(Boolean).forEach(d => {
      ratios.set(Number(d.dataset.idx), 0); observer.observe(d);
    });
    return () => observer.disconnect();
  }, [pages.length, setActivePage]);

  const handleStrokeEnd = useCallback((idx) => {
    clearTimeout(thumbTimers.current[idx]);
    thumbTimers.current[idx] = setTimeout(() => {
      const url = canvasRefs.current[idx]?.flatten();
      if (url) onThumbnailUpdate(idx, url);
    }, 400);
  }, [onThumbnailUpdate]);

  const canvasW = Math.round(BASE_W * zoom);

  return (
    <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', background: '#505050' }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: `${Math.round(40 * zoom)}px 24px ${Math.round(80 * zoom)}px`,
        gap: `${Math.round(32 * zoom)}px`,
        minWidth: `${canvasW + 48}px`,
      }}>
        {pages.map((page, i) => (
          <div
            key={i}
            ref={el => pageDivRefs.current[i] = el}
            data-idx={i}
            style={{
              position: 'relative', width: `${canvasW}px`, flexShrink: 0,
              outline: activePage === i ? '2px solid #f97316' : '2px solid transparent',
              outlineOffset: '4px', transition: 'outline-color 0.15s',
            }}
          >
            <div style={{
              position: 'absolute',
              top: `${Math.round(-24 * Math.max(zoom, 0.5))}px`, left: 0,
              fontSize: `${Math.round(11 * Math.max(zoom, 0.6))}px`,
              fontWeight: 700, color: activePage === i ? '#f97316' : '#777',
              transition: 'color 0.15s', userSelect: 'none', whiteSpace: 'nowrap',
            }}>
              {i + 1} / {pages.length}
            </div>

            <DrawingCanvas
              ref={el => canvasRefs.current[i] = el}
              layers={page.layers}
              activeLayerId={page.activeLayerId}
              tool={tool} color={color} brushSize={brushSize} brushOpacity={brushOpacity}
              fillShapes={fillShapes}
              initialLayerData={page.layerData}
              onStrokeEnd={() => handleStrokeEnd(i)}
              onColorPick={onColorPick}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

export default WebtoonView;
