import { Plus, Trash2 } from 'lucide-react';

export default function MangaPage({ panels, activeIndex, onSelect, onAdd, onDelete }) {
  return (
    <aside className="w-44 flex-shrink-0 flex flex-col bg-neutral-900 border-r-2 border-neutral-800 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 flex-shrink-0">
        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">만화 페이지</span>
        <button
          onClick={onAdd}
          title="패널 추가"
          className="w-5 h-5 rounded bg-neutral-700 hover:bg-orange-500 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
        >
          <Plus size={11} />
        </button>
      </div>

      {/* Scrollable manga page — white paper with stacked panels */}
      <div className="flex-1 overflow-y-auto p-2">
        <div
          className="bg-white mx-auto shadow-[4px_4px_0px_rgba(0,0,0,0.6)]"
          style={{ border: '3px solid #111' }}
        >
          {panels.map((panel, i) => (
            <PanelThumb
              key={i}
              panel={panel}
              index={i}
              active={activeIndex === i}
              isLast={i === panels.length - 1}
              canDelete={panels.length > 1}
              onSelect={() => onSelect(i)}
              onDelete={() => onDelete(i)}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function PanelThumb({ panel, index, active, isLast, canDelete, onSelect, onDelete }) {
  const displaySrc = panel.imageUrl || panel.sketchDataUrl;

  return (
    <div
      onClick={onSelect}
      className="relative cursor-pointer group select-none"
      style={{
        borderBottom: isLast ? 'none' : '2.5px solid #111',
        outline: active ? '3px solid #f97316' : 'none',
        outlineOffset: '-2px',
        position: 'relative',
        zIndex: active ? 1 : 0,
      }}
    >
      {/* 3:4 aspect ratio (portrait manga panel) */}
      <div className="w-full" style={{ paddingBottom: '133%', position: 'relative' }}>
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{ background: '#fff' }}
        >
          {displaySrc ? (
            <img
              src={displaySrc}
              alt={`컷 ${index + 1}`}
              className="w-full h-full object-cover"
              style={{ opacity: panel.imageUrl ? 1 : 0.45 }}
            />
          ) : (
            <span className="font-black select-none" style={{ fontSize: '1.8rem', color: '#e5e7eb' }}>
              {index + 1}
            </span>
          )}

          {/* Active ring */}
          {active && (
            <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 3px #f97316' }} />
          )}

          {/* Panel number badge */}
          <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-black text-white text-[10px] font-black flex items-center justify-center leading-none">
            {index + 1}
          </div>

          {/* AI done dot */}
          {panel.imageUrl && (
            <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-orange-500" title="AI 완성" />
          )}

          {/* Delete on hover */}
          {canDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-red-600 text-white rounded-sm opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <Trash2 size={9} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
