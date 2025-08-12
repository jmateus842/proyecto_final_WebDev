const { DataTypes } = require('sequelize');
const Joi = require('joi');
const { sequelize } = require('../config/database');

// Esquema de validacion Joi para productos
const productValidationSchema = {
  create: Joi.object({
    name: Joi.string()
      .min(2)
      .max(200)
      .required()
      .messages({
        'string.min': 'El nombre del producto debe tener al menos 2 caracteres',
        'string.max': 'El nombre del producto no puede exceder 200 caracteres',
        'any.required': 'El nombre del producto es requerido'
      }),
    description: Joi.string()
      .max(1000)
      .optional()
      .messages({
        'string.max': 'La descripcion no puede exceder 1000 caracteres'
      }),
    price: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({
        'number.base': 'El precio debe ser un numero',
        'number.positive': 'El precio debe ser mayor a 0',
        'number.precision': 'El precio debe tener maximo 2 decimales',
        'any.required': 'El precio es requerido'
      }),
    category_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'El ID de categoria debe ser un numero',
        'number.integer': 'El ID de categoria debe ser un numero entero',
        'number.positive': 'El ID de categoria debe ser mayor a 0'
      }),
    sku: Joi.string()
      .alphanum()
      .min(3)
      .max(100)
      .optional()
      .messages({
        'string.alphanum': 'El SKU solo puede contener letras y numeros',
        'string.min': 'El SKU debe tener al menos 3 caracteres',
        'string.max': 'El SKU no puede exceder 100 caracteres'
      }),
    image_url: Joi.string()
      .uri()
      .max(500)
      .optional()
      .messages({
        'string.uri': 'La URL de imagen debe ser valida',
        'string.max': 'La URL de imagen no puede exceder 500 caracteres'
      }),
    is_active: Joi.boolean()
      .default(true)
  }),
  update: Joi.object({
    name: Joi.string()
      .min(2)
      .max(200)
      .messages({
        'string.min': 'El nombre del producto debe tener al menos 2 caracteres',
        'string.max': 'El nombre del producto no puede exceder 200 caracteres'
      }),
    description: Joi.string()
      .max(1000)
      .optional()
      .messages({
        'string.max': 'La descripcion no puede exceder 1000 caracteres'
      }),
    price: Joi.number()
      .positive()
      .precision(2)
      .messages({
        'number.base': 'El precio debe ser un numero',
        'number.positive': 'El precio debe ser mayor a 0',
        'number.precision': 'El precio debe tener maximo 2 decimales'
      }),
    category_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'El ID de categoria debe ser un numero',
        'number.integer': 'El ID de categoria debe ser un numero entero',
        'number.positive': 'El ID de categoria debe ser mayor a 0'
      }),
    sku: Joi.string()
      .alphanum()
      .min(3)
      .max(100)
      .optional()
      .messages({
        'string.alphanum': 'El SKU solo puede contener letras y numeros',
        'string.min': 'El SKU debe tener al menos 3 caracteres',
        'string.max': 'El SKU no puede exceder 100 caracteres'
      }),
    image_url: Joi.string()
      .uri()
      .max(500)
      .optional()
      .messages({
        'string.uri': 'La URL de imagen debe ser valida',
        'string.max': 'La URL de imagen no puede exceder 500 caracteres'
      }),
    is_active: Joi.boolean()
  })
};

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [2, 200],
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    }
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    },
    validate: {
      isInt: true,
      min: 1
    }
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    validate: {
      len: [3, 100],
      isAlphanumeric: true
    }
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      len: [0, 500],
      isUrl: true
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    // Generar SKU automaticamente si no se proporciona
    beforeCreate: async (product) => {
      if (!product.sku) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        product.sku = `PROD-${timestamp}-${random}`.toUpperCase();
      }
    }
  }
});

// Metodo de clase para obtener productos activos
Product.getActiveProducts = async function(options = {}) {
  return await this.findAll({
    where: { is_active: true },
    include: [{
      model: require('./Category'),
      as: 'category',
      where: { is_active: true },
      required: false
    }],
    ...options
  });
};

// Metodo de clase para buscar por categoria
Product.findByCategory = async function(categoryId, options = {}) {
  return await this.findAll({
    where: {
      category_id: categoryId,
      is_active: true,
      ...options.where
    },
    include: [{
      model: require('./Category'),
      as: 'category',
      where: { is_active: true },
      required: false
    }],
    ...options
  });
};

// Metodo de clase para buscar por SKU
Product.findBySku = async function(sku) {
  return await this.findOne({
    where: { 
      sku: sku,
      is_active: true 
    },
    include: [{
      model: require('./Category'),
      as: 'category',
      required: false
    }]
  });
};

// Metodo de instancia para obtener inventario
Product.prototype.getInventory = async function() {
  const { Inventory } = require('./index');
  return await Inventory.findOne({
    where: { product_id: this.id }
  });
};

// Metodo de instancia para obtener resenas
Product.prototype.getReviews = async function(options = {}) {
  const { Review } = require('./index');
  return await Review.findAll({
    where: { product_id: this.id },
    include: [{
      model: require('./User'),
      as: 'user',
      attributes: ['id', 'username', 'first_name', 'last_name']
    }],
    order: [['created_at', 'DESC']],
    ...options
  });
};

// Metodo de instancia para calcular rating promedio
Product.prototype.getAverageRating = async function() {
  const { Review } = require('./index');
  const result = await Review.findOne({
    where: { product_id: this.id },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']
    ]
  });
  
  return {
    averageRating: parseFloat(result?.dataValues?.averageRating || 0),
    totalReviews: parseInt(result?.dataValues?.totalReviews || 0)
  };
};

// Metodo de instancia para formatear precio
Product.prototype.getFormattedPrice = function() {
  return `$${parseFloat(this.price).toFixed(2)}`;
};

module.exports = Product;
module.exports.validationSchema = productValidationSchema;
