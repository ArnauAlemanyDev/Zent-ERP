require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const { getPool } = require('./config/db');
const path = require('path');
const { startupLog, endpoint } = require('./utils/startupLog');
const { version } = require('../package.json');
const { createOriginPolicy, securityHeaders, createApiGuard, apiErrorHandler } = require('./middleware/apiSecurity');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares globales ───────────────────────────────────────────────────
app.disable('x-powered-by');
app.use(securityHeaders);
const originPolicy = createOriginPolicy();
app.use('/api', createApiGuard(originPolicy), cors({
  origin: (origin, callback) => callback(null, origin === undefined ? false : origin),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Retain the existing Express default size limit, now explicit.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb', parameterLimit: 1000 }));

// ── Rutas ──────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', require('./routes/auth'));
// Próximas rutas (se irán añadiendo):
app.use('/api/v1/clientes', require('./routes/clientes'));
app.use('/api/v1/dispositivos', require('./routes/dispositivos'));
app.use('/api/v1/albaranes', require('./routes/albaranes'));
app.use('/api/v1/tickets', require('./routes/tickets'));
app.use('/api/v1/contratos', require('./routes/contratos'));
app.use('/api/v1/dashboard', require('./routes/dashboard'));
app.use('/api/v1/licencias', require('./routes/licencias'));
app.use('/api/v1/sesiones-remotas', require('./routes/sesiones-remotas'));
app.use('/api/portal', require('./routes/portal'));

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/v1/health', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: 'conectado', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Health]', err.name, err.code || '');
    res.status(500).json({ status: 'error', db: 'desconectado', message: 'Base de datos no disponible' });
  }
});

// ── Servir Portal Web Estático ─────────────────────────────────────────────
app.use('/portal', express.static(path.join(__dirname, '../../portal/dist')));
app.get('/portal/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../portal/dist/index.html'));
});

// ── 404 catch-all ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Error handler global ───────────────────────────────────────────────────
app.use(apiErrorHandler);

// ── Arranque ───────────────────────────────────────────────────────────────
const PORTAL_PORT = process.env.PORTAL_PORT || 8090;
const BIND_HOST = process.env.BIND_HOST || '127.0.0.1';

async function start() {
  startupLog.banner(version);
  await getPool(); // Verificar conexión antes de aceptar peticiones

  // Puerto interno (app de gestión) — sin cambios
  app.listen(PORT, BIND_HOST, () => {
    startupLog.info('API', `Listening at ${endpoint(BIND_HOST, PORT)}`);
    startupLog.info('HEALTH', endpoint(BIND_HOST, PORT, '/api/v1/health'));
  });

  // Puerto del portal de clientes (local por defecto)
  const portal = express();
  portal.disable('x-powered-by');
  portal.use(securityHeaders);
  portal.use((req, res, next) => {
    if (/^\/(portal|api\/portal)(\/|$)/.test(req.path)) return app(req, res, next);
    res.sendStatus(404);
  });
  portal.listen(PORTAL_PORT, BIND_HOST, () => {
    startupLog.info('PORTAL', `Listening at ${endpoint(BIND_HOST, PORTAL_PORT, '/portal/')}`);
  });
}

start().catch(err => { startupLog.error('STARTUP', 'Backend initialization failed', err); process.exitCode = 1; });
