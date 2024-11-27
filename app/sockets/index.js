const socketIO = require('socket.io');
const root = require('./root/socket');

class Socket {
  constructor() {
    this.options = {
      pingInterval: 10000, // - default 25000
      pingTimeout: 8000, // - default 20000
      maxHttpBufferSize: 1e8, // - default - 1e5,  1e8 -> 1 MB
      allowUpgrades: true,
      perMessageDeflate: false,
      serveClient: true,
      cookie: false,
      // transports: ['websocket'],
      connectTimeout: 45000, // - ms to wait before rejecting handshake
      allowEIO3: true,
      cors: {
        origin: '*:*',
        methods: ['GET', 'POST'],
        credentials: false,
      },
    };
  }

  initialize(httpServer) {
    global.io = socketIO(httpServer, this.options);
    root.init();
  }
}

module.exports = new Socket();
// emitter.on('reqCreateTournamentChannel', tournament.init.bind(tournament));
