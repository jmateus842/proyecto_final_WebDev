const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');
const { syncModels } = require('./models');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging personalizado estilo Mr. Robot
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: 'Mr. Robot Commerce API',
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Importar rutas y middleware
const authRoutes = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');

// Ruta de salud del sistema
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Configurar rutas de la API
app.use('/api/auth', authRoutes);

// Middleware de manejo de errores global
app.use(errorHandler);

// Ruta para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    // Probar conexion a la base de datos
    await testConnection();
    
    // Sincronizar modelos con la base de datos
    await syncModels(false); // false = no forzar recreacion de tablas
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor Mr. Robot Commerce iniciado en puerto ${PORT}`);
      console.log(`📡 API disponible en: http://localhost:${PORT}`);
      console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️ Modelos Sequelize sincronizados correctamente`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
