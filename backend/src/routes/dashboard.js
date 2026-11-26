const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
    getDashboardStats,
    getTicketsResumen,
    getAlbaranesResumen,
    getTicketsRecientes,
    getAlbaranesRecientes,
    getClientesTopTickets,
    getTecnicosWorkload,
    getDispositivosStats,
    getResumenCompleto
} = require('../controllers/dashboardController');

// Todas las rutas del dashboard requieren autenticación
router.use(authMiddleware);

// GET /api/dashboard/stats - Estadísticas generales
router.get('/stats', getDashboardStats);

// GET /api/dashboard/tickets-resumen - Resumen de tickets por estado y prioridad
router.get('/tickets-resumen', getTicketsResumen);

// GET /api/dashboard/albaranes-resumen - Resumen de albaranes por estado
router.get('/albaranes-resumen', getAlbaranesResumen);

// GET /api/dashboard/tickets-recientes - Últimos 10 tickets creados
router.get('/tickets-recientes', getTicketsRecientes);

// GET /api/dashboard/albaranes-recientes - Últimos 10 albaranes creados
router.get('/albaranes-recientes', getAlbaranesRecientes);

// GET /api/dashboard/clientes-top - Top 10 clientes con más tickets
router.get('/clientes-top', getClientesTopTickets);

// GET /api/dashboard/tecnicos-workload - Carga de trabajo de técnicos
router.get('/tecnicos-workload', getTecnicosWorkload);

// GET /api/dashboard/dispositivos-stats - Estadísticas de dispositivos
router.get('/dispositivos-stats', getDispositivosStats);

// GET /api/dashboard/resumen - Resumen completo del dashboard
router.get('/resumen', getResumenCompleto);

module.exports = router;
