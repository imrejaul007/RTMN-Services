import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { logger } from '../config/logger';
import { redis } from '../config/redis';
import { authLimiter, oauthAuthorizeLimiter, oauthConsentLimiter, oauthTokenLimiter } from '../middleware/rateLimiter';
import { verifyOTP } from '../services/otpService';

/**
 * Timing-safe string comparison to prevent timing attacks on secret values.
 * Uses crypto.timingSafeEqual for constant-time comparison.
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

const OAUTH_STATE_TTL = 10 * 60; // 10 minutes
const OTP_ATTEMPT_PREFIX = 'oauth:otp_attempt:';
const OTP_MAX_ATTEMPTS = 5;
const OTP_WINDOW_SECONDS = 15 * 60; // 15 minutes

const router = Router();

/**
 * OAuth2 endpoints for partner apps (Rendez, Stay Owen, etc.)
 *
 * Flow:
 * 1. Partner app redirects user to /oauth/authorize
 * 2. User logs in with REZ credentials
 * 3. User approves the partner app
 * 4. REZ redirects back to partner with authorization code
 * 5. Partner exchanges code for access token at /oauth/token
 */

// Redis key prefixes
const REDIS_KEYS = {
  AUTH_CODE: 'oauth:auth_code:',
  TOKEN: 'oauth:token:',
  REFRESH_TOKEN: 'oauth:refresh:',
  PARTNERS: 'oauth:partners',
} as const;

// Authorization code TTL (10 minutes in seconds)
const AUTH_CODE_TTL = 600;

// Access token TTL (1 hour in seconds)
const ACCESS_TOKEN_TTL = 3600;

// Registered partner apps (in-memory for startup, can be cached in Redis)
const registeredPartners = new Map<string, {
  clientId: string;
  clientSecret: string;
  name: string;
  redirectUris: string[];
  scopes: string[];
}>();

function addPartner(
  key: string,
  clientId: string | undefined,
  clientSecret: string | undefined,
  redirectUri: string | undefined,
  name: string,
  defaultRedirectUri: string,
  scopes: string[],
) {
  if (!clientSecret) {
    logger.info(`[OAuth] Partner '${key}' not configured (PARTNER_${key.toUpperCase()}_CLIENT_SECRET not set — skipping)`);
    return;
  }
  registeredPartners.set(key, {
    clientId: clientId || key,
    clientSecret,
    name,
    redirectUris: [redirectUri || defaultRedirectUri],
    scopes,
  });
  logger.info(`[OAuth] Registered partner: ${name} (${key})`);
}

