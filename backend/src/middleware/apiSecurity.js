'use strict';

// Exact allowlists; never reflect an arbitrary Origin. Extra origins are opt-in.
function originSet(defaults, extra = '') {
  const set = new Set(defaults);
  for (const value of extra.split(',').map(s => s.trim()).filter(Boolean)) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value) {
      throw new Error('ZENT origins must be exact http(s) origins without a trailing slash');
    }
    set.add(value);
  }
  return set;
}
function loopbackOrigins(port) {
  return [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
}
function createOriginPolicy(env = process.env) {
  const internal = originSet(loopbackOrigins(5180), env.ZENT_ERP_ORIGINS);
  const portal = originSet([
    ...loopbackOrigins(env.PORTAL_PORT || 8090),
    ...loopbackOrigins(env.PORT || 3001),
    ...loopbackOrigins(5173), // Vite's default portal dev server
  ], env.ZENT_PORTAL_ORIGINS);
  return (req) => {
    const origin = req.headers.origin;
    if (origin === undefined) return true; // CLI/non-browser; JWT remains mandatory.
    if (/^\/v1(?:\/|$)/i.test(req.path)) {
      // Packaged Electron currently loads file://. Restrict its opaque origin to local peers.
      if (origin === 'null') return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress);
      return internal.has(origin);
    }
    if (/^\/portal(?:\/|$)/i.test(req.path)) return portal.has(origin);
    return false;
  };
}
function securityHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');
  next();
}
function createApiGuard(policy) {
  return (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.vary('Origin');
    if (!policy(req)) return res.status(403).json({ error: 'Origen no permitido' });
    next();
  };
}
function validatePortalTicket(req, res, next) {
  const body = req.body;
  const invalid = (error) => res.status(400).json({ error });
  if (!body || typeof body !== 'object' || Array.isArray(body)) return invalid('Solicitud no válida');
  const { titulo, descripcion, prioridad = 'media', contacto } = body;
  if (typeof titulo !== 'string' || !titulo.trim() || titulo.length > 255) return invalid('El título debe contener entre 1 y 255 caracteres');
  if (typeof descripcion !== 'string' || !descripcion.trim()) return invalid('La descripción es obligatoria');
  if (!['baja', 'media', 'alta', 'urgente'].includes(prioridad)) return invalid('Prioridad no válida');
  if (contacto !== undefined && contacto !== null && (typeof contacto !== 'string' || contacto.length > 255)) return invalid('El contacto debe ser un texto de hasta 255 caracteres');
  next();
}
function apiErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode;
  if (status === 400) return res.status(400).json({ error: 'Petición no válida' });
  if (status === 413) return res.status(413).json({ error: 'Petición demasiado grande' });
  if (status === 415) return res.status(415).json({ error: 'Formato de petición no admitido' });
  // Avoid logging the raw body or the complete error object (may contain secrets).
  console.error('[Error global]', err.name, err.code || '');
  return res.status(500).json({ error: 'Error interno del servidor' });
}
module.exports = { createOriginPolicy, securityHeaders, createApiGuard, validatePortalTicket, apiErrorHandler };
