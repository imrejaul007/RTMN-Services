/**
 * Social Authentication Routes
 * Google, Apple, Facebook OAuth endpoints
 */

import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { GoogleAuth, generateState, verifyState } from '../services/socialAuthService';
import { redis } from '../config/redis';
import { User } from '../models/User';
import { logger } from '../config/logger';
import { authLimiter } from '../middleware/rateLimiter';
import { hashPassword } from '../services/tokenService';

// Environment variables (set in .env or cloud)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://rez-auth-service.onrender.com/api/social/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://rez.money';

const router = Router();

// Initialize Google Auth
const google = new GoogleAuth({
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  redirectUri: GOOGLE_REDIRECT_URI,
});

/**
 * GET /api/social/google
 * Initiates Google OAuth flow
 */
router.get('/google', authLimiter, async (req: Request, res: Response) => {
  try {
    const state = generateState();
    const redirectTo = req.query.redirect_uri as string || FRONTEND_URL;

    // Store state for verification
    await verifyState(redis, state).catch(() => {}); // Clear any existing
    await (redis as any).setex(`social:state:${state}`, 600, redirectTo); // 10 min TTL

    // Build Google auth URL
    const authUrl = google.getAuthUrl(state);
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Google OAuth init failed', { error });
    res.status(500).json({ error: 'OAuth initialization failed' });
  }
});

/**
 * GET /api/social/google/callback
 * Handles Google OAuth callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      logger.warn('Google OAuth error', { error });
      return res.redirect(`${FRONTEND_URL}/auth/error?reason=${error}`);
    }

    // Verify state
    if (!state || !(await verifyState(redis, state as string))) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Exchange code for tokens
    const tokens = await google.getTokens(code as string);
    const userInfo = await google.getUserInfo(tokens.accessToken);

    // Find or create user
    let user = await User.findOne({ email: userInfo.email });

    if (!user) {
      // Create new user
      const randomPassword = crypto.randomBytes(32).toString('hex');
      user = await User.create({
        email: userInfo.email,
        phoneNumber: '',  // Social users may not have phone
        passwordHash: await hashPassword(randomPassword),
        role: 'user',
        authMethods: ['google'],
        profileImage: userInfo.picture,
        socialProfiles: {
          google: { id: userInfo.id, connected: true, connectedAt: new Date() },
        },
      });
      logger.info('Social user created', { userId: user._id, provider: 'google' });
    } else {
      // Link Google to existing user
      user.socialProfiles = user.socialProfiles || {};
      user.socialProfiles.google = { id: userInfo.id, connected: true, connectedAt: new Date() };
      user.authMethods = [...new Set([...(user.authMethods || []), 'google'])];
      await user.save();
    }

    // Generate JWT
    const role = user.role || 'user';
    const jwt = await import('../services/tokenService').then(m => m.generateAccessToken(user._id.toString(), role));
    const refreshToken = await import('../services/tokenService').then(m => m.generateRefreshToken(user._id.toString(), role));

    // Redirect to frontend with tokens
    const redirectUrl = new URL(`${FRONTEND_URL}/auth/callback`);
    redirectUrl.searchParams.set('provider', 'google');
    redirectUrl.searchParams.set('access_token', jwt);
    redirectUrl.searchParams.set('refresh_token', refreshToken);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('Google OAuth callback failed', { error });
    res.redirect(`${FRONTEND_URL}/auth/error?reason=callback_failed`);
  }
});

/**
 * POST /api/social/google/verify-id-token
 * Verify Google ID token (for mobile/native apps)
 */
router.post('/google/verify-token', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Missing ID token' });
    }

    const userInfo = await google.verifyIdToken(idToken);

    // Find or create user
    let user = await User.findOne({ email: userInfo.email });
    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      user = await User.create({
        email: userInfo.email,
        phoneNumber: '',  // Social users may not have phone
        passwordHash: await hashPassword(randomPassword),
        role: 'user',
        authMethods: ['google'],
        socialProfiles: { google: { id: userInfo.id, connected: true } },
      });
    }

    const role = user.role || 'user';
    const accessToken = await import('../services/tokenService').then(m => m.generateAccessToken(user._id.toString(), role));
    const refreshToken = await import('../services/tokenService').then(m => m.generateRefreshToken(user._id.toString(), role));

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    logger.error('Google token verification failed', { error });
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
