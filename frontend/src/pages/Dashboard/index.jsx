import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Modal, Input, Button, Badge } from '../../components/ui';
import TimerSession from '../../components/TimerSession';

const PRIORIDADES_OPT = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

const ARTICULOS_OPT = [
  { value: 'portatil', label: 'Portátil' },
  { value: 'pc_sobremesa', label: 'PC Sobremesa' },
  { value: 'smartphone', label: 'Smartphone' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'impresora', label: 'Impresora' },
  { value: 'servidor', label: 'Servidor' },
  { value: 'otro', label: 'Otro' },
];

function fechaRelativa(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (min < 2) return 'ahora';
  if (min < 60) return `hace ${min}m`;
  if (h < 24) return `hace ${h}h`;
  return `hace ${d}d`;
}

// ── Componentes pequeños ───────────────────────────────────────────────────

function MetricCard({ label, value, sub, color, onClick, icon }) {
  return (
    <div
      className="card zent-metric"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '12px 16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'var(--transition)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '75px',
        border: '1px solid var(--border-lo)',
        boxShadow: 'var(--shadow-sm)',
        background: 'var(--surface)'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-lo)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="zent-metric-label" style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label}
          </div>
          <div className="zent-metric-value" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.03em', lineHeight: 1 }}>
            {value ?? '0'}
          </div>
          {sub && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
              {sub}
            </div>
          )}
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: '12px',
          background: 'var(--accent-lo)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)', flexShrink: 0
        }}>
          {React.cloneElement(icon, { width: 20, height: 20, strokeWidth: 2.2 })}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, link, onLink }) {
  return (
    <div style={{
      padding: '10px 18px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-sub)' }}>{title}</span>
      {link && (
        <span
          onClick={onLink}
          style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
        >
          {link}
        </span>
      )}
    </div>
  );
}

function EmptyRow({ text }) {
  return (
    <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12.5 }}>
      {text}
    </div>
  );
}

function Skeleton({ h = 14, w = '100%', mb = 0 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: 4,
      background: 'var(--elevated)',
      marginBottom: mb,
      animation: 'pulse 1.4s ease infinite',
    }} />
  );
}