function initializePartners() {
  // Existing partners (required — service fails if not configured)
  const PARTNER_RENDEZ_SECRET = process.env.PARTNER_RENDEZ_CLIENT_SECRET;
  const PARTNER_STAY_OWEN_SECRET = process.env.PARTNER_STAY_OWEN_CLIENT_SECRET;
  const PARTNER_ADBAZAAR_SECRET = process.env.PARTNER_ADBAZAAR_CLIENT_SECRET;

  if (!PARTNER_RENDEZ_SECRET) throw new Error('[FATAL] PARTNER_RENDEZ_CLIENT_SECRET is not set');
  if (!PARTNER_STAY_OWEN_SECRET) throw new Error('[FATAL] PARTNER_STAY_OWEN_CLIENT_SECRET is not set');
  if (!PARTNER_ADBAZAAR_SECRET) throw new Error('[FATAL] PARTNER_ADBAZAAR_CLIENT_SECRET is not set');

  addPartner(
    'rendez-app',
    process.env.PARTNER_RENDEZ_CLIENT_ID,
    PARTNER_RENDEZ_SECRET,
    process.env.PARTNER_RENDEZ_REDIRECT_URI,
    'Rendez',
    'http://localhost:3000/api/auth/callback',
    ['profile', 'wallet:read', 'wallet:hold'],
  );

  addPartner(
    'stay-owen',
    process.env.PARTNER_STAY_OWEN_CLIENT_ID,
    PARTNER_STAY_OWEN_SECRET,
    process.env.PARTNER_STAY_OWEN_REDIRECT_URI,
    'Stay Owen (Hotel OTA)',
    'http://localhost:4000/api/auth/callback',
    ['profile', 'wallet:read', 'wallet:hold', 'bookings'],
  );

  addPartner(
    'adbazaar',
    process.env.PARTNER_ADBAZAAR_CLIENT_ID,
    PARTNER_ADBAZAAR_SECRET,
    process.env.PARTNER_ADBAZAAR_REDIRECT_URI,
    'AdBazaar',
    'http://localhost:3000/api/auth/callback',
    ['profile', 'wallet:read', 'campaigns'],
  );

  // New partners (optional — logged and skipped if credentials not set)
  addPartner(
    'rez-now',
    process.env.PARTNER_REZNOW_CLIENT_ID,
    process.env.PARTNER_REZNOW_CLIENT_SECRET,
    process.env.PARTNER_REZNOW_REDIRECT_URI,
    'REZ Now',
    'http://localhost:3000/api/auth/callback',
    ['profile', 'wallet:read'],
  );

  addPartner(
    'hotel-pms',
    process.env.PARTNER_HOTEL_PMS_CLIENT_ID,
    process.env.PARTNER_HOTEL_PMS_CLIENT_SECRET,
    process.env.PARTNER_HOTEL_PMS_REDIRECT_URI,
    'Hotel PMS',
    'http://localhost:3001/api/auth/callback',
    ['profile', 'bookings'],
  );

  addPartner(
    'hotel-panel',
    process.env.PARTNER_HOTEL_PANEL_CLIENT_ID,
    process.env.PARTNER_HOTEL_PANEL_CLIENT_SECRET,
    process.env.PARTNER_HOTEL_PANEL_REDIRECT_URI,
    'Hotel Panel',
    'http://localhost:3002/api/auth/callback',
    ['profile', 'hotel:manage'],
  );

  addPartner(
    'nextabizz',
    process.env.PARTNER_NEXTABIZZ_CLIENT_ID,
    process.env.PARTNER_NEXTABIZZ_CLIENT_SECRET,
    process.env.PARTNER_NEXTABIZZ_REDIRECT_URI,
    'NextaBiZ',
    'http://localhost:3000/api/auth/callback', // dev default; overridden by PARTNER_NEXTABIZZ_REDIRECT_URI
    ['profile', 'merchant'],
  );

  addPartner(
    'rez-merchant',
    process.env.PARTNER_REZ_MERCHANT_CLIENT_ID,
    process.env.PARTNER_REZ_MERCHANT_CLIENT_SECRET,
    process.env.PARTNER_REZ_MERCHANT_REDIRECT_URI,
    'REZ Merchant Service',
    'http://localhost:4005/api/auth/callback',
    ['profile', 'orders', 'inventory'],
  );
}
initializePartners();

// Note: Redis TTL handles authorization code expiration automatically

/**
 * GET /oauth/authorize
 * Authorization endpoint - shows login form and consent page
 *
 * Query params:
 *   client_id: Partner app client ID
 *   redirect_uri: Callback URL (must match registered URI)
 *   scope: Space-separated list of requested scopes
 *   state: Random string for CSRF protection
 *   response_type: "code" (only supported)
 */
