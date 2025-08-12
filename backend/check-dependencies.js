/**
 * Script de verificacion de dependencias
 * Ejecutar con: node check-dependencies.js
 */

const dependencies = [
  'express',
  'sequelize', 
  'bcryptjs',
  'jsonwebtoken',
  'joi',
  'cors',
  'dotenv',
  'pg',
  'pg-hstore'
];

const devDependencies = [
  'axios',
  'nodemon'
];

console.log('🔍 Verificando dependencias del proyecto...\n');

// Verificar dependencias principales
console.log('📦 Dependencias principales:');
let allMainDepsOk = true;

dependencies.forEach(dep => {
  try {
    require(dep);
    console.log(`  ✅ ${dep}`);
  } catch (error) {
    console.log(`  ❌ ${dep} - NO ENCONTRADA`);
    allMainDepsOk = false;
  }
});

// Verificar dependencias de desarrollo
console.log('\n🛠️ Dependencias de desarrollo:');
let allDevDepsOk = true;

devDependencies.forEach(dep => {
  try {
    require(dep);
    console.log(`  ✅ ${dep}`);
  } catch (error) {
    console.log(`  ❌ ${dep} - NO ENCONTRADA`);
    allDevDepsOk = false;
  }
});

// Verificar archivos del proyecto
console.log('\n📁 Archivos del proyecto:');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/server.js',
  'src/services/AuthService.js',
  'src/middleware/auth.js',
  'src/controllers/AuthController.js',
  'src/routes/auth.js',
  'src/middleware/errorHandler.js',
  'src/utils/errors.js',
  'src/models/User.js',
  'src/config/database.js',
  'test-auth.js',
  'package.json'
];

let allFilesOk = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - NO ENCONTRADO`);
    allFilesOk = false;
  }
});

// Verificar sintaxis de archivos principales
console.log('\n🔧 Verificando sintaxis:');
const { execSync } = require('child_process');

const filesToCheck = [
  'src/server.js',
  'src/services/AuthService.js',
  'src/middleware/auth.js',
  'src/controllers/AuthController.js',
  'src/routes/auth.js',
  'src/middleware/errorHandler.js',
  'test-auth.js'
];

let allSyntaxOk = true;

filesToCheck.forEach(file => {
  try {
    execSync(`node -c ${file}`, { stdio: 'pipe' });
    console.log(`  ✅ ${file} - Sintaxis correcta`);
  } catch (error) {
    console.log(`  ❌ ${file} - Error de sintaxis`);
    allSyntaxOk = false;
  }
});

// Resumen final
console.log('\n📋 RESUMEN:');
console.log(`  Dependencias principales: ${allMainDepsOk ? '✅ OK' : '❌ FALTAN'}`);
console.log(`  Dependencias de desarrollo: ${allDevDepsOk ? '✅ OK' : '❌ FALTAN'}`);
console.log(`  Archivos del proyecto: ${allFilesOk ? '✅ OK' : '❌ FALTAN'}`);
console.log(`  Sintaxis de archivos: ${allSyntaxOk ? '✅ OK' : '❌ ERRORES'}`);

if (allMainDepsOk && allDevDepsOk && allFilesOk && allSyntaxOk) {
  console.log('\n🎉 ¡Todas las verificaciones pasaron exitosamente!');
  console.log('   El proyecto esta listo para ejecutarse.');
} else {
  console.log('\n⚠️ Se encontraron problemas que deben resolverse antes de continuar.');
  process.exit(1);
}
