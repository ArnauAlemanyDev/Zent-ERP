import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../api/client';
import logo from '../assets/logo-light.svg';
import './Dashboard.css';

const STATUS = {
  abierto: 'Abierto', en_progreso: 'En progreso', cerrado: 'Cerrado', cancelado: 'Cancelado',
};
const PRIORITY = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' };
const FILTERS = [
  ['todos', 'Todos'], ['abierto', 'Abiertos'], ['en_progreso', 'En progreso'],
  ['cerrado', 'Cerrados'], ['cancelado', 'Cancelados'],
];
const EMPTY_FORM = { titulo: '', descripcion: '', prioridad: 'media', contacto: '' };
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
function formatDate(value) {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : dateFormatter.format(date);
}

const paths = {
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h14m-7-7 7 7-7 7" />,
  logout: <><path d="M10 17l5-5-5-5m5 5H3"/><path d="M13 4h6a2 2 0 012 2v12a2 2 0 01-2 2h-6"/></>,
  ticket: <><path d="M4 5h16v4a3 3 0 000 6v4H4v-4a3 3 0 000-6V5z"/><path d="M14 5v2m0 4v2m0 4v2"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  activity: <path d="M3 12h4l3-7 4 14 3-7h4"/>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 8a7 7 0 0112-2l2 6M4 12l2 6a7 7 0 0012-2"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
};
function Icon({ name, size = 20 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
function Stat({ icon, label, value, tone = '' }) {
  return <div className="zp-stat"><div className={`zp-stat-icon ${tone}`}><Icon name={icon} /></div><div><span className="zp-stat-label">{label}</span><strong>{value}</strong></div></div>;
}

export default function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const dialog = useRef(null);
  const titleField = useRef(null);
  const { usuario, logout } = useAuthStore();
  const navigate = useNavigate();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/api/portal/tickets');
      setTickets(Array.isArray(data) ? data : (data?.tickets || []));
      setLoaded(true);
    } catch {
      setError('No hemos podido cargar tus solicitudes. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void fetchTickets(); }, [fetchTickets]);

  const counts = tickets.reduce((acc, ticket) => {
    acc[ticket.estado] = (acc[ticket.estado] || 0) + 1;
    return acc;
  }, {});
  const filtered = tickets.filter(ticket => {
    const matchesStatus = filter === 'todos' || ticket.estado === filter;
    const query = normalize(search.trim());
    return matchesStatus && (!query || normalize(`${ticket.titulo ?? ''} ${ticket.descripcion ?? ''} #${ticket.id}`).includes(query));
  });
  const value = (n) => loaded ? n : '—';
  const change = (event) => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
  const openForm = () => {
    setFormError('');
    dialog.current?.showModal();
    titleField.current?.focus();
  };
  const closeForm = () => { if (!submitting) dialog.current?.close(); };
  const handleCreate = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const payload = { ...form, titulo: form.titulo.trim(), descripcion: form.descripcion.trim(), contacto: form.contacto.trim() };
    if (!payload.titulo || !payload.descripcion || !payload.contacto) {
      setFormError('Completa el título, la descripción y el contacto.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    setSuccess('');
    try {
      await api.post('/api/portal/tickets', payload);
      setForm(EMPTY_FORM);
      dialog.current?.close();
      setFilter('todos');
      setSearch('');
      setSuccess('Solicitud enviada correctamente. Ya puedes consultar su estado.');
      await fetchTickets();
    } catch (err) {
      setFormError(err.message || 'No se ha podido enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="zp-shell">
      <header className="zp-header">
        <div className="zp-header-inner">
          <div className="zp-brand"><img src={logo} alt="Zent" /><span>Portal de clientes</span></div>
          <div className="zp-account">
            <div className="zp-avatar" aria-hidden="true">{(usuario?.email || 'C').charAt(0).toUpperCase()}</div>
            <div className="zp-account-text"><span>Mi cuenta</span><strong title={usuario?.email}>{usuario?.email || 'Cliente'}</strong></div>
            <button type="button" className="zp-logout" onClick={() => { logout(); navigate('/', { replace: true }); }} aria-label="Cerrar sesión"><Icon name="logout" size={18}/><span>Salir</span></button>
          </div>
        </div>
      </header>
      <main className="zp-main">
        <div className="zp-breadcrumb">Área de clientes <span aria-hidden="true">/</span> <strong>Soporte técnico</strong></div>
        <section className="zp-hero" aria-labelledby="zp-title">
          <div className="zp-hero-copy"><span className="zp-eyebrow"><span/> CENTRO DE SOPORTE</span><h1 id="zp-title">¿En qué podemos ayudarte?</h1><p>Abre una solicitud y consulta el progreso de tus incidencias, todo desde un mismo lugar.</p><button className="zp-btn zp-primary" type="button" onClick={openForm}><Icon name="plus" size={19}/> Nueva solicitud <Icon name="arrow" size={17}/></button></div>
          <div className="zp-hero-art" aria-hidden="true"><div className="zp-art-orbit"/><div className="zp-art-back"/><div className="zp-art-front"><div className="zp-art-heading"><Icon name="ticket" size={24}/><span>SUPPORT / ZENT</span></div><i/><i/><div className="zp-art-progress"><b/><b/><b/></div><div className="zp-art-check"><Icon name="check" size={23}/></div></div></div>
        </section>
        <section className="zp-stats" aria-label="Resumen de tus solicitudes" aria-busy={loading}>
          <Stat icon="ticket" label="Total de solicitudes" value={value(tickets.length)} />
          <Stat icon="clock" label="Abiertas" value={value(counts.abierto || 0)} tone="amber" />
          <Stat icon="activity" label="En progreso" value={value(counts.en_progreso || 0)} />
          <Stat icon="check" label="Cerradas" value={value(counts.cerrado || 0)} tone="green" />
        </section>
        {success && <div className="zp-feedback zp-success" role="status"><Icon name="check"/>{success}<button type="button" className="zp-icon-button" onClick={() => setSuccess('')} aria-label="Cerrar aviso"><Icon name="close" size={18}/></button></div>}
        <div className="zp-workspace">
          <section className="zp-panel" aria-labelledby="zp-tickets-title">
            <div className="zp-panel-heading"><div><span className="zp-kicker">GESTIÓN DE INCIDENCIAS</span><h2 id="zp-tickets-title">Mis solicitudes</h2><p>Consulta y organiza tus tickets de soporte.</p></div><button className="zp-btn zp-secondary zp-refresh" type="button" aria-label="Actualizar solicitudes" onClick={fetchTickets} disabled={loading}><Icon name="refresh" size={17}/><span>Actualizar</span></button></div>
            <div className="zp-tools">
              <div className="zp-filters" aria-label="Filtrar por estado">{FILTERS.map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
              <label className="zp-search"><Icon name="search" size={18}/><input type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label="Buscar solicitudes" placeholder="Buscar por título o ID…"/></label>
            </div>
            {error && <div role="alert" className="zp-feedback zp-error"><Icon name="info"/>{error}<button type="button" className="zp-btn zp-secondary" onClick={fetchTickets} disabled={loading}>Reintentar</button></div>}
            {loading ? <div className="zp-empty" role="status"><span className="zp-spinner"/> Cargando solicitudes…</div> : !loaded ? null : <>
              <div className="zp-list-heading"><span>{filtered.length} {filtered.length === 1 ? 'solicitud' : 'solicitudes'}</span><span>Más recientes primero</span></div>
              {filtered.length === 0 ? <div className="zp-empty"><div className="zp-empty-icon"><Icon name={tickets.length ? 'search' : 'ticket'} size={28}/></div><h3>{tickets.length ? 'No hay coincidencias' : 'Aún no tienes solicitudes'}</h3><p>{tickets.length ? 'Prueba con otros términos o cambia el filtro.' : 'Cuando envíes una incidencia, podrás seguir su estado aquí.'}</p><button type="button" className="zp-btn zp-secondary" onClick={tickets.length ? () => { setSearch(''); setFilter('todos'); } : openForm}>{tickets.length ? 'Limpiar filtros' : 'Crear solicitud'}</button></div> : <div className="zp-list">{filtered.map(ticket => <article key={ticket.id} className="zp-ticket"><div className="zp-ticket-top"><span className="zp-ticket-id"><Icon name="ticket" size={16}/> TICKET #{ticket.id}</span><span className={`zp-status ${STATUS[ticket.estado] ? ticket.estado : 'unknown'}`}><i/>{STATUS[ticket.estado] || 'Sin estado'}</span></div><h3>{ticket.titulo || 'Sin título'}</h3><p>{ticket.descripcion || 'Sin descripción'}</p><div className="zp-ticket-bottom"><span className={`zp-priority ${PRIORITY[ticket.prioridad] ? ticket.prioridad : 'unknown'}`}><i/>Prioridad: <strong>{PRIORITY[ticket.prioridad] || 'Sin definir'}</strong></span><span><Icon name="clock" size={15}/>{formatDate(ticket.fecha_creacion)}</span></div></article>)}</div>}
            </>}
          </section>
          <aside className="zp-aside" aria-labelledby="zp-guide-title"><div className="zp-guide"><div className="zp-guide-icon"><Icon name="info" size={23}/></div><span className="zp-kicker">GUÍA DE SOPORTE</span><h2 id="zp-guide-title">Así funciona</h2><p>Del problema a la resolución, en tres pasos.</p><ol><li><b>01</b><div><strong>Abre una solicitud</strong><p>Describe el problema e indica un contacto.</p></div></li><li><b>02</b><div><strong>El equipo revisa el ticket</strong><p>Consulta si pasa a estado en progreso.</p></div></li><li><b>03</b><div><strong>Consulta su estado</strong><p>Revisa las novedades desde este portal.</p></div></li></ol><div className="zp-guide-note"><Icon name="info" size={17}/><span>Incluye los detalles necesarios y evita compartir contraseñas en tus solicitudes.</span></div></div></aside>
        </div>
        <footer className="zp-footer"><span>ZENT / ERP</span><span>Portal de clientes · Soporte técnico</span></footer>
      </main>
      <dialog className="zp-dialog" ref={dialog} aria-labelledby="zp-dialog-title" onCancel={event => { if (submitting) event.preventDefault(); }}>
        <form onSubmit={handleCreate}>
          <div className="zp-dialog-header"><div><span className="zp-kicker">NUEVA INCIDENCIA</span><h2 id="zp-dialog-title">¿Qué ha ocurrido?</h2><p>Cuéntanos qué necesitas y cómo podemos contactar contigo.</p></div><button type="button" className="zp-icon-button" onClick={closeForm} disabled={submitting} aria-label="Cerrar formulario"><Icon name="close"/></button></div>
          <div className="zp-dialog-body">
            {formError && <div className="zp-feedback zp-error" role="alert">{formError}</div>}
            <label>Título <span>*</span><input ref={titleField} name="titulo" value={form.titulo} onChange={change} maxLength={255} required placeholder="Ej. El equipo no arranca" disabled={submitting}/></label>
            <label>Descripción <span>*</span><textarea name="descripcion" value={form.descripcion} onChange={change} rows={4} required placeholder="¿Qué ocurre? ¿Desde cuándo?" disabled={submitting}/></label>
            <div className="zp-form-grid"><label>Prioridad<select name="prioridad" value={form.prioridad} onChange={change} disabled={submitting}>{Object.entries(PRIORITY).map(([id,label]) => <option value={id} key={id}>{label}</option>)}</select></label><label>Contacto <span>*</span><input name="contacto" value={form.contacto} onChange={change} required placeholder="Teléfono o extensión" disabled={submitting}/></label></div>
            <p className="zp-form-hint">Los campos marcados con * son obligatorios.</p>
          </div>
          <div className="zp-dialog-footer"><button type="button" className="zp-btn zp-secondary" onClick={closeForm} disabled={submitting}>Cancelar</button><button type="submit" className="zp-btn zp-primary" disabled={submitting}>{submitting ? 'Enviando…' : 'Enviar solicitud'}<Icon name="arrow" size={17}/></button></div>
        </form>
      </dialog>
    </div>
  );
}
