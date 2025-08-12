// Script de inicializacion de la base de datos SQLite
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuracion
const dbDir = path.join(__dirname, '..', 'database');
const dbFile = path.join(dbDir, 'mr_robot_commerce.db');
const schemaFile = path.join(dbDir, 'schema-sqlite.sql');

console.log('Iniciando configuracion de la base de datos SQLite...');

// Crear directorio de base de datos si no existe
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`Directorio de base de datos creado en: ${dbDir}`);
}

// Verificar si el archivo de base de datos ya existe
if (fs.existsSync(dbFile)) {
  console.log(`La base de datos ya existe en: ${dbFile}`);
  process.exit(0);
}

// Verificar si el archivo de esquema existe
if (!fs.existsSync(schemaFile)) {
  console.error(`Error: No se encontro el archivo de esquema: ${schemaFile}`);
  process.exit(1);
}

// Crear la base de datos vacia
fs.writeFileSync(dbFile, '');
console.log(`Base de datos SQLite creada en: ${dbFile}`);

// Instalar sqlite3 si no esta instalado
try {
  require.resolve('sqlite3');
} catch (e) {
  console.log('Instalando dependencia sqlite3...');
  execSync('npm install sqlite3 --save', { stdio: 'inherit' });
}

// Ejecutar el script SQL
console.log('Ejecutando script de esquema...');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbFile);

// Leer el archivo SQL
const sql = fs.readFileSync(schemaFile, 'utf8');

// Ejecutar cada comando SQL
const commands = sql.split(';').filter(cmd => cmd.trim() !== '');

const executeCommands = async () => {
  for (const cmd of commands) {
    try {
      await new Promise((resolve, reject) => {
        db.run(cmd, (err) => {
          if (err) {
            console.error('Error al ejecutar comando:', cmd);
            console.error(err.message);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } catch (err) {
      console.error('Error en la ejecucion:', err);
      process.exit(1);
    }
  }
  
  // Cerrar la conexion
  db.close();
  console.log('Base de datos inicializada exitosamente!');};

executeCommands();
