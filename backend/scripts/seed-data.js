// Script para poblar la base de datos con datos de prueba
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuracion
const dbFile = path.join(__dirname, '..', 'database', 'mr_robot_commerce.db');

console.log('🌱 Poblando base de datos con datos de prueba...');

const db = new sqlite3.Database(dbFile);

// Datos de prueba
const testData = {
  users: [
    {
      username: 'admin',
      email: 'admin@mrrobot.com',
      password: 'admin123',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User',
      is_active: 1
    },
    {
      username: 'customer1',
      email: 'customer1@example.com',
      password: 'customer123',
      role: 'customer',
      first_name: 'Juan',
      last_name: 'Perez',
      is_active: 1
    },
    {
      username: 'customer2',
      email: 'customer2@example.com',
      password: 'customer123',
      role: 'customer',
      first_name: 'Maria',
      last_name: 'Garcia',
      is_active: 1
    }
  ],
  categories: [
    {
      name: 'Electronica',
      description: 'Productos electronicos y tecnologia',
      slug: 'electronica',
      is_active: 1
    },
    {
      name: 'Ropa',
      description: 'Ropa y accesorios',
      slug: 'ropa',
      is_active: 1
    },
    {
      name: 'Hogar',
      description: 'Productos para el hogar',
      slug: 'hogar',
      is_active: 1
    },
    {
      name: 'Deportes',
      description: 'Equipos y ropa deportiva',
      slug: 'deportes',
      is_active: 1
    }
  ],
  products: [
    {
      name: 'Laptop Gaming Pro',
      description: 'Laptop de alto rendimiento para gaming',
      sku: 'LAP-GAM-001',
      price: 1299.99,
      category_id: 1,
      is_active: 1
    },
    {
      name: 'Smartphone Ultra',
      description: 'Smartphone de ultima generacion',
      sku: 'PHN-ULT-001',
      price: 899.99,
      category_id: 1,
      is_active: 1
    },
    {
      name: 'Camiseta Basica',
      description: 'Camiseta de algodon 100%',
      sku: 'TSH-BAS-001',
      price: 19.99,
      category_id: 2,
      is_active: 1
    },
    {
      name: 'Sofa Moderno',
      description: 'Sofa elegante para sala',
      sku: 'SOF-MOD-001',
      price: 599.99,
      category_id: 3,
      is_active: 1
    },
    {
      name: 'Balon de Futbol',
      description: 'Balon oficial de futbol',
      sku: 'BAL-FUT-001',
      price: 29.99,
      category_id: 4,
      is_active: 1
    }
  ]
};

// Funcion para hashear contrasenas
const hashPassword = (password) => {
  return bcrypt.hashSync(password, 10);
};

// Funcion para insertar datos
const insertData = async () => {
  try {
    // Insertar usuarios
    console.log('👥 Insertando usuarios...');
    for (const user of testData.users) {
      const hashedPassword = hashPassword(user.password);
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO users (username, email, password, role, first_name, last_name, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [user.username, user.email, hashedPassword, user.role, user.first_name, user.last_name, user.is_active], (err) => {
          if (err) {
            console.error('Error insertando usuario:', err.message);
            reject(err);
          } else {
            console.log(`✅ Usuario creado: ${user.username}`);
            resolve();
          }
        });
      });
    }

    // Insertar categorias
    console.log('📂 Insertando categorias...');
    for (const category of testData.categories) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO categories (name, description, slug, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [category.name, category.description, category.slug, category.is_active], (err) => {
          if (err) {
            console.error('Error insertando categoria:', err.message);
            reject(err);
          } else {
            console.log(`✅ Categoria creada: ${category.name}`);
            resolve();
          }
        });
      });
    }

    // Insertar productos
    console.log('📦 Insertando productos...');
    for (const product of testData.products) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO products (name, description, sku, price, category_id, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [product.name, product.description, product.sku, product.price, product.category_id, product.is_active], (err) => {
          if (err) {
            console.error('Error insertando producto:', err.message);
            reject(err);
          } else {
            console.log(`✅ Producto creado: ${product.name}`);
            resolve();
          }
        });
      });
    }

    // Insertar inventario para cada producto
    console.log('📊 Creando inventario...');
    for (let i = 0; i < testData.products.length; i++) {
      const productId = i + 1;
      const stock = Math.floor(Math.random() * 100) + 10; // Stock aleatorio entre 10-110
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO inventory (product_id, quantity, min_stock, max_stock, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [productId, stock, 5, 200], (err) => {
          if (err) {
            console.error('Error insertando inventario:', err.message);
            reject(err);
          } else {
            console.log(`✅ Inventario creado para producto ID ${productId}`);
            resolve();
          }
        });
      });
    }

    console.log('🎉 Base de datos poblada exitosamente!');
    console.log('\n📋 Datos creados:');
    console.log(`- ${testData.users.length} usuarios`);
    console.log(`- ${testData.categories.length} categorias`);
    console.log(`- ${testData.products.length} productos`);
    console.log(`- ${testData.products.length} registros de inventario`);
    
    console.log('\n🔑 Credenciales de prueba:');
    console.log('Admin: admin@mrrobot.com / admin123');
    console.log('Customer: customer1@example.com / customer123');

  } catch (error) {
    console.error('❌ Error poblando la base de datos:', error);
  } finally {
    db.close();
  }
};

// Ejecutar el script
insertData();
