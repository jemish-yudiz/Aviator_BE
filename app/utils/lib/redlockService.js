const Client = require('ioredis');
const { default: Redlock } = require('redlock');

class RedlockService {
  constructor() {
    const client = new Client({
      host: process.env.BULL_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
    });
    client.on('ready', () => {
      try {
        this.lock = new Redlock([client], {
          driftFactor: 0.01, // multiplied by lock ttl to determine drift time
          retryCount: -1,
          retryDelay: 200, // time in ms
          retryJitter: 200, // time in ms
          automaticExtensionThreshold: 500, // time in ms
        });
      } catch (error) {
        console.log('error in redlockService', error);
      }
    });
  }
}

module.exports = new RedlockService();
