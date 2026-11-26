const express = require('express');
const router = express.Router();
const { authMiddleware, requireRol } = require('../middleware/auth');
const {
    getAllDispositivos,
    getDispositivoById,
    createDispositivo,
    updateDispositivo,
    deleteDispositivo,
    restoreDispositivo
} = require('../controllers/dispositivosController');

// Todas las rutas de dispositivos requieren autenticación
router.use(authMiddleware);

// GET /api/dispositivos - Obtener todos los dispositivos
router.get('/', getAllDispositivos);

// GET /api/dispositivos/:id - Obtener un dispositivo por ID
router.get('/:id', getDispositivoById);

// POST /api/dispositivos - Crear un nuevo dispositivo
router.post('/', requireRol('admin', 'tecnico', 'vendedor'), createDispositivo);

// PUT /api/dispositivos/:id - Actualizar un dispositivo
router.put('/:id', requireRol('admin', 'tecnico', 'vendedor'), updateDispositivo);

// DELETE /api/dispositivos/:id - Eliminar (marcar como baja) un dispositivo
router.delete('/:id', requireRol('admin', 'tecnico'), deleteDispositivo);

// PATCH /api/dispositivos/restaurar/:id - Restaurar un dispositivo (marcar activo)
router.patch('/restaurar/:id', requireRol('admin', 'tecnico'), restoreDispositivo);

module.exports = router;
