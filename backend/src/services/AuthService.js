const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { AuthenticationError, ValidationError, ConflictError } = require('../utils/errors');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_123';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  /**
   * Genera un token JWT para el usuario
   * @param {Object} user - Objeto usuario
   * @returns {string} Token JWT
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    });
  }

  /**
   * Verifica y decodifica un token JWT
   * @param {string} token - Token JWT
   * @returns {Object} Payload decodificado
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new AuthenticationError('Token invalido o expirado');
    }
  }

  /**
   * Registra un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Object} Usuario creado con token
   */
  async register(userData) {
    try {
      // Verificar si el email ya existe
      const existingUser = await User.findOne({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw new ConflictError('El email ya esta registrado');
      }

      // Verificar si el username ya existe
      const existingUsername = await User.findOne({
        where: { username: userData.username }
      });

      if (existingUsername) {
        throw new ConflictError('El nombre de usuario ya esta en uso');
      }

      // Crear el usuario
      const user = await User.create({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role || 'customer'
      });

      // Generar token
      const token = this.generateToken(user);

      return {
        user: user.toPublicJSON(),
        token
      };
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      throw new ValidationError('Error al registrar usuario: ' + error.message);
    }
  }

  /**
   * Autentica un usuario existente
   * @param {string} email - Email del usuario
   * @param {string} password - Contrasena del usuario
   * @returns {Object} Usuario autenticado con token
   */
  async login(email, password) {
    try {
      // Buscar usuario por email
      const user = await User.findOne({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        throw new AuthenticationError('Credenciales invalidas');
      }

      // Verificar si el usuario esta activo
      if (!user.is_active) {
        throw new AuthenticationError('Cuenta deshabilitada');
      }

      // Verificar contrasena
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        throw new AuthenticationError('Credenciales invalidas');
      }

      // Actualizar ultimo login
      await user.update({
        last_login: new Date()
      });

      // Generar token
      const token = this.generateToken(user);

      return {
        user: user.toPublicJSON(),
        token
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Error en la autenticacion: ' + error.message);
    }
  }

  /**
   * Obtiene informacion del usuario actual
   * @param {number} userId - ID del usuario
   * @returns {Object} Datos del usuario
   */
  async getCurrentUser(userId) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new AuthenticationError('Usuario no encontrado');
      }

      if (!user.is_active) {
        throw new AuthenticationError('Cuenta deshabilitada');
      }

      return user.toPublicJSON();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Error al obtener usuario: ' + error.message);
    }
  }

  /**
   * Actualiza el perfil del usuario
   * @param {number} userId - ID del usuario
   * @param {Object} updateData - Datos a actualizar
   * @returns {Object} Usuario actualizado
   */
  async updateProfile(userId, updateData) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new AuthenticationError('Usuario no encontrado');
      }

      // Verificar si el email ya existe (si se esta actualizando)
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findOne({
          where: { email: updateData.email }
        });

        if (existingUser) {
          throw new ConflictError('El email ya esta registrado');
        }
      }

      // Verificar si el username ya existe (si se esta actualizando)
      if (updateData.username && updateData.username !== user.username) {
        const existingUsername = await User.findOne({
          where: { username: updateData.username }
        });

        if (existingUsername) {
          throw new ConflictError('El nombre de usuario ya esta en uso');
        }
      }

      // Actualizar usuario
      await user.update(updateData);

      return user.toPublicJSON();
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof ConflictError) {
        throw error;
      }
      throw new ValidationError('Error al actualizar perfil: ' + error.message);
    }
  }

  /**
   * Cambia la contrasena del usuario
   * @param {number} userId - ID del usuario
   * @param {string} currentPassword - Contrasena actual
   * @param {string} newPassword - Nueva contrasena
   * @returns {Object} Confirmacion de cambio
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new AuthenticationError('Usuario no encontrado');
      }

      // Verificar contrasena actual
      const isValidPassword = await user.verifyPassword(currentPassword);
      if (!isValidPassword) {
        throw new AuthenticationError('Contrasena actual incorrecta');
      }

      // Actualizar contrasena
      await user.update({ password: newPassword });

      return { message: 'Contrasena actualizada exitosamente' };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new ValidationError('Error al cambiar contrasena: ' + error.message);
    }
  }

  /**
   * Desactiva la cuenta del usuario
   * @param {number} userId - ID del usuario
   * @returns {Object} Confirmacion de desactivacion
   */
  async deactivateAccount(userId) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new AuthenticationError('Usuario no encontrado');
      }

      await user.update({ is_active: false });

      return { message: 'Cuenta desactivada exitosamente' };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new ValidationError('Error al desactivar cuenta: ' + error.message);
    }
  }
}

module.exports = new AuthService();
