const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/signup', ctrl.signup);
router.post('/login', ctrl.login);
router.post('/logout', auth, ctrl.logout);
router.get('/me', auth, ctrl.getMe);
router.put('/profile', auth, ctrl.editProfile);

module.exports = router;
