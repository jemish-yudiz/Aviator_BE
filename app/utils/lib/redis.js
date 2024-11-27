/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
/* eslint-disable class-methods-use-this */
// /* eslint-disable new-cap */
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const ioRedis = require('socket.io-redis');
const Redlock = require('redlock');

class RedisClient {
  constructor() {
    if (process.env.NODE_ENV === 'dev') {
      this.options = {
        url: process.env.REDIS_HOST,
        legacyMode: false,
      };
    } else {
      this.options = {
        url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        legacyMode: false,
        connectTimeout: 10000,
        legacyMode: false,
        lazyConnect: true,
      };
    }
  }

  async initialize() {
    try {
      this.client = createClient(this.options);
      this.subClient = createClient(this.options);
      this.pubClient = createClient(this.options);
      await Promise.all([this.client.connect(), this.pubClient.connect(), this.subClient.connect()]);
      if (process.env.NODE_ENV !== 'prod') await this.subClient.CONFIG_SET('notify-keyspace-events', 'Ex');
      await this.subClient.subscribe(['__keyevent@0__:expired', 'redisEvent'], this.onMessage, false);
      // console.log(this.pubClient);
      this.client.on('error', log.error);
      this.pubClient.on('error', log.error);
      this.subClient.on('error', log.error);
      log.green('Redis Connected Successfully!!!⚡');
    } catch (error) {
      log.error(`${_.now()} Error Occurred on redis initialize. reason :${error.message}`);
    }
  }

  async setupConfig() {
    log.cyan('Redis initialized ⚡ \n---------------------------------');
  }

  getAdapter() {
    // return ioRedis({
    //   ...this.options,
    //   subClient: this.subClient,
    //   pubClient: this.pubClient,
    // });
    return createAdapter(this.pubClient, this.subClient);
  }

  async onMessage(message, channel) {
    let _channel;
    let _message;

    if (channel === '__keyevent@0__:expired') {
      const [iBoardId, scheduler, sTaskName, iUserId, sHostIp] = message.split(':'); // 'sch:fqr6dlI_2Gg2TcH3_YTfj:assignBot::127.0.0.1' // `sch:${iBattleId}:${sTaskName}:${iUserId}:${host}`
      if (sHostIp !== process.env.HOST || scheduler !== 'scheduler') return false;
      _channel = sTaskName; // 'sch'
      _message = { sTaskName, iBoardId, iUserId };
    } else {
      _channel = channel;
      _message = message;
    }

    let parsedMessage = '';
    try {
      parsedMessage = _.parse(_message);
    } catch (err) {
      log.red('err in onMessage!');
      console.log(error);
      parsedMessage = _message;
    }
    await emitter.asyncEmit(_channel, parsedMessage); // ch : redisEvent | sch
  }
}

module.exports = new RedisClient();
