require('dotenv').config();
const { Sequelize } = require('sequelize');
const defineBusinessSettings = require('./models/BusinessSettings');
const defineCategory = require('./models/Category');
const defineCustomer = require('./models/Customer');
const defineProduct = require('./models/Product');
const defineSale = require('./models/Sale');
const defineSaleItem = require('./models/SaleItem');
const defineStockMovement = require('./models/StockMovement');
const defineUser = require('./models/User');

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false,
});

const BusinessSettings = defineBusinessSettings(sequelize);
const Category = defineCategory(sequelize);
const Customer = defineCustomer(sequelize);
const Product = defineProduct(sequelize);
const Sale = defineSale(sequelize);
const SaleItem = defineSaleItem(sequelize);
const StockMovement = defineStockMovement(sequelize);
const User = defineUser(sequelize);

// Relaciones entre modelos.
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

Product.hasMany(StockMovement, { foreignKey: 'productId', as: 'movements' });
StockMovement.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
User.hasMany(StockMovement, { foreignKey: 'userId', as: 'movements' });
StockMovement.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Customer.hasMany(Sale, { foreignKey: 'customerId', as: 'sales' });
Sale.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
User.hasMany(Sale, { foreignKey: 'userId', as: 'sales' });
Sale.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Sale.belongsTo(User, { foreignKey: 'voidedBy', as: 'voidedByUser' });

Sale.hasMany(SaleItem, { foreignKey: 'saleId', as: 'items' });
SaleItem.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });
Product.hasMany(SaleItem, { foreignKey: 'productId', as: 'saleItems' });
SaleItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Sale.hasMany(StockMovement, { foreignKey: 'saleId', as: 'movements' });
StockMovement.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });

module.exports = { sequelize, BusinessSettings, Category, Customer, Product, Sale, SaleItem, StockMovement, User };
