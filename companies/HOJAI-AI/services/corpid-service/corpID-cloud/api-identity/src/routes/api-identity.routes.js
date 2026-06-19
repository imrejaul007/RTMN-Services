/**
 * CorpID Cloud - API Identity Routes
 * Routes for API keys, OAuth clients, and webhooks
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../shared/utils/logger.js';
import {
  apiKeys,
  oauthClients,
  webhooks,
  scopes,
  createApiKey,
  updateApiKey,
  revokeApiKey,
  rotateApiKey,
  recordApiKeyUsage,
  findApiKeyByRawKey,
  createOAuthClient,
  updateOAuthClient,
  rotateClientSecret,
  getOAuthClientByClientId,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  recordWebhookDelivery,
  getWebhookDeliveries,
  WEBHOOK_EVENTS
} from '../models/api-key.model.js';

const router = express.Router();

// ============ API KEY ROUTES ============

/**
 * Create API key
 * POST /api/api-keys
 */
router.post('/keys',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { name, description, scopes, expiresAt, rateLimit, environment, allowedIps } = req.body;

    if (!name) {
      throw new AppError('API key name is required', 400, 'VALIDATION_ERROR');
    }

    const apiKey = createApiKey({
      name,
      description,
      scopes: scopes || [],
      userId: req.user.id,
      organizationId: req.user.organizationId,
      expiresAt,
      rateLimit,
      environment,
      allowedIps,
      createdBy: req.user.id
    });

    dataAudit('api_key.created', req, 'api_key', apiKey.id);

    res.status(201).json({
      success: true,
      message: 'API key created. Save the key securely - it will not be shown again.',
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key, // Only shown once
        keyId: apiKey.keyId,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt
      }
    });
  })
);

/**
 * List user's API keys
 * GET /api/api-keys
 */
router.get('/keys',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const userKeys = Array.from(apiKeys.values())
      .filter(k => k.userId === req.user.id || k.organizationId === req.user.organizationId)
      .filter(k => k.status === 'active')
      .map(k => ({
        id: k.id,
        name: k.name,
        description: k.description,
        keyId: k.keyPrefix + '...',
        scopes: k.scopes,
        environment: k.environment,
        lastUsedAt: k.lastUsedAt,
        usageCount: k.usageCount,
        expiresAt: k.expiresAt,
        createdAt: k.createdAt
      }));

    res.json({
      success: true,
      count: userKeys.length,
      apiKeys: userKeys
    });
  })
);

/**
 * Get API key details
 * GET /api/api-keys/:id
 */
router.get('/keys/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const apiKey = apiKeys.get(req.params.id);

    if (!apiKey) {
      throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND');
    }

    if (apiKey.userId !== req.user.id && apiKey.organizationId !== req.user.organizationId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    res.json({
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        description: apiKey.description,
        keyId: apiKey.keyPrefix + '...',
        scopes: apiKey.scopes,
        environment: apiKey.environment,
        rateLimit: apiKey.rateLimit,
        lastUsedAt: apiKey.lastUsedAt,
        usageCount: apiKey.usageCount,
        expiresAt: apiKey.expiresAt,
        allowedIps: apiKey.allowedIps,
        createdAt: apiKey.createdAt
      }
    });
  })
);

/**
 * Update API key
 * PUT /api/api-keys/:id
 */
router.put('/keys/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const apiKey = apiKeys.get(req.params.id);

    if (!apiKey) {
      throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND');
    }

    if (apiKey.userId !== req.user.id && apiKey.organizationId !== req.user.organizationId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const updated = updateApiKey(req.params.id, req.body);

    dataAudit('api_key.updated', req, 'api_key', req.params.id);

    res.json({
      success: true,
      message: 'API key updated',
      apiKey: {
        id: updated.id,
        name: updated.name,
        scopes: updated.scopes,
        updatedAt: new Date().toISOString()
      }
    });
  })
);

/**
 * Revoke API key
 * DELETE /api/api-keys/:id
 */
router.delete('/keys/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const apiKey = apiKeys.get(req.params.id);

    if (!apiKey) {
      throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND');
    }

    if (apiKey.userId !== req.user.id && apiKey.organizationId !== req.user.organizationId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    revokeApiKey(req.params.id, req.user.id, req.body?.reason || 'user_revoked');

    dataAudit('api_key.revoked', req, 'api_key', req.params.id);

    res.json({
      success: true,
      message: 'API key revoked'
    });
  })
);

