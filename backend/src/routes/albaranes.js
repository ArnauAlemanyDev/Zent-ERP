const express = require('express');
const router = express.Router();
const { authMiddleware, requireRol } = require('../middleware/auth');
const {
    getAllAlbaranes,
    getAlbaranById,
    createAlbaran,
    updateAlbaran,
    deleteAlbaran,
    restoreAlbaran,
    getAlbaranesByClienteId,
    getAlbaranesByTecnicoId
} = require('../controllers/albaranesController');

// Todas las rutas de albaranes requieren autenticación
router.use(authMiddleware);

// GET /api/albaranes - Obtener todos los albaranes
router.get('/', getAllAlbaranes);

// GET /api/albaranes/cliente/:cliente_id - Obtener albaranes de un cliente específico
router.get('/cliente/:cliente_id', getAlbaranesByClienteId);

// GET /api/albaranes/tecnico/:tecnico_id - Obtener albaranes de un técnico específico
router.get('/tecnico/:tecnico_id', getAlbaranesByTecnicoId);

// GET /api/albaranes/:id - Obtener un albarán por ID
router.get('/:id', getAlbaranById);

// POST /api/albaranes - Crear un nuevo albarán
router.post('/', requireRol('admin', 'tecnico', 'vendedor'), createAlbaran);

// PUT /api/albaranes/:id - Actualizar un albarán
router.put('/:id', requireRol('admin', 'tecnico', 'vendedor'), updateAlbaran);

// DELETE /api/albaranes/:id - Cancelar un albarán
router.delete('/:id', requireRol('admin', 'tecnico'), deleteAlbaran);

// PATCH /api/albaranes/restaurar/:id - Restaurar un albarán cancelado
router.patch('/restaurar/:id', requireRol('admin', 'tecnico'), restoreAlbaran);

module.exports = router;