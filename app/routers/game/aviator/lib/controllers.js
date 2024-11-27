const _ = require('../../../../../globals/lib/helper');
const { redis, mongodb } = require('../../../../utils');

const controllers = {};

controllers.createBoard = async (req, res) => {
  try {
    // const iBoardId = mongodb.mongify();
    const iBoardId = '6744369aac1a00c98ab71c6e';
    await redis.client.json.set(`${iBoardId.toString()}:aviatorBoard`, '$', {
      eState: 'waiting',
      nMultiplyMoneyValue: 0,
      oSocketId: {},
      nAdminProfit: 0,
    });

    await redis.client.pSetEx(_.getSchedulerKey('assignBetTimeout', iBoardId.toString(), ''), 1000 * 15, 'assignBetTimeout');

    return res.reply(messages.success(), { iBoardId });
  } catch (error) {
    console.log('error:::', error);
    res.reply(messages.server_error(), error);
  }
};

module.exports = controllers;
