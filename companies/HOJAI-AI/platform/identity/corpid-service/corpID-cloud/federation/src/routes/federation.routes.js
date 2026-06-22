/**
 * CorpID Cloud - Identity Federation Routes
 * SSO, SAML, OAuth, and OIDC endpoints
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../../shared/utils/logger.js';
import {
  ssoProviders,
  oauthProviders,
  oidcProviders,
  ssoLinks,
  SUPPORTED_OAUTH,
  registerSAMLProvider,
  registerOAuthProvider,
  registerOIDCProvider,
  getAllProviders,
  getProvider,
  initiateSSO,
  completeSSO,
  getSSOSession,
  linkSSOAccount,
  unlinkSSOAccount,
  getUserSSOLinks,
  updateProvider,
  deleteProvider,
  getFederationStats
} from '../models/federation.model.js';

const router = express.Router();

/**
 * Get supported OAuth providers
 * GET /api/federation/identity-providers
 */
router.get('/identity-providers',
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      supported: SUPPORTED_OAUTH
    });
  })
);

/**
 * List all identity providers
 * GET /api/federation/providers
 */
router.get('/providers',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.query;
    const providers = getAllProviders(organizationId);

    res.json({
      success: true,
      count: providers.length,
      providers: providers.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        providerType: p.providerType,
        providerKey: p.providerKey,
        enabled: p.enabled,
        status: p.status,
        scopes: p.scopes
      }))
    });
  })
);

/**
 * Register SAML provider
 * POST /api/federation/providers/saml
 */
router.post('/providers/saml',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { name, entityId, ssoUrl, sloUrl, certificate, attributeMap } = req.body;

    if (!name || !entityId || !ssoUrl) {
      throw new AppError('Name, entityId, and ssoUrl are required', 400, 'VALIDATION_ERROR');
    }

    const provider = registerSAMLProvider({
      ...req.body,
      organizationId: req.user.organizationId
    });

    dataAudit('federation.saml_provider_added', req, 'sso_provider', provider.id);

    res.status(201).json({ success: true, provider });
  })
);

/**
 * Register OAuth provider
 * POST /api/federation/providers/oauth
 */
router.post('/providers/oauth',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { name, providerKey, clientId, clientSecret, authorizationUrl, tokenUrl, userInfoUrl } = req.body;

    if (!name || !providerKey || !clientId || !clientSecret) {
      throw new AppError('Name, providerKey, clientId, and clientSecret are required', 400, 'VALIDATION_ERROR');
    }

    if (!SUPPORTED_OAUTH[providerKey] && !authorizationUrl) {
      throw new AppError('Either a supported providerKey or custom authorizationUrl is required', 400, 'VALIDATION_ERROR');
    }

    const provider = registerOAuthProvider({
      ...req.body,
      organizationId: req.user.organizationId
    });

    dataAudit('federation.oauth_provider_added', req, 'sso_provider', provider.id);

    res.status(201).json({ success: true, provider });
  })
);

/**
 * Register OIDC provider
 * POST /api/federation/providers/oidc
 */
router.post('/providers/oidc',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { name, issuer, clientId, clientSecret, discoveryUrl } = req.body;

    if (!name || !clientId || !clientSecret || (!issuer && !discoveryUrl)) {
      throw new AppError('Name, clientId, clientSecret, and either issuer or discoveryUrl are required', 400, 'VALIDATION_ERROR');
    }

    const provider = registerOIDCProvider({
      ...req.body,
      organizationId: req.user.organizationId
    });

    dataAudit('federation.oidc_provider_added', req, 'sso_provider', provider.id);

    res.status(201).json({ success: true, provider });
  })
);

/**
 * Get provider details
 * GET /api/federation/providers/:id
 */
router.get('/providers/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const provider = getProvider(req.params.id);
    if (!provider) {
      throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');
    }
    res.json({ success: true, provider });
  })
);

/**
 * Update provider
 * PUT /api/federation/providers/:id
 */
router.put('/providers/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const updated = updateProvider(req.params.id, req.body);
    if (!updated) {
      throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');
    }
    dataAudit('federation.provider_updated', req, 'sso_provider', req.params.id);
    res.json({ success: true, provider: updated });
  })
);

