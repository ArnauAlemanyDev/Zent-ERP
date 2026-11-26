const VARIANTS = {
  // Prioridades
  urgente: { className: 'badge-red',    label: 'URGENTE' },
  alta:    { className: 'badge-yellow', label: 'ALTA' },
  media:   { className: 'badge-accent', label: 'MEDIA' },
  baja:    { className: 'badge-green',  label: 'BAJA' },

  // Estados ticket
  abierto:     { className: 'badge-yellow', label: 'Abierto' },
  en_progreso: { className: 'badge-accent', label: 'En progreso' },
  cerrado:     { className: 'badge-green',  label: 'Cerrado' },
  cancelado:   { className: 'badge-red',    label: 'Cancelado' },

  // Estados albarán
  recibido:                       { className: 'badge-gray',   label: 'Recibido' },
  en_diagnostico:                 { className: 'badge-accent', label: 'En diagnóstico' },
  en_reparacion:                  { className: 'badge-yellow', label: 'En reparación' },
  esperando_piezas:               { className: 'badge-accent', label: 'Esp. piezas' },
  esperando_confirmacion_cliente: { className: 'badge-accent', label: 'Esp. cliente' },
  listo_para_recoger:             { className: 'badge-green',  label: 'Listo recoger' },
  entregado:                      { className: 'badge-green',  label: 'Entregado' },

  // Estados dispositivo
  activo:     { className: 'badge-green',  label: 'Activo' },
  reparacion: { className: 'badge-yellow', label: 'Reparación' },
  vendido:    { className: 'badge-gray',   label: 'Vendido' },

  // Contratos
  pendiente: { className: 'badge-yellow', label: 'Pendiente' },
  vencido:   { className: 'badge-red',    label: 'Vencido' },

  // Licencias
  stock:      { className: 'badge-yellow', label: 'Stock' },
  implantada: { className: 'badge-green',  label: 'Implantada' },

  // Roles
  admin:   { className: 'badge-accent', label: 'Admin' },
  tecnico: { className: 'badge-gray',   label: 'Técnico' },
};

export default function Badge({ value, customLabel, className = '' }) {
  if (!value && !customLabel) return null;
  const v = VARIANTS[value] || { className: 'badge-gray', label: value || '' };
  
  return (
    <span className={`badge ${v.className} ${className}`}>
      {customLabel || v.label}
    </span>
  );
}
