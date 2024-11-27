/* eslint-disable new-cap */
const mongoose = require('mongoose');

function MongoClient() {
  this.options = {
    connectTimeoutMS: 30000, // Increase the connection timeout to 30 seconds
    socketTimeoutMS: 30000,
  };
}

MongoClient.prototype.initialize = async function () {
  mongoose
    .connect(process.env.DB_URL, this.options)
    .then(() => log.yellow('Database connected 🧬'))
    .catch(error => {
      throw error;
    });
};

MongoClient.prototype.mongify = function (id) {
  return new mongoose.Types.ObjectId(id);
};

module.exports = new MongoClient();
