const mongoose = require('mongoose');

const Transaction = new mongoose.Schema(
  {
    iUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    iProductId: { type: mongoose.Schema.Types.ObjectId },
    sPurchaseToken: { type: String },
    nPreviousChips: { type: Number },
    nNewChips: { type: Number },
    nAmount: { type: Number, default: 0 },
    eStatus: {
      type: String,
      enum: ['Pending', 'Success', 'Failed'],
      default: 'Pending',
    },
    dExecuteDate: { type: Date, default: Date.now },
    eProductRewardType: { type: String },
    ePlatform: { type: String, enum: ['Android', 'iOS'] },
    sIP: { type: String },
    orderId: { type: String },
    sRemarks: { type: String },
    // Keeping some fields from the original model for backward compatibility
    iDoneBy: mongoose.Schema.Types.ObjectId,
    sDescription: String,
    eType: {
      type: String,
      enum: ['debit', 'credit', 'failed'],
      default: 'credit',
    },
    eMode: {
      type: String,
      enum: ['admin', 'razorpay', 'user', 'game', 'IAP'],
      default: 'game',
    },
  },
  { timestamps: { createdAt: 'dCreatedDate', updatedAt: 'dUpdatedDate' } }
);

Transaction.index({ iUserId: 1, dCreatedDate: 1 });

module.exports = mongoose.model('transaction', Transaction);
