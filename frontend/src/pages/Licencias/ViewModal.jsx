import React, { useState } from 'react';

function ViewModal({ license, tipoLabel, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!license) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(license.clave);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '0000-00-00') return 'No definida';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d)) return 'Inválida';
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return 'No definida'; }
  };

  const isStock = !license.cliente || license.cliente.trim() === '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="view-header-info">
            <h2>Detalles de {tipoLabel} <span className="modal-id">#{license.id}</span></h2>
            <div className="view-header-badges">
              {isStock && <span className="badge-stock">Stock</span>}
              {license.defectuosa && <span className="badge-defective" style={{ padding: '4px 8px', fontSize: '11px' }}>Defectuosa</span>}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="modal-body view-main-layout">
          <div className="view-card">
            <div className="view-details-grid">
              <div className="view-data-group">
                <div className="view-card-title">Cliente</div>
                <div className="view-data-value">
                  {isStock ? <span className="text-muted">En existencias</span> : license.cliente}
                </div>
              </div>
              <div className="view-data-group">
                <div className="view-card-title">Fecha de Implantación</div>
                <div className="view-data-value">{formatDate(license.fecha)}</div>
              </div>
            </div>
          </div>

          <div className="view-card">
            <div className="view-data-group">
              <div className="view-card-title">Versión del Software</div>
              <div className="view-data-value">
                <span className="version-tag" style={{ fontSize: '14px' }}>{license.version || 'No especificada'}</span>
              </div>
            </div>
          </div>

          <div className="view-card">
            <div className="view-card-title">{copied ? '¡Copiado!' : 'Clave de Producto'}</div>
            <div className="clave-hero-box" onClick={handleCopyKey} style={{ cursor: 'pointer' }}>
              <code className="clave-code">{license.clave}</code>
            </div>
          </div>

          <div className="view-card">
            <div className="view-card-title">Observaciones / Equipo</div>
            <div className="view-notes-box">
              {license.anotacion || <span className="text-muted">Sin anotaciones registradas.</span>}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </div>
  );
}

export default ViewModal;
