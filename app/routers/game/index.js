const router = require('express').Router();

const authRoute = require('./auth');
const aviatorRoute = require('./aviator');

router.use('/auth', authRoute);
router.use('/aviator', aviatorRoute);

module.exports = router;
