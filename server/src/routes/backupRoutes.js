const { Router } = require('express');
const backupHandler = require('../handlers/backupHandler');

const router = Router();

router.get('/', backupHandler.list);
router.post('/', backupHandler.create);

module.exports = router;
