const AuthService = require('../services/AuthService');
const { User } = require('../models');
const { ValidationError, AuthenticationError, ConflictError } = require('../utils/errors');

class AuthController {
  /**
   * Registra un nuevo usuario
   * POST /auth/register
   */
  static async register(req, res) {
    try {
      const { username, email, password, first_name, last_name, role } = req.body;

      // Validar datos requeridos
      if (!username || !email || !password || !first_name || !last_name) {
        throw new ValidationError('Todos los campos son requeridos');
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Formato de email invalido');
      }

      // Validar longitud de contrasena
      if (password.length < 6) {
        throw new ValidationError('La contrasena debe tener al menos 6 caracteres');
      }

      // Validar rol si se proporciona
      if (role && !['customer', 'admin'].includes(role)) {
        throw new ValidationError('Rol invalido. Debe ser customer o admin');
      }

      const result = await AuthService.register({
        username,
        email: email.toLowerCase(),
        password,
        first_name,
        last_name,
        role: role || 'customer'
      });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: result
      });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error en registro:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Autentica un usuario existente
   * POST /auth/login
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validar datos requeridos
      if (!email || !password) {
        throw new ValidationError('Email y contrasena son requeridos');
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Formato de email invalido');
      }

      const result = await AuthService.login(email.toLowerCase(), password);

      res.status(200).json({
        success: true,
        message: 'Login exitoso',
        data: result
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtiene informacion del usuario actual
   * GET /auth/me
   */
  static async getCurrentUser(req, res) {
    try {
      const userId = req.user.id;
      const user = await AuthService.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al obtener usuario actual:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualiza el perfil del usuario actual
   * PUT /auth/profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      // Validar que no se intente cambiar el rol (solo admins pueden hacerlo)
      if (updateData.role && req.user.role !== 'admin') {
        throw new ValidationError('No tienes permisos para cambiar el rol');
      }

      // Validar formato de email si se proporciona
      if (updateData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          throw new ValidationError('Formato de email invalido');
        }
        updateData.email = updateData.email.toLowerCase();
      }

      // Validar rol si se proporciona
      if (updateData.role && !['customer', 'admin'].includes(updateData.role)) {
        throw new ValidationError('Rol invalido. Debe ser customer o admin');
      }

      const user = await AuthService.updateProfile(userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: user
      });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al actualizar perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambia la contrasena del usuario actual
   * PUT /auth/change-password
   */
  static async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Validar datos requeridos
      if (!currentPassword || !newPassword) {
        throw new ValidationError('Contrasena actual y nueva contrasena son requeridas');
      }

      // Validar longitud de nueva contrasena
      if (newPassword.length < 6) {
        throw new ValidationError('La nueva contrasena debe tener al menos 6 caracteres');
      }

      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al cambiar contrasena:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Desactiva la cuenta del usuario actual
   * DELETE /auth/deactivate
   */
  static async deactivateAccount(req, res) {
    try {
      const userId = req.user.id;
      const result = await AuthService.deactivateAccount(userId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al desactivar cuenta:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verifica si un email ya esta registrado
   * GET /auth/check-email/:email
   */
  static async checkEmail(req, res) {
    try {
      const { email } = req.params;

      if (!email) {
        throw new ValidationError('Email es requerido');
      }

      const user = await User.findOne({
        where: { email: email.toLowerCase() }
      });

      res.status(200).json({
        success: true,
        data: {
          email: email.toLowerCase(),
          available: !user
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al verificar email:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verifica si un username ya esta en uso
   * GET /auth/check-username/:username
   */
  static async checkUsername(req, res) {
    try {
      const { username } = req.params;

      if (!username) {
        throw new ValidationError('Username es requerido');
      }

      const user = await User.findOne({
        where: { username }
      });

      res.status(200).json({
        success: true,
        data: {
          username,
          available: !user
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      console.error('Error al verificar username:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

module.exports = AuthController;
