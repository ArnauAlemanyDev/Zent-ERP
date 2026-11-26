import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import logo from '../../assets/logo-light.svg';


const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg> },
  { to: '/clientes', label: 'Clientes', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { to: '/tickets', label: 'Tickets', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { to: '/albaranes', label: 'Albaranes', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> },
  { to: '/contratos', label: 'Contratos', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg> },
  { to: '/licencias', label: 'Licencias', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
];

export default function Sidebar() {
  const { usuario, logout } = useAuthStore();
  const initials = usuario?.nombre?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <aside className="zent-sidebar" style={{
      width: 200,
      flexShrink: 0,
      background: '#0c111b', '--text': '#eef2f7', '--text-sub': '#d5e0ed', '--text-dim': '#a0afc3', '--accent': '#4cd9f2', '--accent-lo': '#193447',
      borderRight: '1px solid #223443',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* Logo */}
      <div style={{
        height: 70,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        flexShrink: 0,
      }}>
        <img src={logo} alt="Logo Zent ERP" style={{ height: 26, width: 'auto' }} />
      </div>

      <div className="zent-sidebar-caption">ESPACIO DE TRABAJO</div>
      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
        {NAV.map(item => (
          <NavLink
            className="zent-nav-link"
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontSize: 11.5,
              fontWeight: 700,
              color: isActive ? 'var(--accent)' : 'var(--text-sub)',
              background: isActive ? 'var(--accent-lo)' : 'transparent',
              transition: 'var(--transition)',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            })}
          >
            <span style={{ display: 'flex', opacity: 0.8 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Usuario + logout */}
      <div style={{
        padding: '20px 12px',
        borderTop: '1px solid var(--border-lo)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--accent-lo)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{initials}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.04em' }}>
              {usuario?.nombre || 'Usuario'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{usuario?.rol}</div>
          </div>
        </div>
        
        <button 
          onClick={logout}
          className="btn btn-ghost"
          style={{ width: '100%', padding: '8px', fontSize: 12, justifyContent: 'center', background: 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

const btnReset = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
