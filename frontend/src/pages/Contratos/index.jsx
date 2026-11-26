import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge, Button, Input, Modal, EmptyState, Spinner, PageHeader, SearchBar, Tabs } from '../../components/ui';

const ESTADOS = ['todos', 'activo', 'pendiente', 'vencido'];
const TIPOS = [
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'soporte', label: 'Soporte' },
  { value: 'licencia', label: 'Licencia' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'otro', label: 'Otro' },
];
const PERIODICIDADES = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'puntual', label: 'Puntual' },
];

export default function Contratos() {
  const [contratos, setContratos]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filtroEstado, setFiltro]     = useState('todos');
  const [selected, setSelected]       = useState(null);
  const [modalNuevo, setModalNuevo]   = useState(false);
  const [clientes, setClientes]       = useState([]);
  const [saving, setSaving]           = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const [form, setForm] = useState({
    cliente_id: '', tipo_contrato: 'mantenimiento', descripcion: '',
    fecha_inicio: '', fecha_fin: '', importe: '', periodicidad: 'anual',
    renovacion_automatica: false, observaciones: '',
  });

  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
    setPage(1);
  };
  const renderSortIcon = (field) => {
    if (sortField !== field) return <span className="sort-icon inactive">↕</span>;
    return <span className="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  // Calcula días restantes para vencimiento
  function getDiasParaVencimiento(fechaFin) {
    if (!fechaFin) return null;
    const hoy = new Date();
    const fin = new Date(fechaFin);
    const diferencia = fin - hoy;
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  // Obtiene estado de vencimiento
  function getEstadoVencimiento(contrato) {
    if (!contrato.fecha_fin) return { tipo: 'ok', label: '', dias: null };
    const dias = getDiasParaVencimiento(contrato.fecha_fin);
    if (dias < 0) return { tipo: 'vencido', label: 'VENCIDO', dias };
    if (dias <= 30) return { tipo: 'proximo', label: `Vence en ${dias}d`, dias };
    return { tipo: 'ok', label: '', dias };
  }

  // Calcula fecha de fin automáticamente basada en periodicidad
  function calculateFechaFin(fechaInicio, periodicidad) {
    if (!fechaInicio || !periodicidad) return '';
    const inicio = new Date(fechaInicio);
    const fin = new Date(inicio);
    
    switch (periodicidad) {
      case 'mensual':
        fin.setMonth(fin.getMonth() + 1);
        break;
      case 'trimestral':
        fin.setMonth(fin.getMonth() + 3);
        break;
      case 'semestral':
        fin.setMonth(fin.getMonth() + 6);
        break;
      case 'anual':
        fin.setFullYear(fin.getFullYear() + 1);
        break;
      case 'puntual':
        return '';
      default:
        return '';
    }
    
    return fin.toISOString().split('T')[0];
  }

  useEffect(() => { cargar(); cargarClientes(); }, []);

  // Auto-calcula fecha de fin cuando cambian fecha_inicio o periodicidad
  useEffect(() => {
    if (form.fecha_inicio && form.periodicidad !== 'puntual') {
      const nuevaFechaFin = calculateFechaFin(form.fecha_inicio, form.periodicidad);
      if (nuevaFechaFin !== form.fecha_fin) {
        setForm(p => ({ ...p, fecha_fin: nuevaFechaFin }));
      }
    }
  }, [form.fecha_inicio, form.periodicidad]);

  async function cargar() {
    setLoading(true);
    try {
      const data = await api.get('/contratos');
      setContratos(Array.isArray(data) ? data : data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function cargarClientes() {
    try {
      const data = await api.get('/clientes');
      const clientesBrutos = Array.isArray(data) ? data : data.data || [];
      // Filtrar solo clientes válidos (que tengan ID)
      const clientesValidos = clientesBrutos.filter(c => c.id && c.nombre);
      if (clientesBrutos.length > clientesValidos.length) {
        console.warn('[cargarClientes] Clientes inválidos ignorados:', clientesBrutos.filter(c => !c.id || !c.nombre));
      }
      setClientes(clientesValidos);
    } catch (e) { 
      console.error('[cargarClientes Error]', e);
    }
  }

  async function handleCrear() {
    setErrorMsg('');
    if (!form.cliente_id || !form.tipo_contrato || !form.fecha_inicio) {
      const msg = `Campos requeridos: Cliente=${!!form.cliente_id}, Tipo=${!!form.tipo_contrato}, Inicio=${!!form.fecha_inicio}`;
      setErrorMsg(msg);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        cliente_id: parseInt(form.cliente_id),
        tipo_contrato: form.tipo_contrato,
        subtipo: 'contrato',
        descripcion: form.descripcion || null,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || null,
        importe: form.importe ? parseFloat(form.importe) : null,
        periodicidad: form.periodicidad,
        renovacion_automatica: form.renovacion_automatica ? 1 : 0,
        observaciones: form.observaciones || null,
      };
      
      
      await api.post('/contratos', payload);
      
      setModalNuevo(false);
      setForm({
        cliente_id: '', tipo_contrato: 'mantenimiento', descripcion: '',
        fecha_inicio: '', fecha_fin: '', importe: '', periodicidad: 'anual',
        renovacion_automatica: false, observaciones: '',
      });
      cargar();
    } catch (e) { 
      const errorMsg = e.message || 'Error desconocido';
      console.error('[handleCrear Error]', errorMsg, e);
      setErrorMsg(`Error: ${errorMsg}`);
    }
    finally { setSaving(false); }
  }

  async function handleEliminar(contrato) {
    if (!window.confirm(`¿Estás seguro de que quieres cancelar el contrato #${contrato.id}?`)) return;
    
    setSaving(true);
    try {
      await api.delete(`/contratos/${contrato.id}`);
      setSelected(null);
      cargar();
    } catch (e) { 
      console.error('[handleEliminar Error]', e);
      alert(`Error al cancelar contrato: ${e.message}`);
    }
    finally { setSaving(false); }
  }

  async function handleActualizarEstado(contrato, nuevoEstado) {
    try {
      await api.patch(`/contratos/${contrato.id}/estado`, { estado: nuevoEstado });
      cargar();
      if (selected?.id === contrato.id) setSelected(p => ({ ...p, estado: nuevoEstado }));
    } catch (e) { console.error(e); }
  }

  const filtrados = contratos.filter(c => {
    const matchSearch = `${c.tipo_contrato} ${c.cliente_nombre || ''} ${c.descripcion || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || (c.estado || 'pendiente') === filtroEstado;
    return matchSearch && matchEstado;
  });

  const sorted = [...filtrados].sort((a, b) => {
    let valA = a[sortField] ?? '', valB = b[sortField] ?? '';
    if (sortField === 'id') { valA = Number(valA); valB = Number(valB); }
    else { valA = String(valA).toLowerCase(); valB = String(valB).toLowerCase(); }
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="zent-module zent-module--contratos" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>
      
      <PageHeader section="contratos" title="Gestión de Contratos" />

      <div className="zent-module-tabs" style={{ padding: '0 24px' }}>
        <Tabs 
          tabs={[{ id: 'contratos', label: 'Contratos' }]} 
          active="contratos" 
          onChange={() => {}} 
        />
      </div>
      <main className="main-content">
        <div className="table-container">

          {/* TOOLBAR */}
          <div className="toolbar" style={{ padding: '16px 20px' }}>
            <div className="toolbar-left" style={{ gap: 12 }}>
              <SearchBar
                placeholder="Buscar contrato o cliente…"
                value={search}
                onChange={(val) => { setSearch(val); setPage(1); }}
                style={{ width: 280 }}
              />
              {search.trim() && (
                <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
            <div className="toolbar-right">
              <button className="btn btn-ghost btn-sm" onClick={cargar}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                Actualizar
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setErrorMsg(''); setModalNuevo(true); }} style={{ padding: '8px 16px' }}>
                + Nuevo contrato
              </button>
            </div>
          </div>

        {/* FILTRO ESTADOS PILLS */}
        <div className="filter-group">
          {ESTADOS.map(e => (
            <button
              key={e}
              onClick={() => { setFiltro(e); setPage(1); }}
              className={`filter-pill ${filtroEstado === e ? 'active' : ''}`}
                aria-pressed={filtroEstado === e}
            >
              {{ todos: 'Todos', activo: 'Activos', pendiente: 'Pendientes', vencido: 'Vencidos' }[e] || e}
            </button>
          ))}
        </div>

        {/* ESTADOS DE CARGA Y ERROR */}
        {loading ? (
          <div className="state-box"><div className="spinner" /> Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="state-box">No hay registros que coincidan.</div>
        ) : (
          <>
            {/* TABLA */}
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="col-id sortable" onClick={() => handleSort('id')}>ID {renderSortIcon('id')}</th>
                    <th className="sortable" onClick={() => handleSort('tipo_contrato')}>Tipo {renderSortIcon('tipo_contrato')}</th>
                    <th className="sortable" onClick={() => handleSort('cliente_nombre')}>Cliente {renderSortIcon('cliente_nombre')}</th>
                    <th className="sortable" onClick={() => handleSort('importe')}>Importe {renderSortIcon('importe')}</th>
                    <th className="sortable" onClick={() => handleSort('fecha_fin')}>Vencimiento {renderSortIcon('fecha_fin')}</th>
                    <th className="sortable" onClick={() => handleSort('estado')}>Estado {renderSortIcon('estado')}</th>
                    <th className="col-acciones"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(c => (
                    <tr key={c.id} className="clickable-row" onClick={() => setSelected(c)}>
                      <td className="col-id">#{c.id}</td>
                      <td style={{ fontWeight: 600 }}>{TIPOS.find(t => t.value === c.tipo_contrato)?.label || c.tipo_contrato}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{c.cliente_nombre || `#${c.cliente_id}`}</div>
                      </td>
                      <td className="mono" style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{c.importe ? `${c.importe}€` : ''}</td>
                      <td>
                        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>{c.fecha_fin ? new Date(c.fecha_fin).toLocaleDateString('es-ES') : ''}</div>
                        {(() => { const ev = getEstadoVencimiento(c); return ev.tipo !== 'ok' ? (
                          <div style={{ marginTop: 2 }}><Badge value={ev.tipo === 'vencido' ? 'vencido' : 'pendiente'} customLabel={ev.label} /></div>
                        ) : null; })()}
                      </td>
                      <td><Badge value={c.estado || 'pendiente'} /></td>
                      <td className="col-acciones">
                        <div className="actions-wrapper">
                          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSelected(c); }}>Ver detalle</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN */}
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Anterior</button>
              <span className="page-info">Página {page} de {totalPages} <span className="page-count">({sorted.length} resultados)</span></span>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Siguiente →</button>
            </div>
          </>
        )}
        </div>
      </main>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Contrato #${selected?.id}`} width={480}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 4 }} />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text)' }}>Detalles del contrato</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {(() => {
                const ev = getEstadoVencimiento(selected);
                return ev.tipo !== 'ok' && (
                  <div style={{ 
                    padding: '12px 16px', 
                    background: ev.tipo === 'vencido' ? 'var(--red-lo)' : 'var(--yellow-lo)', 
                    borderRadius: 8, 
                    border: `1px solid ${ev.tipo === 'vencido' ? 'var(--red)' : 'var(--yellow)'}`,
                    color: ev.tipo === 'vencido' ? 'var(--red)' : 'var(--yellow)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    marginBottom: 20
                  }}>
                    ⚠ {ev.tipo === 'vencido' ? `Contrato vencido hace ${Math.abs(ev.dias)} días` : `Este contrato vence en ${ev.dias} días`}
                  </div>
                );
              })()}

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text-main)', textTransform: 'none' }}>
                  {TIPOS.find(t => t.value === selected.tipo_contrato)?.label || selected.tipo_contrato}
                </div>
                {selected.descripcion && <p style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6, textTransform: 'none' }}>{selected.descripcion}</p>}
              </div>
              
              {/* Metadatos */}
              {[
                ['Cliente', selected.cliente_nombre || `#${selected.cliente_id}`],
                ['Importe', selected.importe ? `${selected.importe}€` : '—'],
                ['Periodicidad', PERIODICIDADES.find(p => p.value === selected.periodicidad)?.label || selected.periodicidad || '—'],
                ['Inicio', selected.fecha_inicio ? new Date(selected.fecha_inicio).toLocaleDateString('es-ES') : '—'],
                ['Fin', selected.fecha_fin ? new Date(selected.fecha_fin).toLocaleDateString('es-ES') : '—'],
                ['Estado', null],
                ['Renovación automática', selected.renovacion_automatica ? 'Sí' : 'No'],
                ['Creado', selected.fecha_creacion ? new Date(selected.fecha_creacion).toLocaleString('es-ES') : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{k}</span>
                  {k === 'Estado' ? <Badge value={selected.estado} /> :
                   <span style={{ fontSize: 12.5, color: 'var(--text-main)', textTransform: 'none' }}>{v}</span>}
                </div>
              ))}
              {selected.observaciones && (
                <div style={{ marginTop: 18, padding: '12px', background: 'var(--elevated)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-sub)', textTransform: 'none' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-main)' }}>Observaciones</div>
                  {selected.observaciones}
                </div>
              )}
              {/* Cambiar estado */}
              <div style={{ marginTop: 12, padding: 16, background: '#f8f9fa', border: '1px solid var(--border-lo)', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 12, background: 'var(--accent)', borderRadius: 4 }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Acciones rápidas</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['activo', 'pendiente', 'vencido'].filter(e => e !== selected.estado).map(e => (
                    <button key={e} onClick={() => handleActualizarEstado(selected, e)} className="btn btn-ghost btn-sm" style={{ textTransform: 'none' }}>
                      → {e}
                    </button>
                  ))}
                </div>
              </div>
              {/* Eliminar contrato */}
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
                <Button 
                  variant="danger" 
                  fullWidth 
                  onClick={() => handleEliminar(selected)} 
                  disabled={saving}
                >
                  {saving ? 'Cancelando…' : 'Cancelar contrato'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal nuevo contrato */}
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo contrato" width={560}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalNuevo(false)}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving || !form.cliente_id || !form.tipo_contrato || !form.fecha_inicio}>
              {saving ? 'Creando…' : 'Crear contrato'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {errorMsg && (
            <div className="alert alert-error" style={{ marginBottom: 14 }}>
              ⚠ {errorMsg}
            </div>
          )}
          <Input label="Cliente" as="select" value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))} required
            options={[{ value: '', label: 'Selecciona un cliente…' }, ...clientes.map(c => ({ value: c.id, label: `${c.nombre} ${c.apellidos}` }))]}
          />
          <Input label="Tipo de contrato" as="select" value={form.tipo_contrato} onChange={e => setForm(p => ({ ...p, tipo_contrato: e.target.value }))} required
            options={TIPOS}
          />
          <Input label="Descripción" as="textarea" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Detalles del contrato…" rows={3} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="Fecha de inicio" type="date" value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} required />
            <Input label="Fecha de fin" type="date" value={form.fecha_fin} onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="Importe" type="number" step="0.01" value={form.importe} onChange={e => setForm(p => ({ ...p, importe: e.target.value }))} placeholder="0.00" />
            <Input label="Periodicidad" as="select" value={form.periodicidad} onChange={e => setForm(p => ({ ...p, periodicidad: e.target.value }))} required
              options={PERIODICIDADES}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', background: 'var(--elevated)', borderRadius: 'var(--radius)' }}>
            <input type="checkbox" id="renovacion" checked={form.renovacion_automatica} onChange={e => setForm(p => ({ ...p, renovacion_automatica: e.target.checked }))} style={{ cursor: 'pointer' }} />
            <label htmlFor="renovacion" style={{ fontSize: 12, color: 'var(--text-main)', cursor: 'pointer' }}>Renovación automática</label>
          </div>
          <Input label="Observaciones" as="textarea" value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Notas adicionales…" rows={2} />
        </div>
      </Modal>
    </div>
  );
}
