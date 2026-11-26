import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import AppShell from './components/layout/AppShell';
import Dashboard  from './pages/Dashboard/index';
import Clientes   from './pages/Clientes/index';
import Tickets    from './pages/Tickets/index';
import Albaranes  from './pages/Albaranes/index';
import Contratos  from './pages/Contratos/index';
import Login      from './pages/Login/index';
import Licencias  from './pages/Licencias/index';

// Protege rutas — redirige a /login si no hay sesión
function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

// Global scanner listener
function GlobalScanner() {
  const navigate = useNavigate();
  useBarcodeScanner((barcode) => {
    // Si el código escaneado empieza por TCK-, navegamos al ticket correspondiente
    if (barcode.startsWith('TCK-')) {
      const ticketId = barcode.replace('TCK-', '');
      navigate(`/tickets/${ticketId}`);
    } else if (/^\d+$/.test(barcode)) {
      // Opcional: si escanean solo números que podrían ser el ID
      navigate(`/tickets/${barcode}`);
    }
  });
  return null;
}

export default function App() {
  return (
    <HashRouter>
      <GlobalScanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <PrivateRoute>
            <AppShell />
          </PrivateRoute>
        }>
          <Route index             element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="clientes/*" element={<Clientes />} />
          <Route path="tickets/*"  element={<Tickets />} />
          <Route path="albaranes/*"element={<Albaranes />} />
          <Route path="contratos/*"element={<Contratos />} />
          <Route path="licencias/*" element={<Licencias />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
