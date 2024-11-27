const { User, OperationLog, KYC } = require('../../../../models');
const { OAuth2Client } = require('google-auth-library');
const { fakeUser, firebase } = require('../../../../utils');
const axios = require('axios');

const controllers = {};

controllers.login = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sMobile', 'iReferredBy']);
    let socialDetails = {};

    if (!body.sMobile) return res.reply(messages.required_field('mobile number'));
    if (_.validateMobile(body.sMobile)) return res.reply(messages.not_valid('Mobile number is'));

    const query = { sMobile: body.sMobile, eStatus: { $ne: 'd' } };
    const project = {
      _id: true,
      isMobileVerified: true,
      eStatus: true,
      sToken: true,
      eUserType: true,
      sMobile: true,
      sDeviceId: true,
      sEmail: true,
    };

    let user = await User.findOne(query, project);
    if (req.headers.socialtoken) {
      const decodedSocialToken = _.verifyToken(req.headers.socialtoken);
      if (!decodedSocialToken) return res.reply(messages.unauthorized());
      if (decodedSocialToken.sGoogleId) {
        socialDetails.sUserName = decodedSocialToken.sUserName;
        socialDetails.sEmail = decodedSocialToken.sEmail;
        socialDetails.sGoogleId = decodedSocialToken.sGoogleId;
        socialDetails.eLoginType = decodedSocialToken.eLoginType;
        // socialDetails.sProfilePic = decodedSocialToken.sProfilePic;
        socialDetails.sCurrentAvatar = decodedSocialToken.sCurrentAvatar;
        socialDetails.eUserType = decodedSocialToken.eUserType;
        socialDetails.sDeviceId = decodedSocialToken.sDeviceId;
      }
      const userExists = await User.findOne({ sMobile: body.sMobile, sEmail: { $ne: '' } });
      if (userExists) return res.reply(messages.custom.already_exists_mobile);
    }

    const deviceData = _.pick(req.body, ['oDeviceInfo']);
    try {
      deviceData.oDeviceInfo = JSON.parse(deviceData.oDeviceInfo);
    } catch (e) {
      deviceData.oDeviceInfo = {};
    }
    if (!user) {
      const avatar = [
        { nIndex: 1, unlocked: true, price: 500 },
        { nIndex: 2, unlocked: true, price: 600 },
        { nIndex: 3, unlocked: true, price: 700 },
        { nIndex: 4, unlocked: true, price: 750 },
        { nIndex: 5, unlocked: false, price: 800 },
        { nIndex: 6, unlocked: false, price: 850 },
        { nIndex: 7, unlocked: false, price: 900 },
        { nIndex: 8, unlocked: false, price: 950 },
        { nIndex: 9, unlocked: false, price: 1000 },
      ];

      let newUser = {
        sMobile: body.sMobile,
        eUserType: socialDetails.eUserType,
        nOTP: process.env.NODE_ENV !== 'prod' ? 1234 : _.salt(4),
        sUserName: fakeUser.getRandomUserName(),
        // sProfilePic: `profile/${_.randomFromArray([1, 2, 3, 4, 5, 6])}.png`,
        sCurrentAvatar: 'https://date-ludo-assets-stag.s3.ap-south-1.amazonaws.com/profile/1.png',
        aAvatar: avatar,
        nCurrentAvatarIndex: 1,
        isNewUser: true,
      };

      if (req.headers.socialtoken) {
        // newUser.sEmail = socialDetails.sEmail;
        newUser.eLoginType = socialDetails.eLoginType;
        newUser.sGoogleId = socialDetails.sGoogleId;
        newUser.sUserName = socialDetails.sUserName;
      }

      newUser.sVerificationToken = _.encodeToken(
        { nOTP: newUser.nOTP, sMobile: newUser.sMobile, sDeviceId: deviceData.oDeviceInfo.sDeviceId, sEmail: socialDetails.sEmail },
        { expiresIn: '1m' }
      );

      newUser.sDeviceId = deviceData.oDeviceInfo.sDeviceId;

      // newUser.sReferralCode = _.sortid();
      const _user = new User(newUser);
      await _user.save();

      // await textGuru.sendOTP(_user.sMobile, _user.nOTP);

      // await OperationLog.create({
      //   iUserId: _user._id,
      //   sOperation: 'register',
      //   sRemoteAddress: req.sRemoteAddress,
      //   oDeviceInfo: deviceData.oDeviceInfo,
      // });
      return res.reply(
        messages.custom.login_otp_success,
        { nExpiresIn: 3 * 60 * 1000, sMobile: newUser.sMobile, nOTP: newUser.nOTP },
        { verification: newUser.sVerificationToken, nExpiresIn: 1 * 60 * 1000, sMessage: 'Otp has been sent successfully' }
      );
    }
    //if (req.headers.socialtoken && user?.sEmail.length) return res.reply(messages.custom.already_exists_mobile);

    // if (!user?.sEmail !== '') return res.reply(messages.custom.already_exists_mobile);
    // if (!user?.sMobile) return res.reply(messages.already_exists('Mobile'));
    if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);
    user.nOTP = process.env.NODE_ENV !== 'prod' ? 1234 : _.salt(4);

    user.sVerificationToken = _.encodeToken(
      { nOTP: user.nOTP, sMobile: user.sMobile, sDeviceId: deviceData.oDeviceInfo.sDeviceId, sEmail: socialDetails.sEmail },
      { expiresIn: '1m' }
    );
    user.sDeviceId = deviceData.oDeviceInfo.sDeviceId;
    user.eLoginType = 'M';
    if (req.headers.socialtoken) {
      if (socialDetails.sGoogleId) {
        // user.sEmail = socialDetails.sEmail;
        user.sUserName = socialDetails.sUserName;
        user.sGoogleId = socialDetails.sGoogleId;
        user.eLoginType = 'G';
      }
      // user.sProfilePic = socialDetails.sProfilePic;
    }
    await user.save();
    //await msg91.sendOTP(msg91.loggingNewDevice, { sMobile: user.sMobile, nOTP: user.nOTP });
    // await textGuru.sendOTP(user.sMobile, user.nOTP);
    // await OperationLog.create({
    //   iUserId: user._id,
    //   sOperation: 'simpleLogin',
    //   sRemoteAddress: req.sRemoteAddress,
    //   oDeviceInfo: deviceData.oDeviceInfo,
    // });
    return res.reply(
      messages.custom.login_otp_success,
      { nExpiresIn: 3 * 60 * 1000, sMobile: user.sMobile, nOTP: body.nOTP },
      { verification: user.sVerificationToken, nExpiresIn: 1 * 60 * 1000, sMessage: 'Otp has been sent successfully' }
    );
  } catch (error) {
    console.log('Very Bad 🚀 ~ file: controllers.js:135 ~ controllers.login= ~ error:', error);
    return res.reply(messages.server_error(), error);
  }
};
controllers.verifyOtp = async (req, res) => {
  try {
    const body = _.pick(req.body, ['code', 'sMobile', 'sPushToken']);
    const token = req.header('verification');
    if (!token) return res.reply(messages.unauthorized());

    const decodedToken = _.verifyToken(token);
    if (!decodedToken || decodedToken === 'jwt expired') return res.reply(messages.expired('OTP'));

    if (Number(body.code) !== decodedToken.nOTP) return res.reply(messages.wrong_otp());
    const query = { sMobile: decodedToken.sMobile, eUserType: 'user', eStatus: { $ne: 'd' } };
    const project = {
      _id: true,
      nOTP: true,
      sMobile: true,
      eStatus: true,
      sVerificationToken: true,
      isMobileVerified: true,
      sToken: true,
      sUserName: true,
      sDeviceId: true,
      sPushToken: true,
      aLudoBoard: true,
    };

    const deviceData = _.pick(req.body, ['oDeviceInfo']);
    try {
      deviceData.oDeviceInfo = JSON.parse(deviceData.oDeviceInfo);
    } catch (e) {
      deviceData.oDeviceInfo = {};
    }

    const user = await User.findOne(query, project);
    if (!user) return res.reply(messages.custom.user_not_found);
    if (user.nOTP !== decodedToken.nOTP) return res.reply(messages.wrong_otp());
    if (user.sVerificationToken !== token) return res.reply(messages.unauthorized());
    if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);
    if (user.sPushToken !== body.sPushToken) user.sPushToken = body.sPushToken;
    if (user.aLudoBoard.length) {
      emitter.emit('reqLeave', { sEventName: 'reqLeave', iBoardId: user.aLudoBoard[0].toString(), iUserId: user._id.toString() });
    }

    //await msg91.verifyOTP(msg91.verification, { sMobile: user.sMobile, nOTP: body.code });
    //await textGuru.sendOTP(user.sMobile, body.code);

    user.isMobileVerified = true;

    // user.sMobile = body.sMobile;
    user.sDeviceId = deviceData.oDeviceInfo.sDeviceId; // Used for login sDeviceId manage
    user.sToken = _.encodeToken({
      _id: user._id.toString(),
      eUserType: user.eUserType,
      sDeviceId: user.sDeviceId,
    });
    user.sVerificationToken = '';
    if (decodedToken?.sEmail) {
      log.green('decodedToken.sEmail:', decodedToken.sEmail);
      user.sEmail = decodedToken?.sEmail;
    }

    await user.save();
    return res.reply(messages.success('Login'), {}, { authorization: user.sToken });
  } catch (error) {
    console.log('Very Bad 🚀 ~ file: controllers.js:113::::', error);
    return res.reply(messages.server_error(), error);
  }
};
controllers.resendOtp = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sMobile']);
    const query = { sMobile: body.sMobile, eStatus: { $ne: 'd' } };
    if (!body.sMobile) return res.reply(messages.required_field('sMobile'));
    // if (!body.sUpdatedMobile) return res.reply(messages.required_field('sUpdatedMobile'));

    if (_.validateMobile(body.sMobile)) return res.reply(messages.not_valid('sMobile'));
    // if (_.validateMobile(body.sUpdatedMobile)) return res.reply(messages.not_valid('sMobile'));

    const user = await User.findOne(query);
    if (!user) return res.reply(messages.not_found('Account'));
    if (user.eStatus === 'n') return res.reply(messages.custom.user_blocked);
    if (user.eStatus === 'd') return res.reply(messages.custom.user_deleted);
    // body.nOTP = process.env.NODE_ENV === 'dev' ? _.salt(4) : 1234;
    body.nOTP = process.env.NODE_ENV !== 'prod' ? 1234 : _.salt(4);

    body.sVerificationToken = _.encodeToken({ nOTP: body.nOTP, sMobile: user.sMobile }, { expiresIn: '3m' });
    user.nOTP = body.nOTP;
    user.sVerificationToken = body.sVerificationToken;

    //msg91.sendOTP(msg91.verification, { sMobile: body.sUpdatedMobile, nOTP: body.nOTP }, _.errorCallback);
    // await textGuru.sendOTP(user.sMobile, user.nOTP);
    await user.save();

    // return res.reply(messages.custom.login_otp_success, { nExpiresIn: 3 * 60 * 1000 }, { verification: body.sVerificationToken, nExpiresIn: 3 * 60 * 1000 });

    return res.reply(
      messages.custom.login_otp_success,
      { nExpiresIn: 3 * 60 * 1000, sMobile: user.sMobile, nOTP: user.nOTP },
      { verification: user.sVerificationToken, nExpiresIn: 1 * 60 * 1000, sMessage: 'Otp has been sent successfully' }
    );
  } catch (error) {
    log.red('Very Bad 🚀 ~ file: controllers.js:138 ~ controllers.resendOtp= ~ error:', error);
    return res.reply(messages.server_error(), error);
  }
};
controllers.refreshToken = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id });
    user.sToken = _.encodeToken({ _id: user._id.toString(), eUserType: user.eUserType });
    await user.save();
    return res.reply(messages.success('Login'), {}, { authorization: user.sToken });
  } catch (error) {
    res.reply(messages.server_error(), error);
  }
};
controllers.autoLoginUsers = async (req, res) => {
  try {
    const users = await User.find({ sToken: { $exists: false } }, { eUserType: true });
    for (const user of users) {
      user.sToken = _.encodeToken({ _id: user._id.toString(), eUserType: user.eUserType });
      await user.save();
    }
    return res.reply(messages.success('Auto Login'), {});
  } catch (error) {
    res.reply(messages.server_error(), error);
  }
};
controllers.guestLogin = async (req, res) => {
  try {
    const body = _.pick(req.body, ['sDeviceId', 'sPushToken']);

    if (!body.sDeviceId) return res.reply(messages.required_field('Device Id'));
    const user = await User.findOne({ sDeviceId: body.sDeviceId }).lean();
    const avatar = [
      { nIndex: 1, unlocked: true, price: 500 },
      { nIndex: 2, unlocked: true, price: 600 },
      { nIndex: 3, unlocked: true, price: 700 },
      { nIndex: 4, unlocked: true, price: 750 },
      { nIndex: 5, unlocked: false, price: 800 },
      { nIndex: 6, unlocked: false, price: 850 },
      { nIndex: 7, unlocked: false, price: 900 },
      { nIndex: 8, unlocked: false, price: 950 },
      { nIndex: 9, unlocked: false, price: 1000 },
    ];
    let newUser;
    if (!user) {
      let createUser = fakeUser.getRandomPlayer();
      createUser.sDeviceId = body.sDeviceId;
      createUser.sPushToken = body.sPushToken;
      newUser = await User.create(createUser);
      newUser.sToken = _.encodeToken({ _id: newUser._id });
      newUser.eUserType = 'user';
      newUser.sCurrentAvatar = 'https://date-ludo-assets-stag.s3.ap-south-1.amazonaws.com/profile/1.png';
      newUser.aAvatar = avatar;
      newUser.nCurrentAvatarIndex = 1;
      await newUser.save();
      newUser = { sToken: newUser.sToken };
    }
    req.user = !user ? newUser : user;

    return res.reply(messages.success(), req.user, { authorization: req.user.sToken });
  } catch (error) {
    return res.reply(messages.server_error(), error);
  }
};
controllers.socialLogin = async (req, res) => {
  try {
    const body = _.pick(req.body, ['idToken', 'sPushToken']);
    if (!body.idToken) return res.reply(messages.required_field('Social Token'));

    const deviceData = _.pick(req.body, ['oDeviceInfo']);
    // log.green('Very Bad 🚀 ~ file: controllers.js:44 ~ controllers.login= ~ deviceData:', deviceData);
    try {
      deviceData.oDeviceInfo = JSON.parse(deviceData.oDeviceInfo);
    } catch (e) {
      deviceData.oDeviceInfo = {};
    }

    const oAuth2Client = new OAuth2Client(process.env.GOOGLE_AUTH_CLIENT, process.env.GOOGLE_AUTH_SECRET);
    const verifyGoogleToken = await oAuth2Client.verifyIdToken({
      idToken: body.idToken,
      audience: process.env.GOOGLE_AUTH_CLIENT,
    });
    const googleData = verifyGoogleToken.getPayload();

    // const googleRes = await (await request(`https://oauth2.googleapis.com/tokeninfo?id_token=${body.idToken}`)).body.json();
    const googleRes = await axios
      .get(`https://oauth2.googleapis.com/tokeninfo?id_token=${body.idToken}`)
      .then(response => response.data)
      .catch(error => {
        console.error('Error fetching token info:', error);
        throw error;
      });
    // log.green("🚀 ~ file: controllers.js:344 ~ controllers.socialLogin= ~ googleRes:", googleRes)
    const avatar = [
      { nIndex: 1, unlocked: true, price: 500 },
      { nIndex: 2, unlocked: true, price: 600 },
      { nIndex: 3, unlocked: true, price: 700 },
      { nIndex: 4, unlocked: true, price: 750 },
      { nIndex: 5, unlocked: false, price: 800 },
      { nIndex: 6, unlocked: false, price: 850 },
      { nIndex: 7, unlocked: false, price: 900 },
      { nIndex: 8, unlocked: false, price: 950 },
      { nIndex: 9, unlocked: false, price: 1000 },
    ];
    if (googleData?.sub !== googleRes.sub || googleRes.email !== googleData?.email) return res.reply(messages.unauthorized());
    let socialData = {
      sUserName: googleData?.name,
      sEmail: googleData?.email,
      sGoogleId: googleData?.sub,
      eLoginType: 'G',
      sPushToken: body.sPushToken,
      sCurrentAvatar: googleData?.picture,
      // sProfilePic: , // googleData?.picture, //TODO:ADD image and username
    };

    const query = {
      sEmail: socialData.sEmail,
      eUserType: 'user',
      eStatus: 'y',
      // eLoginType: 'G',
      // $or: [{ sGoogleId: socialData.sGoogleId }, { sEmail: socialData.sEmail }],
    };

    const project = {
      _id: true,
      sEmail: true,
      sMobile: true,
      isMobileVerified: true,
      eStatus: true,
      sToken: true,
      eUserType: true,
      eLoginType: true,
    };

    let user = await User.findOne(query, project);
    if (!user) {
      const userData = {
        ...socialData,
        eUserType: 'user',
        sDeviceId: deviceData.oDeviceInfo.sDeviceId,
        sPushToken: body.sPushToken,
        // sProfilePic: `profile/avatar-${_.randomFromArray([1, 2, 3, 4, 5, 6])}.png`,
        sCurrentAvatar: 'https://date-ludo-assets-stag.s3.ap-south-1.amazonaws.com/profile/1.png',
        aAvatar: avatar,
        nCurrentAvatarIndex: 1,
        isEmailVerified: true,
        isMobileVerified: true,
      };

      user = new User(userData);

      user.sToken = _.encodeToken({
        _id: user._id.toString(),
        eUserType: user.eUserType,
        sDeviceId: user.sDeviceId,
      });
      await user.save();
      return res.reply(messages.successfully('Login'), { authorization: user.sToken }, { authorization: user.sToken });
    } else {
      if (user.eStatus === 'n') return res.reply(messages.user_blocked());
      if (user.eStatus === 'd') return res.reply(messages.user_deleted());

      user.eLoginType = 'G';
      user.sDeviceId = deviceData.oDeviceInfo.sDeviceId;
      user.sPushToken = body.sPushToken;
      //user.sUserName = socialData.sUserName;
      // user.sProfilePic = socialData.sProfilePic; //TODO:ADD image and username
      user.sToken = _.encodeToken({
        _id: user._id.toString(),
        eUserType: user.eUserType,
        sDeviceId: user.sDeviceId,
      });
      await user.save();
      return res.reply(messages.successfully('Login'), { authorization: user.sToken, isEmailVerified: true }, { authorization: user.sToken, isEmailVerified: true });
    }

    /*
    const query = {
      sEmail: socialData.sEmail,
      eUserType: 'user',
      eStatus: 'y',
      // eLoginType: 'G',
      // $or: [{ sGoogleId: socialData.sGoogleId }, { sEmail: socialData.sEmail }],
    };

    const project = {
      _id: true,
      sEmail: true,
      sMobile: true,
      isMobileVerified: true,
      eStatus: true,
      sToken: true,
      eUserType: true,
      eLoginType: true,
    };

    let user = await User.findOne(query, project);
    if (!user) {
      let sToken = _.encodeToken({
        ...socialData,
        eUserType: 'user',
        sDeviceId: deviceData.oDeviceInfo.sDeviceId,
        // sProfilePic: `profile/avatar-${_.randomFromArray([1, 2, 3, 4, 5, 6])}.png`,
        sCurrentAvatar:'https://date-ludo-assets-stag.s3.ap-south-1.amazonaws.com/profile/1.png',
        aAvatar: avatar,
        nCurrentAvatarIndex:1,
      });
      return res.reply(
        messages.no_prefix('Please verify Your Mobile Number'),
        { authorization: sToken, isMobileVerified: false },
        { authorization: sToken, isMobileVerified: false }
      );
    } else {
      if (user.eStatus === 'n') return res.reply(messages.user_blocked());
      if (user.eStatus === 'd') return res.reply(messages.user_deleted());

      user.eLoginType = 'G';
      user.sDeviceId = deviceData.oDeviceInfo.sDeviceId;
      //user.sUserName = socialData.sUserName;
      // user.sProfilePic = socialData.sProfilePic; //TODO:ADD image and username
      user.sToken = _.encodeToken({
        _id: user._id.toString(),
        eUserType: user.eUserType,
        sDeviceId: user.sDeviceId,
      });
      await user.save();
      return res.reply(messages.successfully('Login'), { authorization: user.sToken, isMobileVerified: true }, { authorization: user.sToken, isMobileVerified: true });
    }
    */
  } catch (error) {
    log.red(error);
    return res.reply(messages.server_error(), error);
  }
};

controllers.firebaseNotifyTest = async (req, res) => {
  try {
    await firebase.notify(req.body, (error, response) => {
      if (error) return res.reply(messages.server_error('Firebase Notify Callback'), error);
      return res.reply(messages.success(), response);
    });
  } catch (error) {
    console.log('🚀 :: awaitfirebase.notify :: error:', error);
    return res.reply(messages.server_error('Firebase Notify API'), error);
  }
};

module.exports = controllers;
