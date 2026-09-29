const { Router } = require('express');
const reportHandler = require('../handlers/reportHandler');

const router = Router();

router.get('/summary', reportHandler.summary);
router.get('/top-products', reportHandler.topProducts);
router.get('/payment-methods', reportHandler.paymentMethods);
router.get('/top-customers', reportHandler.topCustomers);
router.get('/low-stock', reportHandler.lowStock);

module.exports = router;
