const { Router } = require('express');
const stockHandler = require('../handlers/stockHandler');

const router = Router();

router.get('/movements', stockHandler.list);
router.post('/movements', stockHandler.create);

module.exports = router;
