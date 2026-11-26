const { getPool } = require('../config/db');

// Obtener todos los albaranes (excluyendo cancelados por defecto)
const getAllAlbaranes = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT a.id, a.numero_albaran, a.token_publico, a.cliente_id, a.dispositivo_id,
                   a.usuario_responsable_id, a.fecha_recepcion, a.fecha_entrega,
                   a.articulo, a.marca, a.modelo, a.numero_serie, a.tipo_bloqueo,
                   a.acepta_custodia_contrasena, a.descripcion_averia, a.notas_internas,
                   a.presupuesto_estimado, a.estado, a.fecha_creacion, a.fecha_actualizacion,
                   c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos,
                   d.tipo_dispositivo AS dispositivo_tipo,
                   u.nombre AS usuario_responsable_nombre
            FROM albaranes a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN dispositivos d ON a.dispositivo_id = d.id
            LEFT JOIN usuarios u ON a.usuario_responsable_id = u.id
            WHERE a.estado != 'cancelado'
            ORDER BY a.fecha_creacion DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('[getAllAlbaranes Error]', error);
        res.status(500).json({ error: 'Error al obtener los albaranes' });
    }
};

// Obtener un albarán por su ID
const getAlbaranById = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
                SELECT a.id, a.numero_albaran, a.token_publico, a.cliente_id, a.dispositivo_id,
                       a.usuario_responsable_id, a.fecha_recepcion, a.fecha_entrega,
                       a.articulo, a.marca, a.modelo, a.numero_serie, a.tipo_bloqueo,
                       a.acepta_custodia_contrasena, a.estado_estetico, a.fotos_estado,
                       a.descripcion_averia, a.notas_internas, a.presupuesto_estimado,
                       a.firma_cliente, a.estado, a.fecha_creacion, a.fecha_actualizacion,
                       c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos,
                       c.cif_nif AS cliente_cif_nif,
                       d.tipo_dispositivo AS dispositivo_tipo,
                       u.nombre AS usuario_responsable_nombre
                FROM albaranes a
                LEFT JOIN clientes c ON a.cliente_id = c.id
                LEFT JOIN dispositivos d ON a.dispositivo_id = d.id
                LEFT JOIN usuarios u ON a.usuario_responsable_id = u.id
                WHERE a.id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Albarán no encontrado' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[getAlbaranById Error]', error);
        res.status(500).json({ error: 'Error al obtener el albarán' });
    }
};

