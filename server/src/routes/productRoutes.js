const { Router } = require('express');
const productHandler = require('../handlers/productHandler');

const router = Router();

router.get('/', productHandler.list);
router.get('/:id', productHandler.getById);
router.post('/', productHandler.create);
router.put('/:id', productHandler.update);
router.patch('/:id/status', productHandler.setStatus);

module.exports = router;
