const InventoryService = require('../services/InventoryService');
const { ValidationError, NotFoundError, ConflictError, BusinessLogicError } = require('../utils/errors');

class InventoryController {
  /**
   * Obtiene todo el inventario con paginacion y filtros
   * GET /inventory
   */
  static async getAllInventory(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        product_id,
        low_stock = 'false',
        out_of_stock = 'false',
        sort_by = 'product_id',
        sort_order = 'ASC'
      } = req.query;

      const filters = {};
      if (product_id) filters.product_id = product_id;
      if (low_stock === 'true') filters.low_stock = true;
      if (out_of_stock === 'true') filters.out_of_stock = true;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        filters,
        sort_by,
        sort_order
      };

      const result = await InventoryService.getAllInventory(options);

      res.status(200).json({
        success: true,
        data: result.inventory,
        pagination: {
          current_page: result.current_page,
          total_pages: result.total_pages,
          total_items: result.total_items,
          items_per_page: result.items_per_page
        }
      });
    } catch (error) {
      console.error('Error al obtener inventario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene inventario de un producto
   * GET /inventory/product/:product_id
   */
  static async getProductInventory(req, res) {
    try {
      const { product_id } = req.params;

      if (!product_id || isNaN(parseInt(product_id))) {
        throw new ValidationError('ID de producto invalido');
      }

      const inventory = await InventoryService.getProductInventory(parseInt(product_id));

      res.status(200).json({
        success: true,
        data: inventory
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

      console.error('Error al obtener inventario de producto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualiza el stock de un producto
   * PUT /inventory/product/:product_id/stock
   */
  static async updateStock(req, res) {
    try {
      const { product_id } = req.params;
      const { quantity, operation = 'set', reason = '' } = req.body;

      if (!product_id || isNaN(parseInt(product_id))) {
        throw new ValidationError('ID de producto invalido');
      }

      if (quantity === undefined || isNaN(parseInt(quantity))) {
        throw new ValidationError('Cantidad es requerida y debe ser un numero');
      }

      const validOperations = ['add', 'subtract', 'set'];
      if (!validOperations.includes(operation)) {
        throw new ValidationError('Operacion invalida. Debe ser add, subtract o set');
      }

      const stockData = {
        quantity: parseInt(quantity),
        operation,
        reason: reason || ''
      };

      const inventory = await InventoryService.updateStock(parseInt(product_id), stockData);

      res.status(200).json({
        success: true,
        message: 'Stock actualizado exitosamente',
        data: inventory
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

      if (error instanceof BusinessLogicError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al actualizar stock:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Reserva stock para un pedido
   * POST /inventory/reserve
   */
  static async reserveStock(req, res) {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ValidationError('Items son requeridos');
      }

      // Validar estructura de items
      for (const item of items) {
        if (!item.product_id || !item.quantity || item.quantity <= 0) {
          throw new ValidationError('Cada item debe tener product_id y quantity valida');
        }
      }

      const reservationData = items.map(item => ({
        product_id: parseInt(item.product_id),
        quantity: parseInt(item.quantity)
      }));

      const result = await InventoryService.reserveStock(reservationData);

      res.status(200).json({
        success: true,
        message: 'Stock reservado exitosamente',
        data: result
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
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

      console.error('Error al reservar stock:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Libera stock reservado
   * POST /inventory/release
   */
  static async releaseStock(req, res) {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ValidationError('Items son requeridos');
      }

      // Validar estructura de items
      for (const item of items) {
        if (!item.product_id || !item.quantity || item.quantity <= 0) {
          throw new ValidationError('Cada item debe tener product_id y quantity valida');
        }
      }

      const releaseData = items.map(item => ({
        product_id: parseInt(item.product_id),
        quantity: parseInt(item.quantity)
      }));

      const result = await InventoryService.releaseStock(releaseData);

      res.status(200).json({
        success: true,
        message: 'Stock liberado exitosamente',
        data: result
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
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

      console.error('Error al liberar stock:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene alertas de inventario
   * GET /inventory/alerts
   */
  static async getInventoryAlerts(req, res) {
    try {
      const { alert_type } = req.query;

      const alerts = await InventoryService.getInventoryAlerts(alert_type);

      res.status(200).json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('Error al obtener alertas de inventario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene productos con stock bajo
   * GET /inventory/low-stock
   */
  static async getLowStockProducts(req, res) {
    try {
      const { limit = 20 } = req.query;

      const products = await InventoryService.getLowStockProducts(parseInt(limit));

      res.status(200).json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error al obtener productos con stock bajo:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene productos sin stock
   * GET /inventory/out-of-stock
   */
  static async getOutOfStockProducts(req, res) {
    try {
      const { limit = 20 } = req.query;

      const products = await InventoryService.getOutOfStockProducts(parseInt(limit));

      res.status(200).json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error al obtener productos sin stock:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verifica disponibilidad de stock para items
   * POST /inventory/check-availability
   */
  static async checkStockAvailability(req, res) {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ValidationError('Items son requeridos');
      }

      // Validar estructura de items
      for (const item of items) {
        if (!item.product_id || !item.quantity || item.quantity <= 0) {
          throw new ValidationError('Cada item debe tener product_id y quantity valida');
        }
      }

      const checkData = items.map(item => ({
        product_id: parseInt(item.product_id),
        quantity: parseInt(item.quantity)
      }));

      const result = await InventoryService.checkStockAvailability(checkData);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al verificar disponibilidad de stock:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Ajusta inventario con razon
   * POST /inventory/adjust
   */
  static async adjustInventory(req, res) {
    try {
      const { product_id, quantity, reason, adjustment_type = 'manual' } = req.body;

      if (!product_id || isNaN(parseInt(product_id))) {
        throw new ValidationError('ID de producto invalido');
      }

      if (quantity === undefined || isNaN(parseInt(quantity))) {
        throw new ValidationError('Cantidad es requerida y debe ser un numero');
      }

      if (!reason) {
        throw new ValidationError('Razon es requerida');
      }

      const validTypes = ['manual', 'damaged', 'expired', 'theft', 'correction'];
      if (!validTypes.includes(adjustment_type)) {
        throw new ValidationError('Tipo de ajuste invalido');
      }

      const adjustmentData = {
        quantity: parseInt(quantity),
        reason,
        adjustment_type
      };

      const result = await InventoryService.adjustInventory(parseInt(product_id), adjustmentData);

      res.status(200).json({
        success: true,
        message: 'Inventario ajustado exitosamente',
        data: result
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

      console.error('Error al ajustar inventario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene estadisticas de inventario
   * GET /inventory/stats
   */
  static async getInventoryStats(req, res) {
    try {
      const stats = await InventoryService.getInventoryStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error al obtener estadisticas de inventario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene historial de ajustes de inventario
   * GET /inventory/:product_id/adjustments
   */
  static async getInventoryAdjustments(req, res) {
    try {
      const { product_id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!product_id || isNaN(parseInt(product_id))) {
        throw new ValidationError('ID de producto invalido');
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await InventoryService.getInventoryAdjustments(parseInt(product_id), options);

      res.status(200).json({
        success: true,
        data: result.adjustments,
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

      console.error('Error al obtener ajustes de inventario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

module.exports = InventoryController;
