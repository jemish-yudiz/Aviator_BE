require('dotenv').config();
require('./globals');

const { mongodb, redis, getIp, queue } = require('./app/utils');
const router = require('./app/routers');
const socket = require('./app/sockets');
const _ = require('./globals/lib/helper');

(async () => {
  try {
    // await getIp();
    console.log('\n---------------------------------');
    await mongodb.initialize();
    await redis.initialize();
    router.initialize();
    // queue.initialize();
    socket.initialize(router.httpServer);
  } catch (err) {
    log.blue(':-(');
    log.red(`reason: ${err.message}, stack: ${err.stack}`);
    process.exit(1);
  }
})();

console.log(`NODE_ENV ${process.env.NODE_ENV} 🌱,PORT ${process.env.PORT} \n---------------------------------`);
