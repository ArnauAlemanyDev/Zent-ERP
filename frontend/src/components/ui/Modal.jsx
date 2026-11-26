import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer, width = 520 }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ 
        maxWidth: width, 
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-hi)',
        border: '1px solid var(--border-lo)',
        overflow: 'hidden'
      }}>
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-lo)' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</h2>
          <button className="modal-close-btn" onClick={onClose} style={{ fontSize: 20, opacity: 0.5 }}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'block', padding: '24px' }}>
          {children}
        </div>
        {footer && (
          <div className="modal-actions" style={{ padding: '16px 24px', background: '#fcfcfd', borderTop: '1px solid var(--border-lo)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
