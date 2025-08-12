const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rutas publicas (no requieren autenticacion)
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/check-email/:email', AuthController.checkEmail);
router.get('/check-username/:username', AuthController.checkUsername);

// Rutas protegidas (requieren autenticacion)
router.get('/me', authenticateToken, AuthController.getCurrentUser);
router.put('/profile', authenticateToken, AuthController.updateProfile);
router.put('/change-password', authenticateToken, AuthController.changePassword);
router.delete('/deactivate', authenticateToken, AuthController.deactivateAccount);

module.exports = router;
