const { getPool, sql } = require('../config/db');

/**
 * Establece SESSION_CONTEXT(N'current_user_id') en la conexión activa.
 * Los triggers de auditoría de la BD leen este valor.
 *
 * Uso:
 *   const request = await setSessionContext(pool, usuarioId);
 *   await request.query('...');
 *
 * @param {import('mssql').ConnectionPool} pool
 * @param {number} userId
 * @returns {import('mssql').Request} request con el contexto ya configurado
 */
async function setSessionContext(pool, userId) {
    const request = pool.request();
    await request
        .input('userId', sql.Int, userId)
        .query(`EXEC sp_set_session_context N'current_user_id', @userId`);
    return request;
}

module.exports = { setSessionContext };
