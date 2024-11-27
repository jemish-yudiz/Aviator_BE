/* eslint-disable no-console */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const axios = require('axios');
const log = require('./log');
const CryptoJS = require('crypto-js');
const { redis, mongodb } = require('../../app/utils/index');

const secretKey = process.env.HASH_KEY; // Shared secret key

const _ = {};

const config = {
  BASE_URL: process.env.BASE_URL,
  VERIFICATION_CODE_LENGTH: process.env.VERIFICATION_CODE_LENGTH,
  JWT_SECRET: process.env.JWT_SECRET,
};

_.parse = function (data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    return data;
  }
};
_.now = () => {
  const dt = new Date();
  return `[${`${dt}`.split(' ')[4]}:${dt.getMilliseconds()}]`;
};
_.stringify = function (data, offset = 0) {
  return JSON.stringify(data, null, offset);
};
_.toString = function (key) {
  try {
    return key.toString();
  } catch (error) {
    return '';
  }
};
_.clone = function (data = {}) {
  const originalData = data.toObject ? data.toObject() : data; // for mongodb result operations
  const eType = originalData ? originalData.constructor : 'normal';
  if (eType === Object) return { ...originalData };
  if (eType === Array) return [...originalData];
  return data;
  // return JSON.parse(JSON.stringify(data));
};

_.deepClone = function (data) {
  const originalData = !!data.toObject || !!data._doc ? data._doc : data;
  if (originalData.constructor === Object) return this.cloneObject(originalData);
  if (originalData.constructor === Array) return this.cloneArray(originalData);
  return originalData;
};

_.cloneObject = function (object) {
  const newData = {};
  const keys = Object.keys(object);
  for (let i = 0; i < keys.length; i += 1) {
    const eType = object[keys[i]] ? object[keys[i]].constructor : 'normal';
    switch (eType) {
      case 'normal':
        newData[keys[i]] = object[keys[i]];
        break;
      case Array:
        newData[keys[i]] = this.cloneArray(object[keys[i]]);
        break;
      case Object:
        newData[keys[i]] = this.cloneObject(object[keys[i]]);
        break;
      default:
        newData[keys[i]] = object[keys[i]];
        break;
    }
  }
  return newData;
};

_.cloneArray = function (array) {
  const newData = [];
  for (let i = 0; i < array.length; i += 1) {
    const eType = array[i] ? array[i].constructor : 'normal';
    switch (eType) {
      case 'normal':
        newData.push(array[i]);
        break;
      case Array:
        newData.push(this.cloneArray(array[i]));
        break;
      case Object:
        newData.push(this.cloneObject(array[i]));
        break;
      default:
        newData.push(array[i]);
        break;
    }
  }
  return newData;
};

_.pick = function (obj, array) {
  const clonedObj = this.clone(obj);
  return array.reduce((acc, elem) => {
    if (elem in clonedObj) acc[elem] = clonedObj[elem];
    return acc;
  }, {});
};
_.getBoardKey = iBoardId => `${iBoardId.toString()}:ludo`;

_.omit = function (obj, array, deepCloning = false) {
  const clonedObject = deepCloning ? this.deepClone(obj) : this.clone(obj);
  const objectKeys = Object.keys(clonedObject);
  return objectKeys.reduce((acc, elem) => {
    if (!array.includes(elem)) acc[elem] = clonedObject[elem];
    return acc;
  }, {});
};

_.searchRegex = search => {
  if (!search) {
    return '';
  }
  return search
    .replace(/\\/g, '\\\\')
    .replace(/\$/g, '\\$')
    .replace(/\*/g, '\\*')
    .replace(/\+/g, '\\+')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\)/g, '\\)')
    .replace(/\(/g, '\\(')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
};

