const { DataTypes } = require('sequelize');
const Joi = require('joi');
const { sequelize } = require('../config/database');

// Esquema de validacion Joi para categorias
const categoryValidationSchema = {
  create: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'El nombre de la categoria debe tener al menos 2 caracteres',
        'string.max': 'El nombre de la categoria no puede exceder 100 caracteres',
        'any.required': 'El nombre de la categoria es requerido'
      }),
    description: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'La descripcion no puede exceder 500 caracteres'
      }),
    slug: Joi.string()
      .alphanum()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.alphanum': 'El slug solo puede contener letras y numeros',
        'string.min': 'El slug debe tener al menos 2 caracteres',
        'string.max': 'El slug no puede exceder 100 caracteres',
        'any.required': 'El slug es requerido'
      }),
    is_active: Joi.boolean()
      .default(true)
  }),
  update: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .messages({
        'string.min': 'El nombre de la categoria debe tener al menos 2 caracteres',
        'string.max': 'El nombre de la categoria no puede exceder 100 caracteres'
      }),
    description: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'La descripcion no puede exceder 500 caracteres'
      }),
    slug: Joi.string()
      .alphanum()
      .min(2)
      .max(100)
      .messages({
        'string.alphanum': 'El slug solo puede contener letras y numeros',
        'string.min': 'El slug debe tener al menos 2 caracteres',
        'string.max': 'El slug no puede exceder 100 caracteres'
      }),
    is_active: Joi.boolean()
  })
};

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100],
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 500]
    }
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      len: [2, 100],
      isAlphanumeric: true
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    // Generar slug automaticamente si no se proporciona
    beforeCreate: async (category) => {
      if (!category.slug) {
        category.slug = category.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 100);
      }
    },
    beforeUpdate: async (category) => {
      if (category.changed('name') && !category.changed('slug')) {
        category.slug = category.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 100);
      }
    }
  }
});

// Metodo de clase para obtener categorias activas
Category.getActiveCategories = async function() {
  return await this.findAll({
    where: { is_active: true },
    order: [['name', 'ASC']]
  });
};

// Metodo de clase para buscar por slug
Category.findBySlug = async function(slug) {
  return await this.findOne({
    where: { 
      slug: slug,
      is_active: true 
    }
  });
};

// Metodo de instancia para obtener productos de la categoria
Category.prototype.getProducts = async function(options = {}) {
  const { Product } = require('./index');
  return await Product.findAll({
    where: {
      category_id: this.id,
      is_active: true,
      ...options.where
    },
    ...options
  });
};

// Metodo de instancia para contar productos
Category.prototype.countProducts = async function() {
  const { Product } = require('./index');
  return await Product.count({
    where: {
      category_id: this.id,
      is_active: true
    }
  });
};

module.exports = Category;
module.exports.validationSchema = categoryValidationSchema;