// SECURITY FIX (AUTH-RATELIMIT-001): Use dedicated OAuth rate limiter
router.get('/authorize', oauthAuthorizeLimiter, async (req: Request, res: Response) => {
  const { client_id, redirect_uri, scope, state, response_type } = req.query;

  // Validate response_type
  if (response_type !== 'code') {
    res.status(400).json({ error: 'unsupported_response_type', error_description: 'Only "code" is supported' });
    return;
  }

  // Validate client_id
  if (!client_id || typeof client_id !== 'string') {
    res.status(400).json({ error: 'invalid_request', error_description: 'client_id is required' });
    return;
  }

  // Find partner
  const partner = Array.from(registeredPartners.values()).find(p => p.clientId === client_id);
  if (!partner) {
    res.status(400).json({ error: 'invalid_client', error_description: 'Unknown client_id' });
    return;
  }

  // Validate redirect_uri
  if (!redirect_uri || typeof redirect_uri !== 'string') {
    res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri is required' });
    return;
  }

  if (!partner.redirectUris.includes(redirect_uri)) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Invalid redirect_uri' });
    return;
  }

  // Validate scope
  const requestedScopes = scope ? (scope as string).split(' ') : partner.scopes;
  const invalidScopes = requestedScopes.filter(s => !partner.scopes.includes(s));
  if (invalidScopes.length > 0) {
    res.status(400).json({ error: 'invalid_scope', error_description: `Invalid scopes: ${invalidScopes.join(', ')}` });
    return;
  }

  // Store OAuth params in Redis for consent step (10 min TTL)
  const oauthState = `${partner.clientId}:${redirect_uri}:${requestedScopes.join(' ')}:${state || ''}`;
  await redis.set(`oauth:params:${state}`, oauthState, 'EX', OAUTH_STATE_TTL);

  // For API-based flow, return authorization URL for redirect
  // The frontend should redirect user to this URL after login
  const baseUrl = process.env.OAUTH_AUTHORIZE_BASE_URL || `${req.protocol}://${req.get('host')}`;

  res.json({
    authorization_url: `${baseUrl}/oauth/consent`,
    state,  // Frontend must pass this to /oauth/consent
    client_id: partner.clientId,
    client_name: partner.name,
    requested_scopes: requestedScopes,
    scope_descriptions: {
      'profile': 'View your profile information',
      'wallet:read': 'View your REZ wallet balance',
      'wallet:hold': 'Hold/release funds for transactions',
      'bookings': 'View and manage your bookings',
      'campaigns': 'Manage advertising campaigns',
      'hotel:manage': 'Manage hotel property and inventory',
      'merchant': 'Access merchant features and payouts',
      'orders': 'View and manage orders',
      'inventory': 'Access inventory management',
    },
  });
});

/**
 * POST /oauth/consent
 * Process user consent and generate authorization code
 *
 * Body:
 *   phone: User phone number
 *   otp: OTP code
 *   approved: boolean (true = approve, false = deny)
 */
// SECURITY FIX (AUTH-RATELIMIT-001): Use dedicated OAuth rate limiter
router.post('/consent', oauthConsentLimiter, async (req: Request, res: Response) => {
  const { phone, otp, approved, state } = req.body;

  if (!state) {
    res.status(400).json({ error: 'invalid_request', error_description: 'State is required' });
    return;
  }

  // Retrieve OAuth params from Redis
  const oauthParamsStr = await redis.get(`oauth:params:${state}`);
  if (!oauthParamsStr) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Session expired or invalid' });
    return;
  }

  // Parse stored params: clientId:redirectUri:scope:state
  const [clientId, redirectUri, scope, storedState] = oauthParamsStr.split(':');

  // Delete after reading (one-time use)
  // PERF: UNLINK returns immediately while Redis deletes asynchronously in background.
  await redis.unlink(`oauth:params:${state}`);

  if (!approved) {
    // User denied consent - redirect with error
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set('error', 'access_denied');
    errorUrl.searchParams.set('error_description', 'User denied the request');
    if (storedState) errorUrl.searchParams.set('state', storedState);
    res.redirect(errorUrl.toString());
    return;
  }

  // Verify user credentials with real OTP verification
  try {
    // OTP rate limiter (VULN-2 fix: prevent brute-force OTP guessing)
    const rateKey = `${OTP_ATTEMPT_PREFIX}${phone}`;
    const attempts = await redis.incr(rateKey);
    if (attempts === 1) {
      await redis.expire(rateKey, OTP_WINDOW_SECONDS);
    }
    if (attempts > OTP_MAX_ATTEMPTS) {
      logger.warn('[OAuth] OTP rate limited', { phone: phone.slice(-4).padStart(phone.length, '*') });
      res.status(429).json({ error: 'rate_limited', error_description: 'Too many attempts. Please try again later.' });
      return;
    }

    // Validate OTP format first
    if (!otp || otp.length !== 6) {
      res.status(400).json({ error: 'invalid_request', error_description: 'Invalid OTP format' });
      return;
    }

    // CRITICAL FIX: Actually verify the OTP against the stored hash
    const otpResult = await verifyOTP(phone, otp);
    if (!otpResult.valid) {
      const reason = otpResult.reason === 'locked'
        ? 'Account locked due to too many failed attempts'
        : otpResult.reason === 'not_found'
        ? 'OTP expired or not found'
        : 'Invalid OTP';
      logger.warn('[OAuth] OTP verification failed', { phone: phone.slice(-4).padStart(phone.length, '*'), reason: otpResult.reason });
      res.status(401).json({ error: 'invalid_credentials', error_description: reason });
      return;
    }

    // Find user by phone
    const user = await User.findOne({ phoneNumber: phone });
    if (!user) {
      res.status(401).json({ error: 'invalid_credentials', error_description: 'User not found' });
      return;
    }

    // Generate authorization code (10 min expiry via Redis TTL)
    const code = crypto.randomUUID();
    const codeData = {
      clientId,
      redirectUri,
      userId: user._id.toString(),
      scope,
    };

    // Store in Redis with TTL (Redis auto-expires after 10 minutes)
    await redis.setex(
      `${REDIS_KEYS.AUTH_CODE}${code}`,
      AUTH_CODE_TTL,
      JSON.stringify(codeData)
    );

    logger.info('[OAuth] Authorization code generated', {
      clientId,
      userId: user._id,
      scope,
    });

    // Redirect with code
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (storedState) redirectUrl.searchParams.set('state', storedState);

    res.json({
      success: true,
      redirect_url: redirectUrl.toString(),
    });
  } catch (error) {
    logger.error('[OAuth] Consent error:', error);
    res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
  }
});

