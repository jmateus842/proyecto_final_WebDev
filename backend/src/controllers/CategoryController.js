const CategoryService = require('../services/CategoryService');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

class CategoryController {
  /**
   * Obtiene todas las categorias
   * GET /categories
   */
  static async getAllCategories(req, res) {
    try {
      const { active_only = 'false' } = req.query;

      const categories = await CategoryService.getAllCategories({
        activeOnly: active_only === 'true'
      });

      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error al obtener categorias:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene una categoria por ID
   * GET /categories/:id
   */
  static async getCategoryById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de categoria invalido');
      }

      const category = await CategoryService.getCategoryById(parseInt(id));

      res.status(200).json({
        success: true,
        data: category
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

      console.error('Error al obtener categoria:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene una categoria por slug
   * GET /categories/slug/:slug
   */
  static async getCategoryBySlug(req, res) {
    try {
      const { slug } = req.params;

      if (!slug) {
        throw new ValidationError('Slug es requerido');
      }

      const category = await CategoryService.getCategoryBySlug(slug);

      res.status(200).json({
        success: true,
        data: category
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

      console.error('Error al obtener categoria por slug:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crea una nueva categoria
   * POST /categories
   */
  static async createCategory(req, res) {
    try {
      const { name, description, parent_id } = req.body;

      // Validar datos requeridos
      if (!name) {
        throw new ValidationError('Nombre de categoria es requerido');
      }

      const categoryData = {
        name,
        description: description || '',
        parent_id: parent_id ? parseInt(parent_id) : null
      };

      const category = await CategoryService.createCategory(categoryData);

      res.status(201).json({
        success: true,
        message: 'Categoria creada exitosamente',
        data: category
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

      console.error('Error al crear categoria:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualiza una categoria existente
   * PUT /categories/:id
   */
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de categoria invalido');
      }

      // Validar que al menos un campo se actualice
      if (Object.keys(updateData).length === 0) {
        throw new ValidationError('Al menos un campo debe ser actualizado');
      }

      const category = await CategoryService.updateCategory(parseInt(id), updateData);

      res.status(200).json({
        success: true,
        message: 'Categoria actualizada exitosamente',
        data: category
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

      if (error instanceof ConflictError) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al actualizar categoria:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Elimina una categoria
   * DELETE /categories/:id
   */
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de categoria invalido');
      }

      await CategoryService.deleteCategory(parseInt(id));

      res.status(200).json({
        success: true,
        message: 'Categoria eliminada exitosamente'
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

      console.error('Error al eliminar categoria:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene categorias activas
   * GET /categories/active
   */
  static async getActiveCategories(req, res) {
    try {
      const categories = await CategoryService.getActiveCategories();

      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error al obtener categorias activas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene el arbol de categorias (jerarquia)
   * GET /categories/tree
   */
  static async getCategoryTree(req, res) {
    try {
      const tree = await CategoryService.getCategoryTree();

      res.status(200).json({
        success: true,
        data: tree
      });
    } catch (error) {
      console.error('Error al obtener arbol de categorias:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene productos de una categoria
   * GET /categories/:id/products
   */
  static async getCategoryProducts(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de categoria invalido');
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await CategoryService.getCategoryProducts(parseInt(id), options);

      res.status(200).json({
        success: true,
        data: result.products,
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

      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al obtener productos de categoria:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene estadisticas de categorias
   * GET /categories/stats
   */
  static async getCategoryStats(req, res) {
    try {
      const stats = await CategoryService.getCategoryStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error al obtener estadisticas de categorias:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

module.exports = CategoryController;
