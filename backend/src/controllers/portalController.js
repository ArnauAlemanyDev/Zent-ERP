const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

/**
 * POST /api/portal/auth/login
 * Body: { email, password }
 * Devuelve: { token, usuario: { id, cliente_id, rol: 'portal' } }
 */
async function portalLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    const pool = await getPool();

    // Buscar usuario del portal activo
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT p.id, p.cliente_id, p.email, p.password_hash, p.activo
        FROM portal_usuarios p
        INNER JOIN clientes c ON c.id = p.cliente_id
        WHERE p.email = @email AND p.activo = 1 AND c.activo = 1
      `);

    const usuario = result.recordset[0];

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Verificar contraseña con bcrypt
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Generar JWT
    const token = jwt.sign(
      { id: usuario.id, cliente_id: usuario.cliente_id, email: usuario.email, rol: 'portal' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        cliente_id: usuario.cliente_id,
        email: usuario.email,
        rol: 'portal',
      },
    });

  } catch (err) {
    console.error('[portal/login]', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/portal/tickets
 * Body: { titulo, descripcion, prioridad? }
 * Crea un ticket externo con origen: 'externo'
 */
async function portalCrearTicket(req, res) {
  const { titulo, descripcion, prioridad = 'media', categoria, impacto, contacto } = req.body;
  const cliente_id = req.usuario.cliente_id;

  // Validar campos requeridos
  if (!titulo || !titulo.trim()) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }
  if (!descripcion || !descripcion.trim()) {
    return res.status(400).json({ error: 'La descripción es obligatoria' });
  }

  try {
    const pool = await getPool();

    // Validar que el cliente existe
    const clienteExist = await pool.request()
      .input('cliente_id', sql.Int, cliente_id)
      .query('SELECT id FROM clientes WHERE id = @cliente_id AND activo = 1');

    if (clienteExist.recordset.length === 0) {
      return res.status(403).json({ error: 'Cliente no encontrado o inactivo' });
    }

    // Crear ticket con metadatos JSON extendidos
    const metadatosObj = { 
      origen: 'externo',
      contacto: contacto || ''
    };
    const metadatos = JSON.stringify(metadatosObj);
    const estado = 'abierto';

    const result = await pool.request()
      .input('cliente_id', sql.Int, cliente_id)
      .input('titulo', sql.NVarChar, titulo)
      .input('descripcion', sql.NVarChar, descripcion)
      .input('prioridad', sql.NVarChar, prioridad)
      .input('estado', sql.NVarChar, estado)
      .input('metadatos', sql.NVarChar(sql.MAX), metadatos)
      .query(`
        INSERT INTO tickets (cliente_id, titulo, descripcion, prioridad, estado, metadatos, fecha_creacion)
        VALUES (@cliente_id, @titulo, @descripcion, @prioridad, @estado, @metadatos, GETDATE())
        SELECT SCOPE_IDENTITY() AS id
      `);

    const ticketId = result.recordset[0].id;

    return res.status(201).json({
      id: ticketId,
      cliente_id,
      titulo,
      descripcion,
      prioridad,
      estado,
      metadatos: metadatosObj,
      fecha_creacion: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[portal/createTicket]', err.message);
    return res.status(500).json({ error: 'Error al crear el ticket' });
  }
}

/**
 * GET /api/portal/tickets
 * Devuelve tickets del cliente donde origen = 'externo'
 */
async function portalGetMisTickets(req, res) {
  const cliente_id = req.usuario.cliente_id;

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('cliente_id', sql.Int, cliente_id)
      .query(`
        SELECT id, titulo, descripcion, estado, prioridad, fecha_creacion, metadatos
        FROM tickets
        WHERE cliente_id = @cliente_id
          AND metadatos LIKE '%"origen":"externo"%'
        ORDER BY fecha_creacion DESC
      `);

    return res.json(result.recordset);

  } catch (err) {
    console.error('[portal/getMisTickets]', err.message);
    return res.status(500).json({ error: 'Error al obtener tickets' });
  }
}

module.exports = {
  portalLogin,
  portalCrearTicket,
  portalGetMisTickets,
};
