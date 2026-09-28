const { Router } = require('express');
const settingsHandler = require('../handlers/settingsHandler');

const router = Router();

router.get('/business', settingsHandler.getBusiness);
router.put('/business', settingsHandler.updateBusiness);

module.exports = router;
