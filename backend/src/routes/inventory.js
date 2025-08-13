const express = require('express');
const InventoryController = require('../controllers/InventoryController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Rutas publicas (no requieren autenticacion)
router.get('/stats', InventoryController.getInventoryStats);
router.get('/product/:productId', InventoryController.getProductInventory);
router.get('/check/:productId', InventoryController.checkStockAvailability);

// Rutas protegidas (requieren autenticacion)
router.get('/alerts', authenticateToken, InventoryController.getInventoryAlerts);
router.get('/low-stock', authenticateToken, InventoryController.getLowStockProducts);
router.get('/out-of-stock', authenticateToken, InventoryController.getOutOfStockProducts);
router.get('/adjustments', authenticateToken, InventoryController.getInventoryAdjustments);

// Rutas de gestion de inventario (requieren rol admin)
router.put('/product/:productId/stock', authenticateToken, requireRoles(['admin']), InventoryController.updateStock);
router.post('/product/:productId/reserve', authenticateToken, InventoryController.reserveStock);
router.post('/product/:productId/release', authenticateToken, InventoryController.releaseStock);
router.post('/product/:productId/adjust', authenticateToken, requireRoles(['admin']), InventoryController.adjustInventory);

module.exports = router;
