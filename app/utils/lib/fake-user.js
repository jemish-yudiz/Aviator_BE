const maleFirstNames = require('./dir/male_firstname.json');
const femaleFirstNames = require('./dir/female_firstname.json');
const lastNames = require('./dir/lastname.json');

const operations = {
  getRandomPlayer: () => {
    const gender = _.randomBetween(0, 1) === 0 ? 'male' : 'female';
    const users = gender === 'male' ? maleFirstNames : femaleFirstNames;
    const firstNameIndex = _.randomBetween(0, users.length - 1);
    const lastNameIndex = _.randomBetween(0, lastNames.length - 1);

    return {
      sUserName: `${users[firstNameIndex]}${lastNames[lastNameIndex]}`.toLowerCase(),
      sDeviceId: `${users[firstNameIndex]}${lastNames[lastNameIndex]}`.toLowerCase(),
      sFirstName: users[firstNameIndex],
      sLastName: lastNames[lastNameIndex],
      isEmailVerified: true,
      isMobileVerified: true,
      eUserType: 'bot',
      eGender: gender,
      nChips: _.randomBetween(1000, 25000),
    };
  },
  getRandomUserName: (gender = 'male') => {
    const users = gender == 'male' ? maleFirstNames : femaleFirstNames;
    const firstNameIndex = _.randomBetween(0, users.length - 1);
    const lastNameIndex = _.randomBetween(0, lastNames.length - 1);

    return `${users[firstNameIndex]}  ${lastNames[lastNameIndex]}`.toLowerCase();
  },
};

// export default operations;
module.exports = operations;
