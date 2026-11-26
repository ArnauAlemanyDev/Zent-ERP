const express = require('express');
const router = express.Router();
const { authMiddleware, requireRol } = require('../middleware/auth');
const {
    getAllSesionesRemotas,
    getSesionRemotaById,
    getSesionesActivasTecnico,
    getSesionesTecnico,
    crearSesionRemota,
    pausarSesion,
    reanudarSesion,
    finalizarSesion
} = require('../controllers/sesionesRemotasController');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// GET /api/sesiones-remotas - Obtener todas las sesiones remotas
router.get('/', getAllSesionesRemotas);

// GET /api/sesiones-remotas/tecnico/:tecnico_id - Obtener historial de sesiones de un técnico
router.get('/tecnico/:tecnico_id', getSesionesTecnico);

// GET /api/sesiones-remotas/activas/:tecnico_id - Obtener sesiones activas/pausadas de un técnico
router.get('/activas/:tecnico_id', getSesionesActivasTecnico);

// GET /api/sesiones-remotas/:id - Obtener una sesión remota por ID
router.get('/:id', getSesionRemotaById);

// POST /api/sesiones-remotas - Crear una nueva sesión remota
router.post('/', requireRol('admin', 'tecnico'), crearSesionRemota);

// PATCH /api/sesiones-remotas/:id/pausar - Pausar una sesión remota
router.patch('/:id/pausar', requireRol('admin', 'tecnico'), pausarSesion);

// PATCH /api/sesiones-remotas/:id/reanudar - Reanudar una sesión remota pausada
router.patch('/:id/reanudar', requireRol('admin', 'tecnico'), reanudarSesion);

// POST /api/sesiones-remotas/:id/finalizar - Finalizar una sesión remota
router.post('/:id/finalizar', requireRol('admin', 'tecnico'), finalizarSesion);

module.exports = router;