// Crear un nuevo albarán
const createAlbaran = async (req, res) => {
    const {
        cliente_id, dispositivo_id, usuario_responsable_id, articulo, marca, modelo,
        numero_serie, tipo_bloqueo, acepta_custodia_contrasena, descripcion_averia,
        contrasena_dispositivo_hash, notas_internas, presupuesto_estimado, estado_estetico, fotos_estado
    } = req.body;

    // Validar campos requeridos
    if (!cliente_id || !usuario_responsable_id || !articulo || !marca || !modelo || !descripcion_averia) {
        return res.status(400).json({
            error: 'Los campos cliente_id, usuario_responsable_id, articulo, marca, modelo y descripcion_averia son requeridos'
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

        // Validar que el usuario existe
        const usuarioExist = await pool.request()
            .input('usuario_id', usuario_responsable_id)
            .query('SELECT id FROM usuarios WHERE id = @usuario_id');
        if (usuarioExist.recordset.length === 0) {
            return res.status(404).json({ error: 'Usuario responsable no encontrado' });
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

        const result = await pool.request()
            .input('cliente_id', cliente_id)
            .input('dispositivo_id', dispositivo_id || null)
            .input('usuario_responsable_id', usuario_responsable_id)
            .input('articulo', articulo)
            .input('marca', marca)
            .input('modelo', modelo)
            .input('numero_serie', numero_serie || null)
            .input('tipo_bloqueo', tipo_bloqueo || null)
            .input('acepta_custodia_contrasena', acepta_custodia_contrasena ? 1 : 0)
            .input('contrasena_dispositivo_hash', contrasena_dispositivo_hash || null)
            .input('descripcion_averia', descripcion_averia)
            .input('notas_internas', notas_internas || null)
            .input('presupuesto_estimado', presupuesto_estimado || null)
            .input('estado_estetico', estado_estetico ? JSON.stringify(estado_estetico) : '[]')
            .input('fotos_estado', fotos_estado ? JSON.stringify(fotos_estado) : '[]')
            .query(`
                DECLARE @token nvarchar(12) = LOWER(CONVERT(varchar(12), CRYPT_GEN_RANDOM(6), 2));
                INSERT INTO albaranes (token_publico,
                    cliente_id, dispositivo_id, usuario_responsable_id, articulo, marca, modelo,
                    numero_serie, tipo_bloqueo, acepta_custodia_contrasena, contrasena_dispositivo_hash,
                    descripcion_averia, notas_internas, presupuesto_estimado, estado_estetico, fotos_estado
                ) VALUES (@token,
                    @cliente_id, @dispositivo_id, @usuario_responsable_id, @articulo, @marca, @modelo,
                    @numero_serie, @tipo_bloqueo, @acepta_custodia_contrasena, @contrasena_dispositivo_hash,
                    @descripcion_averia, @notas_internas, @presupuesto_estimado, @estado_estetico, @fotos_estado
                );
                SELECT * FROM albaranes WHERE token_publico = @token;
            `);

        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('[createAlbaran Error]', error);
        res.status(500).json({ error: 'Error al crear el albarán' });
    }
};

// Actualizar un albarán existente
const updateAlbaran = async (req, res) => {
    const { id } = req.params;
    const {
        dispositivo_id, articulo, marca, modelo, numero_serie, tipo_bloqueo,
        acepta_custodia_contrasena, descripcion_averia, notas_internas, presupuesto_estimado,
        estado, firma_cliente, fecha_entrega, estado_estetico, fotos_estado, usuario_responsable_id
    } = req.body;

    try {
        const pool = await getPool();

        // Verificar que el albarán existe
        const exists = await pool.request()
            .input('id', id)
            .query('SELECT id FROM albaranes WHERE id = @id');
        if (exists.recordset.length === 0) {
            return res.status(404).json({ error: 'Albarán no encontrado' });
        }

        // Construir dinámicamente el query UPDATE
        let updateFields = [];
        let inputCount = 0;

        if (dispositivo_id !== undefined) {
            updateFields.push('dispositivo_id = @dispositivo_id');
            inputCount++;
        }
        if (articulo !== undefined) updateFields.push('articulo = @articulo');
        if (marca !== undefined) updateFields.push('marca = @marca');
        if (modelo !== undefined) updateFields.push('modelo = @modelo');
        if (numero_serie !== undefined) updateFields.push('numero_serie = @numero_serie');
        if (tipo_bloqueo !== undefined) updateFields.push('tipo_bloqueo = @tipo_bloqueo');
        if (acepta_custodia_contrasena !== undefined) updateFields.push('acepta_custodia_contrasena = @acepta_custodia_contrasena');
        if (descripcion_averia !== undefined) updateFields.push('descripcion_averia = @descripcion_averia');
        if (notas_internas !== undefined) updateFields.push('notas_internas = @notas_internas');
        if (presupuesto_estimado !== undefined) updateFields.push('presupuesto_estimado = @presupuesto_estimado');
        if (estado !== undefined) updateFields.push('estado = @estado');
        if (firma_cliente !== undefined) updateFields.push('firma_cliente = @firma_cliente');
        if (fecha_entrega !== undefined) updateFields.push('fecha_entrega = @fecha_entrega');
        if (estado_estetico !== undefined) updateFields.push('estado_estetico = @estado_estetico');
        if (fotos_estado !== undefined) updateFields.push('fotos_estado = @fotos_estado');
        if (usuario_responsable_id !== undefined) updateFields.push('usuario_responsable_id = @usuario_responsable_id');

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
        }

        const setClause = updateFields.join(', ');

        const request = pool.request()
            .input('id', id)
            .input('dispositivo_id', dispositivo_id)
            .input('articulo', articulo)
            .input('marca', marca)
            .input('modelo', modelo)
            .input('numero_serie', numero_serie)
            .input('tipo_bloqueo', tipo_bloqueo)
            .input('acepta_custodia_contrasena', acepta_custodia_contrasena !== undefined ? (acepta_custodia_contrasena ? 1 : 0) : null)
            .input('descripcion_averia', descripcion_averia)
            .input('notas_internas', notas_internas)
            .input('presupuesto_estimado', presupuesto_estimado)
            .input('estado', estado)
            .input('firma_cliente', firma_cliente)
            .input('fecha_entrega', fecha_entrega)
            .input('estado_estetico', estado_estetico ? JSON.stringify(estado_estetico) : null)
            .input('fotos_estado', fotos_estado ? JSON.stringify(fotos_estado) : null)
            .input('usuario_responsable_id', usuario_responsable_id || null);

        const result = await request.query(`
            UPDATE albaranes
            SET ${setClause}
            WHERE id = @id;
            SELECT * FROM albaranes WHERE id = @id;
        `);

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[updateAlbaran Error]', error);
        res.status(500).json({ error: 'Error al actualizar el albarán' });
    }
};

// Eliminar (cambiar estado a cancelado) un albarán
const deleteAlbaran = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
                UPDATE albaranes
                SET estado = 'cancelado'
                WHERE id = @id;
                SELECT * FROM albaranes WHERE id = @id;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Albarán no encontrado' });
        }

        res.json({ message: 'Albarán cancelado', albaran: result.recordset[0] });
    } catch (error) {
        console.error('[deleteAlbaran Error]', error);
        res.status(500).json({ error: 'Error al cancelar el albarán' });
    }
};

