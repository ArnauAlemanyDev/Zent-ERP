import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Badge, Button, Input, Modal, EmptyState, Spinner, PageHeader, SearchBar, Tabs } from '../../components/ui';
import TicketPrintLabel from '../../components/TicketPrintLabel';

const ESTADOS = ['todos', 'abierto', 'en_progreso', 'cerrado', 'cancelado'];
const PRIORIDADES_OPT = [
  { value: 'baja', label: 'Baja' }, { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' }, { value: 'urgente', label: 'Urgente' },
];

export default function Tickets() {
  const params = useParams();
  const id = params.id || params['*'];
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltro] = useState('todos');
  const [selected, setSelected] = useState(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalImprimir, setModalImprimir] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [dispositivos, setDisp] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savingTecnico, setSavingTecnico] = useState(false);
  const [nuevoTecnico, setNuevoTecnico] = useState('');
  const [form, setForm] = useState({
    cliente_id: '', dispositivo_id: '', tecnico_id: '',
    titulo: '', descripcion: '', prioridad: 'media',
  });
  const [tipoTicket, setTipoTicket] = useState('internos');

  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('desc');
  const [fechaFilter, setFechaFilter] = useState('');

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
    setPage(1);
  };
  const renderSortIcon = (field) => {
    if (sortField !== field) return <span className="sort-icon inactive">↕</span>;
    return <span className="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  // Función real de impresión
  const ejecutarImpresion = () => {
    window.print();
    setModalImprimir(false);
  };

  // Función para abrir la vista previa
  const handlePreviewImpresion = () => {
    setModalImprimir(true);
  };
  useEffect(() => { cargar(); cargarAuxiliares(); }, []);

  // Si viene de URL con ID, selecciona ese ticket
  useEffect(() => {
    if (id && tickets.length > 0) {
      const ticket = tickets.find(t => t.id == parseInt(id));
      if (ticket) setSelected(ticket);
    }
  }, [id, tickets]);

  // Al abrir el detalle, sincroniza el selector de técnico
  useEffect(() => {
    if (selected) setNuevoTecnico(selected.tecnico_id ?? '');
  }, [selected?.id]);

  async function cargar() {
    setLoading(true);
    try {
      const data = await api.get('/tickets');
      const ticketsData = Array.isArray(data) ? data : data.data || [];

      const ticketsConMetadatos = ticketsData.map(t => {
        let metadatos = {};
        if (t.metadatos) {
          try { metadatos = JSON.parse(t.metadatos); }
          catch (e) { metadatos = {}; }
        }
        return { ...t, metadatos };
      });

      setTickets(ticketsConMetadatos);
      return ticketsConMetadatos;
    } catch (e) { console.error(e); return []; }
    finally { setLoading(false); }
  }

  async function cargarAuxiliares() {
    try {
      const [c, d, u] = await Promise.all([
        api.get('/clientes'),
        api.get('/dispositivos'),
        api.get('/auth/usuarios'),
      ]);
      setClientes(Array.isArray(c) ? c : c.data || []);
      setDisp(Array.isArray(d) ? d : d.data || []);
      setTecnicos(Array.isArray(u) ? u : u.data || []);
    } catch (e) { console.error(e); }
  }

  async function handleCrear(imprimir = false) {
    if (!form.cliente_id || !form.titulo || !form.descripcion) return;
    setSaving(true);
    try {
      const nuevoTicket = await api.post('/tickets', {
        ...form,
        cliente_id: parseInt(form.cliente_id),
        dispositivo_id: form.dispositivo_id ? parseInt(form.dispositivo_id) : undefined,
        tecnico_id: form.tecnico_id ? parseInt(form.tecnico_id) : undefined,
      });
      setModalNuevo(false);
      setForm({ cliente_id: '', dispositivo_id: '', tecnico_id: '', titulo: '', descripcion: '', prioridad: 'media' });
      const nuevaLista = await cargar();

      const ticketCompleto = nuevaLista.find(t => t.id === nuevoTicket.id);
      if (ticketCompleto) {
        setSelected(ticketCompleto);
        if (imprimir) {
          // Abrir la vista previa automáticamente en vez de imprimir a ciegas
          setModalImprimir(true);
        }
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleActualizarEstado(ticket, nuevoEstado) {
    try {
      await api.put(`/tickets/${ticket.id}`, { estado: nuevoEstado });
      cargar();
      if (selected?.id === ticket.id) setSelected(p => ({ ...p, estado: nuevoEstado }));
    } catch (e) { console.error(e); }
  }

  async function handleAsignarTecnico() {
    setSavingTecnico(true);
    try {
      const tecnico_id = nuevoTecnico ? parseInt(nuevoTecnico) : null;
      await api.put(`/tickets/${selected.id}`, { tecnico_id });
      const tec = tecnicos.find(t => t.id == nuevoTecnico);
      setSelected(p => ({ ...p, tecnico_id, tecnico_nombre: tec?.nombre || null }));
      await cargar();
    } catch (e) { console.error(e); }
    finally { setSavingTecnico(false); }
  }

  const filtrados = (tickets || []).filter(t => {
    if (!t) return false;
    const matchSearch = `${t.titulo || ''} ${t.cliente_nombre || ''} ${t.id || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || (t.estado || 'abierto') === filtroEstado;
    const matchFecha = !fechaFilter || (t.fecha_creacion && t.fecha_creacion.startsWith(fechaFilter));
    return matchSearch && matchEstado && matchFecha;
  });

  const ticketsInternos = filtrados.filter(t => t.metadatos?.origen !== 'externo');
  const ticketsExternos = filtrados.filter(t => t.metadatos?.origen === 'externo');
  const dispDelCliente = dispositivos.filter(d => d.cliente_id == form.cliente_id);
  const ticketsFiltrados = tipoTicket === 'internos' ? ticketsInternos : ticketsExternos;

  const tecnicoSinCambio = nuevoTecnico == (selected?.tecnico_id ?? '');

  const sorted = [...ticketsFiltrados].sort((a, b) => {
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
    <div className="zent-module zent-module--tickets" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>
      
      <PageHeader section="tickets" title="Tickets de soporte" />

      <div className="zent-module-tabs" style={{ padding: '0 24px' }}>
        <Tabs
          tabs={[{ id: 'internos', label: 'Internos' }, { id: 'externos', label: 'Externos' }]}
          active={tipoTicket}
          onChange={setTipoTicket}
        />
      </div>

      <main className="main-content">
        <div className="table-container">

          {/* TOOLBAR */}
          <div className="toolbar" style={{ padding: '16px 20px' }}>
            <div className="toolbar-left" style={{ gap: 12 }}>
              <SearchBar
                placeholder="Buscar ticket…"
                value={search}
                onChange={(val) => { setSearch(val); setPage(1); }}
                style={{ width: 260 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="date"
                  value={fechaFilter}
                  onChange={(e) => { setFiltroFecha(e.target.value); setPage(1); }}
                  className="input-date"
                  style={{ height: 36, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 10px', fontSize: 12 }}
                />
              </div>
              {(search.trim() || fechaFilter?.trim()) && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFiltroFecha(''); }}>
                  ✕
                </button>
              )}
            </div>
            <div className="toolbar-right">
              <button className="btn btn-ghost btn-sm" onClick={cargar}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                Actualizar
              </button>
              {tipoTicket === 'internos' && (
                <button className="btn btn-primary btn-sm" onClick={() => setModalNuevo(true)} style={{ padding: '8px 16px' }}>
                  + Nuevo ticket
                </button>
              )}
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
                {{ todos: 'Todos', abierto: 'Abiertos', en_progreso: 'En progreso', cerrado: 'Cerrados', cancelado: 'Cancelados' }[e] || e}
              </button>
            ))}
          </div>

          {/* ESTADOS DE CARGA Y ERROR */}
          {loading ? (
            <div className="state-box"><div className="spinner" /> Cargando...</div>
          ) : ticketsFiltrados.length === 0 ? (
            <div className="state-box">No hay registros que coincidan.</div>
          ) : (
            <>
              {/* TABLA */}
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="col-id sortable" onClick={() => handleSort('id')}>ID {renderSortIcon('id')}</th>
                      <th className="sortable" onClick={() => handleSort('titulo')}>Título {renderSortIcon('titulo')}</th>
                      <th className="sortable" onClick={() => handleSort('cliente_nombre')}>Cliente {renderSortIcon('cliente_nombre')}</th>
                      <th className="sortable" onClick={() => handleSort('prioridad')}>Prioridad {renderSortIcon('prioridad')}</th>
                      <th className="sortable" onClick={() => handleSort('estado')}>Estado {renderSortIcon('estado')}</th>
                      <th className="sortable" onClick={() => handleSort('tecnico_nombre')}>Técnico {renderSortIcon('tecnico_nombre')}</th>
                      <th className="col-acciones"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(t => (
                      <tr key={t.id} className="clickable-row" onClick={() => setSelected(t)}>
                        <td className="col-id">#{t.id}</td>
                        <td style={{ fontWeight: 600 }}>{t.titulo}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{t.cliente_nombre || `#${t.cliente_id}`}</div>
                        </td>
                        <td style={{ width: 100 }}><Badge value={t.prioridad} /></td>
                        <td style={{ width: 120 }}><Badge value={t.estado || 'abierto'} /></td>
                        <td style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>{t.tecnico_nombre || ''}</td>
                        <td className="col-acciones">
                          <div className="actions-wrapper">
                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSelected(t); }}>Ver detalle</button>
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Ticket #${selected?.id}`} width={500}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 4 }} />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text)' }}>Detalles del ticket</span>
              <div style={{ flex: 1 }} />
              <Button variant="ghost" onClick={handlePreviewImpresion} style={{ padding: '6px 10px', fontSize: '11px' }}>
                🖨️ Imprimir etiqueta
              </Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', paddingTop: 16 }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--text)', textTransform: 'none' }}>{selected.titulo}</div>
                <p style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6, textTransform: 'none' }}>{selected.descripcion}</p>
              </div>

              {/* Metadatos */}
              {[
                ['Cliente', selected.cliente_nombre || `#${selected.cliente_id}`],
                ['Prioridad', null],
                ['Estado', null],
                ['Contacto', selected.metadatos?.contacto],
                ['Creado', selected.fecha_creacion ? new Date(selected.fecha_creacion).toLocaleString('es-ES') : '—'],
              ].filter(([k, v]) => v !== undefined && v !== null || k === 'Prioridad' || k === 'Estado').map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{k}</span>
                  {k === 'Prioridad' ? <Badge value={selected.prioridad} /> :
                    k === 'Estado' ? <Badge value={selected.estado} /> :
                      <span style={{ fontSize: 12.5, color: 'var(--text-main)', textTransform: 'none' }}>{v}</span>}
                </div>
              ))}

              {/* ── Asignar / cambiar técnico ── */}
              <div style={{ marginTop: 8, padding: '16px', background: '#f8f9fa', borderRadius: 'var(--radius)', border: '1px solid var(--border-lo)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 12, background: 'var(--accent)', borderRadius: 4 }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {selected.tecnico_id ? 'Técnico asignado' : 'Sin asignar'}
                  </div>
                </div>
                {selected.tecnico_nombre && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', marginBottom: 10, textTransform: 'none' }}>
                    👤 {selected.tecnico_nombre}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      as="select"
                      value={nuevoTecnico}
                      onChange={e => setNuevoTecnico(e.target.value)}
                      options={[
                        { value: '', label: 'Sin asignar' },
                        ...tecnicos.map(t => ({ value: t.id, label: `${t.nombre} (${t.rol})` }))
                      ]}
                    />
                  </div>
                  <Button
                    onClick={handleAsignarTecnico}
                    disabled={savingTecnico || tecnicoSinCambio}
                  >
                    {savingTecnico ? '…' : 'Guardar'}
                  </Button>
                </div>
              </div>

              {/* Cambiar estado */}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 12, background: 'var(--accent)', borderRadius: 4 }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Acciones rápidas</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['abierto', 'en_progreso', 'cerrado', 'cancelado'].filter(e => e !== selected.estado).map(e => (
                    <button key={e} onClick={() => handleActualizarEstado(selected, e)} className="btn btn-ghost btn-sm" style={{ textTransform: 'none' }}>
                      → {e.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal vista previa impresión */}
      <Modal open={modalImprimir} onClose={() => setModalImprimir(false)} title="Vista Previa de Etiqueta" width={400}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalImprimir(false)}>Cancelar</Button>
            <Button onClick={ejecutarImpresion}>Confirmar e Imprimir</Button>
          </>
        }
      >
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          background: '#f0f0f0',
          padding: '20px',
          borderRadius: '8px',
          border: '1px dashed #ccc'
        }}>
          {/* Mostramos el componente de impresión para que el usuario vea cómo quedará */}
          <TicketPrintLabel ticket={selected} />
        </div>
      </Modal>

      {/* Modal nuevo ticket */}
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo ticket" width={560}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalNuevo(false)}>Cancelar</Button>
            <Button onClick={() => handleCrear(false)} disabled={saving || !form.cliente_id || !form.titulo || !form.descripcion}>
              {saving ? 'Creando…' : 'Crear ticket'}
            </Button>
            <Button onClick={() => handleCrear(true)} disabled={saving || !form.cliente_id || !form.titulo || !form.descripcion}>
              {saving ? 'Creando…' : 'Crear e imprimir'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Cliente" as="select" value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value, dispositivo_id: '' }))} required
            options={[{ value: '', label: 'Selecciona un cliente…' }, ...clientes.map(c => ({ value: c.id, label: `${c.nombre} ${c.apellidos}` }))]}
          />
          {form.cliente_id && dispDelCliente.length > 0 && (
            <Input label="Dispositivo" as="select" value={form.dispositivo_id} onChange={e => setForm(p => ({ ...p, dispositivo_id: e.target.value }))}
              options={[{ value: '', label: 'Sin dispositivo específico' }, ...dispDelCliente.map(d => ({ value: d.id, label: `${d.marca} ${d.modelo}` }))]}
            />
          )}
          <Input label="Título" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} required placeholder="Describe el problema brevemente" />
          <Input label="Descripción" as="textarea" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} required placeholder="Detalles del problema…" rows={4} />
          <Input label="Prioridad" as="select" value={form.prioridad} onChange={e => setForm(p => ({ ...p, prioridad: e.target.value }))} options={PRIORIDADES_OPT} />
          {tecnicos.length > 0 && (
            <Input label="Técnico (opcional)" as="select" value={form.tecnico_id} onChange={e => setForm(p => ({ ...p, tecnico_id: e.target.value }))}
              options={[{ value: '', label: 'Sin asignar — se puede asignar después' }, ...tecnicos.map(t => ({ value: t.id, label: `${t.nombre} (${t.rol})` }))]}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
