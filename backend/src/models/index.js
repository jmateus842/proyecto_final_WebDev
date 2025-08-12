const { sequelize } = require('../config/database');

// Importar todos los modelos
const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const Inventory = require('./Inventory');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Review = require('./Review');

// Definir las asociaciones entre modelos
const defineAssociations = () => {
  // Usuario -> Pedidos (1:N)
  User.hasMany(Order, {
    foreignKey: 'user_id',
    as: 'orders',
    onDelete: 'CASCADE'
  });
  Order.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // Categoria -> Productos (1:N)
  Category.hasMany(Product, {
    foreignKey: 'category_id',
    as: 'products',
    onDelete: 'SET NULL'
  });
  Product.belongsTo(Category, {
    foreignKey: 'category_id',
    as: 'category'
  });

  // Producto -> Inventario (1:1)
  Product.hasOne(Inventory, {
    foreignKey: 'product_id',
    as: 'inventory',
    onDelete: 'CASCADE'
  });
  Inventory.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
  });

  // Producto -> Resenas (1:N)
  Product.hasMany(Review, {
    foreignKey: 'product_id',
    as: 'reviews',
    onDelete: 'CASCADE'
  });
  Review.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
  });

  // Usuario -> Resenas (1:N)
  User.hasMany(Review, {
    foreignKey: 'user_id',
    as: 'reviews',
    onDelete: 'CASCADE'
  });
  Review.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // Pedido -> Items de Pedido (1:N)
  Order.hasMany(OrderItem, {
    foreignKey: 'order_id',
    as: 'orderItems',
    onDelete: 'CASCADE'
  });
  OrderItem.belongsTo(Order, {
    foreignKey: 'order_id',
    as: 'order'
  });

  // Producto -> Items de Pedido (1:N)
  Product.hasMany(OrderItem, {
    foreignKey: 'product_id',
    as: 'orderItems',
    onDelete: 'CASCADE'
  });
  OrderItem.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
  });
};

// Inicializar las asociaciones
defineAssociations();

// Sincronizar modelos con la base de datos
const syncModels = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('Modelos sincronizados correctamente con la base de datos');
  } catch (error) {
    console.error('Error al sincronizar modelos:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Category,
  Product,
  Inventory,
  Order,
  OrderItem,
  Review,
  syncModels
};
