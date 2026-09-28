const { Router } = require('express');
const saleHandler = require('../handlers/saleHandler');

const router = Router();

router.get('/', saleHandler.list);
router.get('/:id', saleHandler.getById);
router.post('/', saleHandler.create);
router.post('/:id/void', saleHandler.voidSale);

module.exports = router;
