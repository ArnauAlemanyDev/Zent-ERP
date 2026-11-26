import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../api/client';
import logo from '../assets/logo.svg';
import './Login.css';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/portal/auth/login', { email, password });
      if (response && response.token) {
        login(response.token, response.usuario);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="zent-portal-login">
      <div className="zpl-layout">
        <section className="zpl-brand" aria-labelledby="zpl-heading">
          <div className="zpl-art" aria-hidden="true"><i /><i /><i /></div>
          <span className="zpl-eyebrow">ZENT ERP / PORTAL DE CLIENTES</span>
          <h1 id="zpl-heading">Tu soporte.<br />Todo más cerca.</h1>
          <p>Abre solicitudes de asistencia y consulta el progreso de tus incidencias desde un mismo lugar.</p>
        </section>
        <section className="zpl-card" aria-labelledby="zpl-access">
          <img className="zpl-logo" src={logo} alt="Zent" />
          <div className="zpl-title">
            <h2 id="zpl-access">Acceso de clientes</h2>
            <p>Inicia sesión con tu cuenta de cliente.</p>
          </div>
          <form className="zpl-form" onSubmit={handleSubmit} aria-busy={loading}>
            <div className="zpl-field">
              <label htmlFor="zpl-email">Correo electrónico <span aria-hidden="true">*</span></label>
              <input id="zpl-email" type="email" name="email" autoComplete="username"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@zent.example" required disabled={loading} />
            </div>
            <div className="zpl-field">
              <label htmlFor="zpl-password">Contraseña <span aria-hidden="true">*</span></label>
              <input id="zpl-password" type="password" name="password" autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required disabled={loading} />
            </div>
            {error && <div className="zpl-error" role="alert">{error}</div>}
            <button type="submit" className="zpl-submit" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