/**
 * POST /oauth/token
 * Exchange authorization code for access token
 *
 * Body:
 *   grant_type: "authorization_code"
 *   code: Authorization code
 *   redirect_uri: Must match original request
 *   client_id: Partner app client ID
 *   client_secret: Partner app client secret
 */
// SECURITY FIX (AUTH-RATELIMIT-001): Use dedicated OAuth rate limiter
router.post('/token', oauthTokenLimiter, async (req: Request, res: Response) => {
  const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;

  if (grant_type !== 'authorization_code') {
    res.status(400).json({ error: 'unsupported_grant_type' });
    return;
  }

  // Validate client credentials
  const partner = Array.from(registeredPartners.values()).find(p => p.clientId === client_id);
  // C14: Use timing-safe comparison for client secret to prevent timing attacks
  if (!partner || !safeCompare(partner.clientSecret, client_secret || '')) {
    res.status(401).json({ error: 'invalid_client' });
    return;
  }

  // Validate code
  if (!code) {
    res.status(400).json({ error: 'invalid_request', error_description: 'code is required' });
    return;
  }

  // Retrieve from Redis (handles TTL automatically)
  const codeJson = await redis.get(`${REDIS_KEYS.AUTH_CODE}${code}`);
  if (!codeJson) {
    res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired code' });
    return;
  }

  const codeData = JSON.parse(codeJson);

  // Validate redirect_uri
  if (codeData.redirectUri !== redirect_uri) {
    res.status(400).json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' });
    return;
  }

  // Delete used code from Redis
  // PERF: UNLINK returns immediately while Redis deletes asynchronously in background.
  await redis.unlink(`${REDIS_KEYS.AUTH_CODE}${code}`);

  // Generate tokens
  const accessToken = crypto.randomBytes(32).toString('hex');
  const refreshToken = crypto.randomUUID();
  const expiresIn = ACCESS_TOKEN_TTL;

  // Store access token in Redis with TTL
  const tokenData = {
    userId: codeData.userId,
    clientId: codeData.clientId,
    scope: codeData.scope,
    refreshToken,
  };
  await redis.setex(
    `${REDIS_KEYS.TOKEN}${accessToken}`,
    ACCESS_TOKEN_TTL,
    JSON.stringify(tokenData)
  );

  // Store refresh token in Redis (no TTL - invalidated on use)
  const refreshData = {
    userId: codeData.userId,
    clientId: codeData.clientId,
    scope: codeData.scope,
  };
  await redis.setex(
    `${REDIS_KEYS.REFRESH_TOKEN}${refreshToken}`,
    30 * 24 * 3600, // 30 days TTL for refresh tokens
    JSON.stringify(refreshData)
  );

  logger.info('[OAuth] Token issued', {
    clientId: codeData.clientId,
    userId: codeData.userId,
    scope: codeData.scope,
  });

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    refresh_token: refreshToken,
    scope: codeData.scope,
  });
});

