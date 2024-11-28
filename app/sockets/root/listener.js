const { User } = require('../../models');
const { redis, redlock } = require('../../utils');

class PlayerListener {
  constructor(iBoardId, iUserId) {
    this.iBoardId = iBoardId;
    this.iUserId = iUserId;
  }

  logError(error, callback) {
    console.log('error in logError', error);
    return callback(error);
  }

  onEvent(oDataa, callback = () => {}) {
    const { sEventName, oData } = typeof oDataa === 'string' ? JSON.parse(oDataa) : oDataa;
    log.cyan('## sEventName in onEvent :: ', sEventName, '::', oData, '::', this.iBoardId);
    switch (sEventName) {
      case 'reqBet':
        this.bet(oData, callback);
        break;
      case 'reqCashOut':
        this.cashOut(oData, callback);
        break;
      case 'reqLeave':
        this.leave(oData, callback);
        break;
      case 'reqCrashAviator':
        this.crashAviators(oData, callback);
        break;
      default:
        log.red('unknown event', sEventName);
        break;
    }
  }

  async setPlayerData(path, value) {
    try {
      await redis.client.json.set(`${this.iBoardId}:${this.iUserId}:player`, path, value);
    } catch (error) {
      console.error(`Error setting player data for ${this.iBoardId}:${this.iUserId}:player at ${path}:`, error);
    }
  }

  async bet(oData, callback) {
    try {
      const { nBetAmount } = oData;
      const board = await redis.client.json.get(`${this.iBoardId}:aviatorBoard`);
      if (!board) return this.logError(messages.not_found('board'), callback);

      const participantData = await redis.client.json.get(`${this.iBoardId}:${this.iUserId}:player`);
      if (!participantData) return this.logError(messages.not_found('participant'), callback);

      if (participantData.nBetAmount) {
        return this.logError(messages.custom.bet_already_placed, callback);
      }

      const isAssignBetTimeoutExists = await redis.client.get(_.getSchedulerKey('assignBetTimeout', this.iBoardId, ''));
      let bPlacedBetNextRound = false;
      if (board.eState === 'playing' && !isAssignBetTimeoutExists) {
        bPlacedBetNextRound = true;
        await this.setPlayerData('$.bPlacedBetNextRound', true);
        callback({ message: 'Placed bet to next round' });
      }

      if (!bPlacedBetNextRound) {
        await this.setPlayerData('$.eState', 'playing');
      }
      await this.setPlayerData('$.nBetAmount', nBetAmount);

      const user = await User.findOne({ _id: this.iUserId }, { nChips: 1 });
      if (!user) return this.logError(messages.not_found('user'), callback);
      if (user.nChips < nBetAmount) return this.logError(messages.custom.insufficient_balance, callback);
      user.nChips -= nBetAmount;
      await user.save();

      callback({ message: messages.success(`Bet amount set to ${nBetAmount}`) });
      this.boardEmit('resBet', { iUserId: this.iUserId, nBetAmount, eState: bPlacedBetNextRound ? 'waiting' : 'playing' }, this.iBoardId);
      if (!bPlacedBetNextRound) await redis.client.json.set(`${this.iBoardId}:aviatorBoard`, '$.nAdminProfit', board.nAdminProfit + nBetAmount);
    } catch (error) {
      return this.logError(error, callback);
    }
  }

