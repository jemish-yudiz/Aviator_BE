const redis = require('./redis');

const operation = {};

operation.setLimit = async (params, callback) => {
    const body = _.pick(params, ['path', 'remoteAddress', 'maxRequestTime']);
    const key = `${body.remoteAddress}:${body.path}`;
    const isExist = await redis.client.get(key);
    if (isExist) return callback('Too many request');
    await redis.client.set(key, Date.now());
    await redis.client.expire(key, (body.maxRequestTime || 1000) / 1000);
    return callback();
};

module.exports = operation;
