const { Router } = require('express');
const customerHandler = require('../handlers/customerHandler');

const router = Router();

router.get('/', customerHandler.list);
router.get('/phone-check', customerHandler.checkPhone); // antes de '/:id'
router.get('/:id', customerHandler.getById);
router.post('/', customerHandler.create);
router.put('/:id', customerHandler.update);
router.patch('/:id/status', customerHandler.setStatus);

module.exports = router;
