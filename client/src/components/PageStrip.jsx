import { Plus, Trash2 } from 'lucide-react';

export default function PageStrip({ pages, activePage, onSelect, onAdd, onDelete }) {
  return (
    <div
      className="flex-shrink-0 flex flex-col overflow-hidden"
      style={{ width: '60px', background: '#383838', borderRight: '1px solid #222' }}
    >
      {/* Scrollable thumbnail list */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center gap-1.5" style={{ padding: '8px 6px' }}>
        {pages.map((page, i) => (
          <Thumb key={i} page={page} index={i} active={activePage === i} canDelete={pages.length > 1}
            onSelect={() => onSelect(i)} onDelete={() => onDelete(i)} />
        ))}
      </div>

      {/* Add page button */}
      <button
        onClick={onAdd}
        title="페이지 추가"
        style={{
          flexShrink: 0, height: '36px', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderTop: '1px solid #222', background: 'transparent',
          color: '#666', cursor: 'pointer', border: 'none',
          transition: 'color 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#4a4a4a'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.background = 'transparent'; }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function Thumb({ page, index, active, canDelete, onSelect, onDelete }) {
  return (
    <div
      onClick={onSelect}
      title={`페이지 ${index + 1}`}
      style={{
        position: 'relative', width: '100%',
        aspectRatio: '3/4',
        borderRadius: '2px', overflow: 'hidden',
        cursor: 'pointer', flexShrink: 0,
        border: active ? '2px solid #f97316' : '2px solid #555',
        boxSizing: 'border-box',
        transition: 'border-color 0.1s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = '#888'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#555'; }}
    >
      {page.thumbnail ? (
        <img src={page.thumbnail} alt={`${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '10px', color: '#ccc', fontWeight: 900 }}>{index + 1}</span>
        </div>
      )}

      {/* Page number badge */}
      <div style={{
        position: 'absolute', top: '2px', left: '2px',
        width: '14px', height: '14px',
        background: 'rgba(0,0,0,0.75)', color: '#fff',
        fontSize: '8px', fontWeight: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '1px',
      }}>
        {index + 1}
      </div>

      {/* AI result dot */}
      {page.aiResult && (
        <div style={{
          position: 'absolute', top: '2px', right: '2px',
          width: '6px', height: '6px', borderRadius: '50%',
          background: '#f97316',
        }} />
      )}

      {/* Delete on hover */}
      {canDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{
            position: 'absolute', bottom: '2px', right: '2px',
            width: '14px', height: '14px',
            background: '#dc2626', color: '#fff',
            border: 'none', borderRadius: '2px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', opacity: 0,
          }}
          className="group-hover-show"
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
        >
          <Trash2 size={8} />
        </button>
      )}
    </div>
  );
}
