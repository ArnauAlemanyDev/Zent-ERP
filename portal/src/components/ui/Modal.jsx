export default function Modal({ open, onClose, title, children, footer, width = 500 }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="card anim-fade-up" 
        style={{ width, maxWidth: '90vw', padding: 0, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-dim)' }}>×</button>
        </div>
        
        <div style={{ padding: 24, maxHeight: '70vh', overflow: 'auto' }}>
          {children}
        </div>

        {footer && (
          <div style={{ padding: '16px 24px', background: '#fafafa', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
