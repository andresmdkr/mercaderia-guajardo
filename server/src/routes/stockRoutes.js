const { Router } = require('express');
const stockHandler = require('../handlers/stockHandler');

const router = Router();

router.get('/movements', stockHandler.list);
router.post('/movements', stockHandler.create);
router.post('/movements/bulk', stockHandler.createBulk);

module.exports = router;
