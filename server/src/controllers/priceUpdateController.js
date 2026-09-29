const { QueryTypes } = require('sequelize');
const { sequelize } = require('../db');
const AppError = require('../utils/AppError');
const { dbDate } = require('../utils/dbDate');

// Actualización masiva de precios. Todo se calcula con enteros (centavos y centésimas de punto): nada de float en la base.
// Cada operación queda como un lote con lo que cambió en cada producto, para poder deshacerla.

const PREVIEW_LIMIT = 100; // filas que se muestran en la vista previa (el conteo es de todos)
const centsToPesos = (cents) => cents / 100;

// Precio nuevo en centavos: el precio × (1 + porcentaje), redondeado al múltiplo de `roundTo` pesos (0 = sin redondear).
// Nunca queda en cero un precio que tenía valor (con redondeo, el mínimo es una unidad).
function applyPercent(cents, percentBp, roundTo) {
  let next = Math.round((cents * (10000 + percentBp)) / 10000);
  if (roundTo > 0) {
    const unit = roundTo * 100;
    next = Math.round(next / unit) * unit;
    if (next === 0 && cents > 0 && percentBp > -10000) next = unit;
  }
  return Math.max(0, next);
}

// Productos alcanzados (todos, o los de una categoría) con los precios nuevos calculados. Los que no cambian, se descartan.
async function computeChanges({ percentBp, costPercentBp, categoryId, roundTo }, transaction) {
  const rows = await sequelize.query(
    `SELECT p.id, p.code, p.name, p.sale_price AS salePrice, p.cost_price AS costPrice
     FROM products p
     WHERE (:categoryId IS NULL OR p.category_id = :categoryId)
     ORDER BY p.name ASC, p.id ASC`,
    { replacements: { categoryId: categoryId ?? null }, type: QueryTypes.SELECT, transaction }
  );

  const changes = [];
  for (const row of rows) {
    const newPrice = applyPercent(row.salePrice, percentBp, roundTo);
    const newCost = costPercentBp === null ? row.costPrice : applyPercent(row.costPrice, costPercentBp, 0);
    if (newPrice !== row.salePrice || newCost !== row.costPrice) {
      changes.push({ ...row, newPrice, newCost });
    }
  }
  return { scopeCount: rows.length, changes };
}

const toPreviewItem = (change) => ({
  id: change.id,
  code: change.code,
  name: change.name,
  oldPrice: centsToPesos(change.salePrice),
  newPrice: centsToPesos(change.newPrice),
  oldCost: centsToPesos(change.costPrice),
  newCost: centsToPesos(change.newCost),
});

async function assertCategory(categoryId) {
  if (categoryId === null) return null;
  const [category] = await sequelize.query('SELECT name FROM categories WHERE id = :categoryId', {
    replacements: { categoryId },
    type: QueryTypes.SELECT,
  });
  if (!category) throw new AppError('La categoría no existe');
  return category.name;
}

// Vista previa: no cambia nada. Devuelve cuántos productos se modificarían y las primeras filas.
async function preview(params) {
  await assertCategory(params.categoryId);
  const { scopeCount, changes } = await computeChanges(params);
  return {
    scopeCount,
    count: changes.length,
    unchanged: scopeCount - changes.length,
    items: changes.slice(0, PREVIEW_LIMIT).map(toPreviewItem),
    truncated: changes.length > PREVIEW_LIMIT,
  };
}

// Aplica los cambios en una sola transacción (todo o nada). `expectedCount` es el conteo que se vio en la vista previa:
// si los productos cambiaron mientras tanto, se rechaza y hay que volver a mirarla.
async function apply(params, { expectedCount, userId }) {
  const categoryName = await assertCategory(params.categoryId);

  return sequelize.transaction(async (transaction) => {
    const { changes } = await computeChanges(params, transaction);
    if (changes.length === 0) throw new AppError('Con esos valores ningún producto cambia de precio');
    if (changes.length !== expectedCount) {
      throw new AppError('Los productos cambiaron desde la vista previa. Volvé a mirarla antes de aplicar.', 409);
    }

    const now = dbDate();
    await sequelize.query(
      `INSERT INTO price_batches (user_id, percent_bp, cost_percent_bp, category_name, round_to, changed_count, created_at, updated_at)
       VALUES (:userId, :percentBp, :costPercentBp, :categoryName, :roundTo, :count, :now, :now)`,
      {
        replacements: { userId, percentBp: params.percentBp, costPercentBp: params.costPercentBp, categoryName, roundTo: params.roundTo, count: changes.length, now },
        transaction,
      }
    );
    // El id se lee en la misma conexión de la transacción (last_insert_rowid es por conexión).
    const [{ id: batchId }] = await sequelize.query('SELECT last_insert_rowid() AS id', { type: QueryTypes.SELECT, transaction });

    for (const change of changes) {
      await sequelize.query('UPDATE products SET sale_price = :price, cost_price = :cost, updated_at = :now WHERE id = :id', {
        replacements: { price: change.newPrice, cost: change.newCost, now, id: change.id },
        transaction,
      });
      await sequelize.query(
        `INSERT INTO price_changes (batch_id, product_id, old_price, new_price, old_cost, new_cost, created_at, updated_at)
         VALUES (:batchId, :id, :oldPrice, :newPrice, :oldCost, :newCost, :now, :now)`,
        {
          replacements: { batchId, id: change.id, oldPrice: change.salePrice, newPrice: change.newPrice, oldCost: change.costPrice, newCost: change.newCost, now },
          transaction,
        }
      );
    }
    return { batchId, count: changes.length };
  });
}

