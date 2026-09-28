const { Op, QueryTypes, col, literal, where } = require('sequelize');
const { sequelize, Category, Product } = require('../db');

// Solo cuentan las ventas completadas: las anuladas no suman a ningún reporte.
// `from` / `to` son opcionales (sin ellas, se cuenta todo el historial).
function periodFilter(from, to) {
  const conditions = ["s.status = 'completed'"];
  const replacements = {};
  if (from) {
    conditions.push('s.created_at >= :from');
    replacements.from = from;
  }
  if (to) {
    conditions.push('s.created_at <= :to');
    replacements.to = to;
  }
  return { sql: conditions.join(' AND '), replacements };
}

const money = (value) => Math.round(Number(value) * 100) / 100;

async function summary({ from, to }) {
  // Ventas completadas y anuladas del período (las anuladas solo se cuentan, no suman dinero).
  const dateConditions = [];
  const replacements = {};
  if (from) {
    dateConditions.push('created_at >= :from');
    replacements.from = from;
  }
  if (to) {
    dateConditions.push('created_at <= :to');
    replacements.to = to;
  }
  const dateSql = dateConditions.length ? `WHERE ${dateConditions.join(' AND ')}` : '';

  const [totals] = await sequelize.query(
    `SELECT COUNT(*) FILTER (WHERE status = 'completed')::int AS "salesCount",
            COUNT(*) FILTER (WHERE status = 'voided')::int AS "voidedCount",
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

  const revenue = money(totals.revenue);
  const cost = money(costRow.cost);
  return {
    salesCount: totals.salesCount,
    voidedCount: totals.voidedCount,
    revenue,
    discounts: money(totals.discounts),
    cost,
    // Ganancia estimada = lo cobrado (ya con descuentos) menos el costo que tenían los productos al vender.
    profit: money(revenue - cost),
    averageTicket: totals.salesCount > 0 ? money(revenue / totals.salesCount) : 0,
  };
}

const TOP_SORT_COLUMNS = { quantity: 'quantity', revenue: 'revenue' };

// Productos más vendidos. `revenue` es lo vendido por producto antes de descuentos de la venta.
async function topProducts({ from, to, limit, sort }) {
  const { sql, replacements } = periodFilter(from, to);
  const orderColumn = TOP_SORT_COLUMNS[sort] ?? 'quantity';
  const secondary = orderColumn === 'quantity' ? 'revenue' : 'quantity';

  const rows = await sequelize.query(
    `SELECT si.product_id AS "productId", p.code, p.name,
            SUM(si.quantity)::int AS quantity,
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

  return rows.map((row) => ({ ...row, revenue: money(row.revenue) }));
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

module.exports = { summary, topProducts, lowStock };
