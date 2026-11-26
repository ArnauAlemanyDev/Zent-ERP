const express = require('express');
const router = express.Router();
const { authMiddleware, requireRol } = require('../middleware/auth');
const {
    getAllClientes,
    getClienteById,
    createCliente,
    updateCliente,
    deleteCliente,
    restoreCliente
} = require('../controllers/clientesController');

// Todas las rutas de clientes requieren autenticación
router.use(authMiddleware);

// GET /api/clientes - Obtener todos los clientes
router.get('/', getAllClientes);

// GET /api/clientes/:id - Obtener un cliente por ID
router.get('/:id', getClienteById);

// POST /api/clientes - Crear un nuevo cliente (ej. solo admin o tecnico)
router.post('/', requireRol('admin', 'tecnico', 'vendedor'), createCliente);

// PUT /api/clientes/:id - Actualizar un cliente
router.put('/:id', requireRol('admin', 'tecnico', 'vendedor'), updateCliente);

// DELETE /api/clientes/:id - Eliminar (marcar inactivo) un cliente (ej. solo admin)
router.delete('/:id', requireRol('admin'), deleteCliente);

// PATCH /api/clientes/restaurar/:id - Restaurar un cliente (deshacer borrado lógico)
router.patch('/restaurar/:id', requireRol('admin'), restoreCliente);

module.exports = router;
