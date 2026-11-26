import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Input, Button, Badge } from './ui';

export default function TimerSession({ tecnico, onSessionUpdated }) {
  const [activeSesion, setActiveSesion] = useState(null);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [descripcion, setDescripcion] = useState('');
  const [cliente_id, setClienteId] = useState('');
  const [dispositivo_id, setDispositivoId] = useState('');
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialSesiones, setHistorialSesiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [guardandoFinal, setGuardandoFinal] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [dispositivos, setDispositivos] = useState([]);

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, [tecnico?.id]);

  // Temporizador
  useEffect(() => {
    if (!activeSesion || activeSesion.estado !== 'activa') return;

    const interval = setInterval(() => {
      setTiempoTranscurrido(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSesion]);

  const calcularTiempo = (sesion) => {
    if (!sesion) return 0;
    const acumulado = Number(sesion.duracion_segundos) || 0;
    if (sesion.estado === 'activa' && sesion.fecha_inicio) {
      const inicio = new Date(sesion.fecha_inicio);
      return acumulado + Math.floor((Date.now() - inicio.getTime()) / 1000);
    }
    return acumulado;
  };

  const cargarDatos = async () => {
    if (!tecnico?.id) return;

    setActiveSesion(null);
    setTiempoTranscurrido(0);

    try {
      // Cargar sesiones activas o pausadas del técnico
      const sesiones = await api.get(`/sesiones-remotas/activas/${tecnico.id}`);
      if (sesiones && sesiones.length > 0) {
        const sesion = sesiones[0];
        setActiveSesion(sesion);
        setTiempoTranscurrido(Number(calcularTiempo(sesion)) || 0);
      } else {
        setActiveSesion(null);
        setTiempoTranscurrido(0);
      }

      // Cargar clientes y dispositivos
      const [clientesData, dispositivosData] = await Promise.all([
        api.get('/clientes'),
        api.get('/dispositivos')
      ]);
      
      setClientes(Array.isArray(clientesData) ? clientesData : clientesData?.data || []);
      setDispositivos(Array.isArray(dispositivosData) ? dispositivosData : dispositivosData?.data || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    }
  };

  const cargarHistorial = async () => {
    if (!tecnico?.id) return;
    setLoading(true);
    try {
      const sesiones = await api.get(`/sesiones-remotas/tecnico/${tecnico.id}`);
      setHistorialSesiones(Array.isArray(sesiones) ? sesiones : []);
      setShowHistorial(true);
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setLoading(false);
    }
  };

  const iniciarSesion = async () => {
    if (!tecnico?.id || !descripcion.trim()) {
      alert('Por favor completa la descripción del trabajo');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        tecnico_id: tecnico.id,
        descripcion: descripcion.trim(),
      };

      if (cliente_id !== '' && cliente_id !== null) {
        payload.cliente_id = Number(cliente_id);
      }
      if (dispositivo_id !== '' && dispositivo_id !== null) {
        payload.dispositivo_id = Number(dispositivo_id);
      }

      const nuevaSesion = await api.post('/sesiones-remotas', payload);
      
      setActiveSesion(nuevaSesion);
      setTiempoTranscurrido(0);
      setDescripcion('');
      setClienteId('');
      setDispositivoId('');
      
      if (onSessionUpdated) onSessionUpdated(nuevaSesion);
    } catch (err) {
      console.error('Error iniciando sesión:', err);
      alert('Error al iniciar la sesión: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const pausarSesion = async () => {
    if (!activeSesion?.id) return;
    setLoading(true);
    try {
      const sesionActualizada = await api.patch(`/sesiones-remotas/${activeSesion.id}/pausar`);
      setActiveSesion(sesionActualizada);
      const nuevoTiempo = Number(calcularTiempo(sesionActualizada));
      setTiempoTranscurrido(Number.isFinite(nuevoTiempo) && nuevoTiempo > 0 ? nuevoTiempo : tiempoTranscurrido);
      if (onSessionUpdated) onSessionUpdated(sesionActualizada);
    } catch (err) {
      console.error('Error pausando sesión:', err);
      alert('Error al pausar: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const reanudarSesion = async () => {
    if (!activeSesion?.id) return;
    setLoading(true);
    try {
      const sesionActualizada = await api.patch(`/sesiones-remotas/${activeSesion.id}/reanudar`);
      setActiveSesion(sesionActualizada);
      setTiempoTranscurrido(Number(calcularTiempo(sesionActualizada)) || 0);
      if (onSessionUpdated) onSessionUpdated(sesionActualizada);
    } catch (err) {
      console.error('Error reanudando sesión:', err);
      alert('Error al reanudar: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const finalizarSesion = async () => {
    if (!activeSesion?.id) return;
    setGuardandoFinal(true);
    try {
      await api.post(`/sesiones-remotas/${activeSesion.id}/finalizar`, {
        observaciones: null,
      });
      await cargarDatos();
      setActiveSesion(null);
      setTiempoTranscurrido(0);
      if (onSessionUpdated) onSessionUpdated(null);
      
      if (showHistorial) {
        await cargarHistorial();
      }
    } catch (err) {
      console.error('Error finalizando sesión:', err);
      alert('Error al finalizar: ' + (err.message || 'Error desconocido'));
    } finally {
      setGuardandoFinal(false);
    }
  };

  const formatearTiempo = (segundos) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;
  };

  const tiempoVisible = activeSesion
    ? activeSesion.estado === 'activa'
      ? tiempoTranscurrido
      : calcularTiempo(activeSesion)
    : tiempoTranscurrido;

  const hasClienteSeleccionado = cliente_id !== '' && cliente_id !== null;

  const dispForClient = hasClienteSeleccionado
    ? dispositivos.filter(d => d.cliente_id == cliente_id)
    : [];

  const dispositivoOptions = [
    { value: '', label: hasClienteSeleccionado ? 'Sin dispositivo específico' : 'Selecciona primero un cliente' },
    ...dispForClient.map(d => ({ value: String(d.id), label: `${d.marca} ${d.modelo}` }))
  ];

  return (
    <div className="zent-remote-session" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      
      {!activeSesion ? (
        // Formulario para iniciar sesión
        <div className="zent-remote-form" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>
            Iniciar sesión remota
          </div>

          <Input
            label="Descripción del trabajo *"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Ej: Instalación de software, soporte técnico..."
            required
          />

          <Input
            label="Cliente (opcional)"
            as="select"
            value={cliente_id}
            onChange={(e) => {
              setClienteId(e.target.value);
              setDispositivoId('');
            }}
            options={[{ value: '', label: 'Selecciona un cliente...' }, ...clientes.map(c => ({ value: String(c.id), label: `${c.nombre} ${c.apellidos}` }))]}
          />

          <Input
            label="Dispositivo (opcional)"
            as="select"
            value={dispositivo_id}
            onChange={e => setDispositivoId(e.target.value)}
            disabled={!hasClienteSeleccionado}
            options={dispositivoOptions}
          />

          <Button
            onClick={iniciarSesion}
            disabled={loading || !descripcion.trim()}
            variant="primary"
            size="sm"
            fullWidth
          >
            {loading ? 'Iniciando...' : 'Iniciar temporizador'}
          </Button>

          <Button
            onClick={() => {
              if (!showHistorial) {
                cargarHistorial();
              } else {
                setShowHistorial(false);
              }
            }}
            disabled={loading}
            variant="ghost"
            size="sm"
            fullWidth
          >
            {showHistorial ? 'Ocultar historial' : 'Historial de sesiones'}
          </Button>
        </div>
      ) : (
        // Temporizador activo
        <div className="zent-remote-active" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px', background: 'linear-gradient(135deg, var(--accent-lo) 0%, var(--elevated) 100%)', borderRadius: 'var(--radius)', border: '1px solid var(--accent)', position: 'relative', overflow: 'hidden' }}>
          {/* Indicador de estado */}
          <div style={{ position: 'absolute', top: 8, right: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: activeSesion.estado === 'activa' ? 'var(--green)' : 'var(--yellow)',
              animation: activeSesion.estado === 'activa' ? 'pulse 2s ease-in-out infinite' : 'none'
            }} />
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              {activeSesion.estado === 'activa' ? 'En progreso' : 'Pausada'}
            </span>
          </div>

          {/* Descripción */}
          {activeSesion.descripcion && (
            <div style={{ fontSize: 11, color: 'var(--text-sub)', marginBottom: 4 }}>
              {activeSesion.descripcion}
            </div>
          )}

          {/* Temporizador grande */}
          <div style={{
            fontSize: 28,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent)',
            textAlign: 'center',
            margin: '6px 0 10px 0',
            letterSpacing: '0.05em'
          }}>
            {formatearTiempo(tiempoVisible)}
          </div>

          {/* Botones de control */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {activeSesion.estado === 'activa' ? (
              <Button
                onClick={pausarSesion}
                disabled={loading}
                variant="primary"
                size="sm"
              >
                Pausar
              </Button>
            ) : (
              <Button
                onClick={reanudarSesion}
                disabled={loading}
                variant="primary"
                size="sm"
              >
                Reanudar
              </Button>
            )}
            <Button
              onClick={finalizarSesion}
              disabled={guardandoFinal || loading}
              variant="danger"
              size="sm"
              style={{ gridColumn: 'span 2' }}
            >
              {guardandoFinal ? 'Finalizando...' : 'Finalizar sesión'}
            </Button>
          </div>
        </div>
      )}

      {/* Historial de sesiones */}
      {showHistorial && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>
            Historial de sesiones
          </div>

          {loading ? (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '12px' }}>
              Cargando historial...
            </div>
          ) : historialSesiones.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '12px' }}>
              No hay sesiones registradas
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
              {historialSesiones.slice(0, 10).map(sesion => (
                <div key={sesion.id} style={{
                  padding: '12px 14px',
                  background: 'var(--elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  fontSize: 11,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-high)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sesion.descripcion || 'Sin descripción'}
                      </div>
                      {(sesion.cliente_nombre || sesion.dispositivo_marca) && (
                        <div style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {sesion.cliente_nombre && <div><strong>Cliente:</strong> {sesion.cliente_nombre}</div>}
                          {sesion.dispositivo_marca && <div><strong>Dispositivo:</strong> {sesion.dispositivo_marca}{sesion.dispositivo_modelo ? ` ${sesion.dispositivo_modelo}` : ''}</div>}
                        </div>
                      )}
                    </div>
                    <Badge value={sesion.estado} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', color: 'var(--text-dim)', fontSize: 10 }}>
                    <span>
                      Duración: {sesion.duracion_segundos ? `${Math.floor(sesion.duracion_segundos / 3600)}h ${Math.floor((sesion.duracion_segundos % 3600) / 60)}m` : '—'}
                    </span>
                    {sesion.fecha_fin && <span>Finalizada: {new Date(sesion.fecha_fin).toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
