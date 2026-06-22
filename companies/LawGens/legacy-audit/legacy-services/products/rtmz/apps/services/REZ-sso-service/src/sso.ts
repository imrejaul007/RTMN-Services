/**
 * REZ SSO Service - Single Sign-On for All Apps
 *
 * Supports:
 * - Email/Password
 * - Google OAuth
 * - Apple Sign In
 * - Phone/OTP
 * - Biometric
 */

import express from 'express';
import logger from './utils/logger';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// ============================================
// MODELS
// ============================================

interface User {
  user_id: string;
  email?: string;
  phone?: string;
  password_hash?: string;
  auth_methods: string[];
  company_ids: string[];
  created_at: Date;
  last_login: Date;
}

const users = new Map<string, User>();

// ============================================
// SSO PROVIDERS
// ============================================

const PROVIDERS = {
  google: {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    auth_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    userinfo_url: 'https://www.googleapis.com/oauth2/v2/userinfo'
  },
  apple: {
    client_id: process.env.APPLE_CLIENT_ID,
    team_id: process.env.APPLE_TEAM_ID,
    key_id: process.env.APPLE_KEY_ID,
    auth_url: 'https://appleid.apple.com/auth/authorize',
    token_url: 'https://appleid.apple.com/auth/token'
  }
};

// ============================================
// HELPER
// ============================================

function generateToken(user: User) {
  return jwt.sign({
    user_id: user.user_id,
    auth_methods: user.auth_methods,
    company_ids: user.company_ids
  }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
}

function generateRefreshToken(userId: string) {
  return jwt.sign({ user_id: userId, type: 'refresh' }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
}

// ============================================
// EMAIL/PASSWORD AUTH
// ============================================

app.post('/auth/register', async (req, res) => {
  const { email, password, phone } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ error: 'Email or phone required' });
  }

  const user_id = `usr_${Date.now()}`;
  const password_hash = password ? await bcrypt.hash(password, 10) : undefined;

  const user: User = {
    user_id,
    email,
    phone,
    password_hash,
    auth_methods: password ? ['email_password'] : ['phone'],
    company_ids: [],
    created_at: new Date()
  };

  users.set(user_id, user);

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user_id);

  res.json({ user_id, token, refresh_token: refreshToken });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = Array.from(users.values()).find(u => u.email === email);
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  user.last_login = new Date();

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user.user_id);

  res.json({ user_id: user.user_id, token, refresh_token: refreshToken });
});

// ============================================
// GOOGLE OAUTH
// ============================================

app.get('/auth/google', (req, res) => {
  const { redirect_uri, state } = req.query;

  const authUrl = `${PROVIDERS.google.auth_url}?` +
    `client_id=${PROVIDERS.google.client_id}` +
    `&redirect_uri=${redirect_uri}` +
    `&response_type=code` +
    `&scope=email%20profile` +
    `&state=${state}`;

  res.json({ auth_url: authUrl });
});

app.post('/auth/google/callback', async (req, res) => {
  const { code, redirect_uri } = req.body;

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post(PROVIDERS.google.token_url, {
      code,
      client_id: PROVIDERS.google.client_id,
      client_secret: PROVIDERS.google.client_secret,
      redirect_uri,
      grant_type: 'authorization_code'
    });

    // Get user info
    const userInfoRes = await axios.get(PROVIDERS.google.userinfo_url, {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
    });

    const { email, id, name } = userInfoRes.data;

    // Find or create user
    let user = Array.from(users.values()).find(u => u.email === email);
    if (!user) {
      const user_id = `usr_${Date.now()}`;
      user = {
        user_id,
        email,
        auth_methods: ['google'],
        company_ids: [],
        created_at: new Date()
      };
      users.set(user_id, user);
    } else {
      if (!user.auth_methods.includes('google')) {
        user.auth_methods.push('google');
      }
    }

    user.last_login = new Date();

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user.user_id);

    res.json({ user_id: user.user_id, token, refresh_token: refreshToken });

  } catch (error) {
    res.status(400).json({ error: 'Google auth failed' });
  }
});

// ============================================
// APPLE SIGN IN
// ============================================

