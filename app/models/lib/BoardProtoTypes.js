const mongoose = require('mongoose');

const BoardProtoType = new mongoose.Schema(
  {
    nBoardFee: Number,
    sName: String,
    nMaxPlayer: {
      type: Number,
      enum: [2, 3, 4],
      default: 2,
    },
    nTurnTime: Number,
    nGameTime: { type: Number, default: 0 },
    aWinningAmount: [Number],
    eOpponent: {
      type: String,
      enum: ['bot', 'user', 'any'],
      default: 'any',
    },
    eBoardType: {
      type: String,
      enum: ['private', 'cash'],
      default: 'cash',
    },
    eGameType: {
      type: String,
      enum: ['classic', 'rush', 'oneToken', 'twoToken', 'threeToken', 'quick', 'popular'],
      default: 'classic',
    },
    eStatus: {
      type: String,
      enum: ['y', 'd'],
      default: 'y',
    },
  },
  { timestamps: { createdAt: 'dCreatedDate', updatedAt: 'dUpdatedDate' } }
);
BoardProtoType.index({ nBoardFee: 1, eGameType: 1, eStatus: 1 });

module.exports = mongoose.model('board_proto_type', BoardProtoType);
