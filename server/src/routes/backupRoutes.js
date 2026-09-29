const { Router } = require('express');
const backupHandler = require('../handlers/backupHandler');

const router = Router();

router.get('/', backupHandler.list);
router.post('/', backupHandler.create);
router.get('/external', backupHandler.externalStatus);
router.put('/external', backupHandler.setExternalFolder);

module.exports = router;
