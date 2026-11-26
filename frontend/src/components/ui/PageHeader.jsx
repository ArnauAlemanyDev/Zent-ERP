const sections = {
  clientes: { label: 'Clientes', description: 'Organiza las fichas de clientes y sus dispositivos.' },
  tickets: { label: 'Soporte', description: 'Gestiona incidencias internas y solicitudes de clientes.' },
  albaranes: { label: 'Taller', description: 'Registra la recepción y sigue el estado de cada reparación.' },
  contratos: { label: 'Servicios', description: 'Consulta contratos, condiciones y fechas de vencimiento.' },
  licencias: { label: 'Inventario digital', description: 'Administra las licencias de Office y Windows.' },
};

function SectionIcon({ section }) {
  const paths = {
    clientes: <><circle cx="9" cy="7" r="3"/><path d="M3 20v-3a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v3M17 4a3 3 0 0 1 0 6M21 20v-3a5 5 0 0 0-3-4.6"/></>,
    tickets: <><path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z"/><path d="M12 5v3m0 3v2m0 3v3"/></>,
    albaranes: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5"/></>,
    contratos: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Zm0 0v6h6M8 13h8m-8 4h6"/></>,
    licencias: <><rect x="3" y="10" width="18" height="11" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3M12 14v3"/></>,
  };
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[section] || paths.contratos}</svg>;
}

export default function PageHeader({ title, subtitle, actions, section }) {
  const info = sections[section];
  return (
    <header className="zent-page-header zent-module-hero">
      <div className="zent-module-intro">
        <div className="zent-eyebrow">ZENT ERP / {info?.label || 'Operativa'}</div>
        <h1 className="zent-page-title">{title}</h1>
        {(subtitle || info?.description) && <p>{subtitle || info.description}</p>}
      </div>
      <div className="zent-module-art" aria-hidden="true"><i/><i/><i/><span><SectionIcon section={section}/></span></div>
      {actions && <div className="zent-module-actions">{actions}</div>}
    </header>
  );
}
