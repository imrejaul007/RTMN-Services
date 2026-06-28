/**
 * Shopify OAuth Routes
 * Complete OAuth 2.0 authentication flow for Shopify apps
 *
 * Flow:
 * 1. User clicks "Install" in Shopify App Store or admin
 * 2. Redirect to /auth/shopify?shop=mystore.myshopify.com
 * 3. Server validates shop domain and builds OAuth URL
 * 4. User authorizes app in Shopify
 * 5. Shopify redirects back with ?code=AUTH_CODE
 * 6. Server exchanges code for permanent access token
 * 7. Token stored securely in HOJAI's database (NOT metafields!)
 * 8. User redirected to app dashboard
 */

import express from 'express';
import Shopify from '@shopify/shopify-api';
import { storage } from '../services/storage.js';
import { logger } from '../utils/logger.js';
import { AppError, asyncHandler, validationError } from '../middleware/errorHandler.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * Validate shop domain format
 * Shopify stores have domains like: mystore.myshopify.com or mystore.shopify.com
 */
function validateShopDomain(shop) {
  if (!shop) {
    return { valid: false, error: 'Shop domain is required' };
  }

  // Normalize: remove protocol and trailing slash
  const normalizedShop = shop.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Check for valid Shopify domain patterns
  const validPatterns = [
    /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/,
    /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.shopify\.com$/
  ];

  for (const pattern of validPatterns) {
    if (pattern.test(normalizedShop)) {
      return { valid: true, shop: normalizedShop };
    }
  }

  // Also allow localhost for development
  if (process.env.NODE_ENV !== 'production') {
    const localhostPattern = /^localhost(:\d+)?$/;
    if (localhostPattern.test(normalizedShop)) {
      return { valid: true, shop: normalizedShop };
    }
  }

  return { valid: false, error: 'Invalid Shopify store domain' };
}

/**
 * Generate HMAC signature for OAuth state parameter
 */
function generateState(shop) {
  const payload = {
    shop,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex')
  };

  const state = Buffer.from(JSON.stringify(payload)).toString('base64');

  // Sign the state to prevent tampering
  const hmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET)
    .update(state)
    .digest('hex');

  return `${state}.${hmac}`;
}

/**
 * Verify HMAC signature on OAuth callback
 */
function verifyState(state) {
  try {
    const [payloadBase64, providedHmac] = state.split('.');
    const expectedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET)
      .update(payloadBase64)
      .digest('hex');

    if (providedHmac !== expectedHmac) {
      return { valid: false, error: 'Invalid state signature' };
    }

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

    // Check if state is too old (15 minutes)
    const maxAge = 15 * 60 * 1000;
    if (Date.now() - payload.timestamp > maxAge) {
      return { valid: false, error: 'State expired' };
    }

    return { valid: true, shop: payload.shop, nonce: payload.nonce };
  } catch (error) {
    return { valid: false, error: 'Invalid state format' };
  }
}

/**
 * GET /auth/shopify
 * Initiate OAuth flow - redirect to Shopify authorization page
 *
 * Query params:
 * - shop: The store domain (e.g., mystore.myshopify.com)
 * - returnTo: Optional path to redirect after successful auth
 */
router.get('/shopify', asyncHandler(async (req, res) => {
  const { shop, returnTo } = req.query;

  // Validate shop domain
  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    logger.warn('Invalid shop domain in OAuth start', { shop, error: validation.error });
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_SHOP',
        message: validation.error
      }
    });
  }

  const shopDomain = validation.shop;

  // Check if shop is already installed
  const existingSession = await storage.getSession(shopDomain);
  if (existingSession) {
    logger.info('Shop already authenticated, redirecting to app', { shop: shopDomain });

    // If already authenticated, redirect directly to app
    const redirectUrl = returnTo || `/?shop=${encodeURIComponent(shopDomain)}&auth=existing`;
    return res.redirect(redirectUrl);
  }

  // Generate state parameter with HMAC
  const state = generateState(shopDomain);

  // Store returnTo in session/cache for post-auth redirect
  if (returnTo) {
    await storage.storeOAuthState(state, { shop: shopDomain, returnTo });
  }

  try {
    // Build OAuth authorization URL
    const authUrl = await Shopify.Auth.beginAuth(
      req,
      res,
      shopDomain,
      returnTo ? `/auth/callback?returnTo=${encodeURIComponent(returnTo)}` : '/auth/callback',
      process.env.NODE_ENV === 'production'
    );

    logger.info('Redirecting to Shopify OAuth', {
      shop: shopDomain,
      authUrl: authUrl.substring(0, 100) + '...'
    });

    // Redirect to Shopify authorization page
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Failed to start OAuth flow', {
      shop: shopDomain,
      error: error.message
    });

    throw new AppError(
      'Failed to initiate Shopify authorization. Please try again.',
      500,
      'OAUTH_INIT_FAILED'
    );
  }
}));

