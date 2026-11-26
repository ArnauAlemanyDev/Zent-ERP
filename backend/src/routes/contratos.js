const express = require('express');
const router = express.Router();
const { authMiddleware, requireRol } = require('../middleware/auth');
const {
    getAllContratos,
    getContratoById,
    getContratosByCliente,
    createContrato,
    updateContrato,
    updateEstadoContrato,
    deleteContrato
} = require('../controllers/contratosController');

// Todas las rutas de contratos requieren autenticación
router.use(authMiddleware);

// GET /api/v1/contratos - Obtener todos los contratos
router.get('/', getAllContratos);

// GET /api/v1/contratos/:id - Obtener un contrato por ID
router.get('/:id', getContratoById);

// GET /api/v1/contratos/cliente/:clienteId - Obtener contratos de un cliente
router.get('/cliente/:clienteId', getContratosByCliente);

// POST /api/v1/contratos - Crear un nuevo contrato
router.post('/', requireRol('admin', 'tecnico', 'vendedor'), createContrato);

// PUT /api/v1/contratos/:id - Actualizar un contrato
router.put('/:id', requireRol('admin', 'tecnico', 'vendedor'), updateContrato);

// PATCH /api/v1/contratos/:id/estado - Cambiar estado de un contrato
router.patch('/:id/estado', requireRol('admin', 'tecnico', 'vendedor'), updateEstadoContrato);

// DELETE /api/v1/contratos/:id - Cancelar un contrato
router.delete('/:id', requireRol('admin'), deleteContrato);

module.exports = router;
