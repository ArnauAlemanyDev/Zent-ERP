import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { Badge, Button, Input, Modal, EmptyState, Spinner, PageHeader, SearchBar, Tabs } from '../../components/ui';

// ── Formateador de tipo de dispositivo ─────────────────────────────────────
const TIPO_DISPOSITIVO_LABELS = {
  pc: 'PC',
  pc_sobremesa: 'PC Sobremesa',
  portatil: 'Portátil',
  servidor: 'Servidor',
  smartphone: 'Smartphone',
  tablet: 'Tablet',
  impresora: 'Impresora',
  otro: 'Otro',
};
function formatTipoDispositivo(tipo) {
  if (!tipo) return '—';
  return TIPO_DISPOSITIVO_LABELS[tipo]
    ?? tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/_/g, ' ');
}

// ── Lista de clientes ───────────────────────────────────────────────────────────────
function ClientesList() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', apellidos: '', telefono: '', cif_nif: '', observaciones: '', tipo: 'particular' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('particular');

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

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const data = await api.get('/clientes');
      setClientes(Array.isArray(data) ? data : data.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCrear() {
    if (!form.nombre) return;
    setSaving(true);
    try {
      await api.post('/clientes', form);
      setModalOpen(false);
      setForm({ nombre: '', apellidos: '', telefono: '', cif_nif: '', observaciones: '', tipo: 'particular' });
      cargar();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  const particulares = clientes.filter(c => c.tipo === 'particular');
  const empresas = clientes.filter(c => c.tipo === 'empresa');

  const filtrados = (tipoFiltro === 'particular' ? particulares
    : tipoFiltro === 'empresa' ? empresas
    : clientes
  ).filter(c =>
    `${c.nombre} ${c.apellidos} ${c.cif_nif || ''}`.toLowerCase().includes(search.toLowerCase())
  );

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
    <div className="zent-module zent-module--clientes" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>
      
      <PageHeader section="clientes" title="Directorio de Clientes" />

      <div className="zent-module-tabs" style={{ padding: '0 24px' }}>
        <Tabs
          tabs={[
            { id: 'particular', label: 'Particulares', count: particulares.length },
            { id: 'empresa', label: 'Empresas', count: empresas.length },
          ]}
          active={tipoFiltro}
          onChange={(t) => { setTipoFiltro(t); setPage(1); }}
        />
      </div>
      <main className="main-content">
        <div className="table-container">

          {/* TOOLBAR */}
          <div className="toolbar" style={{ padding: '16px 20px' }}>
            <div className="toolbar-left" style={{ gap: 12 }}>
              <SearchBar
                placeholder="Buscar cliente por nombre o CIF…"
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
              <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)} style={{ padding: '8px 16px' }}>
                + Nuevo cliente
              </button>
            </div>
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
                      <th className="sortable" onClick={() => handleSort('nombre')}>Nombre {renderSortIcon('nombre')}</th>
                      <th className="sortable" onClick={() => handleSort('cif_nif')}>CIF/NIF {renderSortIcon('cif_nif')}</th>
                      <th className="sortable" onClick={() => handleSort('fecha_registro')}>Alta {renderSortIcon('fecha_registro')}</th>
                      <th className="col-acciones"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(c => (
                      <tr key={c.id} className="clickable-row" onClick={() => navigate(`/clientes/${c.id}`)}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text)' }}>{c.nombre} {c.apellidos}</div>
                          {c.observaciones && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{c.observaciones.slice(0, 70)}{c.observaciones.length > 70 ? '...' : ''}</div>}
                        </td>
                        <td className="mono" style={{ fontSize: 12, color: 'var(--text-sub)' }}>{c.cif_nif || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-sub)' }}>{c.fecha_registro ? new Date(c.fecha_registro).toLocaleDateString('es-ES') : '—'}</td>
                        <td className="col-acciones">
                          <div className="actions-wrapper">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${c.id}`); }}>Ver Ficha</Button>
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

      {/* Modal nuevo cliente */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo cliente"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving || !form.nombre}>
              {saving ? 'Guardando…' : 'Crear cliente'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ padding: '8px 12px', background: 'var(--red-lo)', border: '1px solid var(--red)', borderRadius: 8, fontSize: 12.5, color: 'var(--red)' }}>{error}</div>}
          <Input label="Tipo de cliente" as="select" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
            options={[
              { value: 'particular', label: 'Particular' },
              { value: 'empresa', label: 'Empresa' },
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Nombre y apellidos" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required placeholder="Nombre del cliente" />
            <Input label="Teléfono" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="Número de contacto" />
          </div>
          <Input label="CIF / NIF" value={form.cif_nif} onChange={e => setForm(p => ({ ...p, cif_nif: e.target.value }))} placeholder="Documento identificativo" />
          <Input label="Observaciones" as="textarea" value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Notas sobre el cliente…" />
        </div>
      </Modal>
    </div>
  );
}

// ── Ficha de cliente ───────────────────────────────────────────────────────
function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [dispositivos, setDisp] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [albaranes, setAlbaranes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('datos');
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Modal nuevo dispositivo
  const [modalDisp, setModalDisp] = useState(false);
  const [formDisp, setFormDisp] = useState({ tipo_dispositivo: 'portatil', marca: '', modelo: '', numero_serie: '', notas_internas: '' });

  // Modal detalle dispositivo
  const [dispSeleccionado, setDispSeleccionado] = useState(null);

  useEffect(() => { cargar(); }, [id]);

  async function cargar() {
    setLoading(true);
    try {
      const [c, d, t, a] = await Promise.all([
        api.get(`/clientes/${id}`),
        api.get('/dispositivos').then(r => (Array.isArray(r) ? r : r.data || []).filter(d => d.cliente_id == id)),
        api.get(`/tickets/cliente/${id}`),
        api.get(`/albaranes/cliente/${id}`),
      ]);
      const clienteData = c.data || c;
      setCliente(clienteData);
      setDisp(d);
      setTickets(Array.isArray(t) ? t : t.data || []);
      setAlbaranes(Array.isArray(a) ? a : a.data || []);
      setForm(formatClienteForm(clienteData));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleGuardar() {
    setSaving(true);
    try {
      await api.put(`/clientes/${id}`, form);
      setEditando(false);
      cargar();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleCrearDisp() {
    try {
      await api.post('/dispositivos', { ...formDisp, cliente_id: parseInt(id) });
      setModalDisp(false);
      setFormDisp({ tipo_dispositivo: 'portatil', marca: '', modelo: '', numero_serie: '', notas_internas: '' });
      cargar();
    } catch (e) { console.error(e); }
  }

  const formatClienteForm = (data) => ({
    ...data,
    nombre: `${data.nombre || ''} ${data.apellidos || ''}`.trim(),
    telefono: data.telefono || ''
  });

  const TABS = [
    { id: 'datos', label: 'Datos generales' },
    { id: 'dispositivos', label: 'Dispositivos', count: dispositivos.length },
    { id: 'tickets', label: 'Tickets', count: tickets.length },
    { id: 'albaranes', label: 'Albaranes', count: albaranes.length },
  ];

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spinner size={28} /></div>;
  if (!cliente) return <EmptyState icon="◎" title="Cliente no encontrado" action={<Button onClick={() => navigate('/clientes')}>Volver</Button>} />;

  const whatsappPhone = cliente.telefono ? String(cliente.telefono).replace(/\D/g, '') : '';
  const whatsappMessage = encodeURIComponent('Hola, te escribo de Zent');
  const whatsappUrl = whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${whatsappMessage}` : undefined;

  return (
    <div className="zent-module zent-module--clientes" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>
      
      <PageHeader section="clientes" subtitle="Consulta y actualiza la ficha y los equipos asociados."
        title={`${cliente.nombre} ${cliente.apellidos}`} 
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={() => navigate('/clientes')}>← Volver</Button>
            {!editando
              ? <Button onClick={() => setEditando(true)}>Editar ficha</Button>
              : <>
                <Button variant="ghost" onClick={() => { setEditando(false); setForm(formatClienteForm(cliente)); }}>Cancelar</Button>
                <Button onClick={handleGuardar} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</Button>
              </>
            }
          </div>
        }
      />

      <div className="zent-module-tabs" style={{ padding: '0 24px' }}>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>
      <main className="main-content">

        {/* ── Datos generales ── */}
        {tab === 'datos' && (
          <div className="table-container">
            <div className="toolbar" style={{ padding: '16px 20px' }}>
              <div className="toolbar-left">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 4 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text)' }}>Información de contacto</span>
                </div>
              </div>
              <div className="toolbar-right">
                <div className="stats-inline">
                  <span className="stat-badge">ID: <strong>#{cliente.id}</strong></span>
                  <span className="stat-badge">Alta: <strong>{cliente.fecha_registro ? new Date(cliente.fecha_registro).toLocaleDateString('es-ES') : '—'}</strong></span>
                </div>
              </div>
            </div>
            <div className="zent-contact-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="zent-contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
                <Input label="Nombre y apellidos" value={form.nombre || ''} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} disabled={!editando} />
                <Input label="Teléfono" value={form.telefono || ''} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} disabled={!editando} />
                <Input label="CIF / NIF" value={form.cif_nif || ''} onChange={e => setForm(p => ({ ...p, cif_nif: e.target.value }))} disabled={!editando} />
                <Input label="Tipo de cliente" as={editando ? 'select' : 'text'} value={form.tipo || 'particular'}
                  onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                  disabled={!editando}
                  options={editando ? [{ value: 'particular', label: 'Particular' }, { value: 'empresa', label: 'Empresa' }] : undefined}
                />
              </div>
              <Input label="Observaciones" as="textarea" value={form.observaciones || ''} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} disabled={!editando} rows={4} />
            </div>
          </div>
        )}

        {/* ── Dispositivos ── */}
        {tab === 'dispositivos' && (
          <div className="table-container">
            <div className="toolbar" style={{ padding: '16px 20px' }}>
              <div className="toolbar-left">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 4 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text)' }}>Parque de dispositivos</span>
                </div>
              </div>
              <div className="toolbar-right">
                <button className="btn btn-primary btn-sm" onClick={() => setModalDisp(true)}>+ Añadir dispositivo</button>
              </div>
            </div>
            {dispositivos.length === 0 ? (
              <div className="state-box">Este cliente no tiene dispositivos registrados.</div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Dispositivo</th>
                      <th>Tipo</th>
                      <th>Nº Serie</th>
                      <th>Estado</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispositivos.map(d => (
                      <tr key={d.id} className="clickable-row" onClick={() => setDispSeleccionado(d)}>
                        <td style={{ fontWeight: 500 }}>{d.marca} {d.modelo}</td>
                        <td style={{ textTransform: 'none', color: 'var(--text-sub)', fontSize: 'var(--fs-sm)' }}>{formatTipoDispositivo(d.tipo_dispositivo)}</td>
                        <td className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>{d.numero_serie || '—'}</td>
                        <td><Badge value={d.estado} /></td>
                        <td style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.notas_internas || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tickets ── */}
        {tab === 'tickets' && (
          <div className="table-container">
            <div className="toolbar">
              <div className="toolbar-left">
                <div className="stats-inline">
                  <span className="stat-badge">Total: <strong>{tickets.length}</strong></span>
                </div>
              </div>
            </div>
            {tickets.length === 0 ? (
              <div className="state-box">Este cliente no tiene tickets registrados.</div>
            ) : (
              <div className="table-scroll">
                <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: 52 }} />
                    <col />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 120 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="col-id">ID</th>
                      <th>Título</th>
                      <th style={{ textAlign: 'right' }}>Prioridad</th>
                      <th style={{ textAlign: 'right' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(t => (
                      <tr key={t.id} className="clickable-row" onClick={() => navigate(`/tickets/${t.id}`)}>
                        <td className="col-id">#{t.id}</td>
                        <td>
                          <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</div>
                          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.descripcion?.slice(0, 120)}{t.descripcion?.length > 120 ? '…' : ''}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}><Badge value={t.prioridad} /></td>
                        <td style={{ textAlign: 'right' }}><Badge value={t.estado} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Albaranes ── */}
        {tab === 'albaranes' && (
          <div className="table-container">
            <div className="toolbar">
              <div className="toolbar-left">
                <div className="stats-inline">
                  <span className="stat-badge">Total: <strong>{albaranes.length}</strong></span>
                </div>
              </div>
            </div>
            {albaranes.length === 0 ? (
              <div className="state-box">Este cliente no tiene albaranes registrados.</div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Albarán</th>
                      <th>Dispositivo</th>
                      <th>Entrada</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {albaranes.map(a => (
                      <tr key={a.id} className="clickable-row" onClick={() => navigate(`/albaranes/${a.id}`)}>
                        <td className="mono" style={{ fontSize: 'var(--fs-xs)', fontWeight: 500 }}>{a.numero_albaran}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{a.marca} {a.modelo}</div>
                          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginTop: 2 }}>{a.descripcion_averia?.slice(0, 60)}</div>
                        </td>
                        <td style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>{a.fecha_recepcion ? new Date(a.fecha_recepcion).toLocaleDateString('es-ES') : '—'}</td>
                        <td><Badge value={a.estado} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal detalle dispositivo */}
      <Modal
        open={!!dispSeleccionado}
        onClose={() => setDispSeleccionado(null)}
        title={`${dispSeleccionado?.marca || ''} ${dispSeleccionado?.modelo || ''}`}
      >
        {dispSeleccionado && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Bloque info: tipo + serie */}
            <div style={{ background: '#f8f9fa', border: '1px solid var(--border-lo)', borderRadius: 'var(--radius)', padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'none', fontWeight: 500 }}>
                {formatTipoDispositivo(dispSeleccionado.tipo_dispositivo)}
              </div>
              {dispSeleccionado.numero_serie && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', marginTop: 8, background: 'var(--accent-lo)', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>
                  S/N: {dispSeleccionado.numero_serie}
                </div>
              )}
            </div>

            {/* Estado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Estado</span>
              <Badge value={dispSeleccionado.estado} />
            </div>

            {/* Notas internas */}
            {dispSeleccionado.notas_internas && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 3, height: 12, background: 'var(--accent)', borderRadius: 4 }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notas internas</div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6, textTransform: 'none', whiteSpace: 'pre-wrap' }}>
                  {dispSeleccionado.notas_internas}
                </p>
              </div>
            )}

          </div>
        )}
      </Modal>

      {/* Modal nuevo dispositivo */}
      <Modal open={modalDisp} onClose={() => setModalDisp(false)} title="Añadir dispositivo"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalDisp(false)}>Cancelar</Button>
            <Button onClick={handleCrearDisp}>Añadir</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Tipo" as="select" value={formDisp.tipo_dispositivo} onChange={e => setFormDisp(p => ({ ...p, tipo_dispositivo: e.target.value }))}
            options={[
              { value: 'pc', label: 'PC Sobremesa' }, { value: 'portatil', label: 'Portátil' },
              { value: 'servidor', label: 'Servidor' }, { value: 'tablet', label: 'Tablet' },
              { value: 'smartphone', label: 'Smartphone' }, { value: 'impresora', label: 'Impresora' },
              { value: 'otro', label: 'Otro' },
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Marca" value={formDisp.marca} onChange={e => setFormDisp(p => ({ ...p, marca: e.target.value }))} placeholder="Dell, HP, Apple…" />
            <Input label="Modelo" value={formDisp.modelo} onChange={e => setFormDisp(p => ({ ...p, modelo: e.target.value }))} placeholder="XPS 13, Pavilion…" />
          </div>
          <Input label="Número de serie" value={formDisp.numero_serie} onChange={e => setFormDisp(p => ({ ...p, numero_serie: e.target.value }))} placeholder="SN123456" />
          <Input label="Notas internas" as="textarea" value={formDisp.notas_internas} onChange={e => setFormDisp(p => ({ ...p, notas_internas: e.target.value }))} placeholder="Estado, accesorios…" />
        </div>
      </Modal>

      {whatsappUrl && (
        <a
          className="zent-whatsapp"
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer noopener"
          title="Abrir chat de WhatsApp"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            zIndex: 20,
            background: 'var(--red)',
            color: '#fff',
            borderRadius: 999,
            padding: '14px 18px',
            minWidth: 56,
            minHeight: 56,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            fontWeight: 700,
            boxShadow: '0 18px 32px rgba(0,0,0,0.18)',
            letterSpacing: '0.01em'
          }}
        >
          WhatsApp
        </a>
      )}
    </div>
  );
}

// ── Router interno de Clientes ─────────────────────────────────────────────
export default function Clientes() {
  return (
    <Routes>
      <Route index element={<ClientesList />} />
      <Route path=":id" element={<ClienteDetalle />} />
    </Routes>
  );
}