/**
 * Delete provider
 * DELETE /api/federation/providers/:id
 */
router.delete('/providers/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const deleted = deleteProvider(req.params.id);
    if (!deleted) {
      throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');
    }
    dataAudit('federation.provider_deleted', req, 'sso_provider', req.params.id);
    res.json({ success: true, message: 'Provider deleted' });
  })
);

// ============ SSO FLOW ============

/**
 * Initiate SSO login (public)
 * POST /api/federation/sso/initiate
 */
router.post('/sso/initiate',
  asyncHandler(async (req, res) => {
    const { providerId, redirectUri, state } = req.body;

    if (!providerId || !redirectUri) {
      throw new AppError('ProviderId and redirectUri are required', 400, 'VALIDATION_ERROR');
    }

    try {
      const result = initiateSSO(providerId, redirectUri, state);
      res.json({ success: true, ...result });
    } catch (error) {
      throw new AppError(error.message, 400, 'SSO_INITIATION_FAILED');
    }
  })
);

/**
 * SSO callback (public)
 * POST /api/federation/sso/callback
 */
router.post('/sso/callback',
  asyncHandler(async (req, res) => {
    const { sessionId, code, state, profile } = req.body;

    if (!sessionId) {
      throw new AppError('Session ID is required', 400, 'VALIDATION_ERROR');
    }

    // In production, would exchange code for tokens and fetch user profile
    // For this implementation, accept profile directly
    const session = completeSSO(sessionId, {
      externalId: profile?.id,
      email: profile?.email,
      name: profile?.name,
      avatar: profile?.avatar,
      userId: profile?.userId
    });

    if (!session) {
      throw new AppError('Invalid or expired SSO session', 400, 'INVALID_SSO_SESSION');
    }

    res.json({ success: true, session });
  })
);

/**
 * Get SSO session (public)
 * GET /api/federation/sso/sessions/:id
 */
router.get('/sso/sessions/:id',
  asyncHandler(async (req, res) => {
    const session = getSSOSession(req.params.id);
    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }
    res.json({ success: true, session });
  })
);

// ============ USER SSO LINKS ============

/**
 * Get my SSO links
 * GET /api/federation/me/links
 */
router.get('/me/links',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const links = getUserSSOLinks(req.user.id);
    res.json({ success: true, count: links.length, links });
  })
);

/**
 * Link SSO account
 * POST /api/federation/me/links
 */
router.post('/me/links',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { providerId, externalId, profile } = req.body;

    if (!providerId || !externalId) {
      throw new AppError('Provider ID and external ID are required', 400, 'VALIDATION_ERROR');
    }

    const link = linkSSOAccount(req.user.id, providerId, externalId, profile);
    dataAudit('federation.sso_linked', req, 'sso_link', `${req.user.id}:${providerId}`, { providerId });

    res.status(201).json({ success: true, link });
  })
);

/**
 * Unlink SSO account
 * DELETE /api/federation/me/links/:providerId
 */
router.delete('/me/links/:providerId',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const deleted = unlinkSSOAccount(req.user.id, req.params.providerId);
    if (!deleted) {
      throw new AppError('Link not found', 404, 'LINK_NOT_FOUND');
    }
    dataAudit('federation.sso_unlinked', req, 'sso_link', `${req.user.id}:${req.params.providerId}`);
    res.json({ success: true, message: 'SSO account unlinked' });
  })
);

// ============ SAML METADATA ============

/**
 * Get SAML SP metadata
 * GET /api/federation/saml/metadata
 */
router.get('/saml/metadata',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { providerId } = req.query;
    const provider = providerId ? getProvider(providerId) : null;

    // Generate SP metadata XML
    const metadata = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="urn:corpid:cloud">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://corpid.cloud/api/federation/saml/acs" index="0" isDefault="true"/>
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://corpid.cloud/api/federation/saml/slo"/>
  </SPSSODescriptor>
</EntityDescriptor>`;

    res.set('Content-Type', 'application/xml');
    res.send(metadata);
  })
);

// ============ STATS ============

/**
 * Get federation statistics
 * GET /api/federation/stats
 */
router.get('/stats',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const stats = getFederationStats();
    res.json({ success: true, stats });
  })
);

export default router;
