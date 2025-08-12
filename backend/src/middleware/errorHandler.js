const { 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError, 
  ConflictError, 
  DatabaseError, 
  BusinessLogicError 
} = require('../utils/errors');

/**
 * Middleware de manejo de errores global
 * Maneja errores personalizados y errores generales de la aplicacion
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Manejar errores personalizados
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: err.message,
      type: 'validation_error'
    });
  }

  if (err instanceof AuthenticationError) {
    return res.status(401).json({
      success: false,
      error: err.message,
      type: 'authentication_error'
    });
  }

  if (err instanceof AuthorizationError) {
    return res.status(403).json({
      success: false,
      error: err.message,
      type: 'authorization_error'
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: err.message,
      type: 'not_found_error'
    });
  }

  if (err instanceof ConflictError) {
    return res.status(409).json({
      success: false,
      error: err.message,
      type: 'conflict_error'
    });
  }

  if (err instanceof BusinessLogicError) {
    return res.status(422).json({
      success: false,
      error: err.message,
      type: 'business_logic_error'
    });
  }

  if (err instanceof DatabaseError) {
    return res.status(500).json({
      success: false,
      error: 'Error en la base de datos',
      type: 'database_error'
    });
  }

  // Manejar errores de Sequelize
  if (err.name === 'SequelizeValidationError') {
    const validationErrors = err.errors.map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Error de validacion',
      details: validationErrors,
      type: 'sequelize_validation_error'
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: 'El recurso ya existe',
      type: 'sequelize_unique_error'
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      error: 'Referencia invalida',
      type: 'sequelize_foreign_key_error'
    });
  }

  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      success: false,
      error: 'Error en la base de datos',
      type: 'sequelize_database_error'
    });
  }

  // Manejar errores de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token invalido',
      type: 'jwt_error'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expirado',
      type: 'jwt_expired_error'
    });
  }

  // Manejar errores de sintaxis JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'JSON invalido',
      type: 'json_syntax_error'
    });
  }

  // Error por defecto
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    error: message,
    type: 'internal_server_error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
