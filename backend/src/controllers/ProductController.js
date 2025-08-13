const ProductService = require('../services/ProductService');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

class ProductController {
  /**
   * Obtiene todos los productos con paginacion y filtros
   * GET /products
   */
  static async getAllProducts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        category_id,
        min_price,
        max_price,
        in_stock,
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = req.query;

      const filters = {};
      if (search) filters.search = search;
      if (category_id) filters.category_id = category_id;
      if (min_price) filters.min_price = min_price;
      if (max_price) filters.max_price = max_price;
      if (in_stock !== undefined) filters.in_stock = in_stock === 'true';

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        filters,
        sort_by,
        sort_order
      };

      const result = await ProductService.getAllProducts(options);

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
      console.error('Error al obtener productos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene un producto por ID
   * GET /products/:id
   */
  static async getProductById(req, res) {
    try {
      const { id } = req.params;
      const { include_reviews = 'false' } = req.query;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de producto invalido');
      }

      const options = {
        includeReviews: include_reviews === 'true'
      };

      const product = await ProductService.getProductById(parseInt(id), options);

      res.status(200).json({
        success: true,
        data: product
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

      console.error('Error al obtener producto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene un producto por SKU
   * GET /products/sku/:sku
   */
  static async getProductBySku(req, res) {
    try {
      const { sku } = req.params;

      if (!sku) {
        throw new ValidationError('SKU es requerido');
      }

      const product = await ProductService.getProductBySku(sku);

      res.status(200).json({
        success: true,
        data: product
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

      console.error('Error al obtener producto por SKU:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crea un nuevo producto
   * POST /products
   */
  static async createProduct(req, res) {
    try {
      const {
        name,
        description,
        price,
        category_id,
        initial_stock = 0,
        min_stock = 0,
        max_stock = 1000
      } = req.body;

      // Validar datos requeridos
      if (!name || !description || !price || !category_id) {
        throw new ValidationError('Nombre, descripcion, precio y categoria son requeridos');
      }

      // Validar precio
      if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
        throw new ValidationError('Precio debe ser un numero positivo');
      }

      // Validar stock inicial
      if (isNaN(parseInt(initial_stock)) || parseInt(initial_stock) < 0) {
        throw new ValidationError('Stock inicial debe ser un numero no negativo');
      }

      const productData = {
        name,
        description,
        price: parseFloat(price),
        category_id: parseInt(category_id),
        initial_stock: parseInt(initial_stock),
        min_stock: parseInt(min_stock),
        max_stock: parseInt(max_stock)
      };

      const product = await ProductService.createProduct(productData);

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: product
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

      console.error('Error al crear producto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualiza un producto existente
   * PUT /products/:id
   */
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de producto invalido');
      }

      // Validar que al menos un campo se actualice
      if (Object.keys(updateData).length === 0) {
        throw new ValidationError('Al menos un campo debe ser actualizado');
      }

      // Validar precio si se proporciona
      if (updateData.price && (isNaN(parseFloat(updateData.price)) || parseFloat(updateData.price) <= 0)) {
        throw new ValidationError('Precio debe ser un numero positivo');
      }

      const product = await ProductService.updateProduct(parseInt(id), updateData);

      res.status(200).json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: product
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

      console.error('Error al actualizar producto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Elimina un producto
   * DELETE /products/:id
   */
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de producto invalido');
      }

      await ProductService.deleteProduct(parseInt(id));

      res.status(200).json({
        success: true,
        message: 'Producto eliminado exitosamente'
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

      console.error('Error al eliminar producto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Busca productos por termino de busqueda
   * GET /products/search
   */
  static async searchProducts(req, res) {
    try {
      const { q, page = 1, limit = 10 } = req.query;

      if (!q || q.trim().length === 0) {
        throw new ValidationError('Termino de busqueda es requerido');
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await ProductService.searchProducts(q.trim(), options);

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

      console.error('Error al buscar productos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene productos destacados
   * GET /products/featured
   */
  static async getFeaturedProducts(req, res) {
    try {
      const { limit = 6 } = req.query;

      const products = await ProductService.getFeaturedProducts(parseInt(limit));

      res.status(200).json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error al obtener productos destacados:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene productos relacionados por categoria
   * GET /products/:id/related
   */
  static async getRelatedProducts(req, res) {
    try {
      const { id } = req.params;
      const { limit = 4 } = req.query;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de producto invalido');
      }

      const products = await ProductService.getRelatedProducts(parseInt(id), parseInt(limit));

      res.status(200).json({
        success: true,
        data: products
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

      console.error('Error al obtener productos relacionados:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene estadisticas de productos
   * GET /products/stats
   */
  static async getProductStats(req, res) {
    try {
      const stats = await ProductService.getProductStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error al obtener estadisticas de productos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

module.exports = ProductController;
