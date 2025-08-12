const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Configuracion de la base de datos SQLite
const dbPath = path.join(__dirname, '..', '..', 'database', 'mr_robot_commerce.db');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

// Funcion para probar la conexion
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexion a la base de datos establecida correctamente.');
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error);
  }
};

module.exports = { sequelize, testConnection };
