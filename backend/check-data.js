const { sequelize } = require('./src/config/database.js');

async function checkData() {
  try {
    console.log('🔍 Verificando datos en las tablas...');
    
    // Verificar usuarios
    const [users] = await sequelize.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Usuarios: ${users[0].count}`);
    
    // Verificar categorías
    const [categories] = await sequelize.query('SELECT COUNT(*) as count FROM categories');
    console.log(`📂 Categorías: ${categories[0].count}`);
    
    // Verificar productos
    const [products] = await sequelize.query('SELECT COUNT(*) as count FROM products');
    console.log(`📦 Productos: ${products[0].count}`);
    
    // Verificar inventario
    const [inventory] = await sequelize.query('SELECT COUNT(*) as count FROM inventory');
    console.log(`📊 Inventario: ${inventory[0].count}`);
    
    // Verificar pedidos
    const [orders] = await sequelize.query('SELECT COUNT(*) as count FROM orders');
    console.log(`🛒 Pedidos: ${orders[0].count}`);
    
    // Verificar reseñas
    const [reviews] = await sequelize.query('SELECT COUNT(*) as count FROM reviews');
    console.log(`⭐ Reseñas: ${reviews[0].count}`);
    
    // Mostrar algunos datos de ejemplo
    console.log('\n📋 Datos de ejemplo:');
    
    const [sampleUsers] = await sequelize.query('SELECT id, username, email, role FROM users LIMIT 3');
    console.log('👥 Usuarios:', sampleUsers);
    
    const [sampleCategories] = await sequelize.query('SELECT id, name, slug FROM categories LIMIT 3');
    console.log('📂 Categorías:', sampleCategories);
    
    const [sampleProducts] = await sequelize.query('SELECT id, name, sku, price FROM products LIMIT 3');
    console.log('📦 Productos:', sampleProducts);
    
  } catch (error) {
    console.error('❌ Error al verificar datos:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkData();
