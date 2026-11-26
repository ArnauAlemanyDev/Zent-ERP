import React, { useState } from 'react';
import axios from 'axios';
import CustomSelect from './CustomSelect';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const OFFICE_VERSIONS = ['Office 2019 Pro Plus', 'Office 2021 Pro Plus', 'Office 2024 Pro Plus LTSC', 'Microsoft Office 2024 Pro Plus LTSC'];
const WINDOWS_VERSIONS = ['Windows 10 Pro', 'Windows 11 Pro', 'Windows Server'];
const CUSTOM_VERSION_VAL = '__CUSTOM__';

function parseDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
  } catch { return ''; }
}

function EditModal({ tipo, license, auth, onClose, onSuccess }) {
  const today = new Date().toISOString().split('T')[0];
  const isVersionInList = (v) => [...OFFICE_VERSIONS, ...WINDOWS_VERSIONS].includes(v);
  const initialIsCustom = license.version && !isVersionInList(license.version);

  const [cliente, setCliente] = useState(license.cliente || '');
  const [version, setVersion] = useState(initialIsCustom ? CUSTOM_VERSION_VAL : (license.version || (tipo === 'office' ? 'Office 2021 Pro Plus' : 'Windows 10 Pro')));
  const [customVersion, setCustomVersion] = useState(initialIsCustom ? license.version : '');
  const [fecha, setFecha] = useState(parseDate(license.fecha) || today);
  const [anotacion, setAnotacion] = useState(license.anotacion || '');
  const [defectuosa, setDefectuosa] = useState(license.defectuosa || false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${auth.token}` };
  const wasStock = !license.cliente || license.cliente.trim() === '';
  const tipoLabel = tipo === 'office' ? 'Office' : 'Windows';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const finalVersion = version === CUSTOM_VERSION_VAL ? customVersion.trim() : version;
      await axios.put(
        `${API_BASE_URL}/licencias/${tipo}/${license.id}`,
        { cliente: cliente.trim(), version: finalVersion, fecha: fecha || null, anotacion: anotacion.trim(), defectuosa },
        { headers }
      );
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar los cambios.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar licencia de {tipoLabel} <span className="modal-id">#{license.id}</span></h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Clave de licencia</label>
            <code className="clave-code">{license.clave}</code>
          </div>

          {wasStock && (
            <div className="alert alert-info">
              Esta licencia está actualmente en stock. Al guardar los datos del cliente quedará marcada como implantada.
            </div>
          )}

          <div className="form-group">
            <label htmlFor="edit-cliente">Cliente</label>
            <input id="edit-cliente" type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente o empresa" autoFocus />
          </div>

          <div className="form-group">
            <label htmlFor="edit-version">Versión</label>
            <CustomSelect options={tipo === 'office' ? OFFICE_VERSIONS : WINDOWS_VERSIONS} value={version} onChange={setVersion} customOptionLabel="+ Añadir versión propia..." customValue={CUSTOM_VERSION_VAL} />
          </div>

          {version === CUSTOM_VERSION_VAL && (
            <div className="form-group">
              <label htmlFor="edit-custom-version">Indica el nombre de la versión</label>
              <input id="edit-custom-version" type="text" value={customVersion} onChange={(e) => setCustomVersion(e.target.value)} placeholder="Ej: Windows 11 Enterprise LTSC" autoFocus />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="edit-fecha">Fecha de implantación</label>
            <input id="edit-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <span className="form-hint"></span>
          </div>

          <div className="form-group">
            <label>Estado de la licencia</label>
            <div className="status-toggle-group">
              <button type="button" className={`status-btn operative ${!defectuosa ? 'active' : ''}`} onClick={() => setDefectuosa(false)}>Operativa</button>
              <button type="button" className={`status-btn defective ${defectuosa ? 'active' : ''}`} onClick={() => setDefectuosa(true)}>Defectuosa</button>
            </div>
            <span className="form-hint"></span>
          </div>

          <div className="form-group">
            <label htmlFor="edit-anotacion">Anotaciones</label>
            <textarea id="edit-anotacion" value={anotacion} onChange={(e) => setAnotacion(e.target.value)} placeholder="Equipo, número de serie, observaciones..." rows={2} />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner-sm" /> Guardando...</> : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditModal;