app.post('/auth/apple/callback', async (req, res) => {
  const { identity_token, authorization_code } = req.body;

  // In production, verify with Apple
  // For now, decode JWT from identity_token
  try {
    // Decode Apple ID token (contains email, sub)
    const payload = JSON.parse(Buffer.from(identity_token.split('.')[1], 'base64').toString());
    const { email, sub: apple_id } = payload;

    let user = Array.from(users.values()).find(u => u.email === email);
    if (!user) {
      const user_id = `usr_${Date.now()}`;
      user = {
        user_id,
        email,
        auth_methods: ['apple'],
        company_ids: [],
        created_at: new Date()
      };
      users.set(user_id, user);
    } else {
      if (!user.auth_methods.includes('apple')) {
        user.auth_methods.push('apple');
      }
    }

    user.last_login = new Date();

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user.user_id);

    res.json({ user_id: user.user_id, token, refresh_token: refreshToken });

  } catch (error) {
    res.status(400).json({ error: 'Apple auth failed' });
  }
});

// ============================================
// PHONE/OTP
// ============================================

app.post('/auth/phone/request-otp', async (req, res) => {
  const { phone } = req.body;

  // Generate 6-digit OTP using crypto for cryptographic security
  const otp = String(crypto.randomInt(100000, 999999));

  // In production, send via SMS gateway
  logger.info(`OTP for ${phone}: ${otp}`);

  // Store OTP (use Redis in production)
  const otpStore = new Map<string, { otp: string; expires: number }>();
  otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 });

  res.json({ success: true, message: 'OTP sent (check logs in dev)' });
});

app.post('/auth/phone/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;

  const stored = otpStore?.get(phone);
  if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }

  // Find or create user
  let user = Array.from(users.values()).find(u => u.phone === phone);
  if (!user) {
    const user_id = `usr_${Date.now()}`;
    user = {
      user_id,
      phone,
      auth_methods: ['phone_otp'],
      company_ids: [],
      created_at: new Date()
    };
    users.set(user_id, user);
  } else {
    if (!user.auth_methods.includes('phone_otp')) {
      user.auth_methods.push('phone_otp');
    }
  }

  user.last_login = new Date();

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user.user_id);

  res.json({ user_id: user.user_id, token, refresh_token: refreshToken });
});

// ============================================
// BIOMETRIC (for mobile)
// ============================================

app.post('/auth/biometric/register', async (req, res) => {
  const { user_id, device_id, public_key } = req.body;

  // Store public key for biometric auth
  // In production: store in secure database
  const biometricKeys = new Map<string, { device_id: string; public_key: string }>();
  biometricKeys.set(user_id, { device_id, public_key });

  res.json({ success: true });
});

app.post('/auth/biometric/login', async (req, res) => {
  const { user_id, device_id, signature, challenge } = req.body;

  // Verify signature using stored public key
  // In production: crypto verify
  const key = biometricKeys?.get(user_id);
  if (!key || key.device_id !== device_id) {
    return res.status(401).json({ error: 'Biometric not registered' });
  }

  // Verify signature (simplified)
  // In production: crypto verify with public_key
  const verified = signature && challenge;

  if (!verified) {
    return res.status(401).json({ error: 'Biometric verification failed' });
  }

  const user = users.get(user_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.last_login = new Date();

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user.user_id);

  res.json({ user_id: user.user_id, token, refresh_token: refreshToken });
});

// ============================================
// TOKEN REFRESH
// ============================================

app.post('/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  try {
    const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET || 'secret') as unknown;
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    const user = users.get(decoded.user_id);
    if (!user) {
      throw new Error('User not found');
    }

    const token = generateToken(user);
    const newRefreshToken = generateRefreshToken(user.user_id);

    res.json({ token, refresh_token: newRefreshToken });

  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ============================================
// LINK ACCOUNTS
// ============================================

app.post('/auth/link', async (req, res) => {
  const { user_id, provider } = req.body;

  const user = users.get(user_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Return OAuth URL for linking
  if (provider === 'google') {
    const authUrl = `${PROVIDERS.google.auth_url}?` +
      `client_id=${PROVIDERS.google.client_id}` +
      `&redirect_uri=${process.env.GOOGLE_LINK_REDIRECT}` +
      `&response_type=code` +
      `&scope=email%20profile` +
      `&state=${user_id}`;

    return res.json({ auth_url: authUrl });
  }

  res.status(400).json({ error: 'Unsupported provider' });
});

// ============================================
// LOGOUT
// ============================================

app.post('/auth/logout', (req, res) => {
  // In production: invalidate tokens in Redis
  res.json({ success: true });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'sso', providers: ['google', 'apple', 'phone', 'biometric'] });
});

// ============================================
// START
// ============================================

const PORT = process.env.PORT || 4012;
app.listen(PORT, () => {
  logger.info(`REZ SSO Service running on port ${PORT}`);
});

export default app;