// Restaurar un albarán (cambiar estado de cancelado a recibido)
const restoreAlbaran = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
                UPDATE albaranes
                SET estado = 'recibido'
                WHERE id = @id AND estado = 'cancelado';
                SELECT * FROM albaranes WHERE id = @id;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Albarán no encontrado o no está cancelado' });
        }

        res.json({ message: 'Albarán restaurado', albaran: result.recordset[0] });
    } catch (error) {
        console.error('[restoreAlbaran Error]', error);
        res.status(500).json({ error: 'Error al restaurar el albarán' });
    }
};

// Obtener albaranes por cliente
const getAlbaranesByClienteId = async (req, res) => {
    const { cliente_id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('cliente_id', cliente_id)
            .query(`
                SELECT a.id, a.numero_albaran, a.token_publico, a.fecha_recepcion, a.fecha_entrega,
                       a.articulo, a.marca, a.modelo, a.estado, a.fecha_creacion,
                       c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos
                FROM albaranes a
                LEFT JOIN clientes c ON a.cliente_id = c.id
                WHERE a.cliente_id = @cliente_id AND a.estado != 'cancelado'
                ORDER BY a.fecha_creacion DESC
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('[getAlbaranesByClienteId Error]', error);
        res.status(500).json({ error: 'Error al obtener albaranes del cliente' });
    }
};

// Obtener albaranes por técnico
const getAlbaranesByTecnicoId = async (req, res) => {
    const tecnico_id = parseInt(req.params.tecnico_id);
    if (isNaN(tecnico_id)) return res.status(400).json({ error: 'ID de técnico inválido' });

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('tecnico_id', tecnico_id)
            .query(`
                SELECT a.id, a.numero_albaran, a.token_publico, a.fecha_recepcion, a.fecha_entrega,
                       a.articulo, a.marca, a.modelo, a.estado, a.fecha_creacion,
                       c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos
                FROM albaranes a
                LEFT JOIN clientes c ON a.cliente_id = c.id
                WHERE a.usuario_responsable_id = @tecnico_id AND a.estado != 'cancelado'
                ORDER BY a.fecha_creacion DESC
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('[getAlbaranesByTecnicoId Error]', error);
        res.status(500).json({ error: 'Error al obtener albaranes del técnico' });
    }
};

module.exports = {
    getAllAlbaranes,
    getAlbaranById,
    createAlbaran,
    updateAlbaran,
    deleteAlbaran,
    restoreAlbaran,
    getAlbaranesByClienteId,
    getAlbaranesByTecnicoId
};