/**
 * GET /auth/callback
 * Handle OAuth callback from Shopify
 *
 * Query params:
 * - code: Authorization code from Shopify
 * - hmac: HMAC signature for verification
 * - shop: Shop domain
 * - state: State parameter for CSRF protection
 * - timestamp: Request timestamp
 */
router.get('/callback', asyncHandler(async (req, res) => {
  const { code, hmac, shop, state } = req.query;

  // Validate required params
  if (!code || !shop) {
    throw validationError('Missing required OAuth parameters', [
      { param: !code ? 'code' : undefined },
      { param: !shop ? 'shop' : undefined }
    ].filter(Boolean));
  }

  // Validate shop domain
  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  // Verify state parameter if present
  if (state) {
    const stateValidation = verifyState(state);
    if (!stateValidation.valid) {
      logger.warn('Invalid OAuth state', { shop, error: stateValidation.error });
      throw new AppError('Invalid request state. Please try installing again.', 400, 'INVALID_STATE');
    }
  }

  try {
    // Complete OAuth flow and get access token
    const session = await Shopify.Auth.completeAuth(req, res);

    logger.info('OAuth flow completed successfully', {
      shop,
      scope: session.scope,
      expiresAt: session.expiresAt
    });

    // Store session securely in HOJAI's database
    // IMPORTANT: Never store tokens in Shopify metafields - security risk!
    await storage.storeSession(shop, {
      accessToken: session.accessToken,
      scope: session.scope,
      expiresAt: session.expiresAt?.toISOString?.() || new Date(Date.now() + 86400000 * 30).toISOString(),
      shop,
      isOnline: session.isOnline || true,
      // Additional session data
      createdAt: new Date().toISOString(),
      userId: session.user?.id,
      accountId: session.accountId
    });

    // Initialize default widget configuration
    await storage.storeWidgetConfig(shop, {
      shop,
      apiKey: process.env.HOJAI_API_KEY,
      companyId: shop,
      color: '#3B82F6',
      position: 'bottom-right',
      greeting: 'Hi! How can I help you today?',
      enabled: true,
      features: {
        chat: true,
        voice: false,
        products: true,
        cart: true,
        search: true,
        support: true
      },
      appearance: {
        showOnPages: ['all'],
        excludeUrls: [],
        customCss: ''
      },
      behavior: {
        showOnExitIntent: false,
        showOnScrollPercent: 0,
        autoOpenDelay: 0,
        showOncePerSession: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Notify HOJAI platform of new installation
    await notifyHOJAIPlatform(shop, 'installed', {
      shop,
      scope: session.scope
    });

    // Get return URL from stored state
    let returnTo = '/?auth=success';
    if (state) {
      const stateData = await storage.getOAuthState(state);
      if (stateData?.returnTo) {
        returnTo = stateData.returnTo;
      }
    }

    // Redirect to app dashboard
    logger.info('OAuth complete, redirecting to app', { shop, returnTo });
    res.redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}shop=${encodeURIComponent(shop)}`);

  } catch (error) {
    logger.error('OAuth callback failed', {
      shop,
      error: error.message,
      code: error.code
    });

    // Handle specific Shopify errors
    if (error.message?.includes('Invalid signature')) {
      throw new AppError('OAuth signature verification failed. Please try again.', 400, 'INVALID_SIGNATURE');
    }

    if (error.message?.includes('expired')) {
      throw new AppError('OAuth request expired. Please try again.', 400, 'EXPIRED_REQUEST');
    }

    throw new AppError(
      'Failed to complete Shopify authorization. Please try again.',
      500,
      'OAUTH_CALLBACK_FAILED'
    );
  }
}));

/**
 * GET /auth/status
 * Check authentication status for a shop
 *
 * Query params:
 * - shop: The store domain
 */
router.get('/status', asyncHandler(async (req, res) => {
  const { shop } = req.query;

  if (!shop) {
    throw validationError('Shop parameter is required');
  }

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  try {
    const session = await storage.getSession(shop);
    const config = await storage.getWidgetConfig(shop);

    // Check if token is expired
    let tokenExpired = false;
    if (session?.expiresAt) {
      tokenExpired = new Date(session.expiresAt) < new Date();
    }

    res.json({
      success: true,
      data: {
        authenticated: !!session && !tokenExpired,
        shop,
        hasToken: !!session?.accessToken,
        tokenExpired,
        scope: session?.scope || null,
        expiresAt: session?.expiresAt || null,
        installedAt: session?.createdAt || null,
        widgetEnabled: config?.enabled ?? false,
        config: config ? {
          color: config.color,
          position: config.position,
          greeting: config.greeting
        } : null
      }
    });
  } catch (error) {
    logger.error('Auth status check failed', { shop, error: error.message });
    throw new AppError('Failed to check authentication status', 500, 'STATUS_CHECK_FAILED');
  }
}));

/**
 * POST /auth/token/refresh
 * Refresh an expiring access token
 *
 * Body:
 * - shop: The store domain
 */
router.post('/token/refresh', asyncHandler(async (req, res) => {
  const { shop } = req.body;

  if (!shop) {
    throw validationError('Shop parameter is required');
  }

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  try {
    const session = await storage.getSession(shop);
    if (!session?.accessToken) {
      throw new AppError('No session found for this shop', 404, 'SESSION_NOT_FOUND');
    }

    // Use Shopify's token refresh endpoint
    const client = new Shopify.Clients.GraphQL(shop, session.accessToken);

    // Query to refresh the access token
    const mutation = `
      mutation {
        shopifyConnectAccessTokenRefresh {
          accessToken
          expiresAt
        }
      }
    `;

    const response = await client.query({
      data: { query: mutation }
    });

    if (response.body?.data?.shopifyConnectAccessTokenRefresh) {
      const { accessToken, expiresAt } = response.body.data.shopifyConnectAccessTokenRefresh;

      await storage.storeSession(shop, {
        ...session,
        accessToken,
        expiresAt
      });

      logger.info('Token refreshed successfully', { shop });

      res.json({
        success: true,
        data: {
          expiresAt
        }
      });
    } else {
      throw new AppError('Token refresh not supported by this shop', 400, 'REFRESH_NOT_SUPPORTED');
    }
  } catch (error) {
    logger.error('Token refresh failed', { shop, error: error.message });
    throw new AppError('Failed to refresh access token', 500, 'REFRESH_FAILED');
  }
}));

/**
 * DELETE /auth/uninstall
 * Uninstall the app and clean up data
 *
 * Body:
 * - shop: The store domain
 */
router.delete('/uninstall', asyncHandler(async (req, res) => {
  const { shop } = req.body;

  if (!shop) {
    throw validationError('Shop parameter is required');
  }

  const validation = validateShopDomain(shop);
  if (!validation.valid) {
    throw validationError('Invalid shop domain');
  }

  try {
    // Get session before deleting
    const session = await storage.getSession(shop);

    // Delete all shop data
    await storage.deleteShopData(shop);

    // Notify HOJAI platform
    await notifyHOJAIPlatform(shop, 'uninstalled', {
      shop,
      uninstalledAt: new Date().toISOString()
    });

    logger.info('App uninstalled', { shop });

    res.json({
      success: true,
      message: 'App successfully uninstalled'
    });
  } catch (error) {
    logger.error('Uninstall failed', { shop, error: error.message });
    throw new AppError('Failed to uninstall app', 500, 'UNINSTALL_FAILED');
  }
}));

/**
 * GET /auth/shops
 * List all installed shops (admin endpoint)
 */
router.get('/shops', asyncHandler(async (req, res) => {
  // In production, this would require admin authentication
  // For now, just return shop count
  const shops = await storage.listShops();

  res.json({
    success: true,
    data: {
      count: shops.length,
      shops: shops.map(s => ({
        shop: s.shop,
        installedAt: s.createdAt,
        widgetEnabled: s.enabled,
        lastActive: s.lastActiveAt
      }))
    }
  });
}));

/**
 * Notify HOJAI platform of installation/uninstallation events
 */
async function notifyHOJAIPlatform(shop, event, data) {
  if (!process.env.HOJAI_WEBHOOK_URL) {
    logger.debug('HOJAI webhook URL not configured, skipping notification');
    return;
  }

  try {
    const response = await fetch(`${process.env.HOJAI_WEBHOOK_URL}/api/v1/shopify/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HOJAI_API_KEY}`
      },
      body: JSON.stringify({
        event,
        shop,
        timestamp: new Date().toISOString(),
        ...data
      })
    });

    if (!response.ok) {
      logger.warn('Failed to notify HOJAI platform', {
        shop,
        event,
        status: response.status
      });
    }
  } catch (error) {
    // Don't fail the OAuth flow if HOJAI notification fails
    logger.error('HOJAI platform notification failed', {
      shop,
      event,
      error: error.message
    });
  }
}

export default router;