const express = require('express');
const ProductController = require('../controllers/ProductController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Rutas publicas (no requieren autenticacion)
router.get('/', ProductController.getAllProducts);
router.get('/search', ProductController.searchProducts);
router.get('/featured', ProductController.getFeaturedProducts);
router.get('/stats', ProductController.getProductStats);
router.get('/:id', ProductController.getProductById);
router.get('/sku/:sku', ProductController.getProductBySku);
router.get('/:id/related', ProductController.getRelatedProducts);

// Rutas protegidas (requieren autenticacion de admin)
router.post('/', authenticateToken, requireRoles(['admin']), ProductController.createProduct);
router.put('/:id', authenticateToken, requireRoles(['admin']), ProductController.updateProduct);
router.delete('/:id', authenticateToken, requireRoles(['admin']), ProductController.deleteProduct);

module.exports = router;
