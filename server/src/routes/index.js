const { Router } = require('express');
const authRoutes = require('./authRoutes');
const categoryRoutes = require('./categoryRoutes');
const customerRoutes = require('./customerRoutes');
const productRoutes = require('./productRoutes');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', requireAuth, categoryRoutes);
router.use('/customers', requireAuth, customerRoutes);
router.use('/products', requireAuth, productRoutes);

module.exports = router;
