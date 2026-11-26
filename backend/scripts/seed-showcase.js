// Optional, additive showcase data for the local Zent ERP demonstration.
const fs = require('node:fs');
const path = require('node:path');
const sql = require('mssql');
const root = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(root, '.env') });

async function main() {
  const env = process.env;
  if (!['127.0.0.1', 'localhost'].includes(env.DB_HOST) ||
      env.DB_NAME !== 'zent_gestion' || env.DB_USER !== 'zent_app' || !env.DB_PASSWORD) {
    throw new Error('This script requires the initialized local Zent demo configuration.');
  }
  if (!process.argv.includes('--apply')) {
    console.log('Showcase seed: adds synthetic records only. Use --apply to insert them.');
    return;
  }
  const pool = new sql.ConnectionPool({
    server: env.DB_HOST, port: Number(env.DB_PORT || 1433),
    database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
  });
  try {
    await pool.connect();
    const script = fs.readFileSync(path.join(root, 'database/showcase.sql'), 'utf8');
    const result = await pool.request().batch(script);
    console.table(result.recordset);
  } finally {
    await pool.close();
  }
}
main().catch(error => {
  console.error('Showcase seed failed; no success was recorded.', error.code || '', error.number || '');
  process.exitCode = 1;
});
