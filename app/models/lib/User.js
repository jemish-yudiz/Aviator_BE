const mongoose = require('mongoose');

const User = new mongoose.Schema(
  {
    aLudoBoard: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    sFullName: { type: String, default: '' },
    sUserName: { type: String, default: '' },
    sEmail: { type: String, default: '' },
    sMobile: { type: String, require: true },
    sDeviceId: { type: String, default: '' },
    sPassword: { type: String },
    eUserType: {
      type: String,
      enum: ['user', 'admin', 'bot'],
      default: 'user',
    },
    eLoginType: { type: String, enum: ['M', 'G', 'A', 'F'], default: 'M' },
    // sRootSocket: { type: String, default: '' },
    eStatus: {
      type: String,
      enum: ['y', 'n', 'd'],
      default: 'y',
    },
    sToken: String,
    nOTP: Number,
    sVerifyToken: String,
    nChips: { type: Number, default: 10000 },
    isEmailVerified: { type: Boolean, default: true },
    isMobileVerified: { type: Boolean, default: false },
    bVibrationEnabled: { type: Boolean, default: true },
    bSoundEnabled: { type: Boolean, default: true },
    bMusicEnabled: { type: Boolean, default: true },
    sVerificationToken: String,
    eGender: {
      type: String,
      enum: ['male', 'female', 'unspecified'],
      default: 'male',
    },
    sPushToken: { type: String },
    dDob: Date,
    nWithdrawable: Number,
    sGoogleId: String,
  },
  { timestamps: { createdAt: 'dCreatedDate', updatedAt: 'dUpdatedDate' } }
);

User.index([
  {
    key: { nBoardFee: 1 },
  },
  {
    key: { eGameType: 1 },
  },
  {
    key: { eStatus: 1 },
  },
]);

module.exports = mongoose.model('users', User);
