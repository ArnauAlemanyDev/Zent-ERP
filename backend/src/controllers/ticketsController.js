const { getPool } = require('../config/db');

// Obtener todos los tickets (excluyendo cancelados por defecto)
const getAllTickets = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT t.id, t.cliente_id, t.dispositivo_id, t.tecnico_id, t.estado, t.prioridad,
                   t.titulo, t.descripcion, t.metadatos, t.fecha_creacion, t.fecha_cierre,
                   c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos,
                   d.tipo_dispositivo AS dispositivo_tipo, d.marca AS dispositivo_marca, d.modelo AS dispositivo_modelo,
                   u.nombre AS tecnico_nombre
            FROM tickets t
            LEFT JOIN clientes c ON t.cliente_id = c.id
            LEFT JOIN dispositivos d ON t.dispositivo_id = d.id
            LEFT JOIN usuarios u ON t.tecnico_id = u.id
            ORDER BY t.fecha_creacion DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('[getAllTickets Error]', error);
        res.status(500).json({ error: 'Error al obtener los tickets' });
    }
};

// Obtener un ticket por su ID
const getTicketById = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
                SELECT t.id, t.cliente_id, t.dispositivo_id, t.tecnico_id, t.estado, t.prioridad,
                       t.titulo, t.descripcion, t.metadatos, t.fecha_creacion, t.fecha_cierre,
                       c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos, c.cif_nif AS cliente_cif_nif,
                       d.tipo_dispositivo AS dispositivo_tipo, d.marca AS dispositivo_marca, d.modelo AS dispositivo_modelo,
                       u.nombre AS tecnico_nombre
                FROM tickets t
                LEFT JOIN clientes c ON t.cliente_id = c.id
                LEFT JOIN dispositivos d ON t.dispositivo_id = d.id
                LEFT JOIN usuarios u ON t.tecnico_id = u.id
                WHERE t.id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[getTicketById Error]', error);
        res.status(500).json({ error: 'Error al obtener el ticket' });
    }
};

// Crear un nuevo ticket
const createTicket = async (req, res) => {
    const { cliente_id, dispositivo_id, tecnico_id, titulo, descripcion, prioridad, metadatos } = req.body;

    // Validar campos requeridos
    if (!cliente_id || !titulo || !descripcion) {
        return res.status(400).json({
            error: 'Los campos cliente_id, titulo y descripcion son requeridos'
        });
    }

    try {
        const pool = await getPool();

        // Validar que el cliente existe y está activo
        const clienteExist = await pool.request()
            .input('cliente_id', cliente_id)
            .query('SELECT id FROM clientes WHERE id = @cliente_id AND activo = 1');
        if (clienteExist.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado o inactivo' });
        }

        // Validar que el dispositivo existe si se proporciona
        if (dispositivo_id) {
            const dispositivoExist = await pool.request()
                .input('dispositivo_id', dispositivo_id)
                .query('SELECT id FROM dispositivos WHERE id = @dispositivo_id');
            if (dispositivoExist.recordset.length === 0) {
                return res.status(404).json({ error: 'Dispositivo no encontrado' });
            }
        }

        // Validar que el técnico existe si se proporciona
        if (tecnico_id) {
            const tecnicoExist = await pool.request()
                .input('tecnico_id', tecnico_id)
                .query('SELECT id FROM usuarios WHERE id = @tecnico_id');
            if (tecnicoExist.recordset.length === 0) {
                return res.status(404).json({ error: 'Técnico no encontrado' });
            }
        }

        const result = await pool.request()
            .input('cliente_id', cliente_id)
            .input('dispositivo_id', dispositivo_id || null)
            .input('tecnico_id', tecnico_id || null)
            .input('titulo', titulo)
            .input('descripcion', descripcion)
            .input('prioridad', prioridad || 'media')
            .input('metadatos', metadatos ? JSON.stringify(metadatos) : '{}')
            .query(`
                INSERT INTO tickets (cliente_id, dispositivo_id, tecnico_id, titulo, descripcion, prioridad, metadatos)
                VALUES (@cliente_id, @dispositivo_id, @tecnico_id, @titulo, @descripcion, @prioridad, @metadatos);
                SELECT * FROM tickets WHERE id = SCOPE_IDENTITY();
            `);

        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('[createTicket Error]', error);
        res.status(500).json({ error: 'Error al crear el ticket' });
    }
};

