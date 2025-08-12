const { DataTypes } = require('sequelize');
const Joi = require('joi');
const { sequelize } = require('../config/database');

// Esquema de validacion Joi para inventario
const inventoryValidationSchema = {
  create: Joi.object({
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
      .min(0)
      .default(0)
      .messages({
        'number.base': 'La cantidad debe ser un numero',
        'number.integer': 'La cantidad debe ser un numero entero',
        'number.min': 'La cantidad no puede ser menor a 0'
      }),
    min_stock: Joi.number()
      .integer()
      .min(0)
      .default(5)
      .messages({
        'number.base': 'El stock minimo debe ser un numero',
        'number.integer': 'El stock minimo debe ser un numero entero',
        'number.min': 'El stock minimo no puede ser menor a 0'
      }),
    max_stock: Joi.number()
      .integer()
      .min(1)
      .default(100)
      .messages({
        'number.base': 'El stock maximo debe ser un numero',
        'number.integer': 'El stock maximo debe ser un numero entero',
        'number.min': 'El stock maximo debe ser mayor a 0'
      })
  }),
  update: Joi.object({
    quantity: Joi.number()
      .integer()
      .min(0)
      .messages({
        'number.base': 'La cantidad debe ser un numero',
        'number.integer': 'La cantidad debe ser un numero entero',
        'number.min': 'La cantidad no puede ser menor a 0'
      }),
    min_stock: Joi.number()
      .integer()
      .min(0)
      .messages({
        'number.base': 'El stock minimo debe ser un numero',
        'number.integer': 'El stock minimo debe ser un numero entero',
        'number.min': 'El stock minimo no puede ser menor a 0'
      }),
    max_stock: Joi.number()
      .integer()
      .min(1)
      .messages({
        'number.base': 'El stock maximo debe ser un numero',
        'number.integer': 'El stock maximo debe ser un numero entero',
        'number.min': 'El stock maximo debe ser mayor a 0'
      })
  })
};

const Inventory = sequelize.define('Inventory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
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
    defaultValue: 0,
    validate: {
      isInt: true,
      min: 0
    }
  },
  min_stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: {
      isInt: true,
      min: 0
    }
  },
  max_stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    validate: {
      isInt: true,
      min: 1
    }
  }
}, {
  tableName: 'inventory',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    // Validar que max_stock sea mayor que min_stock
    beforeCreate: async (inventory) => {
      if (inventory.max_stock <= inventory.min_stock) {
        throw new Error('El stock maximo debe ser mayor al stock minimo');
      }
    },
    beforeUpdate: async (inventory) => {
      if (inventory.changed('max_stock') || inventory.changed('min_stock')) {
        const maxStock = inventory.max_stock || inventory.getDataValue('max_stock');
        const minStock = inventory.min_stock || inventory.getDataValue('min_stock');
        if (maxStock <= minStock) {
          throw new Error('El stock maximo debe ser mayor al stock minimo');
        }
      }
    }
  }
});

// Metodo de clase para obtener productos con stock bajo
Inventory.getLowStockProducts = async function() {
  const { Product } = require('./index');
  return await this.findAll({
    where: sequelize.literal('quantity <= min_stock'),
    include: [{
      model: Product,
      as: 'product',
      where: { is_active: true },
      required: true
    }],
    order: [['quantity', 'ASC']]
  });
};

// Metodo de clase para obtener productos agotados
Inventory.getOutOfStockProducts = async function() {
  const { Product } = require('./index');
  return await this.findAll({
    where: { quantity: 0 },
    include: [{
      model: Product,
      as: 'product',
      where: { is_active: true },
      required: true
    }],
    order: [['updated_at', 'DESC']]
  });
};

// Metodo de instancia para verificar si hay stock disponible
Inventory.prototype.hasStock = function(requiredQuantity = 1) {
  return this.quantity >= requiredQuantity;
};

// Metodo de instancia para verificar si el stock esta bajo
Inventory.prototype.isLowStock = function() {
  return this.quantity <= this.min_stock;
};

// Metodo de instancia para verificar si esta agotado
Inventory.prototype.isOutOfStock = function() {
  return this.quantity === 0;
};

// Metodo de instancia para reducir stock (venta)
Inventory.prototype.reduceStock = async function(quantity) {
  if (this.quantity < quantity) {
    throw new Error('Stock insuficiente');
  }
  
  this.quantity -= quantity;
  return await this.save();
};

// Metodo de instancia para aumentar stock (reposicion)
Inventory.prototype.addStock = async function(quantity) {
  if (this.quantity + quantity > this.max_stock) {
    throw new Error('La cantidad excede el stock maximo permitido');
  }
  
  this.quantity += quantity;
  return await this.save();
};

// Metodo de instancia para obtener estado del stock
Inventory.prototype.getStockStatus = function() {
  if (this.isOutOfStock()) {
    return 'agotado';
  } else if (this.isLowStock()) {
    return 'bajo';
  } else {
    return 'disponible';
  }
};

// Metodo de instancia para obtener porcentaje de stock
Inventory.prototype.getStockPercentage = function() {
  return Math.round((this.quantity / this.max_stock) * 100);
};

module.exports = Inventory;
module.exports.validationSchema = inventoryValidationSchema;
