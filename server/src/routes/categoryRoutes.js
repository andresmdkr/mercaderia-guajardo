const { Router } = require('express');
const categoryHandler = require('../handlers/categoryHandler');

const router = Router();

router.get('/', categoryHandler.list);
router.post('/', categoryHandler.create);
router.put('/:id', categoryHandler.update);
router.delete('/:id', categoryHandler.remove);

module.exports = router;
