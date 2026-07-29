import { useRef, useState, useEffect, useCallback } from 'react';
import { Pen, Eraser, Trash2, Undo2 } from 'lucide-react';

export default function SketchCanvas({ onExport, initialDataUrl, fillHeight = false }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(5);
  const isDrawing = useRef(false);
  const historyRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialDataUrl;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const saveSnapshot = useCallback(() => {
    historyRef.current.push(canvasRef.current.toDataURL());
    if (historyRef.current.length > 40) historyRef.current.shift();
  }, []);

  const exportCanvas = useCallback(() => {
    onExport?.(canvasRef.current.toDataURL('image/png'));
  }, [onExport]);

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    saveSnapshot();
    isDrawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [saveSnapshot]);

  const onPointerMove = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y, pressure } = getPos(e);
    ctx.lineWidth = size * (0.4 + pressure * 0.6);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [tool, color, size]);

  const onPointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const ctx = canvasRef.current.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    exportCanvas();
  }, [exportCanvas]);

  const undo = useCallback(() => {
    if (!historyRef.current.length) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const prev = historyRef.current.pop();
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      exportCanvas();
    };
    img.src = prev;
  }, [exportCanvas]);

  const clear = useCallback(() => {
    saveSnapshot();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    exportCanvas();
  }, [saveSnapshot, exportCanvas]);

  const canvasProps = {
    ref: canvasRef,
    width: 512,
    height: 512,
    className: 'cursor-crosshair touch-none bg-white',
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave: onPointerUp,
  };

  const toolbar = (
    <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
      <Btn active={tool === 'pen'} onClick={() => setTool('pen')} title="펜"><Pen size={13} /></Btn>
      <Btn active={tool === 'eraser'} onClick={() => setTool('eraser')} title="지우개"><Eraser size={13} /></Btn>
      <input type="color" value={color} onChange={e => setColor(e.target.value)} title="색상"
        className="w-8 h-8 rounded border-2 border-black cursor-pointer p-0.5 bg-white flex-shrink-0" />
      <div className="flex items-center gap-1 text-xs text-neutral-500">
        <span>굵기</span>
        <input type="range" min={1} max={40} value={size}
          onChange={e => setSize(Number(e.target.value))}
          className="w-20 accent-orange-500" />
        <span className="w-5 text-right">{size}</span>
      </div>
      <Btn active={false} onClick={undo} title="실행취소"><Undo2 size={13} /></Btn>
      <Btn active={false} onClick={clear} title="전체지우기"><Trash2 size={13} /></Btn>
    </div>
  );

  if (fillHeight) {
    return (
      <div className="flex flex-col h-full gap-2">
        {toolbar}
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
          <canvas {...canvasProps}
            className="max-w-full max-h-full aspect-square cursor-crosshair touch-none bg-white border-2 border-neutral-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {toolbar}
      <canvas {...canvasProps}
        className="w-full aspect-square border-2 border-black rounded cursor-crosshair touch-none bg-white block" />
    </div>
  );
}

function Btn({ active, onClick, title, children }) {
  return (
    <button onClick={onClick} title={title}
      className={`w-8 h-8 flex items-center justify-center rounded border-2 border-black flex-shrink-0 transition-colors ${active ? 'bg-orange-500 text-white' : 'bg-white text-black hover:bg-orange-50'}`}>
      {children}
    </button>
  );
}
