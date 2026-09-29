const { Op, QueryTypes, col, literal, where } = require('sequelize');
const { sequelize, Category, Product } = require('../db');

// Los importes se guardan en centavos enteros: las sumas de SQL también llegan en centavos.
const money = (cents) => Math.round(Number(cents)) / 100;

// SQLite guarda las fechas como texto en UTC ("2026-09-29 03:00:00.000 +00:00") y las compara como texto.
// En las consultas SQL a mano hay que pasar las fechas en ese mismo formato (Sequelize las mandaría en hora local).
const dbDate = (date) => date.toISOString().replace('T', ' ').replace('Z', ' +00:00');

// Solo cuentan las ventas completadas: las anuladas no suman a ningún reporte.
// `from` / `to` son opcionales (sin ellas, se cuenta todo el historial).
function periodFilter(from, to) {
  const conditions = ["s.status = 'completed'"];
  const replacements = {};
  if (from) {
    conditions.push('s.created_at >= :from');
    replacements.from = dbDate(from);
  }
  if (to) {
    conditions.push('s.created_at <= :to');
    replacements.to = dbDate(to);
  }
  return { sql: conditions.join(' AND '), replacements };
}

async function summary({ from, to }) {
  // Ventas completadas y anuladas del período (las anuladas solo se cuentan, no suman dinero).
  const dateConditions = [];
  const replacements = {};
  if (from) {
    dateConditions.push('created_at >= :from');
    replacements.from = dbDate(from);
  }
  if (to) {
    dateConditions.push('created_at <= :to');
    replacements.to = dbDate(to);
  }
  const dateSql = dateConditions.length ? `WHERE ${dateConditions.join(' AND ')}` : '';

  const [totals] = await sequelize.query(
    `SELECT COUNT(*) FILTER (WHERE status = 'completed') AS salesCount,
            COUNT(*) FILTER (WHERE status = 'voided') AS voidedCount,
            COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0) AS revenue,
            COALESCE(SUM(discount_amount) FILTER (WHERE status = 'completed'), 0) AS discounts
     FROM sales ${dateSql}`,
    { replacements, type: QueryTypes.SELECT }
  );

  const completed = periodFilter(from, to);
  const [costRow] = await sequelize.query(
    `SELECT COALESCE(SUM(si.unit_cost * si.quantity), 0) AS cost
     FROM sale_items si JOIN sales s ON s.id = si.sale_id
     WHERE ${completed.sql}`,
    { replacements: completed.replacements, type: QueryTypes.SELECT }
  );

  const salesCount = Number(totals.salesCount);
  const revenueCents = Number(totals.revenue);
  const costCents = Number(costRow.cost);
  return {
    salesCount,
    voidedCount: Number(totals.voidedCount),
    revenue: money(revenueCents),
    discounts: money(totals.discounts),
    cost: money(costCents),
    // Ganancia estimada = lo cobrado (ya con descuentos) menos el costo que tenían los productos al vender.
    profit: money(revenueCents - costCents),
    averageTicket: salesCount > 0 ? money(revenueCents / salesCount) : 0,
  };
}

const TOP_SORT_COLUMNS = { quantity: 'quantity', revenue: 'revenue' };

// Productos más vendidos. `revenue` es lo vendido por producto antes de descuentos de la venta.
async function topProducts({ from, to, limit, sort }) {
  const { sql, replacements } = periodFilter(from, to);
  const orderColumn = TOP_SORT_COLUMNS[sort] ?? 'quantity';
  const secondary = orderColumn === 'quantity' ? 'revenue' : 'quantity';

  const rows = await sequelize.query(
    `SELECT si.product_id AS productId, p.code AS code, p.name AS name,
            SUM(si.quantity) AS quantity,
            SUM(si.line_total) AS revenue
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN products p ON p.id = si.product_id
     WHERE ${sql}
     GROUP BY si.product_id, p.code, p.name
     ORDER BY ${orderColumn} DESC, ${secondary} DESC, p.name ASC
     LIMIT :limit`,
    { replacements: { ...replacements, limit }, type: QueryTypes.SELECT }
  );

  return rows.map((row) => ({
    productId: row.productId,
    code: row.code,
    name: row.name,
    quantity: Number(row.quantity),
    revenue: money(row.revenue),
  }));
}

// Ventas y total cobrado por medio de pago (de mayor a menor total).
async function paymentMethods({ from, to }) {
  const { sql, replacements } = periodFilter(from, to);
  const rows = await sequelize.query(
    `SELECT s.payment_method AS method, COUNT(*) AS salesCount, SUM(s.total) AS total
     FROM sales s
     WHERE ${sql}
     GROUP BY s.payment_method
     ORDER BY total DESC`,
    { replacements, type: QueryTypes.SELECT }
  );
  return rows.map((row) => ({ method: row.method, salesCount: Number(row.salesCount), total: money(row.total) }));
}

// Clientes que más compraron (por total cobrado). Las ventas sin cliente asignado se informan aparte.
async function topCustomers({ from, to, limit }) {
  const { sql, replacements } = periodFilter(from, to);
  const rows = await sequelize.query(
    `SELECT c.id AS customerId, c.name AS name, c.phone AS phone, COUNT(*) AS salesCount, SUM(s.total) AS total
     FROM sales s
     JOIN customers c ON c.id = s.customer_id
     WHERE ${sql}
     GROUP BY c.id, c.name, c.phone
     ORDER BY total DESC, salesCount DESC, c.name ASC
     LIMIT :limit`,
    { replacements: { ...replacements, limit }, type: QueryTypes.SELECT }
  );
  const [anonymous] = await sequelize.query(
    `SELECT COUNT(*) AS salesCount, COALESCE(SUM(s.total), 0) AS total
     FROM sales s
     WHERE ${sql} AND s.customer_id IS NULL`,
    { replacements, type: QueryTypes.SELECT }
  );
  return {
    items: rows.map((row) => ({
      customerId: row.customerId,
      name: row.name,
      phone: row.phone,
      salesCount: Number(row.salesCount),
      total: money(row.total),
    })),
    withoutCustomer: { salesCount: Number(anonymous.salesCount), total: money(anonymous.total) },
  };
}

// Productos activos con stock igual o menor al mínimo; primero los más urgentes (los que más faltan).
async function lowStock({ page, limit }) {
  const { rows, count } = await Product.findAndCountAll({
    where: { [Op.and]: [{ active: true }, where(col('stock'), Op.lte, col('min_stock'))] },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
    order: [
      [literal('("Product"."stock" - "Product"."min_stock")'), 'ASC'],
      ['name', 'ASC'],
    ],
    limit,
    offset: (page - 1) * limit,
  });

  return { items: rows, total: count, page, pages: Math.ceil(count / limit) };
}

module.exports = { summary, topProducts, lowStock, paymentMethods, topCustomers };
