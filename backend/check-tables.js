const { sequelize } = require('./src/config/database.js');

async function checkTables() {
  try {
    console.log('🔍 Verificando tablas en la base de datos...');
    
    const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
    
    console.log('📋 Tablas existentes:');
    if (results.length === 0) {
      console.log('❌ No hay tablas en la base de datos');
    } else {
      results.forEach(row => console.log(`- ${row.name}`));
    }
    
    // Verificar tablas específicas que necesitamos
    const requiredTables = ['users', 'categories', 'products', 'inventory', 'orders', 'order_items', 'reviews'];
    
    console.log('\n🔍 Verificando tablas requeridas:');
    for (const table of requiredTables) {
      const [tableExists] = await sequelize.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
      console.log(`${tableExists.length > 0 ? '✅' : '❌'} ${table}`);
    }
    
  } catch (error) {
    console.error('❌ Error al verificar tablas:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTables();
