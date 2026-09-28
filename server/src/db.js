require('dotenv').config();
const { Sequelize } = require('sequelize');
const defineCategory = require('./models/Category');
const defineCustomer = require('./models/Customer');
const defineProduct = require('./models/Product');
const defineStockMovement = require('./models/StockMovement');
const defineUser = require('./models/User');

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false,
});

const Category = defineCategory(sequelize);
const Customer = defineCustomer(sequelize);
const Product = defineProduct(sequelize);
const StockMovement = defineStockMovement(sequelize);
const User = defineUser(sequelize);

// Relaciones. Se agregan acá a medida que aparecen más modelos (ventas, movimientos, etc.).
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

Product.hasMany(StockMovement, { foreignKey: 'productId', as: 'movements' });
StockMovement.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
User.hasMany(StockMovement, { foreignKey: 'userId', as: 'movements' });
StockMovement.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { sequelize, Category, Customer, Product, StockMovement, User };
