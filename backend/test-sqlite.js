const { sequelize } = require('./src/config/database');
const User = require('./src/models/User');

async function testSqlite() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Connection to SQLite has been established successfully.');

    // Test read
    const users = await User.findAll();
    console.log(`Found ${users.length} users in the database.`);

    // Test create
    const newUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpassword',
      role: 'customer',
      first_name: 'Test',
      last_name: 'User'
    });
    console.log(`Created user with id: ${newUser.id}`);

    // Test update
    newUser.email = 'updated@example.com';
    await newUser.save();
    console.log(`Updated user email to: ${newUser.email}`);

    // Test delete
    await newUser.destroy();
    console.log(`Deleted user with id: ${newUser.id}`);

    console.log('All CRUD operations tested successfully.');
  } catch (error) {
    console.error('Error testing SQLite:', error);
  } finally {
    await sequelize.close();
  }
}

testSqlite();
