'use strict';
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');
const { createSessionAuthorization, requireRol } = require('./sessionAuthorization');

const middlewares = createSessionAuthorization({
  verify: token => jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }),
  findTeam: async id => (await (await getPool()).request().input('id', sql.Int, id).query(`
    SELECT id, nombre, email, rol FROM usuarios WHERE id = @id AND activo = 1
  `)).recordset[0],
  findPortal: async id => (await (await getPool()).request().input('id', sql.Int, id).query(`
    SELECT p.id, p.cliente_id, p.email FROM portal_usuarios p
    INNER JOIN clientes c ON c.id = p.cliente_id
    WHERE p.id = @id AND p.activo = 1 AND c.activo = 1
  `)).recordset[0],
  onError: err => console.error('[auth/session]', err.name, err.code || '')
});
module.exports = { ...middlewares, requireRol };