// Historial reciente. Solo el último lote sin deshacer se puede deshacer (`canUndo`).
async function listBatches({ limit = 10 } = {}) {
  const rows = await sequelize.query(
    `SELECT b.id, b.created_at AS createdAt, b.percent_bp AS percentBp, b.cost_percent_bp AS costPercentBp,
            b.category_name AS categoryName, b.round_to AS roundTo, b.changed_count AS count,
            b.undone_at AS undoneAt, u.name AS userName
     FROM price_batches b JOIN users u ON u.id = b.user_id
     ORDER BY b.id DESC LIMIT :limit`,
    { replacements: { limit }, type: QueryTypes.SELECT }
  );
  const latestUndoable = rows.find((row) => !row.undoneAt)?.id ?? null;
  return rows.map((row) => ({
    id: row.id,
    createdAt: new Date(String(row.createdAt).replace(' +00:00', 'Z').replace(' ', 'T')),
    percent: row.percentBp / 100,
    costPercent: row.costPercentBp === null ? null : row.costPercentBp / 100,
    categoryName: row.categoryName,
    roundTo: row.roundTo,
    count: row.count,
    undone: Boolean(row.undoneAt),
    userName: row.userName,
    canUndo: row.id === latestUndoable,
  }));
}

// Deshace un lote: devuelve los precios anteriores. Solo el último lote sin deshacer; y solo los productos cuyo precio
// sigue siendo el que puso el lote (si alguien lo editó después, ese producto se respeta y se informa).
async function undo(batchId) {
  return sequelize.transaction(async (transaction) => {
    const [batch] = await sequelize.query('SELECT id, undone_at AS undoneAt FROM price_batches WHERE id = :batchId', {
      replacements: { batchId },
      type: QueryTypes.SELECT,
      transaction,
    });
    if (!batch) throw new AppError('Esa actualización de precios no existe', 404);
    if (batch.undoneAt) throw new AppError('Esa actualización ya se deshizo', 409);

    const [newer] = await sequelize.query('SELECT id FROM price_batches WHERE id > :batchId AND undone_at IS NULL LIMIT 1', {
      replacements: { batchId },
      type: QueryTypes.SELECT,
      transaction,
    });
    if (newer) throw new AppError('Hay una actualización más nueva. Solo se puede deshacer la última.', 409);

    const rows = await sequelize.query(
      `SELECT c.product_id AS productId, c.old_price AS oldPrice, c.new_price AS newPrice, c.old_cost AS oldCost, c.new_cost AS newCost,
              p.sale_price AS currentPrice, p.cost_price AS currentCost
       FROM price_changes c JOIN products p ON p.id = c.product_id
       WHERE c.batch_id = :batchId`,
      { replacements: { batchId }, type: QueryTypes.SELECT, transaction }
    );

    const now = dbDate();
    let restored = 0;
    for (const row of rows) {
      if (row.currentPrice !== row.newPrice || row.currentCost !== row.newCost) continue; // se editó después: se respeta
      await sequelize.query('UPDATE products SET sale_price = :price, cost_price = :cost, updated_at = :now WHERE id = :id', {
        replacements: { price: row.oldPrice, cost: row.oldCost, now, id: row.productId },
        transaction,
      });
      restored += 1;
    }
    await sequelize.query('UPDATE price_batches SET undone_at = :now, updated_at = :now WHERE id = :batchId', {
      replacements: { now, batchId },
      transaction,
    });
    return { restored, skipped: rows.length - restored };
  });
}

module.exports = { preview, apply, listBatches, undo };
