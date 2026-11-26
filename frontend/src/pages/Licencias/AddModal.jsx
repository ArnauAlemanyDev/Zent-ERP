import React, { useState } from 'react';
import axios from 'axios';
import CustomSelect from './CustomSelect';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const OFFICE_VERSIONS = ['Office 2019 Pro Plus', 'Office 2021 Pro Plus', 'Office 2024 Pro Plus LTSC', 'Microsoft Office 2024 Pro Plus LTSC'];
const WINDOWS_VERSIONS = ['Windows 10 Pro', 'Windows 11 Pro', 'Windows Server'];
const CUSTOM_VERSION_VAL = '__CUSTOM__';
const CLAVE_PATTERN = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;

function extractKeysFromText(content) {
  return content.split('\n').map(l => l.trim().toUpperCase()).filter(l => l && CLAVE_PATTERN.test(l));
}

async function extractKeysFromExcel(arrayBuffer) {
  // Load the spreadsheet parser only when an Excel file is selected.
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  const keys = [];
  for (const row of data) {
    if (row[0] && typeof row[0] === 'string') {
      const key = row[0].trim().toUpperCase();
      if (CLAVE_PATTERN.test(key)) keys.push(key);
    }
  }
  return keys;
}

async function readFileAsArray(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(new Uint8Array(e.target.result));
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

function AddModal({ tipo, auth, onClose, onSuccess }) {
  const [mode, setMode] = useState('single');
  const [clave, setClave] = useState('');
  const [version, setVersion] = useState(tipo === 'office' ? 'Office 2021 Pro Plus' : 'Windows 10 Pro');
  const [customVersion, setCustomVersion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [importVersion, setImportVersion] = useState(tipo === 'office' ? 'Office 2021 Pro Plus' : 'Windows 10 Pro');
  const [customImportVersion, setCustomImportVersion] = useState('');
  const [detectedKeys, setDetectedKeys] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importSummary, setImportSummary] = useState(null);

  const headers = { Authorization: `Bearer ${auth.token}` };
  const tipoLabel = tipo === 'office' ? 'Office' : 'Windows';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const claveClean = clave.trim().toUpperCase();
    if (!claveClean) { setError('La clave de licencia es obligatoria.'); return; }
    setLoading(true); setError('');
    try {
      const finalVersion = version === CUSTOM_VERSION_VAL ? customVersion.trim() : version;
      await axios.post(`${API_BASE_URL}/licencias/${tipo}`, { clave: claveClean, version: finalVersion }, { headers });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al añadir la licencia.');
    } finally { setLoading(false); }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'csv', 'xlsx'].includes(ext)) { setError('Solo se permiten archivos .txt, .csv o .xlsx'); return; }
    setError('');
    try {
      const keys = ext === 'xlsx'
        ? await extractKeysFromExcel(await readFileAsArray(file))
        : extractKeysFromText(await file.text());
      if (keys.length === 0) { setError('No se encontraron claves válidas en el archivo.'); return; }
      setDetectedKeys(keys); setImportSummary(null);
    } catch (err) { setError('Error al procesar el archivo: ' + err.message); }
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleImportConfirm = async () => {
    if (!detectedKeys.length) return;
    setImportLoading(true);
    setImportProgress({ current: 0, total: detectedKeys.length });
    const results = { success: 0, failed: 0, errors: [] };
    const batchSize = 5;
    for (let i = 0; i < detectedKeys.length; i += batchSize) {
      const batch = detectedKeys.slice(i, i + batchSize);
      const promises = batch.map(key =>
        axios.post(`${API_BASE_URL}/licencias/${tipo}`,
          { clave: key, version: importVersion === CUSTOM_VERSION_VAL ? customImportVersion.trim() : importVersion },
          { headers })
          .then(() => { results.success++; setImportProgress(prev => ({ ...prev, current: prev.current + 1 })); })
          .catch(err => { results.failed++; results.errors.push({ key, error: err.response?.data?.error || 'Error desconocido' }); setImportProgress(prev => ({ ...prev, current: prev.current + 1 })); })
      );
      await Promise.all(promises);
    }
    setImportLoading(false); setImportSummary(results);
    if (results.failed === 0) setTimeout(() => onSuccess(), 2000);
  };

  const resetImport = () => { setDetectedKeys([]); setImportSummary(null); setError(''); };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>+ Añadir licencia de {tipoLabel}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="mode-selector">
          <button type="button" className={`mode-btn ${mode === 'single' ? 'active' : ''}`} onClick={() => { setMode('single'); resetImport(); }}>Una licencia</button>
          <button type="button" className={`mode-btn ${mode === 'import' ? 'active' : ''}`} onClick={() => { setMode('import'); resetImport(); }}>Importar fichero</button>
        </div>

        {mode === 'single' && (
          <form onSubmit={handleSubmit} className="modal-body add-single-row">
            <div className="form-group">
              <label htmlFor="version">Versión</label>
              <CustomSelect options={tipo === 'office' ? OFFICE_VERSIONS : WINDOWS_VERSIONS} value={version} onChange={setVersion} customOptionLabel="+ Añadir versión propia..." customValue={CUSTOM_VERSION_VAL} />
            </div>
            {version === CUSTOM_VERSION_VAL && (
              <div className="form-group">
                <label htmlFor="custom-version">Indica el nombre de la versión</label>
                <input id="custom-version" type="text" value={customVersion} onChange={(e) => setCustomVersion(e.target.value)} placeholder="Ej: Windows 11 Enterprise LTSC" autoFocus />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="clave">Clave de licencia <span className="required">*</span></label>
              <input id="clave" type="text" value={clave} onChange={(e) => setClave(e.target.value.toUpperCase())} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" className="input-mono" autoFocus required spellCheck={false} />
              <span className="form-hint"></span>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="spinner-sm" /> Guardando...</> : '+ Añadir al stock'}
              </button>
            </div>
          </form>
        )}

        {mode === 'import' && (
          <div className="modal-body import-mode">
            {!detectedKeys.length && !importSummary ? (
              <>
                <div className="form-group">
                  <label>Versión para todas las licencias</label>
                  <CustomSelect options={tipo === 'office' ? OFFICE_VERSIONS : WINDOWS_VERSIONS} value={importVersion} onChange={setImportVersion} customOptionLabel="+ Añadir versión propia..." customValue={CUSTOM_VERSION_VAL} />
                </div>
                {importVersion === CUSTOM_VERSION_VAL && (
                  <div className="form-group">
                    <label>Indica el nombre de la versión</label>
                    <input type="text" value={customImportVersion} onChange={(e) => setCustomImportVersion(e.target.value)} placeholder="Ej: Office 2024 LTSC" autoFocus />
                  </div>
                )}
                <div className={`drop-zone ${dragActive ? 'active' : ''}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                  <div className="drop-zone-content">
                    <div className="drop-icon">📁</div>
                    <p className="drop-text">Arrastra aquí tu archivo o haz clic para seleccionar</p>
                    <p className="drop-hint">Formatos soportados: .txt, .csv, .xlsx</p>
                  </div>
                  <input type="file" accept=".txt,.csv,.xlsx" onChange={(e) => handleFileSelect(e.target.files?.[0])} style={{ display: 'none' }} id="file-input" />
                  <label htmlFor="file-input" className="drop-overlay"></label>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
              </>
            ) : importSummary ? (
              <div className="import-summary">
                <div className="summary-header"><h3>Resumen de importación</h3></div>
                <div className="summary-stats">
                  <div className="stat success"><div className="stat-number">{importSummary.success}</div><div className="stat-label">Importadas</div></div>
                  {importSummary.failed > 0 && <div className="stat error"><div className="stat-number">{importSummary.failed}</div><div className="stat-label">Fallidas</div></div>}
                </div>
                {importSummary.errors.length > 0 && (
                  <div className="error-details">
                    <h4>Errores detectados:</h4>
                    <ul className="error-list">
                      {importSummary.errors.slice(0, 5).map((err, idx) => <li key={idx}><strong>{err.key}:</strong> {err.error}</li>)}
                      {importSummary.errors.length > 5 && <li>... y {importSummary.errors.length - 5} más</li>}
                    </ul>
                  </div>
                )}
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={resetImport}>Importar otro archivo</button>
                  <button type="button" className="btn btn-primary" onClick={onClose}>Cerrar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="preview-header">
                  <h3>Previsualización ({detectedKeys.length} claves)</h3>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={resetImport}>Cargar otro archivo</button>
                </div>
                <div className="keys-preview">
                  <div className="keys-grid">
                    {detectedKeys.map((key, idx) => <div key={idx} className="key-item"><code>{key}</code></div>)}
                  </div>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={resetImport} disabled={importLoading}>Cancelar</button>
                  <button type="button" className="btn btn-primary" onClick={handleImportConfirm} disabled={importLoading}>
                    {importLoading ? <><span className="spinner-sm" /> Importando {importProgress.current}/{importProgress.total}...</> : `+ Importar ${detectedKeys.length} licencias`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AddModal;
