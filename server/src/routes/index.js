const { Router } = require('express');
const authRoutes = require('./authRoutes');
const categoryRoutes = require('./categoryRoutes');
const customerRoutes = require('./customerRoutes');
const productRoutes = require('./productRoutes');
const saleRoutes = require('./saleRoutes');
const settingsRoutes = require('./settingsRoutes');
const stockRoutes = require('./stockRoutes');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', requireAuth, categoryRoutes);
router.use('/customers', requireAuth, customerRoutes);
router.use('/products', requireAuth, productRoutes);
router.use('/sales', requireAuth, saleRoutes);
router.use('/settings', requireAuth, settingsRoutes);
router.use('/stock', requireAuth, stockRoutes);

module.exports = router;
