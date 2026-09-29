const { Router } = require('express');
const appHandler = require('../handlers/appHandler');
const authRoutes = require('./authRoutes');
const backupRoutes = require('./backupRoutes');
const categoryRoutes = require('./categoryRoutes');
const customerRoutes = require('./customerRoutes');
const priceUpdateRoutes = require('./priceUpdateRoutes');
const productRoutes = require('./productRoutes');
const reportRoutes = require('./reportRoutes');
const saleRoutes = require('./saleRoutes');
const settingsRoutes = require('./settingsRoutes');
const stockRoutes = require('./stockRoutes');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.get('/version', appHandler.getVersion);
router.use('/auth', authRoutes);
router.use('/backups', requireAuth, backupRoutes);
router.use('/categories', requireAuth, categoryRoutes);
router.use('/customers', requireAuth, customerRoutes);
router.use('/price-updates', requireAuth, priceUpdateRoutes);
router.use('/products', requireAuth, productRoutes);
router.use('/reports', requireAuth, reportRoutes);
router.use('/sales', requireAuth, saleRoutes);
router.use('/settings', requireAuth, settingsRoutes);
router.use('/stock', requireAuth, stockRoutes);

module.exports = router;
