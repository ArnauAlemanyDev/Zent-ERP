const sql = require('mssql');
const { startupLog } = require('../utils/startupLog');
require('dotenv').config();

const config = {
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,             // true si usas Azure o TLS forzado
    trustServerCertificate: true, // necesario en entornos de desarrollo locales
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Pool de conexiones reutilizable
let pool = null;

async function getPool() {
  if (pool) return pool;
  try {
    pool = await sql.connect(config);
    startupLog.info('DATABASE', `SQL Server connected | ${config.database} @ ${config.server}:${config.port}`);
    return pool;
  } catch (err) {
    startupLog.error('DATABASE', 'SQL Server connection failed', err);
    throw err;
  }
}

module.exports = { getPool, sql };
