const OrderService = require('../services/OrderService');
const { ValidationError, NotFoundError, ConflictError, BusinessLogicError } = require('../utils/errors');

class OrderController {
  /**
   * Obtiene todos los pedidos con paginacion y filtros
   * GET /orders
   */
  static async getAllOrders(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        user_id,
        start_date,
        end_date,
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (user_id) filters.user_id = user_id;
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        filters,
        sort_by,
        sort_order
      };

      const result = await OrderService.getAllOrders(options);

      res.status(200).json({
        success: true,
        data: result.orders,
        pagination: {
          current_page: result.current_page,
          total_pages: result.total_pages,
          total_items: result.total_items,
          items_per_page: result.items_per_page
        }
      });
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene un pedido por ID
   * GET /orders/:id
   */
  static async getOrderById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de pedido invalido');
      }

      const order = await OrderService.getOrderById(parseInt(id));

      res.status(200).json({
        success: true,
        data: order
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

      console.error('Error al obtener pedido:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene un pedido por numero de pedido
   * GET /orders/number/:order_number
   */
  static async getOrderByNumber(req, res) {
    try {
      const { order_number } = req.params;

      if (!order_number) {
        throw new ValidationError('Numero de pedido es requerido');
      }

      const order = await OrderService.getOrderByNumber(order_number);

      res.status(200).json({
        success: true,
        data: order
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

      console.error('Error al obtener pedido por numero:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crea un nuevo pedido
   * POST /orders
   */
  static async createOrder(req, res) {
    try {
      const { user_id, items, shipping_address, notes } = req.body;

      // Validar datos requeridos
      if (!user_id || !items || !Array.isArray(items) || items.length === 0) {
        throw new ValidationError('Usuario y items son requeridos');
      }

      // Validar estructura de items
      for (const item of items) {
        if (!item.product_id || !item.quantity || item.quantity <= 0) {
          throw new ValidationError('Cada item debe tener product_id y quantity valida');
        }
      }

      const orderData = {
        user_id: parseInt(user_id),
        items: items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity)
        })),
        shipping_address: shipping_address || '',
        notes: notes || ''
      };

      const order = await OrderService.createOrder(orderData);

      res.status(201).json({
        success: true,
        message: 'Pedido creado exitosamente',
        data: order
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

      console.error('Error al crear pedido:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualiza el estado de un pedido
   * PUT /orders/:id/status
   */
  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de pedido invalido');
      }

      if (!status) {
        throw new ValidationError('Estado es requerido');
      }

      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError('Estado invalido');
      }

      const order = await OrderService.updateOrderStatus(parseInt(id), status);

      res.status(200).json({
        success: true,
        message: 'Estado de pedido actualizado exitosamente',
        data: order
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

      console.error('Error al actualizar estado de pedido:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cancela un pedido
   * PUT /orders/:id/cancel
   */
  static async cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de pedido invalido');
      }

      const order = await OrderService.cancelOrder(parseInt(id), reason);

      res.status(200).json({
        success: true,
        message: 'Pedido cancelado exitosamente',
        data: order
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

      console.error('Error al cancelar pedido:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene pedidos de un usuario
   * GET /orders/user/:user_id
   */
  static async getUserOrders(req, res) {
    try {
      const { user_id } = req.params;
      const { page = 1, limit = 10, status } = req.query;

      if (!user_id || isNaN(parseInt(user_id))) {
        throw new ValidationError('ID de usuario invalido');
      }

      const filters = {};
      if (status) filters.status = status;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        filters
      };

      const result = await OrderService.getUserOrders(parseInt(user_id), options);

      res.status(200).json({
        success: true,
        data: result.orders,
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

      console.error('Error al obtener pedidos de usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene estadisticas de pedidos
   * GET /orders/stats
   */
  static async getOrderStats(req, res) {
    try {
      const { period = 'month' } = req.query;

      const stats = await OrderService.getOrderStats(period);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error al obtener estadisticas de pedidos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene pedidos por estado
   * GET /orders/status/:status
   */
  static async getOrdersByStatus(req, res) {
    try {
      const { status } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!status) {
        throw new ValidationError('Estado es requerido');
      }

      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError('Estado invalido');
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await OrderService.getOrdersByStatus(status, options);

      res.status(200).json({
        success: true,
        data: result.orders,
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

      console.error('Error al obtener pedidos por estado:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene items de un pedido
   * GET /orders/:id/items
   */
  static async getOrderItems(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de pedido invalido');
      }

      const items = await OrderService.getOrderItems(parseInt(id));

      res.status(200).json({
        success: true,
        data: items
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

      console.error('Error al obtener items de pedido:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

module.exports = OrderController;
