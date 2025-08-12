const AuthService = require('../services/AuthService');
const { AuthenticationError } = require('../utils/errors');

/**
 * Middleware para verificar autenticacion JWT
 * Extrae el token del header Authorization y verifica su validez
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthenticationError('Token de acceso requerido');
    }

    // Verificar y decodificar token
    const decoded = AuthService.verifyToken(token);
    
    // Agregar informacion del usuario al request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Error en la autenticacion'
    });
  }
};

/**
 * Middleware para verificar si el usuario tiene rol de administrador
 * Debe usarse despues del middleware authenticateToken
 */
const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Autenticacion requerida');
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requieren permisos de administrador'
      });
    }

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Error en la autorizacion'
    });
  }
};

/**
 * Middleware para verificar si el usuario tiene rol de cliente
 * Debe usarse despues del middleware authenticateToken
 */
const requireCustomer = (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Autenticacion requerida');
    }

    if (req.user.role !== 'customer') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requieren permisos de cliente'
      });
    }

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Error en la autorizacion'
    });
  }
};

/**
 * Middleware para verificar si el usuario tiene uno de los roles especificados
 * Debe usarse despues del middleware authenticateToken
 * @param {string[]} roles - Array de roles permitidos
 */
const requireRoles = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Autenticacion requerida');
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: `Acceso denegado. Se requieren permisos de: ${roles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          error: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Error en la autorizacion'
      });
    }
  };
};

/**
 * Middleware opcional para autenticacion
 * No falla si no hay token, pero agrega informacion del usuario si existe
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = AuthService.verifyToken(token);
        req.user = {
          id: decoded.id,
          email: decoded.email,
          username: decoded.username,
          role: decoded.role
        };
      } catch (error) {
        // Si el token es invalido, simplemente continuamos sin usuario
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // En caso de error, continuamos sin usuario
    req.user = null;
    next();
  }
};

/**
 * Middleware para verificar si el usuario es propietario del recurso o admin
 * Debe usarse despues del middleware authenticateToken
 * @param {Function} getResourceUserId - Funcion que obtiene el ID del usuario propietario del recurso
 */
const requireOwnershipOrAdmin = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Autenticacion requerida');
      }

      // Los administradores pueden acceder a cualquier recurso
      if (req.user.role === 'admin') {
        return next();
      }

      // Obtener el ID del usuario propietario del recurso
      const resourceUserId = await getResourceUserId(req);

      // Verificar si el usuario es propietario del recurso
      if (req.user.id !== resourceUserId) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado. No tienes permisos para acceder a este recurso'
        });
      }

      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          error: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Error en la autorizacion'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireCustomer,
  requireRoles,
  optionalAuth,
  requireOwnershipOrAdmin
};