  async cashOut(oData, callback) {
    try {
      const { nCashOutAtValue } = oData;

      const isAssignBetTimeoutExists = await redis.client.get(_.getSchedulerKey('assignBetTimeout', this.iBoardId, ''));
      if (isAssignBetTimeoutExists) {
        return this.logError(messages.custom.cannot_cash_out_now, callback);
      }

      const board = await redis.client.json.get(`${this.iBoardId}:aviatorBoard`);
      if (!board) return this.logError(messages.not_found('board'), callback);

      if (board.nMultiplyMoneyValue < nCashOutAtValue) {
        return this.logError(messages.custom.cash_out_at_value_greater_than_multiplier, callback);
      }

      const participantData = await redis.client.json.get(`${this.iBoardId}:${this.iUserId}:player`);
      if (!participantData) return this.logError(messages.not_found('participant'), callback);

      if (board.eState === 'playing' && participantData.eState !== 'playing') {
        return this.logError(messages.custom.player_not_in_playing_state, callback);
      }

      if (participantData.nBetAmount === 0) {
        return this.logError(messages.custom.bet_not_placed, callback);
      }

      if (participantData.cashOutAt) {
        return this.logError(messages.custom.cash_out_already_placed, callback);
      }

      await this.setPlayerData('$.eState', 'waiting');
      await this.setPlayerData('$.cashOutAt', nCashOutAtValue);

      const _lock = await redlock.lock.acquire([`lock:${this.iBoardId}:aviatorBoard`], 1000);

      await redis.client.json.set(`${this.iBoardId}:aviatorBoard`, '$.nAdminProfit', board.nAdminProfit - participantData.nBetAmount * nCashOutAtValue);
      await User.updateOne({ _id: this.iUserId }, { $inc: { nChips: +participantData.nBetAmount * nCashOutAtValue } });
      await redis.client.json.set(`${this.iBoardId}:${this.iUserId}:player`, '$.bIsCashOut', true);
      this.playerEmit('resCashOut', { iUserId: this.iUserId, nCashOutAtValue }, this.iBoardId, this.iUserId);
      this.boardEmit('resCashOut', { iUserId: this.iUserId, nCashOutAtValue }, this.iBoardId);

      // check if total cash out amount is greater than 90% of admin profit
      const participants = await redis.client.keys(`${this.iBoardId}:*:player`);
      let nTotalCashOutAmount = 0;
      const participantPromises = participants.map(async participant => {
        const participantData = await redis.client.json.get(participant);
        if (participantData.cashOutAt) {
          nTotalCashOutAmount += participantData.cashOutAt * participantData.nBetAmount;
        }
      });
      await Promise.all(participantPromises);

      const bIsEveryOneCashOut = participants.every(participant => redis.client.json.get(participant).cashOutAt);
      if (bIsEveryOneCashOut) {
        const nNewMultiplier = +(nCashOutAtValue + Math.random() * (500 - nCashOutAtValue) + nCashOutAtValue).toFixed(1);
        await redis.client.json.set(`${this.iBoardId}:aviatorBoard`, '$.nMultiplyMoneyValue', nNewMultiplier);
        const nGamePlayTime = this.calculateGamePlayTime(nNewMultiplier);
        this.boardEmit('resCrashAviatorValue', { nMultiplyMoneyValue: nNewMultiplier, nGamePlayTime }, this.iBoardId);
        await redis.client.pSetEx(_.getSchedulerKey('assignGamePlayTimeout', this.iBoardId, ''), nGamePlayTime, 'assignGamePlayTimeout');
      }

      if (nTotalCashOutAmount >= board.nAdminProfit * 0.9) {
        // const nNewMultiplier = +(nCashOutAtValue + Math.random() * 0.5 + 0.5).toFixed(1);
        this.boardEmit('resCrashAviator', { nMultiplyMoneyValue: 1.0, nGamePlayTime: 0 }, this.iBoardId);
        // await redis.client.json.set(`${this.iBoardId}:aviatorBoard`, '$.nMultiplyMoneyValue', nNewMultiplier);
        await redis.client.del(_.getSchedulerKey('assignGamePlayTimeout', this.iBoardId, ''));

        await redis.client.json.set(`${this.iBoardId}:aviatorBoard`, '$.eState', 'waiting');
        await redis.client.json.set(`${this.iBoardId}:aviatorBoard`, '$.nMultiplyMoneyValue', 0);

        const resetPromises = participants.map(async participant => {
          const player = await redis.client.json.get(participant);
          if (!player) {
            console.error(`Participant data not found or is not a JSON object for key: ${participant}`);
            return;
          }

          if (!player.bIsCashOut && +player.nBetAmount != 0) {
            await User.updateOne({ _id: player.iUserId }, { $inc: { nChips: +player.nBetAmount * nCashOutAtValue } });
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
        });
        await Promise.all(resetPromises);

        await redis.client.json.set(`${this.iBoardId}:aviatorBoard`, '$.nAdminProfit', 0);

        await redis.client.pSetEx(_.getSchedulerKey('assignBetTimeout', this.iBoardId, ''), 1000 * 15, 'assignBetTimeout');
        this.boardEmit('assignBetTimeout', { timeoutDuration: 15 }, this.iBoardId);
      }
      await _lock.release();
    } catch (error) {
      console.error('Error during cashOut:', error);
      return this.logError(error, callback);
    }
  }

  /*
  async crashAviators(oData, callback) {
    try {
      const { nCrashMultiplier } = oData;
      const board = await redis.client.json.get(`${this.iBoardId}:aviatorBoard`);
      if (!board) return this.logError(messages.not_found('board'), callback);

      if (board.nMultiplyMoneyValue < nCrashMultiplier) {
        return this.logError(messages.invalid_req('crash multiplier'), callback);
      }

      // await redis.client.del(_.getSchedulerKey('assignGamePlayTimeout', this.iBoardId, ''));
      this.boardEmit('resCrashAviator', { nMultiplyMoneyValue: nCrashMultiplier }, this.iBoardId);
      await redis.client.json.set(`${this.iBoardId}:aviatorBoard`, '$.eState', 'waiting');
      await redis.client.json.set(`${this.iBoardId}:aviatorBoard`, '$.nMultiplyMoneyValue', 0);
      await redis.client.json.set(`${this.iBoardId}:aviatorBoard`, '$.nAdminProfit', 0);

      const participants = await redis.client.keys(`${this.iBoardId}:*:player`);
      for (const participant of participants) {
        const player = await redis.client.json.get(participant);
        if (!player) {
          console.error(`Participant data not found or is not a JSON object for key: ${participant}`);
          continue;
        }

        if (!player.bIsCashOut && +player.nBetAmount != 0) {
          await User.updateOne({ _id: player.iUserId }, { $inc: { nChips: +player.nBetAmount * nCrashMultiplier } });
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

      await redis.client.pSetEx(_.getSchedulerKey('assignBetTimeout', this.iBoardId, ''), 1000 * 15, 'assignBetTimeout');
      this.boardEmit('assignBetTimeout', { timeoutDuration: 15 }, this.iBoardId);
    } catch (error) {
      return this.logError(error, callback);
    }
  }
  */

  async leave(oData, callback) {
    try {
      await redis.client.json.del(`${this.iBoardId}:${this.iUserId}:player`);
      await redis.client.json.del(`${this.iBoardId}:aviatorBoard`, `$.oSocketId.${this.iUserId}`);

      callback({ message: messages.success(`User ${this.iUserId} left the game`) });
    } catch (error) {
      return this.logError(error, callback);
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
module.exports = PlayerListener;
