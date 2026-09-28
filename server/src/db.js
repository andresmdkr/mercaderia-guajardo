require('dotenv').config();
const { Sequelize } = require('sequelize');
const defineCategory = require('./models/Category');
const defineCustomer = require('./models/Customer');
const defineProduct = require('./models/Product');
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
const User = defineUser(sequelize);

// Relaciones. Se agregan acá a medida que aparecen más modelos (ventas, movimientos, etc.).
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

module.exports = { sequelize, Category, Customer, Product, User };
