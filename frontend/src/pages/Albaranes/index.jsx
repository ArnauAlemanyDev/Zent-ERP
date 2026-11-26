import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/client';
import { Badge, Button, Input, Modal, EmptyState, Spinner, PageHeader, SearchBar, Tabs } from '../../components/ui';

const ESTADOS_ALBARAN = ['recibido', 'en_reparacion', 'esperando_piezas', 'esperando_confirmacion_cliente', 'listo_para_recoger', 'entregado', 'cancelado'];
const ARTICULOS = ['portatil', 'pc_sobremesa', 'smartphone', 'tablet', 'impresora', 'servidor', 'otro'];
const BLOQUEOS = ['pin', 'patron', 'huella', 'facial', 'sin_bloqueo', 'otro'];

export default function Albaranes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const [albaranes, setAlbaranes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltro] = useState('todos');
  const [selected, setSelected] = useState(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savingResp, setSavingResp] = useState(false);
  const [nuevoResp, setNuevoResp] = useState('');
  const [form, setForm] = useState({
    cliente_id: '', articulo: 'portatil', marca: '', modelo: '',
    numero_serie: '', tipo_bloqueo: 'sin_bloqueo',
    descripcion_averia: '', notas_internas: '', presupuesto_estimado: '',
  });

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

  useEffect(() => { cargar(); cargarAuxiliares(); }, []);

  // Si viene de URL con ID, selecciona ese albarán
  useEffect(() => {
    if (id && albaranes.length > 0) {
      const albaran = albaranes.find(a => a.id == parseInt(id));
      if (albaran) setSelected(albaran);
    }
  }, [id, albaranes]);

  // Al abrir el detalle, prellena el selector de responsable
  useEffect(() => {
    if (selected) setNuevoResp(selected.usuario_responsable_id ?? '');
  }, [selected?.id]);

  async function cargar() {
    setLoading(true);
    try {
      const data = await api.get('/albaranes');
      setAlbaranes(Array.isArray(data) ? data : data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function cargarAuxiliares() {
    try {
      const [c, u] = await Promise.all([
        api.get('/clientes'),
        api.get('/auth/usuarios'),
      ]);
      setClientes(Array.isArray(c) ? c : c.data || []);
      setUsuarios(Array.isArray(u) ? u : u.data || []);
    } catch (e) { console.error(e); }
  }

  async function handleCrear() {
    if (!form.cliente_id || !form.marca || !form.modelo || !form.descripcion_averia) return;
    setSaving(true);
    try {
      await api.post('/albaranes', {
        ...form,
        cliente_id: parseInt(form.cliente_id),
        usuario_responsable_id: usuario.id,
        presupuesto_estimado: form.presupuesto_estimado ? parseFloat(form.presupuesto_estimado) : undefined,
      });
      setModalNuevo(false);
      setForm({ cliente_id: '', articulo: 'portatil', marca: '', modelo: '', numero_serie: '', tipo_bloqueo: 'sin_bloqueo', descripcion_averia: '', notas_internas: '', presupuesto_estimado: '' });
      cargar();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleCambioEstado(albaran, nuevoEstado) {
    try {
      await api.put(`/albaranes/${albaran.id}`, { estado: nuevoEstado });
      cargar();
      if (selected?.id === albaran.id) setSelected(p => ({ ...p, estado: nuevoEstado }));
    } catch (e) { console.error(e); }
  }

  async function handleCambioResponsable() {
    if (!nuevoResp || nuevoResp == selected.usuario_responsable_id) return;
    setSavingResp(true);
    try {
      await api.put(`/albaranes/${selected.id}`, { usuario_responsable_id: parseInt(nuevoResp) });
      const resp = usuarios.find(u => u.id == nuevoResp);
      setSelected(p => ({ ...p, usuario_responsable_id: parseInt(nuevoResp), usuario_responsable_nombre: resp?.nombre || p.usuario_responsable_nombre }));
      await cargar();
    } catch (e) { console.error(e); }
    finally { setSavingResp(false); }
  }

  const ESTADOS_FILTRO = ['todos', ...ESTADOS_ALBARAN];
  const filtrados = albaranes.filter(a => {
    const matchSearch = `${a.numero_albaran} ${a.marca} ${a.modelo} ${a.cliente_nombre || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || (a.estado || 'recibido') === filtroEstado;
    const matchFecha = !fechaFilter || (a.fecha_recepcion && a.fecha_recepcion.startsWith(fechaFilter));
    return matchSearch && matchEstado && matchFecha;
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

  const SIGUIENTE_ESTADO = {
    recibido: 'en_reparacion',
    en_reparacion: 'listo_para_recoger', esperando_piezas: 'en_reparacion',
    listo_para_recoger: 'entregado',
  };

  return (
    <div className="zent-module zent-module--albaranes" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>

      <PageHeader section="albaranes" title="Gestión de Albaranes" />

      <div className="zent-module-tabs" style={{ padding: '0 24px' }}>
        <Tabs
          tabs={[{ id: 'albaranes', label: 'Albaranes' }]}
          active="albaranes"
          onChange={() => { }}
        />
      </div>
      <main className="main-content">
        <div className="table-container">

          {/* TOOLBAR */}
          <div className="toolbar" style={{ padding: '16px 20px' }}>
            <div className="toolbar-left" style={{ gap: 12 }}>
              <SearchBar
                placeholder="Buscar albarán…"
                value={search}
                onChange={(val) => { setSearch(val); setPage(1); }}
                style={{ width: 260 }}
              />
              <input
                type="date"
                value={fechaFilter}
                onChange={(e) => { setFiltroFecha(e.target.value); setPage(1); }}
                className="input-date"
                style={{ height: 36, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 10px', fontSize: 12 }}
              />
              {(search.trim() || fechaFilter?.trim()) && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFiltroFecha(''); }}>
                  ✕
                </button>
              )}
            </div>
            <div className="toolbar-right">
              <button className="btn btn-ghost btn-sm" onClick={cargar}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
                Actualizar
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setModalNuevo(true)} style={{ padding: '8px 16px' }}>
                + Nuevo albarán
              </button>
            </div>
          </div>

          {/* FILTRO ESTADOS PILLS */}
          <div className="filter-group">
            {ESTADOS_FILTRO.map(e => (
              <button
                key={e}
                onClick={() => { setFiltro(e); setPage(1); }}
                className={`filter-pill ${filtroEstado === e ? 'active' : ''}`}
                aria-pressed={filtroEstado === e}
              >
                {{ todos: 'Todos', recibido: 'Recibidos', en_reparacion: 'En reparación', esperando_piezas: 'Esperando piezas', esperando_confirmacion_cliente: 'Esperando confirmación', listo_para_recoger: 'Listos para recoger', entregado: 'Entregados', cancelado: 'Cancelados' }[e] || e.replace(/_/g, ' ')}
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
                      <th className="sortable" onClick={() => handleSort('numero_albaran')}>Albarán {renderSortIcon('numero_albaran')}</th>
                      <th className="sortable" onClick={() => handleSort('cliente_nombre')}>Cliente {renderSortIcon('cliente_nombre')}</th>
                      <th className="sortable" onClick={() => handleSort('marca')}>Dispositivo {renderSortIcon('marca')}</th>
                      <th className="sortable" onClick={() => handleSort('fecha_recepcion')}>Entrada {renderSortIcon('fecha_recepcion')}</th>
                      <th className="col-estado sortable" onClick={() => handleSort('estado')}>Estado {renderSortIcon('estado')}</th>
                      <th className="sortable" onClick={() => handleSort('usuario_responsable_nombre')}>Técnico {renderSortIcon('usuario_responsable_nombre')}</th>
                      <th className="col-acciones"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(a => (
                      <tr key={a.id} className="clickable-row" onClick={() => setSelected(a)}>
                        <td className="col-id">#{a.id}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', fontWeight: 500 }}>{a.numero_albaran}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{a.cliente_nombre || `#${a.cliente_id}`}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>{a.marca} {a.modelo} &nbsp;&nbsp; {a.numero_serie}</div>
                        </td>
                        <td style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>{a.fecha_recepcion ? new Date(a.fecha_recepcion).toLocaleDateString('es-ES') : ''}</td>
                        <td className="col-estado"><Badge value={a.estado || 'recibido'} /></td>
                        <td style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>{a.usuario_responsable_nombre || ''}</td>
                        <td className="col-acciones">
                          <div className="actions-wrapper">
                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSelected(a); }}>Ver detalle</button>
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Albarán #${selected?.id}`} width={480}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 4 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text)' }}>{selected.numero_albaran}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{selected.token_publico}</div>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', paddingTop: 16 }}>
              {/* Info dispositivo */}
              <div style={{ background: '#f8f9fa', border: '1px solid var(--border-lo)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', textTransform: 'none' }}>{selected.marca} {selected.modelo}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'none', marginTop: 4, fontWeight: 500 }}>{selected.articulo?.replace('_', ' ')}</div>
                {selected.numero_serie && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', marginTop: 8, background: 'var(--accent-lo)', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>S/N: {selected.numero_serie}</div>}
              </div>

              {/* Descripción avería */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 3, height: 12, background: 'var(--accent)', borderRadius: 4 }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avería reportada</div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6, textTransform: 'none' }}>{selected.descripcion_averia}</p>
              </div>

              {/* Metadatos */}
              {[
                ['Cliente', selected.cliente_nombre || `#${selected.cliente_id}`],
                ['Responsable', selected.usuario_responsable_nombre || 'Sin asignar'],
                ['Estado', null],
                ['Presupuesto', selected.presupuesto_estimado ? `${selected.presupuesto_estimado}€` : 'Sin estimar'],
                ['Recibido', selected.fecha_recepcion ? new Date(selected.fecha_recepcion).toLocaleDateString('es-ES') : '—'],
                ['Entrega', selected.fecha_entrega ? new Date(selected.fecha_entrega).toLocaleDateString('es-ES') : 'Pendiente'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{k}</span>
                  {k === 'Estado' ? <Badge value={selected.estado} /> : <span style={{ fontSize: 12.5, color: 'var(--text-main)', textTransform: 'none' }}>{v}</span>}
                </div>
              ))}

              {/* ── Cambiar responsable ── */}
              {usuarios.length > 0 && (
                <div style={{ marginTop: 12, padding: 16, background: '#f8f9fa', border: '1px solid var(--border-lo)', borderRadius: 'var(--radius)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 3, height: 12, background: 'var(--accent)', borderRadius: 4 }} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Responsable asignado
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <Input
                        as="select"
                        value={nuevoResp}
                        onChange={e => setNuevoResp(e.target.value)}
                        options={[
                          { value: '', label: 'Sin asignar' },
                          ...usuarios.map(u => ({ value: u.id, label: `${u.nombre} (${u.rol})` }))
                        ]}
                      />
                    </div>
                    <Button
                      onClick={handleCambioResponsable}
                      disabled={savingResp || !nuevoResp || nuevoResp == selected.usuario_responsable_id}
                    >
                      {savingResp ? '…' : 'Guardar'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Cambio rápido de estado */}
              {SIGUIENTE_ESTADO[selected.estado] && (
                <div style={{ marginTop: 18 }}>
                  <Button
                    fullWidth
                    onClick={() => handleCambioEstado(selected, SIGUIENTE_ESTADO[selected.estado])}
                  >
                    → Pasar a: {SIGUIENTE_ESTADO[selected.estado].replace(/_/g, ' ')}
                  </Button>
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Otros estados</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ESTADOS_ALBARAN.filter(e => e !== selected.estado && e !== SIGUIENTE_ESTADO[selected.estado]).map(e => (
                    <button key={e} onClick={() => handleCambioEstado(selected, e)} className="btn btn-ghost btn-sm" style={{ textTransform: 'capitalize' }}>
                      {e.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal nuevo albarán */}
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo albarán" width={580}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalNuevo(false)}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={saving || !form.cliente_id || !form.marca || !form.modelo || !form.descripcion_averia}>
              {saving ? 'Creando…' : 'Crear albarán'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Cliente" as="select" value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))} required
            options={[{ value: '', label: 'Selecciona un cliente…' }, ...clientes.map(c => ({ value: c.id, label: `${c.nombre} ${c.apellidos}` }))]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Tipo de artículo" as="select" value={form.articulo} onChange={e => setForm(p => ({ ...p, articulo: e.target.value }))}
              options={ARTICULOS.map(a => ({ value: a, label: a.replace('_', ' ') }))}
            />
            <Input label="Tipo de bloqueo" as="select" value={form.tipo_bloqueo} onChange={e => setForm(p => ({ ...p, tipo_bloqueo: e.target.value }))}
              options={BLOQUEOS.map(b => ({ value: b, label: b.replace('_', ' ') }))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Marca" value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value }))} required placeholder="Dell, Apple, Samsung…" />
            <Input label="Modelo" value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))} required placeholder="XPS 13, iPhone 14…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Número de serie" value={form.numero_serie} onChange={e => setForm(p => ({ ...p, numero_serie: e.target.value }))} placeholder="Opcional" />
            <Input label="Presupuesto estimado (€)" type="number" value={form.presupuesto_estimado} onChange={e => setForm(p => ({ ...p, presupuesto_estimado: e.target.value }))} placeholder="0.00" />
          </div>
          <Input label="Descripción de la avería" as="textarea" value={form.descripcion_averia} onChange={e => setForm(p => ({ ...p, descripcion_averia: e.target.value }))} required placeholder="¿Qué problema tiene el dispositivo?" rows={3} />
          <Input label="Notas internas" as="textarea" value={form.notas_internas} onChange={e => setForm(p => ({ ...p, notas_internas: e.target.value }))} placeholder="Accesorios incluidos, estado estético, observaciones…" rows={2} />
          {/* Info: responsable auto-asignado */}
          <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 12px', background: 'var(--elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            👤 El responsable se asignará automáticamente a <strong>{usuario?.nombre}</strong>. Puedes cambiarlo desde el detalle del albarán.
          </div>
        </div>
      </Modal>
    </div>
  );
}