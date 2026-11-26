const { getPool } = require('../config/db');

// Obtener todos los contratos
const getAllContratos = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                c.id, c.cliente_id, cl.nombre AS cliente_nombre, cl.apellidos,
                c.tipo_contrato, c.subtipo, c.descripcion,
                c.fecha_inicio, c.fecha_fin, c.importe, c.periodicidad,
                c.estado, c.renovacion_automatica, c.observaciones, c.fecha_creacion
            FROM contratos c
            LEFT JOIN clientes cl ON c.cliente_id = cl.id
            WHERE c.estado != 'cancelado'
            ORDER BY c.fecha_creacion DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('[getAllContratos Error]', error);
        res.status(500).json({ error: 'Error al obtener los contratos' });
    }
};

// Obtener un contrato por su ID
const getContratoById = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
                SELECT 
                    c.id, c.cliente_id, cl.nombre AS cliente_nombre, cl.apellidos,
                    c.tipo_contrato, c.subtipo, c.descripcion,
                    c.fecha_inicio, c.fecha_fin, c.importe, c.periodicidad,
                    c.estado, c.renovacion_automatica, c.observaciones, c.fecha_creacion
                FROM contratos c
                LEFT JOIN clientes cl ON c.cliente_id = cl.id
                WHERE c.id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Contrato no encontrado' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[getContratoById Error]', error);
        res.status(500).json({ error: 'Error al obtener el contrato' });
    }
};

// Obtener contratos de un cliente específico
const getContratosByCliente = async (req, res) => {
    const { clienteId } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('clienteId', clienteId)
            .query(`
                SELECT 
                    id, cliente_id, tipo_contrato, subtipo, descripcion,
                    fecha_inicio, fecha_fin, importe, periodicidad,
                    estado, renovacion_automatica, observaciones, fecha_creacion
                FROM contratos
                WHERE cliente_id = @clienteId AND estado != 'cancelado'
                ORDER BY fecha_inicio DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('[getContratosByCliente Error]', error);
        res.status(500).json({ error: 'Error al obtener contratos del cliente' });
    }
};

// Crear un nuevo contrato
const createContrato = async (req, res) => {
    const { cliente_id, tipo_contrato, subtipo, descripcion, fecha_inicio, fecha_fin, importe, periodicidad, renovacion_automatica, observaciones } = req.body;

    if (!cliente_id || !tipo_contrato || !fecha_inicio) {
        return res.status(400).json({ error: 'cliente_id, tipo_contrato y fecha_inicio son requeridos' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('cliente_id', cliente_id)
            .input('tipo_contrato', tipo_contrato)
            .input('subtipo', subtipo || 'contrato')
            .input('descripcion', descripcion || null)
            .input('fecha_inicio', fecha_inicio)
            .input('fecha_fin', fecha_fin || null)
            .input('importe', importe || null)
            .input('periodicidad', periodicidad || 'anual')
            .input('renovacion_automatica', renovacion_automatica ? 1 : 0)
            .input('observaciones', observaciones || null)
            .query(`
                INSERT INTO contratos (cliente_id, tipo_contrato, subtipo, descripcion, fecha_inicio, fecha_fin, importe, periodicidad, renovacion_automatica, observaciones)
                VALUES (@cliente_id, @tipo_contrato, @subtipo, @descripcion, @fecha_inicio, @fecha_fin, @importe, @periodicidad, @renovacion_automatica, @observaciones);
                SELECT * FROM contratos WHERE id = SCOPE_IDENTITY();
            `);

        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('[createContrato Error]', error);
        res.status(500).json({ error: 'Error al crear el contrato' });
    }
};

// Actualizar un contrato existente
const updateContrato = async (req, res) => {
    const { id } = req.params;
    const { cliente_id, tipo_contrato, subtipo, descripcion, fecha_inicio, fecha_fin, importe, periodicidad, renovacion_automatica, estado, observaciones } = req.body;

    try {
        const pool = await getPool();

        // Verificar si existe
        const exists = await pool.request().input('id', id).query('SELECT id FROM contratos WHERE id = @id');
        if (exists.recordset.length === 0) {
            return res.status(404).json({ error: 'Contrato no encontrado' });
        }

        const result = await pool.request()
            .input('id', id)
            .input('cliente_id', cliente_id || null)
            .input('tipo_contrato', tipo_contrato || null)
            .input('subtipo', subtipo || null)
            .input('descripcion', descripcion || null)
            .input('fecha_inicio', fecha_inicio || null)
            .input('fecha_fin', fecha_fin || null)
            .input('importe', importe || null)
            .input('periodicidad', periodicidad || null)
            .input('renovacion_automatica', renovacion_automatica !== undefined ? (renovacion_automatica ? 1 : 0) : null)
            .input('estado', estado || null)
            .input('observaciones', observaciones || null)
            .query(`
                UPDATE contratos
                SET
                    cliente_id = ISNULL(@cliente_id, cliente_id),
                    tipo_contrato = ISNULL(@tipo_contrato, tipo_contrato),
                    subtipo = ISNULL(@subtipo, subtipo),
                    descripcion = ISNULL(@descripcion, descripcion),
                    fecha_inicio = ISNULL(@fecha_inicio, fecha_inicio),
                    fecha_fin = ISNULL(@fecha_fin, fecha_fin),
                    importe = ISNULL(@importe, importe),
                    periodicidad = ISNULL(@periodicidad, periodicidad),
                    renovacion_automatica = ISNULL(@renovacion_automatica, renovacion_automatica),
                    estado = ISNULL(@estado, estado),
                    observaciones = ISNULL(@observaciones, observaciones)
                WHERE id = @id;
                SELECT * FROM contratos WHERE id = @id;
            `);

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[updateContrato Error]', error);
        res.status(500).json({ error: 'Error al actualizar el contrato' });
    }
};

// Cambiar estado de un contrato
const updateEstadoContrato = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
        return res.status(400).json({ error: 'Estado es requerido' });
    }

    try {
        const pool = await getPool();

        const result = await pool.request()
            .input('id', id)
            .input('estado', estado)
            .query(`
                UPDATE contratos SET estado = @estado WHERE id = @id;
                SELECT * FROM contratos WHERE id = @id;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Contrato no encontrado' });
        }

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[updateEstadoContrato Error]', error);
        res.status(500).json({ error: 'Error al actualizar el estado del contrato' });
    }
};

// Eliminar (cambiar a cancelado) un contrato
const deleteContrato = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await getPool();

        const result = await pool.request()
            .input('id', id)
            .query(`
                UPDATE contratos SET estado = 'cancelado' WHERE id = @id;
                SELECT * FROM contratos WHERE id = @id;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Contrato no encontrado' });
        }

        res.json({ message: 'Contrato cancelado', contrato: result.recordset[0] });
    } catch (error) {
        console.error('[deleteContrato Error]', error);
        res.status(500).json({ error: 'Error al cancelar el contrato' });
    }
};

module.exports = {
    getAllContratos,
    getContratoById,
    getContratosByCliente,
    createContrato,
    updateContrato,
    updateEstadoContrato,
    deleteContrato
};
