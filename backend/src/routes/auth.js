const router = require('express').Router();
const { createLoginLimiter, validateLogin } = require('../middleware/loginProtection');
const { login, me, getUsuarios } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/login — iniciar sesión
router.post('/login', createLoginLimiter(), validateLogin, login);

// GET /api/auth/me — obtener usuario autenticado (requiere JWT)
router.get('/me', authMiddleware, me);

// GET /api/auth/usuarios — listar usuarios activos (para selectores de técnico/responsable)
router.get('/usuarios', authMiddleware, getUsuarios);

module.exports = router;
