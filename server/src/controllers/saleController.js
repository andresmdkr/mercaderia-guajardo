const { Op } = require('sequelize');
const { sequelize, Customer, Product, Sale, SaleItem, User } = require('../db');
const AppError = require('../utils/AppError');
const { fromCents, toCents } = require('../utils/money');
const { applyMovement } = require('./stockController');

const includeDetail = [
  { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
  { model: User, as: 'user', attributes: ['id', 'name'] },
  { model: User, as: 'voidedByUser', attributes: ['id', 'name'] },
  { model: SaleItem, as: 'items' },
];

const includeSummary = [
  { model: Customer, as: 'customer', attributes: ['id', 'name'] },
  { model: User, as: 'user', attributes: ['id', 'name'] },
];

// Descuento en centavos. Nunca puede superar el subtotal.
function computeDiscountCents(discount, subtotalCents) {
  if (!discount) return 0;
  const cents = discount.type === 'percent' ? Math.round((subtotalCents * discount.value) / 100) : toCents(discount.value);
  if (cents > subtotalCents) throw new AppError('El descuento no puede ser mayor al subtotal');
  return cents;
}

async function getById(id) {
  const sale = await Sale.findByPk(id, { include: includeDetail, order: [[{ model: SaleItem, as: 'items' }, 'id', 'ASC']] });
  if (!sale) throw new AppError('Venta no encontrada', 404);
  return sale;
}

async function list({ page, limit, from, to, status, customerId, paymentMethod }) {
  const conditions = [];
  if (from) conditions.push({ createdAt: { [Op.gte]: from } });
  if (to) conditions.push({ createdAt: { [Op.lte]: to } });
  if (status) conditions.push({ status });
  if (customerId) conditions.push({ customerId });
  if (paymentMethod) conditions.push({ paymentMethod });

  const { rows, count } = await Sale.findAndCountAll({
    where: { [Op.and]: conditions },
    include: includeSummary,
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit,
    offset: (page - 1) * limit,
  });

  return { items: rows, total: count, page, pages: Math.ceil(count / limit) };
}

/**
 * Registra una venta. TODO ocurre en una transacción: si un ítem no tiene stock (o cualquier
 * otra cosa falla) no se guarda la venta ni se descuenta nada.
 * Los precios y el total salen de la base de datos; nunca se toman del cliente.
 * `items` = [{ productId, quantity }] sin productos repetidos.
 */
async function create({ items, customerId, paymentMethod, discount, notes, userId }) {
  const saleId = await sequelize.transaction(async (transaction) => {
    if (customerId) {
      const customer = await Customer.findByPk(customerId, { transaction });
      if (!customer || !customer.active) throw new AppError('El cliente no existe o está dado de baja');
    }

    // Siempre en el mismo orden (por id) para que dos ventas simultáneas no se traben entre sí.
    const ordered = [...items].sort((a, b) => a.productId - b.productId);

    // 1) Leer (y bloquear) cada producto: de acá salen el precio, el costo y el nombre.
    const lines = [];
    for (const { productId, quantity } of ordered) {
      const product = await Product.findByPk(productId, { transaction });
      if (!product) throw new AppError(`El producto ${productId} no existe`);
      if (!product.active) throw new AppError(`"${product.name}" está dado de baja`, 409);

      const unitPriceCents = toCents(product.salePrice);
      lines.push({
        product,
        quantity,
        unitPriceCents,
        unitCostCents: toCents(product.costPrice),
        lineTotalCents: unitPriceCents * quantity,
      });
    }

    // 2) Totales.
    const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const discountCents = computeDiscountCents(discount, subtotalCents);

    // 3) Guardar la venta y sus ítems (con copia de nombre, precio y costo).
    const sale = await Sale.create(
      {
        customerId: customerId ?? null,
        userId,
        paymentMethod,
        subtotal: fromCents(subtotalCents),
        discountType: discount?.type ?? null,
        discountValue: discount?.value ?? null,
        discountAmount: fromCents(discountCents),
        total: fromCents(subtotalCents - discountCents),
        notes: notes ?? null,
      },
      { transaction }
    );

    await SaleItem.bulkCreate(
      lines.map((line) => ({
        saleId: sale.id,
        productId: line.product.id,
        productCode: line.product.code,
        productName: line.product.name,
        quantity: line.quantity,
        unitPrice: fromCents(line.unitPriceCents),
        unitCost: fromCents(line.unitCostCents),
        lineTotal: fromCents(line.lineTotalCents),
      })),
      { transaction }
    );

    // 4) Descontar el stock (deja un movimiento por ítem). Si falta stock, se revierte todo.
    for (const line of lines) {
      await applyMovement(
        { productId: line.product.id, type: 'sale', quantity: line.quantity, userId, saleId: sale.id, reason: `Venta #${sale.id}` },
        { transaction }
      );
    }

    return sale.id;
  });

  return getById(saleId);
}

// Anula una venta: devuelve el stock de todos los ítems. Una venta anulada no se puede volver a anular.
async function voidSale(id, { reason, userId }) {
  await sequelize.transaction(async (transaction) => {
    const sale = await Sale.findByPk(id, { transaction });
    if (!sale) throw new AppError('Venta no encontrada', 404);
    if (sale.status === 'voided') throw new AppError('La venta ya está anulada', 409);

    const items = await SaleItem.findAll({ where: { saleId: id }, order: [['productId', 'ASC']], transaction });
    for (const item of items) {
      await applyMovement(
        {
          productId: item.productId,
          type: 'sale_void',
          quantity: item.quantity,
          userId,
          saleId: id,
          reason: `Anulación de venta #${id}`,
        },
        { transaction }
      );
    }

    await sale.update({ status: 'voided', voidedAt: new Date(), voidedBy: userId, voidReason: reason || null }, { transaction });
  });

  return getById(id);
}

module.exports = { list, getById, create, voidSale };
