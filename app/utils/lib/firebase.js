// const admin = require('firebase-admin');
// const url = require('url');
// const config = require('../../../firebase.json');

// admin.initializeApp({
//   credential: admin.credential.cert(config),
// });

// const operations = {};

// operations.notify = (notify, callback) => {
//   if (!notify.tokens.length) return callback('Token not found');

//   const payload = {
//     notification: { title: notify.sTitle, body: notify.sDescription },
//     data: notify.data || {},
//     android: {
//       notification: {
//         color: '#FFFFFF',
//       },
//     },
//   };

//   const sendPromises = notify.tokens.map(token => {
//     const message = {
//       token,
//       ...payload,
//     };
//     return admin.messaging().send(message);
//   });

//   Promise.all(sendPromises)
//     .then(responses => {
//       callback(null, responses);
//     })
//     .catch(error => {
//       console.log('Error sending notification:', error);
//       callback(error);
//     });
// };

// operations.generateLink = (id, code) => {
//   const image = 'https://rummyone-admin-panel.s3.ap-south-1.amazonaws.com/Rummy.png';
//   const title = 'My referral Link';
//   const description = `Register with my referral code ${code} and get instant bonus`;
//   const _base = 'https://rummyone.page.link';
//   const referral = `http://localhost:4000/download.html?iReferredBy=${id}`;
//   // const apn = 'com.profuse.rummyrounds';
//   const ibi = 'com.yudiz.rummyone';
//   const isi = '';
//   const URL = `${_base}?link=${referral}&ibi=${ibi}&ipbi=${ibi}&isi=${isi}&st=${title}&sd=${description}&si=${image}`;
//   return url.format(URL);
// };

// operations.deepLink = (id, code, callback) => {
//   // const options = {
//   //     method: 'POST',
//   //     url: `firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${process.env.FIREBASE_API_KEY}`,
//   //     headers: {
//   //         'content-type': 'application/json',
//   //     },
//   //     data: {
//   //         longDynamicLink: operations.generateLink(id, code),
//   //         suffix: {
//   //             option: 'UNGUESSABLE',
//   //         },
//   //     },
//   //     isSecure: true,
//   // };
//   // log.blue('options :: ', options);
//   // _.axios(options, (error, success) => {
//   //     if (error) {
//   //         log.red('error :: ', error);
//   //         return callback(error);
//   //     }
//   //     callback(null, success);
//   // });
//   const body = {
//     longDynamicLink: operations.generateLink(id, code),
//     suffix: {
//       option: 'UNGUESSABLE',
//     },
//   };
//   const options = {
//     method: 'POST',
//     hostname: 'firebasedynamiclinks.googleapis.com',
//     path: `/v1/shortLinks?key=${process.env.FIREBASE_API_KEY}`,
//     headers: {
//       'content-type': 'application/json',
//     },
//     isSecure: true,
//   };

//   _.request(body, options, (error, success) => {
//     if (error) return callback(error);
//     callback(null, success);
//   });
// };

// module.exports = operations;
