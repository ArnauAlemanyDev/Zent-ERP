'use strict';
const TEAM_ROLES = ['admin', 'tecnico', 'vendedor', 'soporte'];
const validId = id => Number.isInteger(id) && id > 0 && id <= 2147483647;

// Verify the signature before touching the database; never trust a stale role or client association.
function createSessionAuthorization({ verify, findTeam, findPortal, onError = () => {} }) {
  const middleware = portal => async (req, res, next) => {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !/^Bearer [^\s]+$/i.test(header)) {
      return res.status(401).json({ error: 'Token no proporcionado o inválido' });
    }
    let payload;
    try {
      payload = verify(header.slice(7));
      if (!payload || !validId(payload.id) || !Number.isFinite(payload.exp)) throw Error('Invalid claims');
    } catch (_) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    if (portal ? payload.rol !== 'portal' : !TEAM_ROLES.includes(payload.rol)) {
      return res.status(403).json({ error: 'Acceso denegado para esta sesión' });
    }
    if (portal && !validId(payload.cliente_id)) {
      return res.status(401).json({ error: 'Sesión no válida' });
    }
    let user;
    try {
      user = await (portal ? findPortal(payload.id) : findTeam(payload.id));
    } catch (err) {
      onError(err);
      return res.status(503).json({ error: 'No se puede verificar la sesión' });
    }
    if (!user || user.id !== payload.id || (portal ? user.cliente_id !== payload.cliente_id : user.rol !== payload.rol)) {
      return res.status(401).json({ error: 'Sesión no válida. Inicia sesión de nuevo.' });
    }
    req.usuario = portal
      ? { id: user.id, cliente_id: user.cliente_id, email: user.email, rol: 'portal' }
      : { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    return next();
  };
  return { authMiddleware: middleware(false), portalAuthMiddleware: middleware(true) };
}
function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.usuario.rol)) return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    return next();
  };
}
module.exports = { createSessionAuthorization, requireRol };
