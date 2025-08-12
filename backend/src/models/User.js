const { DataTypes } = require('sequelize');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

// Esquema de validacion Joi para usuarios
const userValidationSchema = {
  create: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(50)
      .required()
      .messages({
        'string.alphanum': 'El nombre de usuario solo puede contener letras y numeros',
        'string.min': 'El nombre de usuario debe tener al menos 3 caracteres',
        'string.max': 'El nombre de usuario no puede exceder 50 caracteres',
        'any.required': 'El nombre de usuario es requerido'
      }),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'El email debe tener un formato valido',
        'any.required': 'El email es requerido'
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': 'La contrasena debe tener al menos 6 caracteres',
        'any.required': 'La contrasena es requerida'
      }),
    first_name: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 50 caracteres',
        'any.required': 'El nombre es requerido'
      }),
    last_name: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'El apellido debe tener al menos 2 caracteres',
        'string.max': 'El apellido no puede exceder 50 caracteres',
        'any.required': 'El apellido es requerido'
      }),
    role: Joi.string()
      .valid('customer', 'admin')
      .default('customer')
      .messages({
        'any.only': 'El rol debe ser customer o admin'
      })
  }),
  update: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(50)
      .messages({
        'string.alphanum': 'El nombre de usuario solo puede contener letras y numeros',
        'string.min': 'El nombre de usuario debe tener al menos 3 caracteres',
        'string.max': 'El nombre de usuario no puede exceder 50 caracteres'
      }),
    email: Joi.string()
      .email()
      .messages({
        'string.email': 'El email debe tener un formato valido'
      }),
    first_name: Joi.string()
      .min(2)
      .max(50)
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 50 caracteres'
      }),
    last_name: Joi.string()
      .min(2)
      .max(50)
      .messages({
        'string.min': 'El apellido debe tener al menos 2 caracteres',
        'string.max': 'El apellido no puede exceder 50 caracteres'
      }),
    role: Joi.string()
      .valid('customer', 'admin')
      .messages({
        'any.only': 'El rol debe ser customer o admin'
      }),
    is_active: Joi.boolean()
  }),
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'El email debe tener un formato valido',
        'any.required': 'El email es requerido'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'La contrasena es requerida'
      })
  })
};

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      isAlphanumeric: true
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reset_token_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  first_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [2, 50]
    }
  },
  last_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [2, 50]
    }
  },
  role: {
    type: DataTypes.ENUM('customer', 'admin'),
    defaultValue: 'customer',
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    // Hash de contrasena antes de crear/actualizar
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

// Metodo de instancia para verificar contrasena
User.prototype.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Metodo de instancia para obtener nombre completo
User.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`;
};

// Metodo de instancia para obtener datos publicos (sin contrasena)
User.prototype.toPublicJSON = function() {
  const user = this.toJSON();
  delete user.password;
  delete user.reset_token;
  delete user.reset_token_expires;
  return user;
};

module.exports = User;
module.exports.validationSchema = userValidationSchema;
