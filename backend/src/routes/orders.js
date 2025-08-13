const express = require('express');
const OrderController = require('../controllers/OrderController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Rutas protegidas (requieren autenticacion)
router.get('/', authenticateToken, OrderController.getAllOrders);
router.get('/my-orders', authenticateToken, OrderController.getUserOrders);
router.get('/stats', authenticateToken, OrderController.getOrderStats);
router.get('/status/:status', authenticateToken, OrderController.getOrdersByStatus);
router.get('/:id', authenticateToken, OrderController.getOrderById);
router.get('/number/:orderNumber', authenticateToken, OrderController.getOrderByNumber);
router.get('/:id/items', authenticateToken, OrderController.getOrderItems);

// Rutas para crear y gestionar ordenes
router.post('/', authenticateToken, OrderController.createOrder);
router.put('/:id/status', authenticateToken, OrderController.updateOrderStatus);
router.delete('/:id', authenticateToken, OrderController.cancelOrder);

module.exports = router;