// Actualizar un ticket existente
const updateTicket = async (req, res) => {
    const { id } = req.params;
    const { dispositivo_id, tecnico_id, estado, prioridad, titulo, descripcion, metadatos, fecha_cierre } = req.body;

    try {
        const pool = await getPool();

        // Verificar que el ticket existe
        const exists = await pool.request()
            .input('id', id)
            .query('SELECT id FROM tickets WHERE id = @id');
        if (exists.recordset.length === 0) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }

        // Construir dinámicamente el query UPDATE
        let updateFields = [];

        if (dispositivo_id !== undefined) updateFields.push('dispositivo_id = @dispositivo_id');
        if (tecnico_id !== undefined) updateFields.push('tecnico_id = @tecnico_id');
        if (estado !== undefined) updateFields.push('estado = @estado');
        if (prioridad !== undefined) updateFields.push('prioridad = @prioridad');
        if (titulo !== undefined) updateFields.push('titulo = @titulo');
        if (descripcion !== undefined) updateFields.push('descripcion = @descripcion');
        if (metadatos !== undefined) updateFields.push('metadatos = @metadatos');
        if (fecha_cierre !== undefined) updateFields.push('fecha_cierre = @fecha_cierre');

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
        }

        const setClause = updateFields.join(', ');

        const request = pool.request().input('id', id);

        // Solo agregar inputs para los campos que se van a actualizar
        if (dispositivo_id !== undefined) request.input('dispositivo_id', dispositivo_id);
        if (tecnico_id !== undefined) request.input('tecnico_id', tecnico_id);
        if (estado !== undefined) request.input('estado', estado);
        if (prioridad !== undefined) request.input('prioridad', prioridad);
        if (titulo !== undefined) request.input('titulo', titulo);
        if (descripcion !== undefined) request.input('descripcion', descripcion);
        if (metadatos !== undefined) request.input('metadatos', JSON.stringify(metadatos));
        if (fecha_cierre !== undefined) request.input('fecha_cierre', fecha_cierre);

        const result = await request.query(`
            UPDATE tickets
            SET ${setClause}
            WHERE id = @id;
            SELECT * FROM tickets WHERE id = @id;
        `);

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[updateTicket Error]', error);
        res.status(500).json({ error: 'Error al actualizar el ticket' });
    }
};

// Eliminar (cambiar estado a cancelado) un ticket
const deleteTicket = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
                UPDATE tickets
                SET estado = 'cancelado'
                WHERE id = @id;
                SELECT * FROM tickets WHERE id = @id;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }

        res.json({ message: 'Ticket cancelado', ticket: result.recordset[0] });
    } catch (error) {
        console.error('[deleteTicket Error]', error);
        res.status(500).json({ error: 'Error al cancelar el ticket' });
    }
};

// Restaurar un ticket (cambiar estado de cancelado a abierto)
const restoreTicket = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
                UPDATE tickets
                SET estado = 'abierto'
                WHERE id = @id AND estado = 'cancelado';
                SELECT * FROM tickets WHERE id = @id;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Ticket no encontrado o no está cancelado' });
        }

        res.json({ message: 'Ticket restaurado', ticket: result.recordset[0] });
    } catch (error) {
        console.error('[restoreTicket Error]', error);
        res.status(500).json({ error: 'Error al restaurar el ticket' });
    }
};

// Obtener tickets por cliente
const getTicketsByClienteId = async (req, res) => {
    const { cliente_id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('cliente_id', cliente_id)
            .query(`
                SELECT t.id, t.cliente_id, t.dispositivo_id, t.tecnico_id, t.estado, t.prioridad,
                       t.titulo, t.descripcion, t.fecha_creacion, t.fecha_cierre,
                       c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos,
                       u.nombre AS tecnico_nombre
                FROM tickets t
                LEFT JOIN clientes c ON t.cliente_id = c.id
                LEFT JOIN usuarios u ON t.tecnico_id = u.id
                WHERE t.cliente_id = @cliente_id
                ORDER BY t.fecha_creacion DESC
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('[getTicketsByClienteId Error]', error);
        res.status(500).json({ error: 'Error al obtener tickets del cliente' });
    }
};

// Obtener tickets por técnico
const getTicketsByTecnicoId = async (req, res) => {
    const tecnico_id = parseInt(req.params.tecnico_id);
    if (isNaN(tecnico_id)) return res.status(400).json({ error: 'ID de técnico inválido' });

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('tecnico_id', tecnico_id)
            .query(`
                SELECT t.id, t.cliente_id, t.dispositivo_id, t.tecnico_id, t.estado, t.prioridad,
                       t.titulo, t.descripcion, t.fecha_creacion, t.fecha_cierre,
                       c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos,
                       u.nombre AS tecnico_nombre
                FROM tickets t
                LEFT JOIN clientes c ON t.cliente_id = c.id
                LEFT JOIN usuarios u ON t.tecnico_id = u.id
                WHERE t.tecnico_id = @tecnico_id
                ORDER BY t.fecha_creacion DESC
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('[getTicketsByTecnicoId Error]', error);
        res.status(500).json({ error: 'Error al obtener tickets del técnico' });
    }
};

module.exports = {
    getAllTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    restoreTicket,
    getTicketsByClienteId,
    getTicketsByTecnicoId
};
