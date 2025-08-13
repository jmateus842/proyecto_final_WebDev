const express = require('express');
const ReviewController = require('../controllers/ReviewController');
const { authenticateToken, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Rutas publicas (no requieren autenticacion)
router.get('/', ReviewController.getAllReviews);
router.get('/featured', ReviewController.getFeaturedReviews);
router.get('/recent', ReviewController.getRecentReviews);
router.get('/stats', ReviewController.getReviewStats);
router.get('/product/:productId', ReviewController.getProductReviews);
router.get('/:id', ReviewController.getReviewById);

// Rutas protegidas (requieren autenticacion)
router.get('/user/me', authenticateToken, ReviewController.getUserReviews);
router.get('/can-review/:productId', authenticateToken, ReviewController.canUserReview);
router.post('/', authenticateToken, ReviewController.createReview);
router.put('/:id', authenticateToken, ReviewController.updateReview);
router.delete('/:id', authenticateToken, ReviewController.deleteReview);

// Rutas de administracion (requieren rol admin)
router.put('/:id/verify', authenticateToken, requireRoles(['admin']), ReviewController.verifyReview);

module.exports = router;