/**
 * Rotate API key
 * POST /api/api-keys/:id/rotate
 */
router.post('/keys/:id/rotate',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const apiKey = apiKeys.get(req.params.id);

    if (!apiKey) {
      throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND');
    }

    if (apiKey.userId !== req.user.id) {
      throw new AppError('Only the owner can rotate the key', 403, 'ACCESS_DENIED');
    }

    const rotated = rotateApiKey(req.params.id);

    dataAudit('api_key.rotated', req, 'api_key', req.params.id);

    res.json({
      success: true,
      message: 'API key rotated. Save the new key securely.',
      apiKey: {
        id: rotated.id,
        name: rotated.name,
        key: rotated.key
      }
    });
  })
);

// ============ SCOPES ROUTES ============

/**
 * List all scopes
 * GET /api/scopes
 */
router.get('/scopes',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const allScopes = Array.from(scopes.values());

    res.json({
      success: true,
      count: allScopes.length,
      scopes: allScopes
    });
  })
);

// ============ OAUTH CLIENT ROUTES ============

/**
 * Create OAuth client
 * POST /api/oauth/clients
 */
router.post('/oauth/clients',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { name, description, redirectUris, scopes: clientScopes, applicationType } = req.body;

    if (!name || !redirectUris || redirectUris.length === 0) {
      throw new AppError('Name and redirect URIs are required', 400, 'VALIDATION_ERROR');
    }

    const client = createOAuthClient({
      name,
      description,
      redirectUris,
      organizationId: req.user.organizationId,
      userId: req.user.id,
      scopes: clientScopes,
      applicationType,
      createdBy: req.user.id
    });

    dataAudit('oauth_client.created', req, 'oauth_client', client.id);

    res.status(201).json({
      success: true,
      message: 'OAuth client created',
      client: {
        id: client.id,
        name: client.name,
        clientId: client.clientId,
        clientSecret: client.clientSecret, // Only shown once
        redirectUris: client.redirectUris,
        scopes: client.scopes
      }
    });
  })
);

/**
 * List OAuth clients
 * GET /api/oauth/clients
 */
router.get('/oauth/clients',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const orgClients = Array.from(oauthClients.values())
      .filter(c => c.organizationId === req.user.organizationId)
      .map(c => ({
        id: c.id,
        name: c.name,
        clientId: c.clientId,
        redirectUris: c.redirectUris,
        scopes: c.scopes,
        status: c.status,
        createdAt: c.createdAt
      }));

    res.json({
      success: true,
      count: orgClients.length,
      clients: orgClients
    });
  })
);

/**
 * Rotate OAuth client secret
 * POST /api/oauth/clients/:id/rotate-secret
 */
router.post('/oauth/clients/:id/rotate-secret',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const client = oauthClients.get(req.params.id);

    if (!client) {
      throw new AppError('OAuth client not found', 404, 'OAUTH_CLIENT_NOT_FOUND');
    }

    if (client.organizationId !== req.user.organizationId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const rotated = rotateClientSecret(req.params.id);

    dataAudit('oauth_client.secret_rotated', req, 'oauth_client', req.params.id);

    res.json({
      success: true,
      message: 'Client secret rotated',
      client: {
        id: rotated.id,
        clientId: rotated.clientId,
        clientSecret: rotated.clientSecret
      }
    });
  })
);

// ============ WEBHOOK ROUTES ============

/**
 * List available webhook events
 * GET /api/webhooks/events
 */
router.get('/webhooks/events',
  requireAuth(),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      events: WEBHOOK_EVENTS
    });
  })
);

/**
 * Create webhook
 * POST /api/webhooks
 */
router.post('/webhooks',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { name, url, events, filters, retryPolicy, enabled } = req.body;

    if (!name || !url || !events || events.length === 0) {
      throw new AppError('Name, URL, and events are required', 400, 'VALIDATION_ERROR');
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new AppError('Invalid URL', 400, 'INVALID_URL');
    }

    const webhook = createWebhook({
      name,
      url,
      events,
      filters,
      retryPolicy,
      enabled,
      organizationId: req.user.organizationId,
      createdBy: req.user.id
    });

    dataAudit('webhook.created', req, 'webhook', webhook.id);

    res.status(201).json({
      success: true,
      message: 'Webhook created',
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        enabled: webhook.enabled,
        secret: webhook.secret // Only shown once
      }
    });
  })
);

