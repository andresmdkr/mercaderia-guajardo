const { Router } = require('express');
const authHandler = require('../handlers/authHandler');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.get('/setup-status', authHandler.setupStatus);
router.post('/setup', authHandler.setup);
router.post('/login', authHandler.login);
router.post('/logout', authHandler.logout);
router.get('/me', requireAuth, authHandler.me);
router.post('/change-password', requireAuth, authHandler.changePassword);

module.exports = router;
