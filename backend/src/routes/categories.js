const express = require('express');
const CategoryController = require('../controllers/CategoryController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Rutas publicas (no requieren autenticacion)
router.get('/', CategoryController.getAllCategories);
router.get('/active', CategoryController.getActiveCategories);
router.get('/tree', CategoryController.getCategoryTree);
router.get('/stats', CategoryController.getCategoryStats);
router.get('/:id', CategoryController.getCategoryById);
router.get('/slug/:slug', CategoryController.getCategoryBySlug);
router.get('/:id/products', CategoryController.getCategoryProducts);

// Rutas protegidas (requieren autenticacion de admin)
router.post('/', authenticateToken, requireRoles(['admin']), CategoryController.createCategory);
router.put('/:id', authenticateToken, requireRoles(['admin']), CategoryController.updateCategory);
router.delete('/:id', authenticateToken, requireRoles(['admin']), CategoryController.deleteCategory);

module.exports = router;
