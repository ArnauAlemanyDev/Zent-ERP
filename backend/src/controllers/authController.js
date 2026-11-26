const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Devuelve: { token, usuario: { id, nombre, email, rol } }
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    const pool = await getPool();

    // Buscar usuario activo por email
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT id, nombre, email, password_hash, rol, activo
        FROM usuarios
        WHERE email = @email AND activo = 1
      `);

    const usuario = result.recordset[0];

    if (!usuario) {
      // Registrar intento fallido (sin revelar si el email existe)
      await registrarIntentoFallido(pool, email, req.ip);
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Verificar contraseña con bcrypt
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      await registrarIntentoFallido(pool, email, req.ip);
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Actualizar último acceso
    await pool.request()
      .input('id', sql.Int, usuario.id)
      .query(`UPDATE usuarios SET ultimo_acceso = GETDATE() WHERE id = @id`);

    // Generar JWT
    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      token,
      usuario: {
        id:     usuario.id,
        nombre: usuario.nombre,
        email:  usuario.email,
        rol:    usuario.rol,
      },
    });

  } catch (err) {
    console.error('[auth/login]', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/auth/me
 * Devuelve los datos del usuario autenticado (requiere JWT válido).
 */
async function me(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.usuario.id)
      .query(`
        SELECT id, nombre, email, rol, telefono, ultimo_acceso
        FROM usuarios
        WHERE id = @id AND activo = 1
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(result.recordset[0]);
  } catch (err) {
    console.error('[auth/me]', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ── Helper: registra intento de login fallido ──────────────────────────────
async function registrarIntentoFallido(pool, email, ip) {
  try {
    await pool.request()
      .input('email', sql.NVarChar, email)
      .input('ip',    sql.NVarChar, ip || 'desconocida')
      .query(`
        INSERT INTO intentos_login (email, ip_origen, exitoso)
        VALUES (@email, @ip, 0)
      `);
  } catch (_) {
    // No interrumpir el flujo si falla el log
  }
}

/**
 * GET /api/auth/usuarios
 * Devuelve la lista de todos los usuarios activos (id, nombre, email, rol).
 * Requiere JWT válido.
 */
async function getUsuarios(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, nombre, email, rol
      FROM usuarios
      WHERE activo = 1
      ORDER BY nombre ASC
    `);
    return res.json(result.recordset);
  } catch (err) {
    console.error('[auth/getUsuarios]', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { login, me, getUsuarios };
