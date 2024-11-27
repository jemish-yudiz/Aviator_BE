const router = require('express').Router();
const { socialAuth } = require('../../../utils');
const controllers = require('./lib/controllers');
const middleware = require('./lib/middlewares');

router.post('/login/social', controllers.socialLogin);
router.post('/login', controllers.login);
router.post('/otp/resend', controllers.resendOtp);
router.post('/otp/verify', controllers.verifyOtp);
router.post('/autoLogin', controllers.autoLoginUsers);
router.post('/guestLogin', controllers.guestLogin);
router.post('/token/refresh', middleware.isAuthenticated, controllers.refreshToken);

// ------------------------------ Test API ------------------------------
router.get('/google/auth', socialAuth.getGoogle);
router.get('/google/token', socialAuth.getToken);
router.post('/firebase/notify', controllers.firebaseNotifyTest);

module.exports = router;
