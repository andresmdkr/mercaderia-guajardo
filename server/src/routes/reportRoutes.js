const { Router } = require('express');
const reportHandler = require('../handlers/reportHandler');

const router = Router();

router.get('/summary', reportHandler.summary);
router.get('/top-products', reportHandler.topProducts);
router.get('/low-stock', reportHandler.lowStock);

module.exports = router;
