/* eslint-disable no-restricted-syntax */
/* eslint-disable class-methods-use-this */
const emitter = require('../../../globals/lib/emitter');
const { User } = require('../../models');
const { redis } = require('../../utils');

class BoardManager {
  constructor() {
    this.oDefaultSetting = {};

    emitter.on('assignBetTimeout', this.schedular.bind(this, 'assignBetTimeout'));
    emitter.on('assignGamePlayTimeout', this.schedular.bind(this, 'assignGamePlayTimeout'));
  }

  schedular(sTaskName, message, callback) {
    const { iBoardId, iUserId } = message;
    this.scheduleTask(sTaskName, iBoardId, iUserId, callback);
  }

  async scheduleTask(sTaskName, iBoardId, callback) {
    const board = await redis.client.json.get(`${iBoardId}:aviatorBoard`);
    if (!board) return console.log('scheduleTask board not found');

    switch (sTaskName) {
      case 'assignBetTimeout':
        await this.InAssignBetTimeout(iBoardId, callback);
        break;
      case 'assignGamePlayTimeout':
        await this.InAssignGamePlayTimeout(iBoardId, callback);
        break;
      default:
        log.red('case did not matched', sTaskName);
        break;
    }
  }

  async InAssignBetTimeout(iBoardId, callback) {
    try {
      const participants = await redis.client.keys(`${iBoardId}:*:player`);
      let nMaxBetAmount = 0;
      for (const participant of participants) {
        const participantData = await redis.client.json.get(participant);
        if (+participantData.nBetAmount > nMaxBetAmount) nMaxBetAmount = +participantData.nBetAmount;
      }

      const board = await redis.client.json.get(`${iBoardId}:aviatorBoard`);
      if (!board) {
        console.log('board not found');
        return;
      }

      let nMultiplier = (board.nAdminProfit * 0.9) / nMaxBetAmount;
      if (nMultiplier <= 1 || nMaxBetAmount == 0) {
        //   const nRandom = Math.random();
        //   if (nRandom <= 0.9) {
        //     nMultiplier = +(Math.random() * 10 + 1).toFixed(1);
        //   } else if (nRandom > 0.9 && nRandom <= 0.95) {
        //     nMultiplier = +(Math.random() * 30 + 10).toFixed(1);
        //   } else {
        //     nMultiplier = +(Math.random() * 60 + 30).toFixed(1);
        //   }

        nMultiplier = (Math.floor(Math.random() * 10) / 10 + 1.2).toFixed(1);
      }

      await redis.client.json.set(`${iBoardId}:aviatorBoard`, '$.eState', 'playing');
      await redis.client.json.set(`${iBoardId}:aviatorBoard`, '$.nMultiplyMoneyValue', +nMultiplier);

      const gamePlayTime = this.calculateGamePlayTime(+nMultiplier);
      await redis.client.pSetEx(_.getSchedulerKey('assignGamePlayTimeout', iBoardId, ''), gamePlayTime, 'assignGamePlayTimeout');

      this.boardEmit('resInitialCrashValue', { nMultiplyMoneyValue: +nMultiplier, nGamePlayTime: gamePlayTime }, iBoardId);

      const allPlayers = await redis.client.keys(`${iBoardId}:*:player`);
      for (const player of allPlayers) {
        const playerData = await redis.client.json.get(player);
        this.playerEmit('resPlayerData', playerData, iBoardId, playerData.iUserId);
      }
    } catch (error) {
      console.log(`Error in setAssignBetTimeout: ${error}`);
    }
  }

  async InAssignGamePlayTimeout(iBoardId, callback) {
    try {
      const board = await redis.client.json.get(`${iBoardId}:aviatorBoard`);
      if (!board) return console.log('board not found');

      await redis.client.json.set(`${iBoardId}:aviatorBoard`, '$.eState', 'waiting');
      await redis.client.json.set(`${iBoardId}:aviatorBoard`, '$.nMultiplyMoneyValue', 0);
      await redis.client.json.set(`${iBoardId}:aviatorBoard`, '$.nAdminProfit', 0);

      const participants = await redis.client.keys(`${iBoardId}:*:player`);
      for (const participant of participants) {
        const player = await redis.client.json.get(participant);
        if (!player) {
          console.error(`Participant data not found or is not a JSON object for key: ${participant}`);
          continue;
        }

        if (!player.bIsCashOut && +player.nBetAmount != 0) {
          const user = await User.findByIdAndUpdate(player.iUserId, { $inc: { nChips: +player.nBetAmount * +board.nMultiplyMoneyValue } }, { new: true });
          this.playerEmit('resPlayerData', { nChips: user.nChips }, iBoardId, player.iUserId);
        }

        if (player.bPlacedBetNextRound) {
          await redis.client.json.set(participant, '$.eState', 'playing');
        } else {
          await redis.client.json.set(participant, '$.eState', 'waiting');
          await redis.client.json.set(participant, '$.nBetAmount', 0);
        }
        await redis.client.json.set(participant, '$.cashOutAt', 0);
        await redis.client.json.set(participant, '$.bPlacedBetNextRound', false);
        await redis.client.json.set(participant, '$.bIsCashOut', false);
      }

      await redis.client.pSetEx(_.getSchedulerKey('assignBetTimeout', iBoardId, ''), 1000 * 15, 'assignBetTimeout');
      this.boardEmit('assignBetTimeout', { timeoutDuration: 15 }, iBoardId);
    } catch (error) {
      console.log(`Error in setAssignGamePlayTimeout: ${error}`);
    }
  }

  calculateGamePlayTime(nMultiplier) {
    const a = 7.6;
    const b = 0.65;
    const c = 0.6;

    return Math.floor(a * Math.pow(nMultiplier, b) + c) * 1000;
  }

  async playerEmit(sEventName, oData, iBoardId, iUserId) {
    const board = await redis.client.json.get(`${iBoardId}:aviatorBoard`);
    if (!board) return false;
    if (global.io.to(board?.oSocketId[iUserId])) global.io.to(board?.oSocketId[iUserId]).emit(iBoardId, { sEventName, oData });
  }

  async boardEmit(sEventName, oData, iBoardId) {
    const board = await redis.client.json.get(`${iBoardId}:aviatorBoard`);
    if (!board) return false;
    Object.values(board?.oSocketId).forEach(sRootSocket => {
      if (sRootSocket) global.io.to(sRootSocket).emit(iBoardId, { sEventName, oData });
    });
  }
}

module.exports = new BoardManager();
