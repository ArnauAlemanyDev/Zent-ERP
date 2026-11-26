const router = require('express').Router();
const sql = require('mssql');
const { startupLog } = require('../utils/startupLog');
const { authMiddleware, requireRol } = require('../middleware/auth');

// Pool independiente para la BD de licencias (mismas credenciales, BD distinta)
const licenciasConfig = {
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_LICENSE_NAME || 'zent_licencias',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
  pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
};

let licenciasPool = null;
async function getLicenciasPool() {
  if (licenciasPool) return licenciasPool;
  try {
    licenciasPool = new sql.ConnectionPool(licenciasConfig).connect();
    await licenciasPool;
    startupLog.info('LICENSES', 'SQL Server connection established');
    return licenciasPool;
  } catch (err) {
    licenciasPool = null;
    startupLog.error('LICENSES', 'SQL Server connection failed', err);
    throw err;
  }
}

function tableName(tipo) {
  return tipo === 'office' ? 'office' : 'windows10';
}

// GET /api/v1/licencias/:tipo?search=...&fecha=...
router.get('/:tipo', authMiddleware, async (req, res) => {
  try {
    const db = await getLicenciasPool();
    const table = tableName(req.params.tipo);
    const { search, fecha } = req.query;

    let query = `SELECT * FROM ${table}`;
    const conditions = [];
    const request = db.request();

    if (search && search.trim()) {
      conditions.push(`(cliente LIKE @search OR clave LIKE @search)`);
      request.input('search', sql.NVarChar, `%${search.trim()}%`);
    }
    if (fecha && fecha.trim()) {
      conditions.push(`fecha = @fecha`);
      request.input('fecha', sql.Date, fecha.trim());
    }
    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ` ORDER BY id DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('GET /licencias error:', err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// POST /api/v1/licencias/:tipo — solo admin
router.post('/:tipo', authMiddleware, requireRol('admin'), async (req, res) => {
  try {
    const db = await getLicenciasPool();
    const table = tableName(req.params.tipo);
    const { clave, version } = req.body;

    if (!clave || !clave.trim()) {
      return res.status(400).json({ error: 'La clave es obligatoria' });
    }

    let insertedId;
    if (table === 'office') {
      const result = await db.request()
        .input('clave', sql.NVarChar, clave.trim().toUpperCase())
        .input('version', sql.NVarChar, version || 'Office 2021 Pro Plus')
        .query(`
          INSERT INTO office (cliente, version, clave, fecha, anotacion)
          OUTPUT INSERTED.id
          VALUES ('', @version, @clave, NULL, '')
        `);
      insertedId = result.recordset[0].id;
    } else {
      const result = await db.request()
        .input('clave', sql.NVarChar, clave.trim().toUpperCase())
        .input('version', sql.NVarChar, version || null)
        .query(`
          INSERT INTO windows10 (cliente, version, clave, fecha, anotacion)
          OUTPUT INSERTED.id
          VALUES ('', @version, @clave, NULL, '')
        `);
      insertedId = result.recordset[0].id;
    }

    res.status(201).json({ id: insertedId });
  } catch (err) {
    console.error('POST /licencias error:', err);
    res.status(500).json({ error: 'Error al insertar la licencia' });
  }
});

// PUT /api/v1/licencias/:tipo/:id
router.put('/:tipo/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getLicenciasPool();
    const table = tableName(req.params.tipo);
    const id = parseInt(req.params.id);
    const { cliente, version, fecha, anotacion, defectuosa } = req.body;

    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    if (table === 'office') {
      await db.request()
        .input('cliente', sql.NVarChar, cliente || '')
        .input('version', sql.NVarChar, version || 'Office 2021 Pro Plus')
        .input('fecha', sql.Date, fecha || null)
        .input('anotacion', sql.NVarChar, anotacion || '')
        .input('defectuosa', sql.Bit, defectuosa ? 1 : 0)
        .input('id', sql.Int, id)
        .query(`
          UPDATE office
          SET cliente = @cliente, version = @version,
              fecha = @fecha, anotacion = @anotacion, defectuosa = @defectuosa
          WHERE id = @id
        `);
    } else {
      await db.request()
        .input('cliente', sql.NVarChar, cliente || '')
        .input('version', sql.NVarChar, version || null)
        .input('fecha', sql.Date, fecha || null)
        .input('anotacion', sql.NVarChar, anotacion || '')
        .input('defectuosa', sql.Bit, defectuosa ? 1 : 0)
        .input('id', sql.Int, id)
        .query(`
          UPDATE windows10
          SET cliente = @cliente, version = @version,
              fecha = @fecha, anotacion = @anotacion, defectuosa = @defectuosa
          WHERE id = @id
        `);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /licencias error:', err);
    res.status(500).json({ error: 'Error al actualizar la licencia' });
  }
});

// DELETE /api/v1/licencias/:tipo/:id — solo admin
router.delete('/:tipo/:id', authMiddleware, requireRol('admin'), async (req, res) => {
  try {
    const db = await getLicenciasPool();
    const table = tableName(req.params.tipo);
    const id = parseInt(req.params.id);

    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    await db.request()
      .input('id', sql.Int, id)
      .query(`DELETE FROM ${table} WHERE id = @id`);

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /licencias error:', err);
    res.status(500).json({ error: 'Error al eliminar la licencia' });
  }
});

module.exports = router;
