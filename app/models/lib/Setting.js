const mongoose = require('mongoose');

const Setting = new mongoose.Schema({
  aAvatar: [],
  aVersion: [],
  oServerInfo: {},
  aPrivateTableRange: [
    {
      _id: false,
      nTablePoint: Number,
      nRackPercentage: Number,
    },
  ],
  aCashPack: [Number],
  aReportDropDown: [], // will be static for now
  ePrivateTableEnabled: {
    type: String,
    enum: ['y', 'n'],
    default: 'y',
  },
  nDefaultChips: { type: Number, default: 5000 },
  nMaxBot: { type: Number, default: 1 },
  nReferralBonus: { type: Number, default: 0 },
  nWelcomeBonus: { type: Number, default: 0 },
  nPrivateTableRack: { type: Number, default: 0 },
  oPurchaseRange: {
    nMinimum: { type: Number, default: 10 },
    nMaximum: { type: Number, default: 20000 },
  },
  oMaintenance: {
    eMode: { type: String },
    dStartAt: { type: Date },
    dEndAt: { type: Date },
  },
  oWithdrawRange: {
    nMinimum: { type: Number, default: 100 },
    nMaximum: { type: Number, default: 5000 },
  },
  oTax: {
    nDeduction: { type: Number, default: 30 },
    nOffset: { type: Number, default: 10000 },
  },
});

module.exports = mongoose.model('setting', Setting);
