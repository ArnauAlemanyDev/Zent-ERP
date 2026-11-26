const express = require('express');
const router = express.Router();
const { createLoginLimiter, validateLogin } = require('../middleware/loginProtection');
const { validatePortalTicket } = require('../middleware/apiSecurity');
const { portalAuthMiddleware } = require('../middleware/auth');
const {
  portalLogin,
  portalCrearTicket,
  portalGetMisTickets,
} = require('../controllers/portalController');

// POST /api/portal/auth/login - Sin middleware de auth
router.post('/auth/login', createLoginLimiter(), validateLogin, portalLogin);

// POST /api/portal/tickets - Con portalAuthMiddleware
router.post('/tickets', portalAuthMiddleware, validatePortalTicket, portalCrearTicket);

// GET /api/portal/tickets - Con portalAuthMiddleware
router.get('/tickets', portalAuthMiddleware, portalGetMisTickets);

module.exports = router;