/**
 * List webhooks
 * GET /api/webhooks
 */
router.get('/webhooks',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const orgWebhooks = Array.from(webhooks.values())
      .filter(w => w.organizationId === req.user.organizationId)
      .map(w => ({
        id: w.id,
        name: w.name,
        url: w.url,
        events: w.events,
        enabled: w.enabled,
        status: w.status,
        successCount: w.successCount,
        failureCount: w.failureCount,
        lastDeliveryAt: w.lastDeliveryAt,
        createdAt: w.createdAt
      }));

    res.json({
      success: true,
      count: orgWebhooks.length,
      webhooks: orgWebhooks
    });
  })
);

/**
 * Get webhook details
 * GET /api/webhooks/:id
 */
router.get('/webhooks/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const webhook = webhooks.get(req.params.id);

    if (!webhook) {
      throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND');
    }

    if (webhook.organizationId !== req.user.organizationId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    res.json({
      success: true,
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        filters: webhook.filters,
        enabled: webhook.enabled,
        retryPolicy: webhook.retryPolicy,
        successCount: webhook.successCount,
        failureCount: webhook.failureCount,
        lastDeliveryAt: webhook.lastDeliveryAt,
        createdAt: webhook.createdAt
      }
    });
  })
);

/**
 * Update webhook
 * PUT /api/webhooks/:id
 */
router.put('/webhooks/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const webhook = webhooks.get(req.params.id);

    if (!webhook) {
      throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND');
    }

    if (webhook.organizationId !== req.user.organizationId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    updateWebhook(req.params.id, req.body);

    dataAudit('webhook.updated', req, 'webhook', req.params.id);

    res.json({
      success: true,
      message: 'Webhook updated'
    });
  })
);

/**
 * Delete webhook
 * DELETE /api/webhooks/:id
 */
router.delete('/webhooks/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const webhook = webhooks.get(req.params.id);

    if (!webhook) {
      throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND');
    }

    if (webhook.organizationId !== req.user.organizationId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    deleteWebhook(req.params.id);

    dataAudit('webhook.deleted', req, 'webhook', req.params.id);

    res.json({
      success: true,
      message: 'Webhook deleted'
    });
  })
);

/**
 * Get webhook delivery history
 * GET /api/webhooks/:id/deliveries
 */
router.get('/webhooks/:id/deliveries',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const webhook = webhooks.get(req.params.id);

    if (!webhook) {
      throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND');
    }

    if (webhook.organizationId !== req.user.organizationId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const { limit = 50 } = req.query;
    const deliveries = getWebhookDeliveries(req.params.id, parseInt(limit));

    res.json({
      success: true,
      count: deliveries.length,
      deliveries
    });
  })
);

// ============ API KEY AUTHENTICATION MIDDLEWARE ============

/**
 * Middleware to authenticate requests using API key
 */
export async function apiKeyAuth(req, res, next) {
  const apiKeyHeader = req.headers['x-api-key'];

  if (!apiKeyHeader) {
    return res.status(401).json({
      success: false,
      error: { code: 'API_KEY_REQUIRED', message: 'API key required' }
    });
  }

  const apiKey = findApiKeyByRawKey(apiKeyHeader);

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_API_KEY', message: 'Invalid API key' }
    });
  }

  if (apiKey.status !== 'active') {
    return res.status(401).json({
      success: false,
      error: { code: 'API_KEY_INACTIVE', message: 'API key is not active' }
    });
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return res.status(401).json({
      success: false,
      error: { code: 'API_KEY_EXPIRED', message: 'API key has expired' }
    });
  }

  // Check IP whitelist
  if (apiKey.allowedIps && apiKey.allowedIps.length > 0) {
    const clientIp = req.ip;
    if (!apiKey.allowedIps.includes(clientIp)) {
      return res.status(403).json({
        success: false,
        error: { code: 'IP_NOT_ALLOWED', message: 'IP not in allowlist' }
      });
    }
  }

  // Record usage
  recordApiKeyUsage(apiKey.id);

  // Attach API key to request
  req.apiKey = {
    id: apiKey.id,
    name: apiKey.name,
    scopes: apiKey.scopes,
    userId: apiKey.userId,
    organizationId: apiKey.organizationId
  };

  next();
}

export default router;
