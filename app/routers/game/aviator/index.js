const router = require('express').Router();
const controllers = require('./lib/controllers');
const middleware = require('./lib/middlewares');

router.use(middleware.isAuthenticated);
router.post('/board/create', controllers.createBoard);

module.exports = router;
