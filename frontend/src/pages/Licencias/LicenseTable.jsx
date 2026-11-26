import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AddModal from './AddModal';
import EditModal from './EditModal';
import ViewModal from './ViewModal';
import { Badge, Modal, SearchBar } from '../../components/ui';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
const PAGE_SIZE = 50;

function LicenseTable({ tipo, auth }) {
  const [licenses, setLicenses]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [search, setSearch]               = useState('');
  const [fechaFilter, setFechaFilter]     = useState('');
  const [page, setPage]                   = useState(1);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [editingItem, setEditingItem]     = useState(null);
  const [viewItem, setViewItem]           = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [sortField, setSortField]         = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');

  const headers = { Authorization: `Bearer ${auth.token}` };

  const fetchLicenses = useCallback(async () => {
    setLoading(true); setError('');
    try {
      let url = `${API_BASE_URL}/licencias/${tipo}`;
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (fechaFilter.trim()) params.append('fecha', fechaFilter.trim());
      if (params.toString()) url += `?${params.toString()}`;
      const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${auth.token}`, 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      const data = await response.json();
      setLicenses(data); setPage(1);
    } catch (err) {
      setError(`Error de conexión (${API_BASE_URL}). Detalle: ${err.message}`);
    } finally { setLoading(false); }
  }, [tipo, search, fechaFilter, auth.token]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/licencias/${tipo}/${deleteTarget.id}`, { headers });
      setDeleteTarget(null); fetchLicenses();
    } catch { alert('Error al eliminar la licencia.'); }
    finally { setDeleting(false); }
  };

  const isStock = (lic) => !lic.cliente || lic.cliente.trim() === '';
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try { const d = new Date(dateStr); if (isNaN(d)) return null; return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' }); }
    catch { return null; }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <span className="sort-icon inactive">↕</span>;
    return <span className="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const sortedLicenses = [...licenses].sort((a, b) => {
    let valA = a[sortField] ?? '', valB = b[sortField] ?? '';
    if (sortField === 'id') { valA = Number(valA); valB = Number(valB); }
    else { valA = String(valA).toLowerCase(); valB = String(valB).toLowerCase(); }
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedLicenses.length / PAGE_SIZE));
  const paginated  = sortedLicenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const stockCount = licenses.filter(isStock).length;
  const assignedCount = licenses.length - stockCount;
  const hasFilters = search.trim() || fechaFilter.trim();

  return (
    <div className="table-container">
      <div className="toolbar" style={{ padding: '16px 20px' }}>
        <div className="toolbar-left" style={{ gap: 12 }}>
          <SearchBar
            placeholder="Buscar por cliente o clave…"
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            style={{ width: 280 }}
          />
          <input
            type="date"
            value={fechaFilter}
            onChange={(e) => { setFechaFilter(e.target.value); setPage(1); }}
            className="input-date"
            style={{ height: 36, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 10px', fontSize: 13 }}
          />
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFechaFilter(''); }}>
              ✕
            </button>
          )}
        </div>
        <div className="toolbar-right">
          <button className="btn btn-ghost btn-sm" onClick={fetchLicenses}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
            Actualizar
          </button>
          {auth.role === 'admin' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ padding: '8px 16px' }}>
              + Añadir licencia
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="state-box"><div className="spinner" /> Cargando...</div>
      ) : error ? (
        <div className="state-box state-error">{error} <button className="btn btn-ghost btn-sm" onClick={fetchLicenses}>Reintentar</button></div>
      ) : (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-id sortable" onClick={() => handleSort('id')}>ID {renderSortIcon('id')}</th>
                  <th className="col-cliente sortable" onClick={() => handleSort('cliente')}>Cliente {renderSortIcon('cliente')}</th>
                  <th className="col-version sortable" onClick={() => handleSort('version')}>Versión {renderSortIcon('version')}</th>
                  <th className="col-clave sortable" onClick={() => handleSort('clave')}>Clave {renderSortIcon('clave')}</th>
                  <th className="col-fecha sortable" onClick={() => handleSort('fecha')}>Fecha {renderSortIcon('fecha')}</th>
                  <th className="col-acciones"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={6} className="empty-cell">{hasFilters ? 'No se encontraron licencias con esos filtros.' : 'No hay licencias registradas.'}</td></tr>
                ) : paginated.map((lic) => {
                  const stock = isStock(lic);
                  const rowClass = ['clickable-row', stock ? 'row-stock' : '', lic.defectuosa ? 'row-defective' : ''].filter(Boolean).join(' ');
                  return (
                    <tr key={lic.id} className={rowClass} onClick={() => setViewItem(lic)}>
                      <td className="col-id">{lic.id}</td>
                      <td className="col-cliente">{stock ? <Badge value="stock" /> : lic.cliente}</td>
                      <td className="col-version">{lic.version && <Badge value="version" customLabel={lic.version} className="badge-accent" />}</td>
                      <td className="col-clave"><code className="clave-code">{lic.clave}</code></td>
                      <td className="col-fecha">{formatDate(lic.fecha) || <span className="text-muted">—</span>}</td>
                      <td className="col-acciones">
                        <div className="actions-wrapper">
                          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setEditingItem(lic); }}>Editar</button>
                          {auth.role === 'admin' && <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(lic); }}>Eliminar</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Anterior</button>
              <span className="page-info">Página {page} de {totalPages} <span className="page-count">({licenses.length} resultados)</span></span>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Siguiente →</button>
            </div>
          )}
        </>
      )}

      {showAddModal && <AddModal tipo={tipo} auth={auth} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchLicenses(); }} />}
      {editingItem && <EditModal tipo={tipo} license={editingItem} auth={auth} onClose={() => setEditingItem(null)} onSuccess={() => { setEditingItem(null); fetchLicenses(); }} />}
      {viewItem && <ViewModal license={viewItem} tipoLabel={tipo === 'office' ? 'Office' : 'Windows'} onClose={() => setViewItem(null)} />}

      {deleteTarget && (
        <Modal 
          open={!!deleteTarget} 
          onClose={() => setDeleteTarget(null)} 
          title="Confirmar eliminación"
          width={400}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Eliminar licencia'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 3, height: 14, background: 'var(--red)', borderRadius: 4 }} />
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>Acción irreversible</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
              ¿Estás seguro de que quieres eliminar la licencia <strong>#{deleteTarget.id}</strong> del sistema?
            </p>
            <div style={{ padding: '12px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>
              {deleteTarget.clave}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default LicenseTable;
