const { getPool, sql } = require('../config/db');

// Obtener todas las sesiones remotas (con filtros opcionales)
const getAllSesionesRemotas = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                sr.id, sr.tecnico_id, sr.cliente_id, sr.dispositivo_id,
                sr.fecha_inicio, sr.fecha_fin, sr.duracion_segundos,
                sr.descripcion, sr.estado, sr.observaciones, sr.fecha_creacion,
                u.nombre AS tecnico_nombre, u.email AS tecnico_email,
                c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos,
                d.marca AS dispositivo_marca, d.modelo AS dispositivo_modelo
            FROM sesiones_remotas sr
            LEFT JOIN usuarios u ON sr.tecnico_id = u.id
            LEFT JOIN clientes c ON sr.cliente_id = c.id
            LEFT JOIN dispositivos d ON sr.dispositivo_id = d.id
            ORDER BY sr.fecha_inicio DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('[getAllSesionesRemotas Error]', error);
        res.status(500).json({ error: 'Error al obtener las sesiones remotas' });
    }
};

// Obtener una sesión remota por su ID
const getSesionRemotaById = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
                SELECT 
                    sr.id, sr.tecnico_id, sr.cliente_id, sr.dispositivo_id,
                    sr.fecha_inicio, sr.fecha_fin, sr.duracion_segundos,
                    sr.descripcion, sr.estado, sr.observaciones, sr.fecha_creacion,
                    u.nombre AS tecnico_nombre, u.email AS tecnico_email,
                    c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos,
                    d.marca AS dispositivo_marca, d.modelo AS dispositivo_modelo
                FROM sesiones_remotas sr
                LEFT JOIN usuarios u ON sr.tecnico_id = u.id
                LEFT JOIN clientes c ON sr.cliente_id = c.id
                LEFT JOIN dispositivos d ON sr.dispositivo_id = d.id
                WHERE sr.id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Sesión remota no encontrada' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[getSesionRemotaById Error]', error);
        res.status(500).json({ error: 'Error al obtener la sesión remota' });
    }
};