_.privateEmit = async function (iUserId, sEventName, data) {
  const socketId = await redis.client.GET(_.getUserSocketKey(iUserId));
  if (!socketId) return log.red(`active socketId not found for user. ${iUserId}`);

  log.blue(`iUserId: ${iUserId}, sEventName: ${sEventName}, data: ${JSON.stringify(data)}`);
  global.io.to(socketId).emit(sEventName, JSON.stringify(data));
};
// _.privateEmit('670e00bb66f85c3d381fb966', 'resUpdateCoins', { nChips: 1 })

_.isEmptyObject = function (obj = {}) {
  return !Object.keys(obj).length;
};

_.isEqual = function (id1, id2) {
  return (id1 ? id1.toString() : id1) === (id2 ? id2.toString() : id2);
};

_.formattedDate = function () {
  return new Date().toLocaleString('en-us', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
};

_.isoTimeString = function () {
  const today = new Date();
  return today;
};

_.getDate = function (_date = undefined) {
  const date = _date ? new Date(_date) : new Date();
  date.setHours(0, 0, 0, 0);
  const timeOffset = date.getTimezoneOffset() === 0 ? 19800000 : 0;
  // return new Date(date.toLocaleString('en-us', { day: 'numeric', month: 'short', year: 'numeric' }));
  return new Date(date - timeOffset);
};

_.addDays = function (date, days) {
  const inputDate = new Date(date);
  return new Date(inputDate.setDate(inputDate.getDate() + days));
};

_.addMonth = function (date, month) {
  const inputDate = new Date(date);
  return new Date(inputDate.setMonth(inputDate.getMonth() + month));
};

_.addMilliseconds = function (date, milliseconds) {
  const inputDate = new Date(date);
  return new Date(inputDate.valueOf() + milliseconds);
};

_.encryptPassword = function (password) {
  return crypto.createHmac('sha256', config.JWT_SECRET).update(password).digest('hex');
};

// _.encryptData= function (data) {
//     const cipher = CryptoJS.AES.encrypt(data, CryptoJS.enc.Hex.parse(secretKey), {
//         iv: CryptoJS.enc.Hex.parse(iv.toString()),
//     });
//     return { iv: iv.toString(), encryptedData: cipher.toString() };
// }
_.encryptDataGhetiya = function (text) {
  const iv = CryptoJS.lib.WordArray.random(128 / 8);
  const encrypted = CryptoJS.AES.encrypt(text, CryptoJS.enc.Utf8.parse(secretKey), { iv: iv });
  return { iv: iv.toString(CryptoJS.enc.Hex), content: encrypted.toString() };
};

// _.encryptDataCrypto= function (data) {
//   const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
//   let encrypted = cipher.update(data);
//   encrypted = Buffer.concat([encrypted, cipher.final()]);
//   return { iv: iv.toString('hex'), content: encrypted.toString('hex') };
// }

// _.decryptData=function (data) {
//     const decipher = CryptoJS.AES.decrypt(data.encryptedData, CryptoJS.enc.Hex.parse(secretKey), {
//         iv: CryptoJS.enc.Hex.parse(data.iv),
//     });
//     return decipher.toString(CryptoJS.enc.Utf8);
// }

_.decryptDataGhetiya = function (hash) {
  const iv = CryptoJS.enc.Hex.parse(hash.iv);
  const decrypted = CryptoJS.AES.decrypt(hash.content, CryptoJS.enc.Utf8.parse(secretKey), { iv: iv });
  return decrypted.toString(CryptoJS.enc.Utf8);
};

// _.decryptDataCrypto= function decrypt(hash) {
//   let iv = Buffer.from(hash.iv, 'hex');
//   let encryptedText = Buffer.from(hash.content, 'hex');
//   const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
//   let decrypted = decipher.update(encryptedText);
//   decrypted = Buffer.concat([decrypted, decipher.final()]);
//   return decrypted.toString();
// }

_.randomizeNumericString = function (length, size) {
  let result = '';
  const output = new Set();
  const characters = '1234567890';
  const charactersLength = characters.length;
  for (let j = 0; j < size; j += 1) {
    for (let i = 0; i < length; i += 1) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    output.add(result);
    result = '';
  }
  return [...output];
};

_.generateRandomDiceRolls = function (targetSum, nMoves) {
  const minSum = nMoves * 1;
  const maxSum = nMoves * 6;

  if (targetSum < minSum || targetSum > maxSum) {
    console.log(`Target sum ${targetSum} is out of range. Must be between ${minSum} and ${maxSum}.`);
    return [];
  }

  const diceRolls = [];
  let currentSum = 0;

  for (let i = 0; i < nMoves; i++) {
    let diceRoll = Math.floor(Math.random() * 6) + 1;
    diceRolls.push(diceRoll);
    currentSum += diceRoll;
  }

  let diff = targetSum - currentSum;

  let i = 0;
  while (diff !== 0) {
    if (diff > 0) {
      // Increase values (max 6)
      let increase = Math.min(diff, 6 - diceRolls[i]);
      diceRolls[i] += increase;
      diff -= increase;
    } else {
      let decrease = Math.min(-diff, diceRolls[i] - 1);
      diceRolls[i] -= decrease;
      diff += decrease;
    }

    i = (i + 1) % nMoves;
  }

  return diceRolls;
};

_.shuffle = function (array) {
  let currentIndex = array.length;
  const shuffled = [...array];

  while (currentIndex > 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // Swap elements
    [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];

    if (currentIndex > 0 && shuffled[currentIndex] === shuffled[currentIndex - 1]) {
      const nextIndex = (currentIndex + 1) % shuffled.length;
      [shuffled[currentIndex], shuffled[nextIndex]] = [shuffled[nextIndex], shuffled[currentIndex]];
    }
  }

  return shuffled;
};

_.getBoardData = function (number) {
  const generateDummyPlayer = (seat, maxScore, { aPawn, aPublicPosition }) => ({
    iUserId: mongodb.mongify(),
    sUserName: `Dummy${seat}`,
    eUserType: 'dummy',
    image: `dummy${seat}.png`,
    nSeat: seat,
    nChips: _.salt(4, Number),
    sToken: `dummy_token_${seat}`,
    aPawn: aPawn,
    aPublicPosition: aPublicPosition,
    nMaxScore: maxScore,
  });

  const dummyBoardData = [
    [],
    [
      generateDummyPlayer(1, 79, { aPawn: [1, 20, 12, 47], aPublicPosition: [14, 33, 25, 8] }),
      generateDummyPlayer(2, 57, { aPawn: [1, 17, 10, 30], aPublicPosition: [27, 43, 36, 4] }),
      generateDummyPlayer(3, 81, { aPawn: [1, 30, 8, 43], aPublicPosition: [40, 17, 47, 30] }),
    ],
    [
      generateDummyPlayer(1, 75, { aPawn: [1, 38, 7, 30], aPublicPosition: [14, 51, 20, 43] }),
      generateDummyPlayer(2, 62, { aPawn: [1, 21, 8, 33], aPublicPosition: [27, 47, 34, 7] }),
      generateDummyPlayer(3, 85, { aPawn: [1, 25, 17, 43], aPublicPosition: [40, 12, 4, 30] }),
    ],
    [
      generateDummyPlayer(1, 70, { aPawn: [1, 47, 4, 19], aPublicPosition: [14, 8, 17, 32] }),
      generateDummyPlayer(2, 80, { aPawn: [1, 47, 4, 29], aPublicPosition: [27, 21, 30, 3] }),
      generateDummyPlayer(3, 14, { aPawn: [1, 1, 3, 10], aPublicPosition: [40, 40, 42, 49] }),
    ],
    [
      generateDummyPlayer(1, 54, { aPawn: [1, 4, 17, 33], aPublicPosition: [14, 17, 30, 46] }),
      generateDummyPlayer(2, 64, { aPawn: [1, 1, 16, 47], aPublicPosition: [27, 27, 42, 21] }),
      generateDummyPlayer(3, 71, { aPawn: [1, 12, 21, 38], aPublicPosition: [40, 51, 8, 25] }),
    ],
    [
      generateDummyPlayer(1, 67, { aPawn: [1, 16, 8, 43], aPublicPosition: [14, 29, 21, 4] }),
      generateDummyPlayer(2, 106, { aPawn: [1, 12, 51, 43], aPublicPosition: [27, 38, 25, 17] }),
      generateDummyPlayer(3, 77, { aPawn: [1, 47, 10, 20], aPublicPosition: [40, 34, 49, 7] }),
    ],
    [
      generateDummyPlayer(1, 71, { aPawn: [1, 21, 8, 42], aPublicPosition: [14, 34, 21, 3] }),
      generateDummyPlayer(2, 105, { aPawn: [1, 12, 50, 43], aPublicPosition: [27, 38, 24, 17] }),
      generateDummyPlayer(3, 53, { aPawn: [1, 25, 8, 20], aPublicPosition: [40, 12, 47, 7] }),
    ],
    [
      generateDummyPlayer(1, 123, { aPawn: [1, 50, 30, 43], aPublicPosition: [14, 11, 43, 4] }),
      generateDummyPlayer(2, 97, { aPawn: [1, 7, 47, 43], aPublicPosition: [27, 33, 21, 17] }),
      generateDummyPlayer(3, 31, { aPawn: [1, 1, 10, 20], aPublicPosition: [40, 40, 49, 7] }),
    ],
    [
      generateDummyPlayer(1, 56, { aPawn: [1, 12, 25, 19], aPublicPosition: [14, 25, 38, 32] }),
      generateDummyPlayer(2, 80, { aPawn: [1, 47, 4, 29], aPublicPosition: [27, 21, 30, 3] }),
      generateDummyPlayer(3, 61, { aPawn: [1, 30, 21, 10], aPublicPosition: [40, 17, 8, 49] }),
    ],
    [
      generateDummyPlayer(1, 96, { aPawn: [1, 43, 20, 33], aPublicPosition: [14, 4, 33, 46] }),
      generateDummyPlayer(2, 97, { aPawn: [1, 38, 12, 47], aPublicPosition: [27, 12, 38, 21] }),
      generateDummyPlayer(3, 71, { aPawn: [1, 12, 21, 38], aPublicPosition: [40, 51, 8, 25] }),
    ],
    [
      generateDummyPlayer(1, 49, { aPawn: [1, 17, 25, 7], aPublicPosition: [14, 30, 38, 20] }),
      generateDummyPlayer(2, 49, { aPawn: [1, 17, 25, 7], aPublicPosition: [27, 43, 51, 33] }),
      generateDummyPlayer(3, 49, { aPawn: [1, 17, 25, 7], aPublicPosition: [40, 4, 12, 46] }),
    ],
  ];

  return dummyBoardData[number];
};

_.salt = function (length, type) {
  // if (process.env.NODE_ENV !== 'prod') return 1234;
  if (type === 'string') {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  let min = 1;
  let max = 9;
  for (let i = 1; i < length; i += 1) {
    min += '0';
    max += '9';
  }
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

_.validateMobile = function (mobile) {
  const regeX = /^\+?[1-9][0-9]{8,12}$/;
  return !regeX.test(mobile);
};

_.sortByKey = function name(array, key) {
  return _.clone(array).sort((a, b) => a[key] - b[key]);
};

_.randomCode = function (size) {
  // const code = Math.random().toString(32);
  const code = Date.now().toString(36);
  return code.slice(code.length - size);
};

_.encodeToken = function (body, expTime) {
  try {
    return expTime ? jwt.sign(this.clone(body), config.JWT_SECRET, expTime) : jwt.sign(this.clone(body), config.JWT_SECRET);
  } catch (error) {
    return undefined;
  }
};

_.decodeToken = function (token) {
  try {
    return jwt.decode(token, config.JWT_SECRET);
  } catch (error) {
    return undefined;
  }
};

_.verifyToken = function (token) {
  try {
    return jwt.verify(token, config.JWT_SECRET, function (err, decoded) {
      return err ? err.message : decoded; // return true if token expired
    });
  } catch (error) {
    return error ? error.message : error;
  }
};

_.isOtpValid = function (createdAt) {
  const difference = new Date() - createdAt;
  return difference < process.env.OTP_VALIDITY;
};

_.isEmail = function (email) {
  const regeX = /[a-z0-9._%+-]+@[a-z0-9-]+[.]+[a-z]{2,5}$/;
  return !regeX.test(email);
};

_.isUserName = function (name) {
  const regeX = /^[a-zA-Z ]+$/;
  return !regeX.test(name);
};

_.isPassword = function (password) {
  const regeX = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,15}$/;
  return !regeX.test(password);
};

_.randomizeArray = function (array = []) {
  const arrayLength = array.length;
  for (let i = 0; i < arrayLength; i += 1) {
    let randomNumber = Math.floor(Math.random() * arrayLength);
    [array[i], array[randomNumber]] = [array[randomNumber], array[i]];
    randomNumber = Math.floor(Math.random() * arrayLength);
    [array[i], array[randomNumber]] = [array[randomNumber], array[i]];
  }
  return array;
};

_.randomBetween = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

_.randomFromArray = function (array) {
  if (!array.length) return false;
  return array[Math.floor(Math.random() * array.length)];
};

_.appendZero = number => (number < 10 ? '0' : '') + number;

_.delay = ttl => new Promise(resolve => setTimeout(resolve, ttl));

_.roundDownToMultiple = function (number, multiple) {
  return number - (number % multiple);
};

_.emptyCallback = (error, response) => {};

_.errorCallback = (error, response) => {
  if (error) console.error(error);
};

_.getUserSocketKey = iUserId => `dwl:${iUserId}`;

_.getUserKey = iUserId => `user:${iUserId}`;

_.getProtoKey = iProtoId => `${iProtoId}:proto`;

_.getTableCounterKey = id => `${id}:counter`;

_.getTournamentKey = iTableId => `tournament:${iTableId}`;

_.getTournamentCounterKey = id => `counter:${id}`;

_.getSchedulerKey = (sTask, iBoardId = '', iUserId = '', host = process.env.HOST) => `${iBoardId}:scheduler:${sTask}:${iUserId}:${host}`;
_.getSchedulerKeyWithOutHost = (sTask, iBoardId = '', iUserId = '') => `${iBoardId}:scheduler:${sTask}:${iUserId}:*`;

_.generateRandomUserName = function () {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i += 1) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};

_.randomizeNumber = function (length, size) {
  let number = new Date().getTime().toString();
  return `0${number.slice(6, 13)}`;
};

_.retryAxiosCall = async function (optionsEndGame, maxRetries = 3, delayMs = 15000) {
  try {
    const response = await axios(optionsEndGame);
    return response.data;
  } catch (error) {
    if (maxRetries <= 0) {
      throw error; // No more retries, propagate the error
    }
    console.error(`API request failed. Retrying in ${delayMs / 1000} seconds...`);
    // Use setTimeout to introduce a delay before retrying the request
    await new Promise(resolve => setTimeout(resolve, delayMs));

    return _.retryAxiosCall(optionsEndGame, maxRetries - 1, delayMs);
  }
};
_.removeKey = (obj, keyToRemove) => {
  // Create a new object by copying all key-value pairs except the one to be removed
  const newObj = Object.fromEntries(Object.entries(obj).filter(([key, value]) => key !== keyToRemove));

  return newObj;
};
_.removeFieldFromArray = async (array, fieldToRemove) => {
  array.forEach(item => {
    delete item[fieldToRemove];
  });
};

module.exports = _;
