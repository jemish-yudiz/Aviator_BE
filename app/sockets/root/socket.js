const Player = require('./player');
const { redis } = require('../../utils');
const { User } = require('../../models');

class Socket {
  constructor() {}
  init() {
    // global.io.origins('*:*');
    // global.io.adapter(redis.getAdapter());
    this.setEventListeners();
  }
  setEventListeners() {
    global.io.use((socket, next) => this.middleware(socket, next));
    global.io.on('connection', socket => new Player(socket));
    global.io.on('error', error => log.console('error in socket :: ', error));
  }
  async middleware(socket, next) {
    const authorization = socket.handshake.headers.authorization ?? socket.handshake.auth.authorization ?? socket.handshake.query.authorization;
    // console.log('Very Bad 🚀 ~ file: socket.js:211111 ~ Socket ~ middleware ~ authorization:::', authorization);

    if (!authorization) return next(new Error(messages.unauthorized().message));

    const decodedToken = _.decodeToken(authorization);
    if (!decodedToken) return next(new Error(messages.unauthorized().message));

    const query = { _id: decodedToken._id };
    const project = {
      eUserType: true,
      eStatus: true,
      isMobileVerified: true,
      sRootSocket: true,
      sToken: true,
      sMobile: true,
      nChips: true,
      sCurrentAvatar: true,
      nCurrentAvatarIndex: true,
    };
    const user = await User.findOne(query, project);
    if (!user) return next(new Error(messages.unauthorized().message));
    if (user.eUserType !== 'ubot' && !user.isMobileVerified) return next(new Error(messages.unauthorized().message));
    if (user.eStatus === 'n') return next(new Error(messages.blocked('Account').message));
    if (user.eStatus === 'd') return next(new Error(messages.deleted('Account').message));
    if (user.sToken !== authorization) return next(new Error(messages.unauthorized().message));
    socket.user = { iUserId: user._id.toString() };
    await User.updateOne(query, { $set: { sRootSocket: socket.id } });
    if (process.env.NODE_ENV !== 'prod') log.green('Root connected', socket.user.iUserId, 'with ', socket.id);
    next();
  }
}

module.exports = new Socket();

// emitter.on('reqCreateTournamentChannel', tournament.init.bind(tournament));