// Obtener sesiones activas de un técnico
const getSesionesActivasTecnico = async (req, res) => {
    const { tecnico_id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('tecnico_id', tecnico_id)
            .query(`
                SELECT 
                    sr.id, sr.tecnico_id, sr.cliente_id, sr.dispositivo_id,
                    sr.fecha_inicio, sr.fecha_fin, sr.duracion_segundos,
                    sr.descripcion, sr.estado, sr.observaciones,
                    c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos,
                    d.marca AS dispositivo_marca, d.modelo AS dispositivo_modelo
                FROM sesiones_remotas sr
                LEFT JOIN clientes c ON sr.cliente_id = c.id
                LEFT JOIN dispositivos d ON sr.dispositivo_id = d.id
                WHERE sr.tecnico_id = @tecnico_id AND sr.estado IN ('activa', 'pausada')
                ORDER BY sr.fecha_inicio DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('[getSesionesActivasTecnico Error]', error);
        res.status(500).json({ error: 'Error al obtener las sesiones activas del técnico' });
    }
};

// Obtener historial de sesiones de un técnico
const getSesionesTecnico = async (req, res) => {
    const { tecnico_id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('tecnico_id', tecnico_id)
            .query(`
                SELECT 
                    sr.id, sr.tecnico_id, sr.cliente_id, sr.dispositivo_id,
                    sr.fecha_inicio, sr.fecha_fin, sr.duracion_segundos,
                    sr.descripcion, sr.estado, sr.observaciones, sr.fecha_creacion,
                    c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos,
                    d.marca AS dispositivo_marca, d.modelo AS dispositivo_modelo
                FROM sesiones_remotas sr
                LEFT JOIN clientes c ON sr.cliente_id = c.id
                LEFT JOIN dispositivos d ON sr.dispositivo_id = d.id
                WHERE sr.tecnico_id = @tecnico_id
                ORDER BY sr.fecha_inicio DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('[getSesionesTecnico Error]', error);
        res.status(500).json({ error: 'Error al obtener el historial de sesiones' });
    }
};

// Crear una nueva sesión remota
const crearSesionRemota = async (req, res) => {
    const { tecnico_id, cliente_id, dispositivo_id, descripcion } = req.body;

    if (!tecnico_id) {
        return res.status(400).json({ error: 'El tecnico_id es requerido' });
    }

    try {
        const pool = await getPool();

        // Verificar que el técnico existe
        const tecnicoExist = await pool.request()
            .input('tecnico_id', sql.Int, Number(tecnico_id))
            .query('SELECT id FROM usuarios WHERE id = @tecnico_id AND activo = 1');
        
        if (tecnicoExist.recordset.length === 0) {
            return res.status(404).json({ error: 'Técnico no encontrado o inactivo' });
        }

        // Crear la sesión
        const insertResult = await pool.request()
            .input('tecnico_id', sql.Int, Number(tecnico_id))
            .input('cliente_id', sql.Int, cliente_id !== undefined && cliente_id !== null ? Number(cliente_id) : null)
            .input('dispositivo_id', sql.Int, dispositivo_id !== undefined && dispositivo_id !== null ? Number(dispositivo_id) : null)
            .input('descripcion', sql.NVarChar(sql.MAX), descripcion || null)
            .query(`
                INSERT INTO sesiones_remotas (tecnico_id, cliente_id, dispositivo_id, descripcion, estado, fecha_inicio, duracion_segundos)
                OUTPUT INSERTED.id AS newId
                VALUES (@tecnico_id, @cliente_id, @dispositivo_id, @descripcion, 'activa', GETDATE(), 0);
            `);

        const insertedId = insertResult.recordset[0]?.newId;
        if (!insertedId) {
            return res.status(500).json({ error: 'No se pudo crear la sesión remota' });
        }

        const result = await pool.request()
            .input('id', insertedId)
            .query(`
                SELECT 
                    sr.id, sr.tecnico_id, sr.cliente_id, sr.dispositivo_id,
                    sr.fecha_inicio, sr.fecha_fin, sr.duracion_segundos,
                    sr.descripcion, sr.estado, sr.observaciones,
                    u.nombre AS tecnico_nombre, c.nombre AS cliente_nombre,
                    d.marca AS dispositivo_marca, d.modelo AS dispositivo_modelo
                FROM sesiones_remotas sr
                LEFT JOIN usuarios u ON sr.tecnico_id = u.id
                LEFT JOIN clientes c ON sr.cliente_id = c.id
                LEFT JOIN dispositivos d ON sr.dispositivo_id = d.id
                WHERE sr.id = @id;
            `);

        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('[crearSesionRemota Error]', error);
        res.status(500).json({ error: 'Error al crear la sesión remota' });
    }
};

// Pausar una sesión remota
const pausarSesion = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await getPool();

        // Verificar que la sesión existe y está activa
        const sesionExist = await pool.request()
            .input('id', id)
            .query('SELECT estado FROM sesiones_remotas WHERE id = @id');

        if (sesionExist.recordset.length === 0) {
            return res.status(404).json({ error: 'Sesión remota no encontrada' });
        }

        if (sesionExist.recordset[0].estado !== 'activa') {
            return res.status(400).json({ error: 'Solo se pueden pausar sesiones activas' });
        }

        // Actualizar estado a pausada y guardar tiempo acumulado
        await pool.request()
            .input('id', id)
            .query(`
                UPDATE sesiones_remotas
                SET estado = 'pausada',
                    duracion_segundos = ISNULL(duracion_segundos, 0) + DATEDIFF(second, fecha_inicio, GETDATE()),
                    fecha_inicio = NULL
                WHERE id = @id
            `);

        // Obtener la sesión actualizada
        const result = await pool.request()
            .input('id', id)
            .query(`
                SELECT 
                    sr.id, sr.tecnico_id, sr.cliente_id, sr.dispositivo_id,
                    sr.fecha_inicio, sr.fecha_fin, sr.duracion_segundos,
                    sr.descripcion, sr.estado, sr.observaciones
                FROM sesiones_remotas sr
                WHERE sr.id = @id
            `);

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[pausarSesion Error]', error);
        res.status(500).json({ error: 'Error al pausar la sesión' });
    }
};

