const { getPool } = require('../config/db');

const splitNombreCompleto = (nombreCompleto) => {
    const normalized = (nombreCompleto || '').trim();
    if (!normalized) return { nombre: '', apellidos: '' };
    const parts = normalized.split(/\s+/);
    if (parts.length === 1) return { nombre: normalized, apellidos: '' };
    const apellidos = parts.pop();
    const nombre = parts.join(' ');
    return { nombre, apellidos };
};

// Obtener todos los clientes (solo activos por defecto)
const getAllClientes = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
      SELECT c.id, c.nombre, c.apellidos, c.cif_nif, c.activo, c.fecha_registro, c.observaciones, c.tipo,
             tel.telefono
      FROM clientes c
      LEFT JOIN clientes_telefonos tel ON tel.cliente_id = c.id AND tel.tipo = 'principal'
      WHERE c.activo = 1
    `);
        res.json(result.recordset);
    } catch (error) {
        console.error('[getAllClientes Error]', error);
        res.status(500).json({ error: 'Error al obtener los clientes' });
    }
};

// Obtener un cliente por su ID
const getClienteById = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
        SELECT c.id, c.nombre, c.apellidos, c.cif_nif, c.activo, c.fecha_registro, c.observaciones, c.tipo,
               tel.telefono
        FROM clientes c
        LEFT JOIN clientes_telefonos tel ON tel.cliente_id = c.id AND tel.tipo = 'principal'
        WHERE c.id = @id
      `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[getClienteById Error]', error);
        res.status(500).json({ error: 'Error al obtener el cliente' });
    }
};

// Crear un nuevo cliente
const createCliente = async (req, res) => {
    const { nombre: nombreCompleto, apellidos, cif_nif, observaciones, telefono, tipo } = req.body;

    if (!nombreCompleto) {
        return res.status(400).json({ error: 'Nombre y apellidos son requeridos' });
    }

    const parsed = splitNombreCompleto(nombreCompleto);
    const nombre = parsed.nombre;
    const apellidosFinal = apellidos || parsed.apellidos || '';
    const tipoFinal = tipo || 'particular';

    try {
        const pool = await getPool();
        const insertResult = await pool.request()
            .input('nombre', nombre)
            .input('apellidos', apellidosFinal)
            .input('cif_nif', cif_nif || null)
            .input('observaciones', observaciones || null)
            .input('tipo', tipoFinal)
            .query(`
        INSERT INTO clientes (nombre, apellidos, cif_nif, observaciones, tipo) 
        VALUES (@nombre, @apellidos, @cif_nif, @observaciones, @tipo);
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
      `);

        const clienteId = insertResult.recordset[0].id;

        if (telefono !== undefined && telefono !== null && telefono !== '') {
            await pool.request()
                .input('cliente_id', clienteId)
                .input('telefono', telefono)
                .query(`
              INSERT INTO clientes_telefonos (cliente_id, telefono, tipo, es_preferido)
              VALUES (@cliente_id, @telefono, 'principal', 1);
            `);
        }

        const result = await pool.request()
            .input('id', clienteId)
            .query(`
        SELECT c.id, c.nombre, c.apellidos, c.cif_nif, c.activo, c.fecha_registro, c.observaciones, c.tipo,
               tel.telefono
        FROM clientes c
        LEFT JOIN clientes_telefonos tel ON tel.cliente_id = c.id AND tel.tipo = 'principal'
        WHERE c.id = @id
      `);

        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('[createCliente Error]', error);
        res.status(500).json({ error: 'Error al crear el cliente' });
    }
};

// Actualizar un cliente existente
const updateCliente = async (req, res) => {
    const { id } = req.params;
    const { nombre: nombreCompleto, apellidos, cif_nif, observaciones, activo, telefono, tipo } = req.body;

    const parsed = splitNombreCompleto(nombreCompleto || '');
    const nombre = parsed.nombre || '';
    const apellidosFinal = apellidos || parsed.apellidos || '';

    try {
        const pool = await getPool();

        const exists = await pool.request().input('id', id).query('SELECT id FROM clientes WHERE id = @id');
        if (exists.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        await pool.request()
            .input('id', id)
            .input('nombre', nombre)
            .input('apellidos', apellidosFinal)
            .input('cif_nif', cif_nif || null)
            .input('observaciones', observaciones || null)
            .input('activo', activo !== undefined ? activo : 1)
            .input('tipo', tipo || 'particular')
            .query(`
        UPDATE clientes 
        SET nombre = @nombre,
            apellidos = @apellidos,
            cif_nif = @cif_nif,
            observaciones = @observaciones,
            activo = @activo,
            tipo = @tipo
        WHERE id = @id;
      `);

        if (telefono !== undefined) {
            const phoneExists = await pool.request()
                .input('cliente_id', id)
                .query(`SELECT id FROM clientes_telefonos WHERE cliente_id = @cliente_id AND tipo = 'principal'`);

            if (phoneExists.recordset.length > 0) {
                await pool.request()
                    .input('id', phoneExists.recordset[0].id)
                    .input('telefono', telefono)
                    .query(`UPDATE clientes_telefonos SET telefono = @telefono WHERE id = @id`);
            } else {
                await pool.request()
                    .input('cliente_id', id)
                    .input('telefono', telefono)
                    .query(`
                  INSERT INTO clientes_telefonos (cliente_id, telefono, tipo, es_preferido)
                  VALUES (@cliente_id, @telefono, 'principal', 1);
                `);
            }
        }

        const result = await pool.request()
            .input('id', id)
            .query(`
        SELECT c.id, c.nombre, c.apellidos, c.cif_nif, c.activo, c.fecha_registro, c.observaciones, c.tipo,
               tel.telefono
        FROM clientes c
        LEFT JOIN clientes_telefonos tel ON tel.cliente_id = c.id AND tel.tipo = 'principal'
        WHERE c.id = @id;
      `);

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[updateCliente Error]', error);
        res.status(500).json({ error: 'Error al actualizar el cliente' });
    }
};

// Eliminar (lógicamente) un cliente
const deleteCliente = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
        UPDATE clientes 
        SET activo = 0 
        WHERE id = @id;
        SELECT * FROM clientes WHERE id = @id;
      `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json({ message: 'Cliente eliminado lógicamente', cliente: result.recordset[0] });
    } catch (error) {
        console.error('[deleteCliente Error]', error);
        res.status(500).json({ error: 'Error al eliminar el cliente' });
    }
};

// Restaurar un cliente (deshacer borrado lógico)
const restoreCliente = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', id)
            .query(`
        UPDATE clientes 
        SET activo = 1 
        WHERE id = @id;
        SELECT * FROM clientes WHERE id = @id;
      `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json({ message: 'Cliente restaurado correctamente', cliente: result.recordset[0] });
    } catch (error) {
        console.error('[restoreCliente Error]', error);
        res.status(500).json({ error: 'Error al restaurar el cliente' });
    }
};

module.exports = {
    getAllClientes,
    getClienteById,
    createCliente,
    updateCliente,
    deleteCliente,
    restoreCliente
};
