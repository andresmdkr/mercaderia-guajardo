require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Sequelize } = require('sequelize');
const defineBusinessSettings = require('./models/BusinessSettings');
const defineCategory = require('./models/Category');
const defineCustomer = require('./models/Customer');
const defineProduct = require('./models/Product');
const defineSale = require('./models/Sale');
const defineSaleItem = require('./models/SaleItem');
const defineStockMovement = require('./models/StockMovement');
const defineUser = require('./models/User');

// La base de datos es un único archivo SQLite. La app de escritorio define DB_FILE (carpeta de datos del usuario).
const DB_FILE = path.resolve(process.env.DB_FILE ?? path.join(__dirname, '..', 'data', 'mercaderia.sqlite'));
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const sequelize = new Sequelize({
  dialect: 'sqlite',
  dialectModule: require('sqlite3'),
  storage: DB_FILE,
  logging: false,
  // Toda transacción toma el candado de escritura al empezar (BEGIN IMMEDIATE). Así dos ventas simultáneas
  // se hacen en fila y no se pisan: reemplaza al "bloqueo de filas" que hacía PostgreSQL.
  transactionType: 'IMMEDIATE',
});

// Las transacciones hacen fila: una a la vez. Motivo: SQLite trabaja en un grupo de solo 4 hilos; si más de 4
// transacciones esperan el candado de escritura dentro de SQLite, ocupan todos los hilos y la que tiene el candado
// no consigue uno libre para terminar (con 8 simultáneas tardaba 23 segundos, con 10+ fallaba). Esperando acá, en
// JavaScript, no se ocupa ningún hilo. Las lecturas no usan transacción y siguen siendo simultáneas.
// Importante: dentro de una transacción NO se puede abrir otra (se quedaría esperando a sí misma).
let writeQueue = Promise.resolve();

function acquireWriteTurn() {
  let release;
  const turn = new Promise((resolve) => {
    release = resolve;
  });
  const ready = writeQueue.then(() => release);
  writeQueue = writeQueue.then(() => turn);
  return ready;
}

const rawTransaction = sequelize.transaction.bind(sequelize);
sequelize.transaction = async function queuedTransaction(options, autoCallback) {
  if (typeof options === 'function') {
    autoCallback = options;
    options = undefined;
  }
  const release = await acquireWriteTurn();

  if (autoCallback) {
    try {
      return await rawTransaction(options, autoCallback);
    } finally {
      release();
    }
  }

  // Transacción manual (sin función): el turno se libera al terminarla (commit o rollback).
  let transaction;
  try {
    transaction = await rawTransaction(options);
  } catch (error) {
    release();
    throw error;
  }
  for (const method of ['commit', 'rollback']) {
    const original = transaction[method].bind(transaction);
    transaction[method] = async (...args) => {
      try {
        return await original(...args);
      } finally {
        release();
      }
    };
  }
  return transaction;
};

// Cada transacción abre su propia conexión: si otro proceso tiene la base ocupada, espera hasta 10 segundos.
const { connectionManager } = sequelize;
const originalGetConnection = connectionManager.getConnection.bind(connectionManager);
const configured = new WeakSet();
connectionManager.getConnection = async (options) => {
  const connection = await originalGetConnection(options);
  if (!configured.has(connection)) {
    configured.add(connection);
    connection.configure('busyTimeout', 10000);
  }
  return connection;
};

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

module.exports = { sequelize, DB_FILE, BusinessSettings, Category, Customer, Product, Sale, SaleItem, StockMovement, User };
