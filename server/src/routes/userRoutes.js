const { Router } = require('express');
const userHandler = require('../handlers/userHandler');

const router = Router();

router.get('/', userHandler.list);
router.post('/', userHandler.create);
router.patch('/:id/active', userHandler.setActive);
router.post('/:id/password', userHandler.resetPassword);

module.exports = router;
