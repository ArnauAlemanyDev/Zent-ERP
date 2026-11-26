const express = require('express');
const router = express.Router();
const { authMiddleware, requireRol } = require('../middleware/auth');
const {
    getAllTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    restoreTicket,
    getTicketsByClienteId,
    getTicketsByTecnicoId
} = require('../controllers/ticketsController');

// Todas las rutas de tickets requieren autenticación
router.use(authMiddleware);

// GET /api/tickets - Obtener todos los tickets
router.get('/', getAllTickets);

// GET /api/tickets/cliente/:cliente_id - Obtener tickets de un cliente específico
router.get('/cliente/:cliente_id', getTicketsByClienteId);

// GET /api/tickets/tecnico/:tecnico_id - Obtener tickets asignados a un técnico
router.get('/tecnico/:tecnico_id', getTicketsByTecnicoId);

// GET /api/tickets/:id - Obtener un ticket por ID
router.get('/:id', getTicketById);

// POST /api/tickets - Crear un nuevo ticket
router.post('/', requireRol('admin', 'tecnico', 'vendedor'), createTicket);

// PUT /api/tickets/:id - Actualizar un ticket
router.put('/:id', requireRol('admin', 'tecnico', 'vendedor'), updateTicket);

// DELETE /api/tickets/:id - Cancelar un ticket
router.delete('/:id', requireRol('admin', 'tecnico'), deleteTicket);

// PATCH /api/tickets/restaurar/:id - Restaurar un ticket cancelado
router.patch('/restaurar/:id', requireRol('admin', 'tecnico'), restoreTicket);

module.exports = router;