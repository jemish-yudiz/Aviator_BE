const { default: axios } = require('axios');

const services = {};

services.getGoogle = (req, res) => {
  const clientId = process.env.GOOGLE_AUTH_CLIENT;
  const redirectUri = `http://localhost:3080/api/v1/auth/google/token`;

  const options = new URLSearchParams({
    redirect_uri: redirectUri,
    client_id: clientId,
    response_type: 'code',
    scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'].join(' '),
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${options}`;

  return res.reply(messages.success(), authUrl);
};

services.getToken = async (req, res) => {
  async function getTokens({ code, clientId, clientSecret, redirectUri }) {
    const url = 'https://oauth2.googleapis.com/token';

    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const res = await axios.post(url, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return await res.data;
  }

  try {
    const code = req.query.code;

    const { id_token, access_token } = await getTokens({
      code,
      clientId: process.env.GOOGLE_AUTH_CLIENT,
      clientSecret: process.env.GOOGLE_AUTH_SECRET,
      redirectUri: `http://localhost:3080/api/v1/auth/google/token`,
    });
    log.green('🚀 id_token:::::::::::', id_token); // This is the token that we need to send to the client in "googleLogin"

    const googleUser = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`, {
      headers: {
        Authorization: `Bearer ${id_token}`,
      },
    });

    const result = await googleUser.data;

    return res.reply(messages.success(), result);
  } catch (error) {
    return res.reply(messages.server_error());
  }
};

services.googleLogin = async ({ idToken }) => {
  const options = {
    method: 'GET',
    hostname: `oauth2.googleapis.com`,
    path: `/tokeninfo?id_token=${idToken}`,
    headers: { 'Content-Type': 'application/json' },
    isSecure: true,
    rejectUnauthorized: false,
  };
  try {
    const response = await _.request({}, options);

    const userData = {
      sEmail: response.email,
      sGoogleId: response.sub,
    };
    return userData;
  } catch (error) {
    log.error('Error:', error);
  }
};

module.exports = services;
