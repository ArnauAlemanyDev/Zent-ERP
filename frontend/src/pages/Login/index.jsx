import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { Input, Button } from '../../components/ui';
import logo from '../../assets/logo.svg';


export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();
  const login    = useAuthStore(s => s.login);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      login(data.token, data.usuario);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="zent-login" style={{
      height:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg, #0c111b, #173b53)',
    }}>
      <div className="zent-login-brand">
        <span className="zent-eyebrow">ZENT ERP / ESPACIO DE TRABAJO</span>
        <h1>Tu taller.<br/>Todo en un lugar.</h1>
        <p>Clientes, incidencias y reparaciones en un entorno de gestión unificado.</p>
        <div className="zent-login-art" aria-hidden="true"><i/><i/><i/></div>
      </div>
      <div className="zent-login-card" style={{
        width: 'min(360px, calc(100% - 32px))',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 32,
        animation: 'fadeUp 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', marginBottom:28 }}>
          <img src={logo} alt="Logo Zent ERP" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
        </div>

        <div className="zent-login-title">
          <h2>Acceso del equipo</h2>
          <p>Inicia sesión con tu cuenta de trabajo.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="equipo@zent.example"
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <div style={{ padding:'8px 12px', background:'var(--red-lo)', border:'1px solid var(--red)', borderRadius:8, fontSize:12.5, color:'var(--red)' }}>
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} fullWidth>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}


