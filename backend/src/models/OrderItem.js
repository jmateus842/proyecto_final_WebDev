const { DataTypes } = require('sequelize');
const Joi = require('joi');
const { sequelize } = require('../config/database');

// Esquema de validacion Joi para items de pedido
const orderItemValidationSchema = {
  create: Joi.object({
    order_id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'El ID del pedido debe ser un numero',
        'number.integer': 'El ID del pedido debe ser un numero entero',
        'number.positive': 'El ID del pedido debe ser mayor a 0',
        'any.required': 'El ID del pedido es requerido'
      }),
    product_id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'El ID del producto debe ser un numero',
        'number.integer': 'El ID del producto debe ser un numero entero',
        'number.positive': 'El ID del producto debe ser mayor a 0',
        'any.required': 'El ID del producto es requerido'
      }),
    quantity: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'La cantidad debe ser un numero',
        'number.integer': 'La cantidad debe ser un numero entero',
        'number.positive': 'La cantidad debe ser mayor a 0',
        'any.required': 'La cantidad es requerida'
      }),
    unit_price: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({
        'number.base': 'El precio unitario debe ser un numero',
        'number.positive': 'El precio unitario debe ser mayor a 0',
        'number.precision': 'El precio unitario debe tener maximo 2 decimales',
        'any.required': 'El precio unitario es requerido'
      }),
    total_price: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({
        'number.base': 'El precio total debe ser un numero',
        'number.positive': 'El precio total debe ser mayor a 0',
        'number.precision': 'El precio total debe tener maximo 2 decimales',
        'any.required': 'El precio total es requerido'
      })
  }),
  update: Joi.object({
    quantity: Joi.number()
      .integer()
      .positive()
      .messages({
        'number.base': 'La cantidad debe ser un numero',
        'number.integer': 'La cantidad debe ser un numero entero',
        'number.positive': 'La cantidad debe ser mayor a 0'
      }),
    unit_price: Joi.number()
      .positive()
      .precision(2)
      .messages({
        'number.base': 'El precio unitario debe ser un numero',
        'number.positive': 'El precio unitario debe ser mayor a 0',
        'number.precision': 'El precio unitario debe tener maximo 2 decimales'
      }),
    total_price: Joi.number()
      .positive()
      .precision(2)
      .messages({
        'number.base': 'El precio total debe ser un numero',
        'number.positive': 'El precio total debe ser mayor a 0',
        'number.precision': 'El precio total debe tener maximo 2 decimales'
      })
  })
};

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    },
    validate: {
      isInt: true,
      min: 1
    }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    },
    validate: {
      isInt: true,
      min: 1
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: true,
      min: 1
    }
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    }
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    }
  }
}, {
  tableName: 'order_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // No necesitamos updated_at para items de pedido
  hooks: {
    // Calcular precio total automaticamente
    beforeCreate: async (orderItem) => {
      if (!orderItem.total_price) {
        orderItem.total_price = parseFloat(orderItem.unit_price) * orderItem.quantity;
      }
    },
    beforeUpdate: async (orderItem) => {
      if (orderItem.changed('quantity') || orderItem.changed('unit_price')) {
        const quantity = orderItem.quantity || orderItem.getDataValue('quantity');
        const unitPrice = orderItem.unit_price || orderItem.getDataValue('unit_price');
        orderItem.total_price = parseFloat(unitPrice) * quantity;
      }
    }
  }
});

// Metodo de clase para obtener items por pedido
OrderItem.getByOrder = async function(orderId, options = {}) {
  return await this.findAll({
    where: { order_id: orderId },
    include: [{
      model: require('./Product'),
      as: 'product',
      attributes: ['id', 'name', 'sku', 'price', 'image_url']
    }],
    ...options
  });
};

// Metodo de clase para obtener items por producto
OrderItem.getByProduct = async function(productId, options = {}) {
  return await this.findAll({
    where: { product_id: productId },
    include: [{
      model: require('./Order'),
      as: 'order',
      attributes: ['id', 'order_number', 'status', 'created_at']
    }],
    order: [['created_at', 'DESC']],
    ...options
  });
};

// Metodo de clase para calcular totales por pedido
OrderItem.getOrderTotals = async function(orderId) {
  const result = await this.findOne({
    where: { order_id: orderId },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('total_price')), 'totalAmount'],
      [sequelize.fn('SUM', sequelize.col('quantity')), 'totalItems'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalProducts']
    ]
  });
  
  return {
    totalAmount: parseFloat(result?.dataValues?.totalAmount || 0),
    totalItems: parseInt(result?.dataValues?.totalItems || 0),
    totalProducts: parseInt(result?.dataValues?.totalProducts || 0)
  };
};

// Metodo de instancia para recalcular precio total
OrderItem.prototype.recalculateTotal = function() {
  this.total_price = parseFloat(this.unit_price) * this.quantity;
  return this;
};

// Metodo de instancia para formatear precio unitario
OrderItem.prototype.getFormattedUnitPrice = function() {
  return `$${parseFloat(this.unit_price).toFixed(2)}`;
};

// Metodo de instancia para formatear precio total
OrderItem.prototype.getFormattedTotalPrice = function() {
  return `$${parseFloat(this.total_price).toFixed(2)}`;
};

// Metodo de instancia para obtener subtotal
OrderItem.prototype.getSubtotal = function() {
  return parseFloat(this.unit_price) * this.quantity;
};

module.exports = OrderItem;
module.exports.validationSchema = orderItemValidationSchema;
