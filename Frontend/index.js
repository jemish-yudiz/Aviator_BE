class GameSocket {
  constructor() {
    this.socket = io('http://localhost:3040', {
      auth: {
        authorization: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzQ3MDk4OWM2MTYyYWM4NDQwNTRiOWEiLCJpYXQiOjE3MzI3MDg3NDV9.YvsQ1eV84jPuCTFYmnA691VVaUPSAK5L6o9_ghk9npM',
      },
    });
    this.iBoardId = '6744369aac1a00c98ab71c6e';
    this.iUserId = '';
    this.game = new AviatorGame();
    this.initializeEventListeners();
    this.currentMultiplier = 1.0;
  }

  initializeEventListeners() {
    this.setupButtonListeners();
    this.setupSocketListeners();
  }

  setupButtonListeners() {
    const joinBoardButton = document.getElementById('join-board');
    const placeBetButton = document.getElementById('place-bet');
    const cashOutButton = document.getElementById('cash-out');
    const leaveBoardButton = document.getElementById('leave-board');

    if (joinBoardButton) {
      joinBoardButton.addEventListener('click', () => this.handleJoinBoard());
    }

    if (placeBetButton) {
      placeBetButton.addEventListener('click', () => this.handlePlaceBet());
    }

    if (cashOutButton) {
      cashOutButton.addEventListener('click', () => this.handleCashOut());
    }

    if (leaveBoardButton) {
      leaveBoardButton.addEventListener('click', () => this.handleLeaveBoard());
    }
  }

  setupSocketListeners() {
    this.socket.on(this.iBoardId, data => this.handleSocketEvents(data));
  }

  handleJoinBoard() {
    this.socket.emit('reqJoinBoard', { iBoardId: this.iBoardId, isReconnect: false }, response => {
      this.displayMessage(JSON.stringify(response));
      this.iUserId = response.player.iUserId;
      this.clearIntervals();
      this.startBetTimer(response.getBetTtl - 2);
    });
  }

  handlePlaceBet() {
    const nBetAmount = document.getElementById('bet-amount').value;
    this.socket.emit(this.iBoardId, { sEventName: 'reqBet', oData: { nBetAmount: +nBetAmount } }, response => {
      this.displayMessage(JSON.stringify(response.message));
    });
  }

  handleCashOut() {
    const multiplier = document.getElementById('multiplier');
    const currentMultiplierValue = +multiplier.textContent.split('x')[0];
    this.socket.emit(this.iBoardId, { sEventName: 'reqCashOut', oData: { nCashOutAtValue: currentMultiplierValue } }, response => {
      this.displayMessage(JSON.stringify(response.message));
    });
  }

  handleLeaveBoard() {
    this.socket.emit(this.iBoardId, { sEventName: 'reqLeave', oData: {} }, response => {
      this.displayMessage(JSON.stringify(response.message));
    });
  }

  handleSocketEvents(data) {
    const multiplier = document.getElementById('multiplier');
    const playerStatusText = document.getElementById('player-status-text');

    switch (data.sEventName) {
      case 'assignBetTimeout':
        this.handleBetTimeout(data.oData);
        break;
      case 'resAviatorCrashValue':
        this.handleCrashValue(data.oData, this.currentMultiplier, multiplier);
        break;
      case 'resCrashAviator':
        this.handleCrashAviator(data.oData, this.currentMultiplier, multiplier);
        break;
      case 'resBet':
        this.handleBetResponse(data.oData, playerStatusText);
        break;
      case 'resCashOut':
        this.handleCashOutResponse(data.oData, playerStatusText);
        break;
      default:
        console.log('unknown event', data.sEventName);
        break;
    }
  }

  handleBetTimeout(oData) {
    this.clearGameState();
    this.startBetTimer(oData.timeoutDuration - 1);
  }

  handleCrashValue(oData, currentMultiplier, multiplier) {
    const { nMultiplyMoneyValue, nGamePlayTime } = oData;
    this.clearIntervals();
    this.nMultiplyMoneyValue = nMultiplyMoneyValue;
    this.game.start();

    const increment = (nMultiplyMoneyValue - currentMultiplier) / (nGamePlayTime / 1000);
    this.startCrashInterval(increment, nMultiplyMoneyValue, currentMultiplier, multiplier);
  }

  handleCrashAviator(oData, currentMultiplier, multiplier) {
    const { nMultiplyMoneyValue, nGamePlayTime } = oData;
    this.clearIntervals();
    this.game.start();

    const increment = (nMultiplyMoneyValue - currentMultiplier) / (nGamePlayTime ? 1 : nGamePlayTime / 1000);
    this.startCrashAviatorInterval(increment, nMultiplyMoneyValue, currentMultiplier, multiplier);
  }

  handleBetResponse(oData, playerStatusText) {
    this.updateLeaderboard(`Bet Amount: ${oData.nBetAmount}`);
    playerStatusText.textContent = oData.eState.charAt(0).toUpperCase() + oData.eState.slice(1);
  }

  handleCashOutResponse(oData, playerStatusText) {
    this.updateLeaderboard(`Cash Out At: ${oData.nCashOutAtValue}`);
    playerStatusText.textContent = 'Waiting';
  }

  clearGameState() {
    const messagesDiv = document.getElementById('messages');
    const leaderboard = document.getElementById('leaderboard');
    const multiplierSpan = document.getElementById('multiplier');

    messagesDiv.innerHTML = '';
    leaderboard.innerHTML = '';
    multiplierSpan.textContent = '1.0x';
  }

  clearIntervals() {
    if (window.betTimeoutInterval) clearInterval(window.betTimeoutInterval);
    if (window.crashInterval) clearInterval(window.crashInterval);
    if (window.crashAviatorInterval) clearInterval(window.crashAviatorInterval);
  }

  startBetTimer(remainingTime) {
    const timerElement = document.getElementById('timer');
    window.betTimeoutInterval = setInterval(() => {
      if (remainingTime > 0) {
        timerElement.textContent = `Betting time: ${remainingTime} seconds`;
        remainingTime--;
      } else {
        clearInterval(window.betTimeoutInterval);
        timerElement.textContent = 'Betting time is over!';
      }
    }, 1000);
  }

  startCrashInterval(increment, nMultiplyMoneyValue, currentMultiplier, multiplier) {
    window.crashInterval = setInterval(() => {
      if (currentMultiplier < nMultiplyMoneyValue) {
        currentMultiplier += increment;
        multiplier.textContent = `${currentMultiplier.toFixed(1)}x`;
        this.game.updateMultiplier(currentMultiplier);
      } else {
        clearInterval(window.crashInterval);
        multiplier.textContent = '1.0x';
        this.game.stop();
        this.game.updateMultiplier(1.0);
      }
    }, 1000);
  }

  startCrashAviatorInterval(increment, nMultiplyMoneyValue, currentMultiplier, multiplier) {
    window.crashAviatorInterval = setInterval(() => {
      if (currentMultiplier < nMultiplyMoneyValue) {
        currentMultiplier += increment;
        multiplier.textContent = `${currentMultiplier.toFixed(1)}x`;
        this.game.updateMultiplier(currentMultiplier);
      } else {
        clearInterval(window.crashAviatorInterval);
        multiplier.textContent = '1.0x';
        this.game.stop();
        this.game.updateMultiplier(1.0);
      }
    }, 1000);
  }

  displayMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
  }

  updateLeaderboard(data) {
    const leaderboard = document.getElementById('leaderboard');
    const entry = document.createElement('li');
    const text = document.createTextNode(`User: ${this.iUserId} || ${data}`);
    entry.appendChild(text);
    leaderboard.appendChild(entry);
  }
}

class AviatorGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.multiplier = 1.0;
    this.isFlying = false;
    this.curvePoints = [];
    this.maxPoints = 100;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }

  drawPlane(x, y) {
    if (!this.ctx) return;

    // Draw a simple triangle plane in orange color
    const planeSize = 15;
    this.ctx.fillStyle = '#f0b90b';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x - planeSize, y + planeSize / 2);
    this.ctx.lineTo(x - planeSize / 2, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  calculateCurvePoint() {
    const padding = 50;
    const x = padding + ((this.canvas.width - padding * 2) * (this.multiplier - 1)) / 1.5;
    const y = this.canvas.height - ((this.multiplier - 1) * (this.canvas.height - padding)) / 1.2;
    return { x, y };
  }

  drawCurve() {
    if (!this.ctx) return;

    const newPoint = this.calculateCurvePoint();
    this.curvePoints.push(newPoint);

    // if (this.curvePoints.length > this.maxPoints) {
    //   this.curvePoints.shift();
    // }

    this.ctx.fillStyle = 'rgba(240, 185, 11, 0.15)';
    this.ctx.beginPath();
    this.ctx.moveTo(50, this.canvas.height);

    this.curvePoints.forEach((point, index) => {
      if (index === 0) {
        this.ctx.moveTo(point.x, point.y);
      } else {
        this.ctx.lineTo(point.x, point.y);
      }
    });

    this.ctx.lineTo(newPoint.x, this.canvas.height);
    this.ctx.lineTo(50, this.canvas.height);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(240, 185, 11, 0.15)';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 2;
    this.ctx.beginPath();
    this.curvePoints.forEach((point, index) => {
      if (index === 0) {
        this.ctx.moveTo(point.x, point.y);
      } else {
        this.ctx.lineTo(point.x, point.y);
      }
    });
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  drawGrid() {
    if (!this.ctx) return;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;

    const multipliers = [1, 1.2, 1.3, 1.4, 1.5, 1.7, 2];
    multipliers.forEach(mult => {
      const y = this.canvas.height - ((mult - 1) * (this.canvas.height - 100)) / 1.2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.font = '11px Arial';
      this.ctx.fillText(`${mult}x`, 5, y - 3);
    });
  }

  animate() {
    if (!this.isFlying || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid();

    this.drawCurve();

    // const currentPoint = this.calculateCurvePoint();
    // this.drawPlane(currentPoint.x, currentPoint.y);

    requestAnimationFrame(() => this.animate());
  }

  start() {
    this.isFlying = true;
    this.curvePoints = [];
    this.animate();
  }

  stop() {
    this.isFlying = false;
    this.curvePoints = [];
  }

  updateMultiplier(newMultiplier) {
    this.multiplier = newMultiplier;
  }
}

function delay(ttl) {
  return new Promise(resolve => setTimeout(resolve, ttl));
}

document.addEventListener('DOMContentLoaded', () => {
  new GameSocket();
});
