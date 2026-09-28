require('dotenv').config();
const { Sequelize } = require('sequelize');
const defineProduct = require('./models/Product');

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false,
});

const Product = defineProduct(sequelize);

// Acá se van a definir las relaciones entre modelos (ventas, movimientos, etc.).

module.exports = { sequelize, Product };
