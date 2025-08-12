const { DataTypes } = require('sequelize');
const Joi = require('joi');
const { sequelize } = require('../config/database');

// Esquema de validacion Joi para pedidos
const orderValidationSchema = {
  create: Joi.object({
    user_id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'El ID del usuario debe ser un numero',
        'number.integer': 'El ID del usuario debe ser un numero entero',
        'number.positive': 'El ID del usuario debe ser mayor a 0',
        'any.required': 'El ID del usuario es requerido'
      }),
    order_number: Joi.string()
      .min(5)
      .max(50)
      .optional()
      .messages({
        'string.min': 'El numero de pedido debe tener al menos 5 caracteres',
        'string.max': 'El numero de pedido no puede exceder 50 caracteres'
      }),
    status: Joi.string()
      .valid('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
      .default('pending')
      .messages({
        'any.only': 'El estado debe ser: pending, confirmed, shipped, delivered, cancelled'
      }),
    total_amount: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({
        'number.base': 'El monto total debe ser un numero',
        'number.positive': 'El monto total debe ser mayor a 0',
        'number.precision': 'El monto total debe tener maximo 2 decimales',
        'any.required': 'El monto total es requerido'
      }),
    shipping_address: Joi.string()
      .min(10)
      .max(1000)
      .required()
      .messages({
        'string.min': 'La direccion de envio debe tener al menos 10 caracteres',
        'string.max': 'La direccion de envio no puede exceder 1000 caracteres',
        'any.required': 'La direccion de envio es requerida'
      }),
    billing_address: Joi.string()
      .min(10)
      .max(1000)
      .required()
      .messages({
        'string.min': 'La direccion de facturacion debe tener al menos 10 caracteres',
        'string.max': 'La direccion de facturacion no puede exceder 1000 caracteres',
        'any.required': 'La direccion de facturacion es requerida'
      }),
    payment_status: Joi.string()
      .valid('pending', 'paid', 'failed', 'refunded')
      .default('pending')
      .messages({
        'any.only': 'El estado de pago debe ser: pending, paid, failed, refunded'
      })
  }),
  update: Joi.object({
    status: Joi.string()
      .valid('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
      .messages({
        'any.only': 'El estado debe ser: pending, confirmed, shipped, delivered, cancelled'
      }),
    payment_status: Joi.string()
      .valid('pending', 'paid', 'failed', 'refunded')
      .messages({
        'any.only': 'El estado de pago debe ser: pending, paid, failed, refunded'
      }),
    shipping_address: Joi.string()
      .min(10)
      .max(1000)
      .messages({
        'string.min': 'La direccion de envio debe tener al menos 10 caracteres',
        'string.max': 'La direccion de envio no puede exceder 1000 caracteres'
      }),
    billing_address: Joi.string()
      .min(10)
      .max(1000)
      .messages({
        'string.min': 'La direccion de facturacion debe tener al menos 10 caracteres',
        'string.max': 'La direccion de facturacion no puede exceder 1000 caracteres'
      })
  })
};

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    validate: {
      isInt: true,
      min: 1
    }
  },
  order_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [5, 50],
      notEmpty: true
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    }
  },
  shipping_address: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 1000],
      notEmpty: true
    }
  },
  billing_address: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 1000],
      notEmpty: true
    }
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending',
    allowNull: false
  }
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    // Generar numero de pedido automaticamente si no se proporciona
    beforeCreate: async (order) => {
      if (!order.order_number) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        order.order_number = `ORD-${timestamp}-${random}`.toUpperCase();
      }
    }
  }
});

// Metodo de clase para obtener pedidos por usuario
Order.getUserOrders = async function(userId, options = {}) {
  return await this.findAll({
    where: { user_id: userId },
    include: [{
      model: require('./User'),
      as: 'user',
      attributes: ['id', 'username', 'first_name', 'last_name']
    }],
    order: [['created_at', 'DESC']],
    ...options
  });
};

// Metodo de clase para obtener pedidos por estado
Order.getOrdersByStatus = async function(status, options = {}) {
  return await this.findAll({
    where: { status: status },
    include: [{
      model: require('./User'),
      as: 'user',
      attributes: ['id', 'username', 'first_name', 'last_name']
    }],
    order: [['created_at', 'DESC']],
    ...options
  });
};

// Metodo de clase para buscar por numero de pedido
Order.findByOrderNumber = async function(orderNumber) {
  return await this.findOne({
    where: { order_number: orderNumber },
    include: [{
      model: require('./User'),
      as: 'user',
      attributes: ['id', 'username', 'first_name', 'last_name']
    }]
  });
};

// Metodo de instancia para obtener items del pedido
Order.prototype.getOrderItems = async function(options = {}) {
  const { OrderItem } = require('./index');
  return await OrderItem.findAll({
    where: { order_id: this.id },
    include: [{
      model: require('./Product'),
      as: 'product',
      attributes: ['id', 'name', 'sku', 'price', 'image_url']
    }],
    ...options
  });
};

// Metodo de instancia para calcular total del pedido
Order.prototype.calculateTotal = async function() {
  const { OrderItem } = require('./index');
  const result = await OrderItem.findOne({
    where: { order_id: this.id },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('total_price')), 'total']
    ]
  });
  
  return parseFloat(result?.dataValues?.total || 0);
};

// Metodo de instancia para verificar si se puede cancelar
Order.prototype.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

// Metodo de instancia para verificar si se puede enviar
Order.prototype.canBeShipped = function() {
  return this.status === 'confirmed' && this.payment_status === 'paid';
};

// Metodo de instancia para obtener estado legible
Order.prototype.getStatusText = function() {
  const statusMap = {
    'pending': 'Pendiente',
    'confirmed': 'Confirmado',
    'shipped': 'Enviado',
    'delivered': 'Entregado',
    'cancelled': 'Cancelado'
  };
  return statusMap[this.status] || this.status;
};

// Metodo de instancia para obtener estado de pago legible
Order.prototype.getPaymentStatusText = function() {
  const paymentStatusMap = {
    'pending': 'Pendiente',
    'paid': 'Pagado',
    'failed': 'Fallido',
    'refunded': 'Reembolsado'
  };
  return paymentStatusMap[this.payment_status] || this.payment_status;
};

// Metodo de instancia para formatear monto total
Order.prototype.getFormattedTotal = function() {
  return `$${parseFloat(this.total_amount).toFixed(2)}`;
};

module.exports = Order;
module.exports.validationSchema = orderValidationSchema;
