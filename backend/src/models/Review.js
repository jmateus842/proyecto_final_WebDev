const { DataTypes } = require('sequelize');
const Joi = require('joi');
const { sequelize } = require('../config/database');

// Esquema de validacion Joi para resenas
const reviewValidationSchema = {
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
    rating: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .required()
      .messages({
        'number.base': 'La calificacion debe ser un numero',
        'number.integer': 'La calificacion debe ser un numero entero',
        'number.min': 'La calificacion debe ser al menos 1',
        'number.max': 'La calificacion no puede exceder 5',
        'any.required': 'La calificacion es requerida'
      }),
    comment: Joi.string()
      .max(1000)
      .optional()
      .messages({
        'string.max': 'El comentario no puede exceder 1000 caracteres'
      }),
    is_verified_purchase: Joi.boolean()
      .default(false)
  }),
  update: Joi.object({
    rating: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .messages({
        'number.base': 'La calificacion debe ser un numero',
        'number.integer': 'La calificacion debe ser un numero entero',
        'number.min': 'La calificacion debe ser al menos 1',
        'number.max': 'La calificacion no puede exceder 5'
      }),
    comment: Joi.string()
      .max(1000)
      .optional()
      .messages({
        'string.max': 'El comentario no puede exceder 1000 caracteres'
      }),
    is_verified_purchase: Joi.boolean()
  })
};

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: true,
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  },
  is_verified_purchase: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  tableName: 'reviews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['product_id', 'user_id'],
      name: 'unique_product_user_review'
    }
  ],
  hooks: {
    // Verificar que el usuario no haya resenado el mismo producto antes
    beforeCreate: async (review) => {
      const existingReview = await Review.findOne({
        where: {
          product_id: review.product_id,
          user_id: review.user_id
        }
      });
      
      if (existingReview) {
        throw new Error('Ya has resenado este producto');
      }
    }
  }
});

// Metodo de clase para obtener resenas por producto
Review.getProductReviews = async function(productId, options = {}) {
  return await this.findAll({
    where: { product_id: productId },
    include: [{
      model: require('./User'),
      as: 'user',
      attributes: ['id', 'username', 'first_name', 'last_name']
    }],
    order: [['created_at', 'DESC']],
    ...options
  });
};

// Metodo de clase para obtener resenas por usuario
Review.getUserReviews = async function(userId, options = {}) {
  return await this.findAll({
    where: { user_id: userId },
    include: [{
      model: require('./Product'),
      as: 'product',
      attributes: ['id', 'name', 'sku', 'image_url']
    }],
    order: [['created_at', 'DESC']],
    ...options
  });
};

// Metodo de clase para obtener estadisticas de resenas por producto
Review.getProductStats = async function(productId) {
  const result = await this.findOne({
    where: { product_id: productId },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 5 THEN 1 END')), 'fiveStar'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 4 THEN 1 END')), 'fourStar'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 3 THEN 1 END')), 'threeStar'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 2 THEN 1 END')), 'twoStar'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 1 THEN 1 END')), 'oneStar']
    ]
  });
  
  return {
    averageRating: parseFloat(result?.dataValues?.averageRating || 0),
    totalReviews: parseInt(result?.dataValues?.totalReviews || 0),
    fiveStar: parseInt(result?.dataValues?.fiveStar || 0),
    fourStar: parseInt(result?.dataValues?.fourStar || 0),
    threeStar: parseInt(result?.dataValues?.threeStar || 0),
    twoStar: parseInt(result?.dataValues?.twoStar || 0),
    oneStar: parseInt(result?.dataValues?.oneStar || 0)
  };
};

// Metodo de clase para obtener resenas verificadas
Review.getVerifiedReviews = async function(productId, options = {}) {
  return await this.findAll({
    where: { 
      product_id: productId,
      is_verified_purchase: true
    },
    include: [{
      model: require('./User'),
      as: 'user',
      attributes: ['id', 'username', 'first_name', 'last_name']
    }],
    order: [['created_at', 'DESC']],
    ...options
  });
};

// Metodo de instancia para obtener estrellas como texto
Review.prototype.getStarsText = function() {
  const stars = '★'.repeat(this.rating) + '☆'.repeat(5 - this.rating);
  return stars;
};

// Metodo de instancia para obtener rating como texto
Review.prototype.getRatingText = function() {
  const ratingTexts = {
    1: 'Muy malo',
    2: 'Malo',
    3: 'Regular',
    4: 'Bueno',
    5: 'Excelente'
  };
  return ratingTexts[this.rating] || 'Sin calificar';
};

// Metodo de instancia para verificar si es verificada
Review.prototype.isVerified = function() {
  return this.is_verified_purchase;
};

// Metodo de instancia para obtener fecha formateada
Review.prototype.getFormattedDate = function() {
  return this.created_at.toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

module.exports = Review;
module.exports.validationSchema = reviewValidationSchema;
