const { Op } = require('sequelize');
const { sequelize, Product, StockMovement, User } = require('../db');
const AppError = require('../utils/AppError');

const includeRelations = [
  { model: Product, as: 'product', attributes: ['id', 'code', 'name'] },
  { model: User, as: 'user', attributes: ['id', 'name'] },
];

// Cambio de stock que produce cada tipo de movimiento (sale / sale_void los usa Ventas).
function computeDelta(type, { quantity, newStock }, currentStock) {
  switch (type) {
    case 'in':
    case 'sale_void':
      return quantity;
    case 'out':
    case 'sale':
      return -quantity;
    case 'adjustment':
      return newStock - currentStock; // newStock = stock real contado
    default:
      throw new AppError('Tipo de movimiento inválido');
  }
}

/**
 * ÚNICO lugar del sistema que modifica products.stock: cada cambio deja un movimiento.
 * Si recibe `transaction` participa de ella (así Ventas descuenta todo o nada);
 * si no, abre una propia. La fila del producto se bloquea mientras se calcula, para que
 * dos operaciones simultáneas no se pisen.
 */
async function applyMovement({ productId, type, quantity, newStock, reason, userId, saleId }, { transaction } = {}) {
  if (!transaction) {
    return sequelize.transaction((t) =>
      applyMovement({ productId, type, quantity, newStock, reason, userId, saleId }, { transaction: t })
    );
  }

  const product = await Product.findByPk(productId, { transaction });
  if (!product) throw new AppError('Producto no encontrado', 404);
  // Anular una venta tiene que poder devolver stock aunque el producto ya esté de baja.
  if (!product.active && type !== 'sale_void') {
    throw new AppError(`"${product.name}" está dado de baja`, 409);
  }

  const stockBefore = product.stock;
  const delta = computeDelta(type, { quantity, newStock }, stockBefore);
  if (delta === 0) throw new AppError(`El stock de "${product.name}" ya es ${stockBefore}`);

  const stockAfter = stockBefore + delta;
  if (stockAfter < 0) {
    throw new AppError(`Stock insuficiente de "${product.name}": hay ${stockBefore} y se piden ${-delta}`, 409);
  }

  await product.update({ stock: stockAfter }, { transaction });
  return StockMovement.create(
    { productId, userId, saleId: saleId ?? null, type, quantity: delta, stockBefore, stockAfter, reason: reason || null },
    { transaction }
  );
}

/**
 * Un mismo tipo de movimiento para varios productos, todo o nada (una sola transacción).
 * Cada renglón pasa por applyMovement, así que sigue habiendo un movimiento por producto.
 * En un ajuste, los productos cuyo stock ya coincide con lo contado se saltean (no son error:
 * al contar un estante es lo normal). Devuelve los movimientos creados y la cantidad salteada.
 */
async function applyBulk({ type, reason, items, userId }) {
  return sequelize.transaction(async (transaction) => {
    const movements = [];
    let skipped = 0;
    // En orden de id: dos lotes simultáneos toman los productos en el mismo orden.
    for (const item of [...items].sort((a, b) => a.productId - b.productId)) {
      if (type === 'adjustment') {
        const product = await Product.findByPk(item.productId, { transaction });
        if (product && product.active && product.stock === item.newStock) {
          skipped += 1;
          continue;
        }
      }
      movements.push(await applyMovement({ ...item, type, reason, userId }, { transaction }));
    }
    if (movements.length === 0) throw new AppError('Ningún producto cambia de stock: todos ya tienen esa cantidad');
    return { movements, skipped };
  });
}

function getById(id) {
  return StockMovement.findByPk(id, { include: includeRelations });
}

async function list({ page, limit, productId, type, from, to }) {
  const conditions = [];
  if (productId) conditions.push({ productId });
  if (type) conditions.push({ type });
  if (from) conditions.push({ createdAt: { [Op.gte]: from } });
  if (to) conditions.push({ createdAt: { [Op.lte]: to } });

  const { rows, count } = await StockMovement.findAndCountAll({
    where: { [Op.and]: conditions },
    include: includeRelations,
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit,
    offset: (page - 1) * limit,
  });

  return { items: rows, total: count, page, pages: Math.ceil(count / limit) };
}

module.exports = { applyMovement, applyBulk, getById, list };
