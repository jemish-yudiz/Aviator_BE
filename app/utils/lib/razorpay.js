const auth = {
  username: process.env.RAZOR_KEY_ID,
  password: process.env.RAZOR_KEY_SECRET,
};

const URL = process.env.RAZOR_HOST;

const controllers = {};

controllers.createOrder = (order, callback) => {
  const options = {
    method: 'post',
    url: `${URL}/orders`,
    auth,
    headers: { 'Content-Type': 'application/json' },
    data: _.stringify(order),
    withCredentials: true,
  };

  _.axios(options, callback);
};

controllers.getOrderInfo = (id, callback) => {
  const options = {
    method: 'get',
    url: `${URL}/orders/${id}/payments`,
    auth,
    headers: { 'Content-Type': 'application/json' },
    data: _.stringify({}),
    withCredentials: true,
  };
  _.axios(options, callback);
};

// controllers.getPaymentInfo = rzp.payments.fetch;

controllers.createContact = (user, callback) => {
  const data = _.stringify({
    name: user.sUserName,
    email: user.sEmail,
    contact: user.sMobile,
    type: 'customer',
  });
  const options = {
    method: 'post',
    url: `${URL}/contacts`,
    auth,
    headers: { 'Content-Type': 'application/json' },
    data,
    withCredentials: true,
  };
  _.axios(options, callback);
};

controllers.getContact = (id, callback) => {
  const options = {
    url: `${URL}/contacts/${id}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    auth,
  };
  _.request(options, (error, response, contact) => {
    if (error) return callback(error);
    callback(null, JSON.parse(contact));
  });
};
/**
 * @params eAccountType : bank_account | vpa | card
 */
controllers.createFundAccount = (bank, callback) => {
  const body = _.pick(bank, ['sContactId', 'sAccountNo', 'sIFSC', 'sAccountHolderName', 'sBankName']);
  const data = _.stringify({
    contact_id: body.sContactId,
    account_type: 'bank_account',
    bank_account: {
      name: body.sAccountHolderName,
      ifsc: body.sIFSC,
      account_number: body.sAccountNo,
    },
  });
  const options = {
    method: 'post',
    url: `${URL}/fund_accounts`,
    auth,
    headers: { 'Content-Type': 'application/json' },
    data,
    withCredentials: true,
  };
  _.axios(options, callback);
};

controllers.initRedeem = (payment, callback) => {
  const data = {
    account_number: process.env.RAZOR_ACCOUNT_NO,
    fund_account_id: payment.sFundAccountId,
    amount: payment.amount * 100,
    reference_id: payment.reference_id,
    currency: 'INR',
    mode: 'IMPS',
    purpose: 'payout',
    queue_if_low_balance: true,
    notes: payment.notes,
  };
  const options = {
    method: 'post',
    url: `${URL}/payouts`,
    auth,
    headers: { 'Content-Type': 'application/json' },
    data: _.stringify(data),
    withCredentials: true,
  };
  _.axios(options, (error, response) => {
    if (error) callback(error);
    return callback(null, response);
  });
};

controllers.getFundAccount = (id, callback) => {
  const options = {
    url: `${URL}/fund_accounts/${id}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    auth,
  };
  _.request(options, (error, response, contact) => {
    if (error) return callback(error);
    callback(null, JSON.parse(contact));
  });
};

controllers.deactivateFundAccount = (id, callback) => {
  const options = {
    url: `${URL}/fund_accounts/${id}`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    auth,
    data: _.stringify({ active: false }),
  };
  _.axios(options, callback);
};

module.exports = controllers;