// Reanudar una sesión remota pausada
const reanudarSesion = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await getPool();

        // Verificar que la sesión existe y está pausada
        const sesionExist = await pool.request()
            .input('id', id)
            .query('SELECT estado FROM sesiones_remotas WHERE id = @id');

        if (sesionExist.recordset.length === 0) {
            return res.status(404).json({ error: 'Sesión remota no encontrada' });
        }

        if (sesionExist.recordset[0].estado !== 'pausada') {
            return res.status(400).json({ error: 'Solo se pueden reanudar sesiones pausadas' });
        }

        // Actualizar estado a activa y comenzar nueva etapa de tiempo
        await pool.request()
            .input('id', id)
            .query(`
                UPDATE sesiones_remotas
                SET estado = 'activa',
                    fecha_inicio = GETDATE()
                WHERE id = @id
            `);

        // Obtener la sesión actualizada
        const result = await pool.request()
            .input('id', id)
            .query(`
                SELECT 
                    sr.id, sr.tecnico_id, sr.cliente_id, sr.dispositivo_id,
                    sr.fecha_inicio, sr.fecha_fin, sr.duracion_segundos,
                    sr.descripcion, sr.estado, sr.observaciones
                FROM sesiones_remotas sr
                WHERE sr.id = @id
            `);

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[reanudarSesion Error]', error);
        res.status(500).json({ error: 'Error al reanudar la sesión' });
    }
};

// Finalizar una sesión remota
const finalizarSesion = async (req, res) => {
    const { id } = req.params;
    const { observaciones } = req.body;

    try {
        const pool = await getPool();

        // Obtener la sesión
        const sesionExist = await pool.request()
            .input('id', id)
            .query('SELECT estado, fecha_inicio, duracion_segundos FROM sesiones_remotas WHERE id = @id');

        if (sesionExist.recordset.length === 0) {
            return res.status(404).json({ error: 'Sesión remota no encontrada' });
        }

        const sesion = sesionExist.recordset[0];
        
        if (sesion.estado === 'finalizada') {
            return res.status(400).json({ error: 'La sesión ya ha sido finalizada' });
        }

        let duracionSegundos = sesion.duracion_segundos || 0;
        if (sesion.estado === 'activa') {
            const fechaInicio = new Date(sesion.fecha_inicio);
            duracionSegundos += Math.floor((Date.now() - fechaInicio.getTime()) / 1000);
        }

        // Actualizar sesión
        await pool.request()
            .input('id', id)
            .input('duracion_segundos', duracionSegundos)
            .input('observaciones', observaciones || null)
            .query(`
                UPDATE sesiones_remotas 
                SET estado = 'finalizada', 
                    fecha_fin = GETDATE(), 
                    duracion_segundos = @duracion_segundos,
                    observaciones = ISNULL(@observaciones, observaciones),
                    fecha_inicio = NULL
                WHERE id = @id
            `);

        // Obtener la sesión actualizada
        const result = await pool.request()
            .input('id', id)
            .query(`
                SELECT 
                    sr.id, sr.tecnico_id, sr.cliente_id, sr.dispositivo_id,
                    sr.fecha_inicio, sr.fecha_fin, sr.duracion_segundos,
                    sr.descripcion, sr.estado, sr.observaciones,
                    u.nombre AS tecnico_nombre, c.nombre AS cliente_nombre,
                    d.marca AS dispositivo_marca, d.modelo AS dispositivo_modelo
                FROM sesiones_remotas sr
                LEFT JOIN usuarios u ON sr.tecnico_id = u.id
                LEFT JOIN clientes c ON sr.cliente_id = c.id
                LEFT JOIN dispositivos d ON sr.dispositivo_id = d.id
                WHERE sr.id = @id
            `);

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[finalizarSesion Error]', error);
        res.status(500).json({ error: 'Error al finalizar la sesión' });
    }
};

module.exports = {
    getAllSesionesRemotas,
    getSesionRemotaById,
    getSesionesActivasTecnico,
    getSesionesTecnico,
    crearSesionRemota,
    pausarSesion,
    reanudarSesion,
    finalizarSesion
};
