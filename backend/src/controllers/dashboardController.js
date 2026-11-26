const { getPool } = require('../config/db');

// Obtener estadísticas generales del dashboard
const getDashboardStats = async (req, res) => {
    try {
        const pool = await getPool();

        // Obtener todos los datos en paralelo
        const [
            clientesCount,
            dispositivosCount,
            ticketsCount,
            albaranesCount,
            usuariosCount
        ] = await Promise.all([
            pool.request().query('SELECT COUNT(*) AS total FROM clientes WHERE activo = 1'),
            pool.request().query('SELECT COUNT(*) AS total FROM dispositivos WHERE estado != \'baja\''),
            pool.request().query('SELECT COUNT(*) AS total FROM tickets WHERE estado != \'cancelado\''),
            pool.request().query('SELECT COUNT(*) AS total FROM albaranes WHERE estado != \'cancelado\''),
            pool.request().query('SELECT COUNT(*) AS total FROM usuarios WHERE activo = 1')
        ]);

        res.json({
            clientes: clientesCount.recordset[0].total,
            dispositivos: dispositivosCount.recordset[0].total,
            tickets: ticketsCount.recordset[0].total,
            albaranes: albaranesCount.recordset[0].total,
            usuarios: usuariosCount.recordset[0].total
        });
    } catch (error) {
        console.error('[getDashboardStats Error]', error);
        res.status(500).json({ error: 'Error al obtener estadísticas del dashboard' });
    }
};

// Obtener resumen de tickets por estado y prioridad
const getTicketsResumen = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                estado,
                prioridad,
                COUNT(*) AS cantidad
            FROM tickets
            WHERE estado != 'cancelado'
            GROUP BY estado, prioridad
            ORDER BY estado, prioridad
        `);

        // Agrupar por estado
        const resumen = {};
        result.recordset.forEach(row => {
            if (!resumen[row.estado]) {
                resumen[row.estado] = {};
            }
            resumen[row.estado][row.prioridad] = row.cantidad;
        });

        res.json(resumen);
    } catch (error) {
        console.error('[getTicketsResumen Error]', error);
        res.status(500).json({ error: 'Error al obtener resumen de tickets' });
    }
};

// Obtener resumen de albaranes por estado
const getAlbaranesResumen = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                estado,
                COUNT(*) AS cantidad
            FROM albaranes
            WHERE estado != 'cancelado'
            GROUP BY estado
            ORDER BY estado
        `);

        const resumen = {};
        result.recordset.forEach(row => {
            resumen[row.estado] = row.cantidad;
        });

        res.json(resumen);
    } catch (error) {
        console.error('[getAlbaranesResumen Error]', error);
        res.status(500).json({ error: 'Error al obtener resumen de albaranes' });
    }
};

// Obtener tickets recientes (últimos 10)
const getTicketsRecientes = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT TOP 10
                t.id, t.titulo, t.estado, t.prioridad, t.fecha_creacion,
                c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos,
                u.nombre AS tecnico_nombre
            FROM tickets t
            LEFT JOIN clientes c ON t.cliente_id = c.id
            LEFT JOIN usuarios u ON t.tecnico_id = u.id
            ORDER BY t.fecha_creacion DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('[getTicketsRecientes Error]', error);
        res.status(500).json({ error: 'Error al obtener tickets recientes' });
    }
};

// Obtener albaranes recientes (últimos 10)
const getAlbaranesRecientes = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT TOP 10
                a.id, a.numero_albaran, a.estado, a.fecha_recepcion, a.fecha_creacion,
                c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos,
                u.nombre AS usuario_responsable_nombre
            FROM albaranes a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN usuarios u ON a.usuario_responsable_id = u.id
            ORDER BY a.fecha_creacion DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('[getAlbaranesRecientes Error]', error);
        res.status(500).json({ error: 'Error al obtener albaranes recientes' });
    }
};

// Obtener clientes con más tickets
const getClientesTopTickets = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT TOP 10
                c.id, c.nombre, c.apellidos,
                COUNT(t.id) AS total_tickets,
                SUM(CASE WHEN t.estado = 'abierto' THEN 1 ELSE 0 END) AS tickets_abiertos,
                SUM(CASE WHEN t.estado = 'en_progreso' THEN 1 ELSE 0 END) AS tickets_en_progreso,
                SUM(CASE WHEN t.estado = 'cerrado' THEN 1 ELSE 0 END) AS tickets_cerrados
            FROM clientes c
            LEFT JOIN tickets t ON c.id = t.cliente_id
            WHERE c.activo = 1
            GROUP BY c.id, c.nombre, c.apellidos
            ORDER BY total_tickets DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('[getClientesTopTickets Error]', error);
        res.status(500).json({ error: 'Error al obtener clientes con más tickets' });
    }
};

// Obtener técnicos con carga de trabajo
const getTecnicosWorkload = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT
                u.id, u.nombre,
                (SELECT COUNT(*) FROM tickets WHERE tecnico_id = u.id AND estado != 'cancelado') AS tickets_asignados,
                (SELECT COUNT(*) FROM albaranes WHERE usuario_responsable_id = u.id AND estado != 'cancelado') AS albaranes_asignados,
                (SELECT COUNT(*) FROM tickets WHERE tecnico_id = u.id AND estado = 'abierto') AS tickets_abiertos,
                (SELECT COUNT(*) FROM tickets WHERE tecnico_id = u.id AND estado = 'en_progreso') AS tickets_en_progreso,
                (SELECT COUNT(*) FROM albaranes WHERE usuario_responsable_id = u.id AND estado = 'en_diagnostico') AS albaranes_diagnostico,
                (SELECT COUNT(*) FROM albaranes WHERE usuario_responsable_id = u.id AND estado = 'en_reparacion') AS albaranes_en_reparacion
            FROM usuarios u
            WHERE u.activo = 1 AND u.rol IN ('tecnico', 'admin')
            ORDER BY (SELECT COUNT(*) FROM tickets WHERE tecnico_id = u.id AND estado != 'cancelado') +
                     (SELECT COUNT(*) FROM albaranes WHERE usuario_responsable_id = u.id AND estado != 'cancelado') DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('[getTecnicosWorkload Error]', error);
        res.status(500).json({ error: 'Error al obtener carga de trabajo de técnicos' });
    }
};

