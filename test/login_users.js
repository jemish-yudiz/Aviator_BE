const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'authorization', 'verification'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

async function login(sMobile) {
  try {
    const res = await axios.post('http://localhost:3040/api/v1/auth/login', {
      sMobile: sMobile,
    });

    const verificationToken = res.headers['verification'];
    if (verificationToken) {
      await verifyOtp(verificationToken, sMobile);
    } else {
      console.error('Verification token not found in response data');
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
}

async function verifyOtp(verificationToken, sMobile) {
  try {
    const res = await axios.post(
      'http://localhost:3040/api/v1/auth/otp/verify',
      {
        code: 1234,
        sMobile: sMobile,
      },
      {
        headers: {
          verification: verificationToken,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('OTP verification successful:', res.data);

    const authToken = res.headers['authorization'];
    if (authToken) {
      console.log('Authorization token:', authToken);
    } else {
      console.error('Authorization token not found');
    }
  } catch (error) {
    console.error('OTP verification failed:', error);
  }
}

const users = ['1234567891', '1234567892', '1234567893', '1234567894', '1234567895'];

users.forEach(user => {
  login(user);
});