/**
 * GET /oauth/userinfo
 * Get user info with access token
 *
 * Headers:
 *   Authorization: Bearer <access_token>
 */
router.get('/userinfo', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  const accessToken = authHeader.slice(7);

  // Retrieve from Redis (TTL handles expiration)
  const tokenJson = await redis.get(`${REDIS_KEYS.TOKEN}${accessToken}`);
  if (!tokenJson) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  const tokenInfo = JSON.parse(tokenJson);

  try {
    const user = await User.findById(tokenInfo.userId).select('-password -__v');
    if (!user) {
      res.status(404).json({ error: 'user_not_found' });
      return;
    }

    res.json({
      sub: user._id,
      phone: user.phoneNumber,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      scope: tokenInfo.scope,
    });
  } catch (error) {
    logger.error('[OAuth] Userinfo error:', error);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * POST /oauth/refresh
 * Refresh access token with rotation
 *
 * Security: Implements refresh token rotation per RFC 6819
 * - Each refresh generates a new refresh token
 * - Old refresh token is invalidated immediately
 * - Token reuse detection: if a rotated token is used again,
 *   ALL tokens for that user/client are revoked (theft signal)
 *
 * Body:
 *   grant_type: "refresh_token"
 *   refresh_token: Refresh token
 *   client_id: Partner app client ID
 *   client_secret: Partner app client secret
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const { grant_type, refresh_token, client_id, client_secret } = req.body;

  if (grant_type !== 'refresh_token') {
    res.status(400).json({ error: 'unsupported_grant_type' });
    return;
  }

  // Validate client credentials
  const partner = Array.from(registeredPartners.values()).find(p => p.clientId === client_id);
  // C14: Use timing-safe comparison for client secret to prevent timing attacks
  if (!partner || !safeCompare(partner.clientSecret, client_secret || '')) {
    res.status(401).json({ error: 'invalid_client' });
    return;
  }

  if (!refresh_token) {
    res.status(400).json({ error: 'invalid_request', error_description: 'refresh_token is required' });
    return;
  }

  // Compute hash of the refresh token for reuse detection
  const refreshTokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
  const usedTokenKey = `oauth:refresh_used:${refreshTokenHash}`;
  const REFRESH_TTL = 30 * 24 * 3600; // 30 days

  // SEC-001: Token reuse detection
  // If this token's hash exists in used tokens, it means it was already rotated
  // This is a theft signal - revoke all tokens for this user/client
  const wasAlreadyUsed = await redis.exists(usedTokenKey);
  if (wasAlreadyUsed) {
    // Retrieve token info for logging before it's deleted
    const refreshJson = await redis.get(`${REDIS_KEYS.REFRESH_TOKEN}${refresh_token}`);
    const tokenInfo = refreshJson ? JSON.parse(refreshJson) : { userId: 'unknown', clientId: client_id };

    // CRITICAL SECURITY: Token reuse detected - potential theft
    // Revoke ALL tokens for this user/client combination
    logger.error('[OAuth] SECURITY: Refresh token reuse detected - revoking all tokens', {
      userId: tokenInfo.userId,
      clientId: tokenInfo.clientId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Revoke all refresh tokens for this user/client (they all share the same family)
    const familyPattern = `oauth:refresh_family:${tokenInfo.userId}:${tokenInfo.clientId}*`;
    const familyKeys = await redis.keys(familyPattern);
    if (familyKeys.length > 0) {
      await redis.unlink(...familyKeys);
    }

    // Also revoke any existing access tokens for this user/client
    const accessPattern = `oauth:token:*`;
    const allTokenKeys = await redis.keys(accessPattern);
    const userTokens = allTokenKeys.filter(async (key) => {
      const data = await redis.get(key);
      if (!data) return false;
      try {
        const parsed = JSON.parse(data);
        return parsed.userId === tokenInfo.userId && parsed.clientId === tokenInfo.clientId;
      } catch {
        return false;
      }
    });
    if (userTokens.length > 0) {
      await redis.unlink(...userTokens);
    }

    // Return error forcing re-authentication
    res.status(401).json({
      error: 'invalid_grant',
      error_description: 'Token reuse detected. All sessions have been revoked for security. Please re-authenticate.',
      code: 'TOKEN_REUSE_DETECTED',
    });
    return;
  }

  // Retrieve from Redis
  const refreshJson = await redis.get(`${REDIS_KEYS.REFRESH_TOKEN}${refresh_token}`);
  if (!refreshJson) {
    res.status(400).json({ error: 'invalid_grant' });
    return;
  }

  const tokenInfo = JSON.parse(refreshJson);

  // Mark this token as used (for reuse detection)
  // TTL = same as refresh token lifetime (30 days)
  // This allows detecting if a rotated token is used again
  await redis.setex(usedTokenKey, REFRESH_TTL, '1');

  // Generate new tokens
  const accessToken = crypto.randomBytes(32).toString('hex');
  const newRefreshToken = crypto.randomUUID();
  const expiresIn = ACCESS_TOKEN_TTL;

  // SEC-001: Token rotation - delete old refresh token AFTER marking as used
  // PERF: UNLINK returns immediately while Redis deletes asynchronously in background.
  await redis.unlink(`${REDIS_KEYS.REFRESH_TOKEN}${refresh_token}`);

  // Store new access token
  const tokenData = {
    userId: tokenInfo.userId,
    clientId: tokenInfo.clientId,
    scope: tokenInfo.scope,
    refreshToken: newRefreshToken,
  };
  await redis.setex(
    `${REDIS_KEYS.TOKEN}${accessToken}`,
    ACCESS_TOKEN_TTL,
    JSON.stringify(tokenData)
  );

  // Store new refresh token (30 day TTL)
  const newRefreshData = {
    userId: tokenInfo.userId,
    clientId: tokenInfo.clientId,
    scope: tokenInfo.scope,
  };
  await redis.setex(
    `${REDIS_KEYS.REFRESH_TOKEN}${newRefreshToken}`,
    REFRESH_TTL,
    JSON.stringify(newRefreshData)
  );

  // Store family tracking key (current valid refresh token for this user/client)
  // This allows enumerating and revoking all tokens for a user
  await redis.setex(
    `oauth:refresh_family:${tokenInfo.userId}:${tokenInfo.clientId}:current`,
    REFRESH_TTL,
    crypto.createHash('sha256').update(newRefreshToken).digest('hex')
  );

  logger.info('[OAuth] Token refreshed with rotation', {
    userId: tokenInfo.userId,
    clientId: tokenInfo.clientId,
  });

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    refresh_token: newRefreshToken,
    scope: tokenInfo.scope,
  });
});

/**
 * POST /oauth/revoke
 * Revoke access token
 *
 * Body:
 *   token: Token to revoke
 *   client_id: Partner app client ID
 *   client_secret: Partner app client secret
 */
router.post('/revoke', async (req: Request, res: Response) => {
  const { token, client_id, client_secret } = req.body;

  // Validate client credentials
  const partner = Array.from(registeredPartners.values()).find(p => p.clientId === client_id);
  // C14: Use timing-safe comparison for client secret to prevent timing attacks
  if (!partner || !safeCompare(partner.clientSecret, client_secret || '')) {
    res.status(401).json({ error: 'invalid_client' });
    return;
  }

  // Revoke token from Redis (check both access and refresh token keys)
  // PERF: Pipeline both UNLINK calls into a single round-trip instead of 2 sequential calls.
  const pipeline = redis.pipeline();
  pipeline.unlink(`${REDIS_KEYS.TOKEN}${token}`);
  pipeline.unlink(`${REDIS_KEYS.REFRESH_TOKEN}${token}`);
  await pipeline.exec();

  res.json({ success: true });
});

export default router;
