const { Router } = require('express');
const priceUpdateHandler = require('../handlers/priceUpdateHandler');

const router = Router();

router.get('/', priceUpdateHandler.list);
router.post('/preview', priceUpdateHandler.preview);
router.post('/', priceUpdateHandler.apply);
router.post('/:id/undo', priceUpdateHandler.undo);

module.exports = router;
