const boardManager = require('../../game/BoardManager');
const { User } = require('../../models');
const { queue, redis } = require('../../utils'); // redis
const PlayerListener = require('./listener');

class Player {
  constructor(socket) {
    this.socket = socket;
    this.iUserId = socket.user.iUserId;
    this.setEventListeners();
  }
  setEventListeners() {
    this.socket.on('ping', this.ping.bind(this));
    this.socket.on('disconnect', this.disconnect.bind(this));
    this.socket.on('reqJoinBoard', this.joinBoard.bind(this));
    this.socket.on('error', error => log.red('socket error', error));
  }
  ping(body, callback) {
    callback({ message: 'pong' });
  }

  async joinBoard({ iBoardId, isReconnect }, callback) {
    try {
      const board = await redis.client.json.get(`${iBoardId}:aviatorBoard`);
      if (!board) {
        return this.logError(messages.not_found('board'), callback);
      }

      if (!this.socket.eventNames().includes(iBoardId)) {
        const playerListener = new PlayerListener(iBoardId, this.iUserId);
        this.socket.on(iBoardId, playerListener.onEvent.bind(playerListener));
      }
      if (!board.oSocketId) board.oSocketId = {};
      board.oSocketId[this.iUserId] = this.socket.id;
      await redis.client.json.set(`${iBoardId}:aviatorBoard`, '$.oSocketId', board.oSocketId);

      let player = {
        iUserId: this.iUserId,
        eState: 'waiting',
        nBetAmount: 0,
        cashOutAt: 0,
        bPlacedBetNextRound: false,
        bIsCashOut: false,
      };
      if (!isReconnect) {
        await redis.client.json.set(`${iBoardId}:${this.iUserId}:player`, '$', player);
      } else {
        const player = await redis.client.json.get(`${iBoardId}:${this.iUserId}:player`);
        if (!player) return this.logError(messages.not_found('player'), callback);

        this.socket.emit(iBoardId, { message: 'Reconnected to board', board, player });
      }

      const getBetTtl = await redis.client.ttl(_.getSchedulerKey('assignBetTimeout', iBoardId, ''));

      callback({ message: 'Joined board', player, getBetTtl });
    } catch (error) {
      log.red('Error joining board:', error);
      return this.logError(error, callback);
    }
  }

  logError(error, callback = () => {}) {
    console.log('error in logError', error);
    callback(error);
  }

  async disconnect() {
    try {
      log.red('Root disconnected', this.iUserId, 'with ', this.socket.id);
      await User.updateOne({ _id: this.iUserId }, { $set: { ePlayerStatus: 'offline' } });
    } catch (error) {
      log.trace('disconnect error:::', error);
    }
  }
}

module.exports = Player;
