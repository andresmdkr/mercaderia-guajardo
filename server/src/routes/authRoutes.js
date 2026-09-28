const { Router } = require('express');
const authHandler = require('../handlers/authHandler');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.post('/login', authHandler.login);
router.post('/logout', authHandler.logout);
router.get('/me', requireAuth, authHandler.me);

module.exports = router;
