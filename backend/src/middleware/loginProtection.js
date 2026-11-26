'use strict';

// A bounded, process-local limiter. Each login route creates its own instance.
// Express's default trust proxy=false uses the direct peer, not forwarded headers.
function createLoginLimiter({ limit = 10, windowMs = 60_000, maxKeys = 4096, now = Date.now } = {}) {
  const attempts = new Map();
  return (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const time = now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    let entry = attempts.get(key);
    if (!entry || entry.resetAt <= time) {
      if (attempts.size >= maxKeys) {
        for (const [ip, value] of attempts) {
          if (value.resetAt <= time) attempts.delete(ip);
        }
      }
      if (!attempts.has(key) && attempts.size >= maxKeys) {
        res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
        return res.status(429).json({ error: 'Demasiadas solicitudes. Inténtalo más tarde.' });
      }
      entry = { count: 0, resetAt: time + windowMs };
      attempts.set(key, entry);
    }
    if (entry.count >= limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - time) / 1000))));
      return res.status(429).json({ error: 'Demasiados intentos de inicio de sesión. Inténtalo más tarde.' });
    }
    entry.count++;
    return next();
  };
}

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  // Both SQL email columns are NVARCHAR(100). Preserve existing password semantics.
  if (typeof email !== 'string' || !email.trim() || email.length > 100 ||
      typeof password !== 'string' || !password.length || Buffer.byteLength(password, 'utf8') > 1024) {
    return res.status(400).json({ error: 'Email o contraseña no válidos' });
  }
  return next();
}

module.exports = { createLoginLimiter, validateLogin };
