const { getPool } = require('../config/db');

// Obtener todos los dispositivos (excluyendo los dados de baja, por defecto)
const getAllDispositivos = async (req, res) => {
    try {
        const pool = await getPool();
        // Hacemos JOIN con clientes para devolver también el nombre del propietario
        const result = await pool.request().query(`
      SELECT d.id, d.cliente_id, d.tipo_dispositivo, d.marca, d.modelo, d.numero_serie, 
             d.estado, d.fecha_ingreso, d.notas_internas, d.sede_id, d.estado_actual_reparacion,
             c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos
      FROM dispositivos d
      LEFT JOIN clientes c ON d.cliente_id = c.id
      WHERE d.estado != 'baja'
    `);
        res.json(result.recordset);
    } catch (error) {
        console.error('[getAllDispositivos Error]', error);
        res.status(500).json({ error: 'Error al obtener los dispositivos' });
    }
};

// Obtener un dispositivo por su ID
const getDispositivoById = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
        SELECT d.*, c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos
        FROM dispositivos d
        LEFT JOIN clientes c ON d.cliente_id = c.id
        WHERE d.id = @id
      `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[getDispositivoById Error]', error);
        res.status(500).json({ error: 'Error al obtener el dispositivo' });
    }
};

// Crear un nuevo dispositivo
const createDispositivo = async (req, res) => {
    const { cliente_id, tipo_dispositivo, marca, modelo, numero_serie, notas_internas, sede_id } = req.body;

    if (!cliente_id || !tipo_dispositivo) {
        return res.status(400).json({ error: 'El cliente_id y el tipo_dispositivo son requeridos' });
    }

    try {
        const pool = await getPool();

        // Validar que el cliente existe y no está borrado (suponiendo 'activo' = 1)
        const clienteExist = await pool.request().input('cid', cliente_id).query('SELECT id FROM clientes WHERE id = @cid AND activo = 1');
        if (clienteExist.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado o inactivo' });
        }

        const result = await pool.request()
            .input('cliente_id', cliente_id)
            .input('tipo_dispositivo', tipo_dispositivo)
            .input('marca', marca || null)
            .input('modelo', modelo || null)
            .input('numero_serie', numero_serie || null)
            .input('notas_internas', notas_internas || null)
            .input('sede_id', sede_id || null)
            .query(`
        INSERT INTO dispositivos (cliente_id, tipo_dispositivo, marca, modelo, numero_serie, notas_internas, sede_id) 
        VALUES (@cliente_id, @tipo_dispositivo, @marca, @modelo, @numero_serie, @notas_internas, @sede_id);
        
        SELECT * FROM dispositivos WHERE id = SCOPE_IDENTITY();
      `);

        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('[createDispositivo Error]', error);
        res.status(500).json({ error: 'Error al crear el dispositivo' });
    }
};

// Actualizar un dispositivo existente
const updateDispositivo = async (req, res) => {
    const { id } = req.params;
    const { cliente_id, tipo_dispositivo, marca, modelo, numero_serie, estado, notas_internas, sede_id, estado_actual_reparacion } = req.body;

    try {
        const pool = await getPool();

        // Primero, verificamos si existe
        const exists = await pool.request().input('id', id).query('SELECT id FROM dispositivos WHERE id = @id');
        if (exists.recordset.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        // Construir dinámicamente el query UPDATE según qué parámetros vengan en el body
        let updateFields = [];
        if (cliente_id !== undefined) updateFields.push('cliente_id = @cliente_id');
        if (tipo_dispositivo !== undefined) updateFields.push('tipo_dispositivo = @tipo_dispositivo');
        if (marca !== undefined) updateFields.push('marca = @marca');
        if (modelo !== undefined) updateFields.push('modelo = @modelo');
        if (numero_serie !== undefined) updateFields.push('numero_serie = @numero_serie');
        if (estado !== undefined) updateFields.push('estado = @estado');
        if (notas_internas !== undefined) updateFields.push('notas_internas = @notas_internas');
        if (sede_id !== undefined) updateFields.push('sede_id = @sede_id');
        if (estado_actual_reparacion !== undefined) updateFields.push('estado_actual_reparacion = @estado_actual_reparacion');

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
        }

        const setClause = updateFields.join(', ');

        const result = await pool.request()
            .input('id', id)
            .input('cliente_id', cliente_id)
            .input('tipo_dispositivo', tipo_dispositivo)
            .input('marca', marca)
            .input('modelo', modelo)
            .input('numero_serie', numero_serie)
            .input('estado', estado)
            .input('notas_internas', notas_internas)
            .input('sede_id', sede_id)
            .input('estado_actual_reparacion', estado_actual_reparacion)
            .query(`
        UPDATE dispositivos 
        SET ${setClause}
        WHERE id = @id;
        
        SELECT * FROM dispositivos WHERE id = @id;
      `);

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[updateDispositivo Error]', error);
        res.status(500).json({ error: 'Error al actualizar el dispositivo' });
    }
};

// Eliminar (lógicamente) un dispositivo
const deleteDispositivo = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
        UPDATE dispositivos 
        SET estado = 'baja'
        WHERE id = @id;
        
        SELECT * FROM dispositivos WHERE id = @id;
      `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        res.json({ message: 'Dispositivo dado de baja', dispositivo: result.recordset[0] });
    } catch (error) {
        console.error('[deleteDispositivo Error]', error);
        res.status(500).json({ error: 'Error al dar de baja el dispositivo' });
    }
};

// Restaurar un dispositivo (volver a poner estado = activo)
const restoreDispositivo = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
        UPDATE dispositivos 
        SET estado = 'activo'
        WHERE id = @id;
        
        SELECT * FROM dispositivos WHERE id = @id;
      `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        res.json({ message: 'Dispositivo restaurado a activo', dispositivo: result.recordset[0] });
    } catch (error) {
        console.error('[restoreDispositivo Error]', error);
        res.status(500).json({ error: 'Error al restaurar el dispositivo' });
    }
};

module.exports = {
    getAllDispositivos,
    getDispositivoById,
    createDispositivo,
    updateDispositivo,
    deleteDispositivo,
    restoreDispositivo
};
