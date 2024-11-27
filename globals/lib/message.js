const customMessages = {
  custom_message: { code: 200, message: 'custom message' },
  already_exists_email: { code: 409, message: 'User already exists with email id' },
  user_not_found: { code: 404, message: "Sorry, we didn't find any account with that Email id/Mobile number" },
  insufficient_chips: { code: 406, message: 'You have insufficient balance' },
  table_proto_not_found: { code: 404, message: 'table not found!' },
  already_exists_mobile: { code: 409, message: 'User already exists with this mobile number' },
  max_board_join_limit: { code: 419, message: 'You can not join more than 3 board' },
  wait_for_turn: { code: 419, message: 'Please wait for your turn' },
  no_player_found: { code: 409, message: 'No playing player found Try after some time' },
  invalid_code: { code: 404, message: 'Invalid code or board has been started already !' },
  can_not_join_board: { code: 401, message: 'can not join board.' },
  power_up_used: { code: 403, message: 'you have already used this powerup.' },
  login_otp_success: {
    code: 205,
    message: 'Verification OTP sent to your registered mobile number.',
  },
  already_exists_mobile: { code: 409, message: 'Mobile number is already exist with another email account' },
  balance_not_enough: { code: 406, message: 'withdraw amount should be less than or qual to your balance' },
  duplicate_transactionId: { code: 406, message: 'Duplicate Transaction id not allow' },
  transactionId_length: { code: 406, message: 'Transaction id length must be between 12 and 16 characters' },
  kyc_not_verified: { code: 406, message: 'Please verify kyc first' },
  bankDetails_add: { code: 406, message: 'Please add bank details first' },
  betterluck: { code: 200, message: 'Better luck next time!!' },
  can_not_join_tournament: { code: 401, message: 'can not join tournament.' },
  max_played_entry_reached: { code: 401, message: 'max played entry reached.' },

  board_not_in_playing_state: { code: 401, message: 'board not in playing state.' },
  board_not_in_waiting_state: { code: 401, message: 'board not in waiting state.' },
  assign_bet_timeout_expired: { code: 401, message: 'assign bet timeout expired.' },
  bet_already_placed: { code: 401, message: 'bet already placed.' },
  cash_out_already_placed: { code: 401, message: 'cash out already placed.' },
  player_not_in_playing_state: { code: 401, message: 'player not in playing state.' },
  bet_not_placed: { code: 401, message: 'bet not placed.' },
  cash_out_at_value_greater_than_multiplier: { code: 401, message: 'cash out at value greater than multiplier.' },
  cannot_cash_out_now: { code: 401, message: 'cannot cash out now.' },
};
/**
 * Push notification messages
 */
const notifications = {};

const builder = {
  invalid_req: prefix => builder.prepare(406, prefix, 'invalid Request'),
  wrong_otp: prefix => builder.prepare(403, prefix, 'entered OTP is invalid'),
  wrong_format: prefix => builder.prepare(403, prefix, 'wrong format'),
  insufficient_chips: prefix => builder.prepare(403, prefix, 'insufficient_chips'),
  server_error: prefix => builder.prepare(500, prefix, 'server error'),
  server_maintenance: prefix => builder.prepare(500, prefix, 'maintenance mode is active'),
  unauthorized: prefix => builder.prepare(401, prefix, 'authentication Error, please try logging again'),
  inactive: prefix => builder.prepare(403, prefix, 'inactive'),
  not_found: prefix => builder.prepare(404, prefix, 'not found'),
  not_matched: prefix => builder.prepare(406, prefix, 'not matched'),
  not_verified: prefix => builder.prepare(406, prefix, 'not verified'),
  already_exists: prefix => builder.prepare(409, prefix, 'already exists'),
  user_deleted: prefix => builder.prepare(406, prefix, 'deleted by admin'),
  user_blocked: prefix => builder.prepare(406, prefix, 'blocked by admin'),
  required_field: prefix => builder.prepare(419, prefix, 'field required'),
  not_valid: prefix => builder.prepare(419, prefix, 'not valid'),
  too_many_request: prefix => builder.prepare(429, prefix, 'too many request'),
  expired: prefix => builder.prepare(417, prefix, 'expired'),
  canceled: prefix => builder.prepare(419, prefix, 'canceled'),
  created: prefix => builder.prepare(200, prefix, 'created'),
  updated: prefix => builder.prepare(200, prefix, 'updated'),
  deleted: prefix => builder.prepare(417, prefix, 'deleted'),
  blocked: prefix => builder.prepare(401, prefix, 'blocked'),
  success: prefix => builder.prepare(200, prefix, 'success'),
  successfully: prefix => builder.prepare(200, prefix, 'successfully'),
  error: prefix => builder.prepare(500, prefix, 'error'),
  no_prefix: prefix => builder.prepare(200, prefix, ''),
  custom: { ...customMessages },
  getString: key => (customMessages ? customMessages[key].message : ''),
  // custom: key => builder.prepare(...customMessages[key], ''),
  notifications,
};

Object.defineProperty(builder, 'prepare', {
  enumerable: false,
  configurable: false,
  writable: false,
  value: (code, prefix, message) => ({
    code,
    message: `${prefix ? `${prefix} ${message}` : message}`,
  }),
});

module.exports = builder;