// ── Dashboard principal ────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modales
  const [modalTicket, setModalTicket] = useState(false);
  const [modalAlbaran, setModalAlbaran] = useState(false);

  // Datos auxiliares
  const [clientes, setClientes] = useState([]);
  const [dispositivos, setDispositivos] = useState([]);

  // Formularios
  const [formTicket, setFormTicket] = useState({
    cliente_id: '', dispositivo_id: '', titulo: '', descripcion: '', prioridad: 'media',
  });
  const [formAlbaran, setFormAlbaran] = useState({
    cliente_id: '', dispositivo_id: '', articulo: 'portatil', marca: '', modelo: '',
    numero_serie: '', tipo_bloqueo: 'sin_bloqueo', descripcion_averia: '', presupuesto_estimado: '',
  });

  // Estados de guardado
  const [savingTicket, setSavingTicket] = useState(false);
  const [savingAlbaran, setSavingAlbaran] = useState(false);
  const [selectedTecnico, setSelectedTecnico] = useState(null);
  const [itemsTecnico, setItemsTecnico] = useState({ tickets: [], albaranes: [], loading: false });

  // Cargar detalles del técnico cuando se selecciona
  useEffect(() => {
    if (!selectedTecnico) {
      setItemsTecnico({ tickets: [], albaranes: [], loading: false });
      return;
    }
    async function cargarDetalles() {
      setItemsTecnico(p => ({ ...p, loading: true }));
      try {
        const [tkts, albs] = await Promise.all([
          api.get(`/tickets/tecnico/${selectedTecnico.id}`),
          api.get(`/albaranes/tecnico/${selectedTecnico.id}`)
        ]);
        setItemsTecnico({ tickets: tkts, albaranes: albs, loading: false });
      } catch (err) {
        console.error(err);
        setItemsTecnico(p => ({ ...p, loading: false }));
      }
    }
    cargarDetalles();
  }, [selectedTecnico]);

  // Obtiene todo con un único endpoint
  useEffect(() => {
    async function cargar() {
      try {
        const [data, cli, dis] = await Promise.all([
          api.get('/dashboard/resumen'),
          api.get('/clientes'),
          api.get('/dispositivos'),
        ]);
        setResumen(data);
        setClientes(Array.isArray(cli) ? cli : cli.data || []);
        setDispositivos(Array.isArray(dis) ? dis : dis.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  // Fecha y hora actuales
  const ahora = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  }).replace(/^[a-z]/, (char) => char.toUpperCase());

  // ── Estado: cargando ──
  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ marginBottom: 24 }}>
          <Skeleton h={14} w={180} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Skeleton h={46} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Skeleton h={280} />
          <Skeleton h={280} />
        </div>
      </div>
    );
  }

  // ── Estado: error ──
  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{
          padding: '14px 18px',
          background: 'var(--red-lo)',
          border: '1px solid var(--red)',
          borderRadius: 'var(--radius)',
          color: 'var(--red)',
          fontSize: 12,
        }}>
          Error al cargar el dashboard: {error}
        </div>
      </div>
    );
  }

  // Extraer datos del resumen (cambiar snake_case a camelCase del backend)
  const stats = resumen?.estadisticas || {};
  const tResumen = resumen?.ticketsResumen || [];
  const aResumen = resumen?.albaranesResumen || [];
  const tickets = resumen?.ticketsRecientes || [];
  const albaranes = resumen?.albaranesRecientes || [];
  const tecnicos = resumen?.tecnicosConMasCarga || [];

  // Calcular subtítulos para métricas — convertir arrays a objetos
  const tResumenObj = tResumen.reduce((acc, r) => ({ ...acc, [r.estado]: r.cantidad }), {});
  const aResumenObj = aResumen.reduce((acc, r) => ({ ...acc, [r.estado]: r.cantidad }), {});
  const ticketsAbiertos = (tResumenObj.abierto || 0) + (tResumenObj.en_progreso || 0);
  const listoRecoger = aResumenObj.listo_para_recoger || 0;

  // Manejos de formularios
  const dispForClient = formTicket.cliente_id
    ? dispositivos.filter(d => d.cliente_id == formTicket.cliente_id)
    : [];

  async function handleCrearTicket() {
    if (!formTicket.cliente_id || !formTicket.titulo || !formTicket.descripcion) return;
    setSavingTicket(true);
    try {
      await api.post('/tickets', {
        ...formTicket,
        cliente_id: parseInt(formTicket.cliente_id),
        dispositivo_id: formTicket.dispositivo_id ? parseInt(formTicket.dispositivo_id) : undefined,
      });
      setModalTicket(false);
      setFormTicket({ cliente_id: '', dispositivo_id: '', titulo: '', descripcion: '', prioridad: 'media' });
      // Recargar dashboard
      const data = await api.get('/dashboard/resumen');
      setResumen(data);
    } catch (e) { console.error(e); }
    finally { setSavingTicket(false); }
  }

  async function handleCrearAlbaran() {
    if (!formAlbaran.cliente_id || !formAlbaran.marca || !formAlbaran.modelo || !formAlbaran.descripcion_averia) return;
    setSavingAlbaran(true);
    try {
      await api.post('/albaranes', {
        ...formAlbaran,
        cliente_id: parseInt(formAlbaran.cliente_id),
        dispositivo_id: formAlbaran.dispositivo_id ? parseInt(formAlbaran.dispositivo_id) : undefined,
        presupuesto_estimado: formAlbaran.presupuesto_estimado ? parseFloat(formAlbaran.presupuesto_estimado) : undefined,
      });
      setModalAlbaran(false);
      setFormAlbaran({ cliente_id: '', dispositivo_id: '', articulo: 'portatil', marca: '', modelo: '', numero_serie: '', tipo_bloqueo: 'sin_bloqueo', descripcion_averia: '', presupuesto_estimado: '' });
      // Recargar dashboard
      const data = await api.get('/dashboard/resumen');
      setResumen(data);
    } catch (e) { console.error(e); }
    finally { setSavingAlbaran(false); }
  }

  return (
    <div className="zent-dashboard" style={{ flex: 1, overflow: 'hidden', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Cabecera ── */}
      <header className="zent-dash-heading">
        <div className="zent-dash-intro">
          <span className="zent-eyebrow">ZENT ERP / OPERATIVA</span>
          <h1>Panel de actividad</h1>
          <p>Consulta las incidencias, reparaciones y actividad del equipo.</p>
        </div>
        <div className="zent-dash-date">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
          <span>{ahora}</span>
        </div>
        <div className="zent-dash-ornament" aria-hidden="true"><i/><i/><i/></div>
      </header>

      {/* ── Métricas ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
          <div style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 4 }} />
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text)' }}>
            Resumen de actividad
          </div>
        </div>
        <div className="zent-metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <MetricCard
          label="Tickets activos"
          value={ticketsAbiertos}
          sub={`${tResumenObj.en_progreso || 0} en progreso`}
          color="var(--accent)"
          onClick={() => navigate('/tickets')}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
          }
        />
        <MetricCard
          label="Albaranes activos"
          value={Object.entries(aResumenObj).filter(([k]) => !['entregado', 'cancelado'].includes(k)).reduce((s, [, v]) => s + v, 0)}
          sub={`${listoRecoger} listos para recoger`}
          color="var(--accent)"
          onClick={() => navigate('/albaranes')}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
          }
        />
        <MetricCard
          label="Clientes"
          value={stats.total_clientes}
          sub="en base de datos"
          color="var(--accent)"
          onClick={() => navigate('/clientes')}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          }
        />
        <MetricCard
          label="Dispositivos"
          value={stats.total_dispositivos}
          sub="registrados"
          color="var(--accent)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="11" x="2" y="3" rx="2" ry="2"/><path d="M7 21h10"/><path d="M12 18v3"/></svg>
          }
        />
      </div>
    </div>

      {/* ── Tickets + Albaranes recientes ── */}
      <div className="zent-recent-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Tickets recientes */}
        <div className="card zent-recent" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px 4px 20px' }}>
            <div style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 4 }} />
            <div style={{ flex: 1, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text)' }}>
              Tickets recientes
            </div>
            <span 
              onClick={() => navigate('/tickets')}
              style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
            >
              Ver todos →
            </span>
          </div>
          {tickets.slice(0, 5).length === 0 ? (
            <EmptyRow text="No hay tickets activos" />
          ) : (
            <div className="table-scroll" style={{ flex: 1, overflow: 'auto', borderBottom: '1px solid var(--border)' }}>
              <table className="data-table">
                <tbody>
                  {tickets.slice(0, 5).map((t) => (
                    <tr key={t.id} className="clickable-row" onClick={() => navigate(`/tickets/${t.id}`)}>
                      <td className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', width: 70 }}>
                        #{t.id}
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>{t.titulo}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                          {t.cliente_nombre || '—'} &nbsp;&nbsp; {fechaRelativa(t.fecha_creacion)}
                        </div>
                      </td>
                      <td style={{ width: 110, textAlign: 'center' }}>
                        <Badge value={t.prioridad} />
                      </td>
                      <td style={{ width: 140, textAlign: 'right' }}>
                        <Badge value={t.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: '8px 18px' }}>
            <button
              onClick={() => setModalTicket(true)}
              className="btn btn-primary btn-full"
              style={{ padding: '6px', fontSize: 13 }}
            >
              + Nuevo ticket
            </button>
          </div>
        </div>

        {/* Albaranes recientes */}
        <div className="card zent-recent" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px 4px 20px' }}>
            <div style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 4 }} />
            <div style={{ flex: 1, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text)' }}>
              Albaranes recientes
            </div>
            <span 
              onClick={() => navigate('/albaranes')}
              style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
            >
              Ver todos →
            </span>
          </div>
          {albaranes.slice(0, 5).length === 0 ? (
            <EmptyRow text="No hay albaranes activos" />
          ) : (
            <div className="table-scroll" style={{ flex: 1, overflow: 'auto', borderBottom: '1px solid var(--border)' }}>
              <table className="data-table">
                <tbody>
                  {albaranes.slice(0, 5).map((a) => (
                    <tr key={a.id} className="clickable-row" onClick={() => navigate(`/albaranes/${a.id}`)}>
                      <td>
                        <div style={{ fontSize: 12 }}>{a.cliente_nombre || a.cliente_id}</div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                          {a.numero_albaran} &nbsp;&nbsp; {a.marca} {a.modelo}
                        </div>
                      </td>
                      <td style={{ width: 180, textAlign: 'right' }}>
                        <Badge value={a.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: '10px 18px' }}>
            <button
              onClick={() => setModalAlbaran(true)}
              className="btn btn-primary btn-full"
              style={{ padding: '8px', fontSize: 13 }}
            >
              + Nuevo albarán
            </button>
          </div>
        </div>
      </div>

      {/* ── Equipo ── */}
      {tecnicos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
            <div style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 4 }} />
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text)' }}>
              Equipo de trabajo
            </div>
          </div>
          <div className="zent-team-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {tecnicos.map((t, idx) => {
              const initials = t.nombre?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
              const totalAsignado = (t.tickets_asignados || 0) + (t.albaranes_asignados || 0);

              return (
                <div
                  key={t.id || idx}
                  className="card"
                  onClick={() => setSelectedTecnico({ ...t, color: 'var(--accent)' })}
                  style={{
                    height: '62px',
                    padding: '0 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'var(--accent-lo)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.02em' }}>{initials}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.nombre}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
                      {totalAsignado} {totalAsignado === 1 ? 'asignado' : 'asignados'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal perfil técnico */}
      <Modal
        open={!!selectedTecnico}
        onClose={() => setSelectedTecnico(null)}
        title="Perfil del trabajador"
        width={500}
        footer={
          <Button variant="ghost" onClick={() => setSelectedTecnico(null)}>Cerrar</Button>
        }
      >
        {selectedTecnico && (() => {
          const t = selectedTecnico;
          const initials = t.nombre?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
          const totalAsignado = (t.tickets_asignados || 0) + (t.albaranes_asignados || 0);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Cabecera perfil */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--bg)',
                  border: `2px solid ${t.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.color }}>{initials}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t.email || 'Técnico'}</div>
                </div>
                <Badge value={t.rol} />
              </div>

              {/* Estadísticas rápidas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div style={{ padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{totalAsignado}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>Carga Total</div>
                </div>
                <div style={{ padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--yellow)' }}>{t.tickets_asignados || 0}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>Tickets</div>
                </div>
                <div style={{ padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{t.albaranes_asignados || 0}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>Albaranes</div>
                </div>
              </div>

              {/* Listado detallado */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>

                {/* Tickets */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tickets asignados</span>
                    {itemsTecnico.loading && <span style={{ fontSize: 9 }}>Cargando...</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {itemsTecnico.tickets.length === 0 && !itemsTecnico.loading && <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>Sin tickets pendientes</div>}
                    {itemsTecnico.tickets.map(tk => (
                      <div key={tk.id} onClick={() => navigate(`/tickets/${tk.id}`)} className="list-item-hover" style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'none' }}>{tk.titulo}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'none' }}>{tk.cliente_nombre}</div>
                        </div>
                        <Badge value={tk.estado} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Albaranes */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Albaranes asignados</span>
                    {itemsTecnico.loading && <span style={{ fontSize: 9 }}>Cargando...</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {itemsTecnico.albaranes.length === 0 && !itemsTecnico.loading && <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>Sin albaranes pendientes</div>}
                    {itemsTecnico.albaranes.map(al => (
                      <div key={al.id} onClick={() => navigate(`/albaranes/${al.id}`)} className="list-item-hover" style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'none' }}>{al.marca} {al.modelo}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{al.numero_albaran}</div>
                        </div>
                        <Badge value={al.estado} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sesiones remotas / Temporizador */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                  <TimerSession tecnico={t} onSessionUpdated={(sesion) => {
                    // Sesión actualizada
                  }} />
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal crear ticket */}
      <Modal
        open={modalTicket}
        onClose={() => setModalTicket(false)}
        title="Nuevo ticket"
        width={560}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalTicket(false)}>Cancelar</Button>
            <Button onClick={handleCrearTicket} disabled={savingTicket || !formTicket.cliente_id || !formTicket.titulo || !formTicket.descripcion}>
              {savingTicket ? 'Creando…' : 'Crear ticket'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Cliente"
            as="select"
            value={formTicket.cliente_id}
            onChange={e => setFormTicket(p => ({ ...p, cliente_id: e.target.value, dispositivo_id: '' }))}
            required
            options={[{ value: '', label: 'Selecciona un cliente…' }, ...clientes.map(c => ({ value: c.id, label: `${c.nombre} ${c.apellidos}` }))]}
          />
          {formTicket.cliente_id && dispForClient.length > 0 && (
            <Input
              label="Dispositivo"
              as="select"
              value={formTicket.dispositivo_id}
              onChange={e => setFormTicket(p => ({ ...p, dispositivo_id: e.target.value }))}
              options={[{ value: '', label: 'Sin dispositivo específico' }, ...dispForClient.map(d => ({ value: d.id, label: `${d.marca} ${d.modelo}` }))]}
            />
          )}
          <Input
            label="Título"
            value={formTicket.titulo}
            onChange={e => setFormTicket(p => ({ ...p, titulo: e.target.value }))}
            required
            placeholder="Describe el problema brevemente"
          />
          <Input
            label="Descripción"
            as="textarea"
            value={formTicket.descripcion}
            onChange={e => setFormTicket(p => ({ ...p, descripcion: e.target.value }))}
            required
            placeholder="Detalles del problema…"
            rows={4}
          />
          <Input
            label="Prioridad"
            as="select"
            value={formTicket.prioridad}
            onChange={e => setFormTicket(p => ({ ...p, prioridad: e.target.value }))}
            options={PRIORIDADES_OPT}
          />
        </div>
      </Modal>

      {/* Modal crear albarán */}
      <Modal
        open={modalAlbaran}
        onClose={() => setModalAlbaran(false)}
        title="Nuevo albarán"
        width={560}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalAlbaran(false)}>Cancelar</Button>
            <Button onClick={handleCrearAlbaran} disabled={savingAlbaran || !formAlbaran.cliente_id || !formAlbaran.marca || !formAlbaran.modelo || !formAlbaran.descripcion_averia}>
              {savingAlbaran ? 'Creando…' : 'Crear albarán'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Cliente"
            as="select"
            value={formAlbaran.cliente_id}
            onChange={e => setFormAlbaran(p => ({ ...p, cliente_id: e.target.value, dispositivo_id: '' }))}
            required
            options={[{ value: '', label: 'Selecciona un cliente…' }, ...clientes.map(c => ({ value: c.id, label: `${c.nombre} ${c.apellidos}` }))]}
          />
          <Input
            label="Articulo"
            as="select"
            value={formAlbaran.articulo}
            onChange={e => setFormAlbaran(p => ({ ...p, articulo: e.target.value }))}
            options={ARTICULOS_OPT}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Marca"
              value={formAlbaran.marca}
              onChange={e => setFormAlbaran(p => ({ ...p, marca: e.target.value }))}
              required
              placeholder="Apple, Dell, etc."
            />
            <Input
              label="Modelo"
              value={formAlbaran.modelo}
              onChange={e => setFormAlbaran(p => ({ ...p, modelo: e.target.value }))}
              required
              placeholder="MacBook Pro, etc."
            />
          </div>
          <Input
            label="Número de serie"
            value={formAlbaran.numero_serie}
            onChange={e => setFormAlbaran(p => ({ ...p, numero_serie: e.target.value }))}
            placeholder="Opcional"
          />
          <Input
            label="Descripción de avería"
            as="textarea"
            value={formAlbaran.descripcion_averia}
            onChange={e => setFormAlbaran(p => ({ ...p, descripcion_averia: e.target.value }))}
            required
            placeholder="Describe el problema…"
            rows={3}
          />
          <Input
            label="Presupuesto estimado"
            type="number"
            value={formAlbaran.presupuesto_estimado}
            onChange={e => setFormAlbaran(p => ({ ...p, presupuesto_estimado: e.target.value }))}
            placeholder="Opcional"
          />
        </div>
      </Modal>

    </div>
  );
}