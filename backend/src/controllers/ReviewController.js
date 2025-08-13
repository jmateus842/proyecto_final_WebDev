const ReviewService = require('../services/ReviewService');
const { ValidationError, NotFoundError, ConflictError, BusinessLogicError } = require('../utils/errors');

class ReviewController {
  /**
   * Obtiene todas las resenas con paginacion y filtros
   * GET /reviews
   */
  static async getAllReviews(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        product_id,
        user_id,
        rating,
        verified_only = 'false',
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = req.query;

      const filters = {};
      if (product_id) filters.product_id = product_id;
      if (user_id) filters.user_id = user_id;
      if (rating) filters.rating = rating;
      if (verified_only === 'true') filters.verified_only = true;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        filters,
        sort_by,
        sort_order
      };

      const result = await ReviewService.getAllReviews(options);

      res.status(200).json({
        success: true,
        data: result.reviews,
        pagination: {
          current_page: result.current_page,
          total_pages: result.total_pages,
          total_items: result.total_items,
          items_per_page: result.items_per_page
        }
      });
    } catch (error) {
      console.error('Error al obtener resenas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene una resena por ID
   * GET /reviews/:id
   */
  static async getReviewById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de resena invalido');
      }

      const review = await ReviewService.getReviewById(parseInt(id));

      res.status(200).json({
        success: true,
        data: review
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al obtener resena:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crea una nueva resena
   * POST /reviews
   */
  static async createReview(req, res) {
    try {
      const { user_id, product_id, rating, comment } = req.body;

      // Validar datos requeridos
      if (!user_id || !product_id || !rating) {
        throw new ValidationError('Usuario, producto y rating son requeridos');
      }

      // Validar rating
      if (isNaN(parseInt(rating)) || parseInt(rating) < 1 || parseInt(rating) > 5) {
        throw new ValidationError('Rating debe ser un numero entre 1 y 5');
      }

      const reviewData = {
        user_id: parseInt(user_id),
        product_id: parseInt(product_id),
        rating: parseInt(rating),
        comment: comment || ''
      };

      const review = await ReviewService.createReview(reviewData);

      res.status(201).json({
        success: true,
        message: 'Resena creada exitosamente',
        data: review
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      if (error instanceof ConflictError) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }

      if (error instanceof BusinessLogicError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al crear resena:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualiza una resena existente
   * PUT /reviews/:id
   */
  static async updateReview(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de resena invalido');
      }

      // Validar que al menos un campo se actualice
      if (Object.keys(updateData).length === 0) {
        throw new ValidationError('Al menos un campo debe ser actualizado');
      }

      // Validar rating si se proporciona
      if (updateData.rating && (isNaN(parseInt(updateData.rating)) || parseInt(updateData.rating) < 1 || parseInt(updateData.rating) > 5)) {
        throw new ValidationError('Rating debe ser un numero entre 1 y 5');
      }

      const review = await ReviewService.updateReview(parseInt(id), updateData);

      res.status(200).json({
        success: true,
        message: 'Resena actualizada exitosamente',
        data: review
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al actualizar resena:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Elimina una resena
   * DELETE /reviews/:id
   */
  static async deleteReview(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de resena invalido');
      }

      await ReviewService.deleteReview(parseInt(id));

      res.status(200).json({
        success: true,
        message: 'Resena eliminada exitosamente'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al eliminar resena:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene resenas de un producto
   * GET /reviews/product/:product_id
   */
  static async getProductReviews(req, res) {
    try {
      const { product_id } = req.params;
      const { page = 1, limit = 10, rating, verified_only = 'false' } = req.query;

      if (!product_id || isNaN(parseInt(product_id))) {
        throw new ValidationError('ID de producto invalido');
      }

      const filters = {};
      if (rating) filters.rating = rating;
      if (verified_only === 'true') filters.verified_only = true;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        filters
      };

      const result = await ReviewService.getProductReviews(parseInt(product_id), options);

      res.status(200).json({
        success: true,
        data: result.reviews,
        pagination: {
          current_page: result.current_page,
          total_pages: result.total_pages,
          total_items: result.total_items,
          items_per_page: result.items_per_page
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al obtener resenas de producto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene resenas de un usuario
   * GET /reviews/user/:user_id
   */
  static async getUserReviews(req, res) {
    try {
      const { user_id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!user_id || isNaN(parseInt(user_id))) {
        throw new ValidationError('ID de usuario invalido');
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await ReviewService.getUserReviews(parseInt(user_id), options);

      res.status(200).json({
        success: true,
        data: result.reviews,
        pagination: {
          current_page: result.current_page,
          total_pages: result.total_pages,
          total_items: result.total_items,
          items_per_page: result.items_per_page
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al obtener resenas de usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene resenas destacadas
   * GET /reviews/featured
   */
  static async getFeaturedReviews(req, res) {
    try {
      const { limit = 5 } = req.query;

      const reviews = await ReviewService.getFeaturedReviews(parseInt(limit));

      res.status(200).json({
        success: true,
        data: reviews
      });
    } catch (error) {
      console.error('Error al obtener resenas destacadas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene resenas recientes
   * GET /reviews/recent
   */
  static async getRecentReviews(req, res) {
    try {
      const { limit = 10 } = req.query;

      const reviews = await ReviewService.getRecentReviews(parseInt(limit));

      res.status(200).json({
        success: true,
        data: reviews
      });
    } catch (error) {
      console.error('Error al obtener resenas recientes:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene estadisticas de resenas
   * GET /reviews/stats
   */
  static async getReviewStats(req, res) {
    try {
      const { product_id } = req.query;

      const stats = await ReviewService.getReviewStats(product_id ? parseInt(product_id) : null);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error al obtener estadisticas de resenas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verifica si un usuario puede hacer resena de un producto
   * GET /reviews/can-review/:user_id/:product_id
   */
  static async canUserReview(req, res) {
    try {
      const { user_id, product_id } = req.params;

      if (!user_id || isNaN(parseInt(user_id))) {
        throw new ValidationError('ID de usuario invalido');
      }

      if (!product_id || isNaN(parseInt(product_id))) {
        throw new ValidationError('ID de producto invalido');
      }

      const canReview = await ReviewService.canUserReview(parseInt(user_id), parseInt(product_id));

      res.status(200).json({
        success: true,
        data: {
          can_review: canReview.canReview,
          reason: canReview.reason
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al verificar si usuario puede hacer resena:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Marca una resena como verificada
   * PUT /reviews/:id/verify
   */
  static async verifyReview(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de resena invalido');
      }

      const review = await ReviewService.verifyReview(parseInt(id));

      res.status(200).json({
        success: true,
        message: 'Resena marcada como verificada',
        data: review
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al verificar resena:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

module.exports = ReviewController;
