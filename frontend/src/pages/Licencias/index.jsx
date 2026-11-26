import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { PageHeader, Tabs } from '../../components/ui';
import LicenseTable from './LicenseTable';
import './licencias.css';

export default function Licencias() {
  const [activeTab, setActiveTab] = useState('office');
  const { token, usuario } = useAuthStore();

  const auth = {
    token,
    role: usuario?.rol,
    username: usuario?.nombre,
  };

  const TABS = [
    { id: 'office', label: 'Office' },
    { id: 'windows', label: 'Windows' }
  ];

  return (
    <div className="zent-module zent-module--licencias" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>
      <PageHeader section="licencias" title="Gestión de Licencias" />

      <div className="zent-module-tabs" style={{ padding: '0 24px' }}>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      <main className="main-content">
        {activeTab === 'office' && <LicenseTable key="office" tipo="office" auth={auth} />}
        {activeTab === 'windows' && <LicenseTable key="windows" tipo="windows" auth={auth} />}
      </main>
    </div>
  );
}