// Obtener estadísticas de dispositivos
const getDispositivosStats = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT
                tipo_dispositivo,
                COUNT(*) AS total,
                SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) AS activos,
                SUM(CASE WHEN estado = 'mantenimiento' THEN 1 ELSE 0 END) AS en_mantenimiento,
                SUM(CASE WHEN estado = 'baja' THEN 1 ELSE 0 END) AS dados_de_baja
            FROM dispositivos
            GROUP BY tipo_dispositivo
            ORDER BY total DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('[getDispositivosStats Error]', error);
        res.status(500).json({ error: 'Error al obtener estadísticas de dispositivos' });
    }
};

// Obtener resumen completo del dashboard
const getResumenCompleto = async (req, res) => {
    try {
        const pool = await getPool();

        const [
            stats,
            ticketsResumen,
            albaranesResumen,
            ticketsRecientes,
            albaranesRecientes,
            clientesTop,
            tecnicosWorkload,
            dispositivosStats
        ] = await Promise.all([
            pool.request().query(`
                SELECT
                    (SELECT COUNT(*) FROM clientes WHERE activo = 1) AS total_clientes,
                    (SELECT COUNT(*) FROM dispositivos WHERE estado != 'baja') AS total_dispositivos,
                    (SELECT COUNT(*) FROM tickets WHERE estado != 'cancelado') AS total_tickets,
                    (SELECT COUNT(*) FROM albaranes WHERE estado != 'cancelado') AS total_albaranes,
                    (SELECT COUNT(*) FROM usuarios WHERE activo = 1) AS total_usuarios
            `),
            pool.request().query(`
                SELECT 
                    estado,
                    COUNT(*) AS cantidad
                FROM tickets
                WHERE estado != 'cancelado'
                GROUP BY estado
                ORDER BY estado
            `),
            pool.request().query(`
                SELECT 
                    estado,
                    COUNT(*) AS cantidad
                FROM albaranes
                WHERE estado != 'cancelado'
                GROUP BY estado
                ORDER BY estado
            `),
            pool.request().query(`
                SELECT TOP 5
                    t.id, t.titulo, t.estado, t.prioridad, t.fecha_creacion,
                    c.nombre AS cliente_nombre
                FROM tickets t
                LEFT JOIN clientes c ON t.cliente_id = c.id
                ORDER BY t.fecha_creacion DESC
            `),
            pool.request().query(`
                SELECT TOP 5
                    a.id, a.numero_albaran, a.estado, a.fecha_recepcion AS fecha_creacion,
                    c.nombre AS cliente_nombre, a.marca, a.modelo
                FROM albaranes a
                LEFT JOIN clientes c ON a.cliente_id = c.id
                ORDER BY a.fecha_recepcion DESC
            `),
            pool.request().query(`
                SELECT TOP 5
                    c.id, c.nombre, c.apellidos,
                    COUNT(t.id) AS total_tickets
                FROM clientes c
                LEFT JOIN tickets t ON c.id = t.cliente_id
                WHERE c.activo = 1
                GROUP BY c.id, c.nombre, c.apellidos
                ORDER BY total_tickets DESC
            `),
            pool.request().query(`
                SELECT
                    u.id, u.nombre, u.email, u.rol,
                    (SELECT COUNT(*) FROM tickets WHERE tecnico_id = u.id AND estado != 'cancelado') AS tickets_asignados,
                    (SELECT COUNT(*) FROM albaranes WHERE usuario_responsable_id = u.id AND estado != 'cancelado') AS albaranes_asignados
                FROM usuarios u
                WHERE u.activo = 1 AND u.rol IN ('tecnico', 'admin')
                ORDER BY (SELECT COUNT(*) FROM tickets WHERE tecnico_id = u.id AND estado != 'cancelado') +
                         (SELECT COUNT(*) FROM albaranes WHERE usuario_responsable_id = u.id AND estado != 'cancelado') DESC
            `),
            pool.request().query(`
                SELECT
                    tipo_dispositivo,
                    COUNT(*) AS total
                FROM dispositivos
                GROUP BY tipo_dispositivo
                ORDER BY total DESC
            `)
        ]);

        res.json({
            estadisticas: stats.recordset[0],
            ticketsResumen: ticketsResumen.recordset,
            albaranesResumen: albaranesResumen.recordset,
            ticketsRecientes: ticketsRecientes.recordset,
            albaranesRecientes: albaranesRecientes.recordset,
            clientesConMasTickets: clientesTop.recordset,
            tecnicosConMasCarga: tecnicosWorkload.recordset,
            dispositivosPorTipo: dispositivosStats.recordset
        });
    } catch (error) {
        console.error('[getResumenCompleto Error]', error);
        res.status(500).json({ error: 'Error al obtener resumen completo del dashboard' });
    }
};

module.exports = {
    getDashboardStats,
    getTicketsResumen,
    getAlbaranesResumen,
    getTicketsRecientes,
    getAlbaranesRecientes,
    getClientesTopTickets,
    getTecnicosWorkload,
    getDispositivosStats,
    getResumenCompleto
};
