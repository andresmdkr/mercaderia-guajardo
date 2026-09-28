const { Router } = require('express');
const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', requireAuth, productRoutes);

module.exports = router;
