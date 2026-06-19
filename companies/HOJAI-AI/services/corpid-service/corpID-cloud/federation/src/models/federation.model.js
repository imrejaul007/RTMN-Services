/**
 * CorpID Cloud - Identity Federation Model
 * SSO, SAML, OAuth, and OIDC federation
 */

import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../../../shared/utils/security.js';

// ============ IN-MEMORY STORES ============

export const ssoProviders = new Map();   // providerId -> SAML Provider
export const oauthProviders = new Map();  // providerId -> OAuth Provider
export const oidcProviders = new Map();   // providerId -> OIDC Provider
export const ssoSessions = new Map();     // sessionId -> SSOSession
export const ssoLinks = new Map();        // userId+provider -> Link

// ============ SUPPORTED PROVIDERS ============

export const SUPPORTED_OAUTH = {
  google: { name: 'Google', icon: 'google', scopes: ['openid', 'email', 'profile'] },
  apple: { name: 'Apple', icon: 'apple', scopes: ['name', 'email'] },
  microsoft: { name: 'Microsoft', icon: 'microsoft', scopes: ['openid', 'email', 'profile'] },
  facebook: { name: 'Facebook', icon: 'facebook', scopes: ['email', 'public_profile'] },
  github: { name: 'GitHub', icon: 'github', scopes: ['user:email', 'read:user'] },
  linkedin: { name: 'LinkedIn', icon: 'linkedin', scopes: ['r_liteprofile', 'r_emailaddress'] },
  twitter: { name: 'Twitter', icon: 'twitter', scopes: ['tweet.read', 'users.read'] }
};

// ============ MODEL FACTORY ============

/**
 * Register SAML provider
 */
export function registerSAMLProvider(data) {
  const providerId = `saml-${uuidv4().slice(0, 12)}`;
  const now = new Date().toISOString();

  const provider = {
    id: providerId,
    name: data.name,
    type: 'saml',

    // SAML config
    entityId: data.entityId,
    ssoUrl: data.ssoUrl,
    sloUrl: data.sloUrl,
    certificate: data.certificate,
    metadataUrl: data.metadataUrl,

    // Settings
    signRequests: data.signRequests || false,
    encryptedAssertions: data.encryptedAssertions || false,
    signatureAlgorithm: data.signatureAlgorithm || 'sha256',

    // Attribute mapping
    attributeMap: data.attributeMap || {
      email: 'email',
      name: 'name',
      firstName: 'given_name',
      lastName: 'family_name'
    },

    // Organization
    organizationId: data.organizationId,

    // Status
    status: 'active',
    enabled: data.enabled !== false,

    // Timestamps
    createdAt: now,
    updatedAt: now
  };

  ssoProviders.set(providerId, provider);
  return provider;
}

/**
 * Register OAuth provider
 */
export function registerOAuthProvider(data) {
  const providerId = `oauth-${uuidv4().slice(0, 12)}`;
  const now = new Date().toISOString();

  const provider = {
    id: providerId,
    name: data.name,
    type: 'oauth',
    providerKey: data.providerKey, // google, apple, etc.

    // Config
    clientId: data.clientId,
    clientSecret: data.clientSecret, // Encrypted in production
    authorizationUrl: data.authorizationUrl,
    tokenUrl: data.tokenUrl,
    userInfoUrl: data.userInfoUrl,

    // Scopes
    scopes: data.scopes || SUPPORTED_OAUTH[data.providerKey]?.scopes || ['openid', 'email', 'profile'],

    // Settings
    pkce: data.pkce !== false,
    autoLink: data.autoLink || false, // Auto-link if email matches

    // Claims mapping
    claimsMap: data.claimsMap || {
      id: 'sub',
      email: 'email',
      name: 'name',
      avatar: 'picture'
    },

    // Organization
    organizationId: data.organizationId,

    // Status
    status: 'active',
    enabled: data.enabled !== false,

    createdAt: now,
    updatedAt: now
  };

  oauthProviders.set(providerId, provider);
  return provider;
}

/**
 * Register OIDC provider
 */
export function registerOIDCProvider(data) {
  const providerId = `oidc-${uuidv4().slice(0, 12)}`;
  const now = new Date().toISOString();

  const provider = {
    id: providerId,
    name: data.name,
    type: 'oidc',

    // OIDC config
    issuer: data.issuer,
    clientId: data.clientId,
    clientSecret: data.clientSecret, // Encrypted
    discoveryUrl: data.discoveryUrl,

    // Endpoints (auto-discovered)
    authorizationEndpoint: data.authorizationEndpoint,
    tokenEndpoint: data.tokenEndpoint,
    userInfoEndpoint: data.userInfoEndpoint,
    jwksUri: data.jwksUri,

    // Scopes
    scopes: data.scopes || ['openid', 'email', 'profile'],

    // Settings
    responseTypes: data.responseTypes || ['code'],
    grantTypes: data.grantTypes || ['authorization_code'],
    pkce: data.pkce !== false,

    // Claims
    claimsMap: data.claimsMap || {
      id: 'sub',
      email: 'email',
      name: 'name',
      avatar: 'picture'
    },

    // Organization
    organizationId: data.organizationId,

    // Status
    status: 'active',
    enabled: data.enabled !== false,

    createdAt: now,
    updatedAt: now
  };

  oidcProviders.set(providerId, provider);
  return provider;
}

/**
 * Get all providers
 */
export function getAllProviders(organizationId = null) {
  const all = [];

  for (const p of ssoProviders.values()) {
    if (!organizationId || p.organizationId === organizationId) {
      all.push({ ...p, providerType: 'saml' });
    }
  }
  for (const p of oauthProviders.values()) {
    if (!organizationId || p.organizationId === organizationId) {
      all.push({ ...p, providerType: 'oauth' });
    }
  }
  for (const p of oidcProviders.values()) {
    if (!organizationId || p.organizationId === organizationId) {
      all.push({ ...p, providerType: 'oidc' });
    }
  }

  return all;
}

/**
 * Get provider by ID
 */
export function getProvider(id) {
  return ssoProviders.get(id) || oauthProviders.get(id) || oidcProviders.get(id) || null;
}

/**
 * Initiate SSO login
 */
export function initiateSSO(providerId, redirectUri, state = null) {
  const provider = getProvider(providerId);
  if (!provider || !provider.enabled) {
    throw new Error('Provider not found or disabled');
  }

  const sessionId = `sso-${uuidv4().slice(0, 12)}}`;
  const sessionState = state || generateToken(16);

  const session = {
    id: sessionId,
    providerId,
    userId: null, // Set after callback
    redirectUri,
    state: sessionState,
    status: 'initiated',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
  };

  ssoSessions.set(sessionId, session);

  // Build authorization URL based on provider type
  let authUrl = '';
  if (provider.type === 'oauth' || provider.type === 'oidc') {
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider.scopes.join(' '),
      state: sessionState
    });

    if (provider.type === 'oauth') {
      authUrl = `${provider.authorizationUrl}?${params.toString()}`;
    } else {
      authUrl = `${provider.authorizationEndpoint}?${params.toString()}`;
    }
  } else if (provider.type === 'saml') {
    // For SAML, would build SAML AuthnRequest
    authUrl = `${provider.ssoUrl}?SAMLRequest=${Buffer.from(`<samlp:AuthnRequest>...</samlp:AuthnRequest>`).toString('base64')}&RelayState=${sessionState}`;
  }

  return {
    sessionId,
    authorizationUrl: authUrl,
    state: sessionState
  };
}

/**
 * Complete SSO login (simulated)
 */
export function completeSSO(sessionId, profile) {
  const session = ssoSessions.get(sessionId);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) return null;

  session.status = 'completed';
  session.userId = profile.userId;
  session.profile = profile;
  session.completedAt = new Date().toISOString();
  ssoSessions.set(sessionId, session);

  // Link account
  const linkKey = `${profile.userId}:${session.providerId}`;
  ssoLinks.set(linkKey, {
    userId: profile.userId,
    providerId: session.providerId,
    externalId: profile.externalId,
    linkedAt: new Date().toISOString()
  });

  return session;
}

/**
 * Get SSO session
 */
export function getSSOSession(sessionId) {
  return ssoSessions.get(sessionId) || null;
}

/**
 * Link SSO account
 */
export function linkSSOAccount(userId, providerId, externalId, profile) {
  const linkKey = `${userId}:${providerId}`;
  const link = {
    userId,
    providerId,
    externalId,
    profile,
    linkedAt: new Date().toISOString()
  };

  ssoLinks.set(linkKey, link);
  return link;
}

/**
 * Unlink SSO account
 */
export function unlinkSSOAccount(userId, providerId) {
  const linkKey = `${userId}:${providerId}`;
  return ssoLinks.delete(linkKey);
}

/**
 * Get user's SSO links
 */
export function getUserSSOLinks(userId) {
  const links = [];
  for (const link of ssoLinks.values()) {
    if (link.userId === userId) {
      links.push(link);
    }
  }
  return links;
}

/**
 * Update provider
 */
export function updateProvider(id, data) {
  const provider = getProvider(id);
  if (!provider) return null;

  const allowedFields = ['name', 'enabled', 'status', 'scopes', 'claimsMap', 'attributeMap', 'autoLink'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      provider[field] = data[field];
    }
  }

  provider.updatedAt = new Date().toISOString();

  // Update in correct map
  if (provider.type === 'saml') ssoProviders.set(id, provider);
  else if (provider.type === 'oauth') oauthProviders.set(id, provider);
  else if (provider.type === 'oidc') oidcProviders.set(id, provider);

  return provider;
}

/**
 * Delete provider
 */
export function deleteProvider(id) {
  return ssoProviders.delete(id) || oauthProviders.delete(id) || oidcProviders.delete(id);
}

/**
 * Get federation stats
 */
export function getFederationStats() {
  return {
    samlProviders: ssoProviders.size,
    oauthProviders: oauthProviders.size,
    oidcProviders: oidcProviders.size,
    totalProviders: ssoProviders.size + oauthProviders.size + oidcProviders.size,
    activeSSOSessions: Array.from(ssoSessions.values()).filter(s => s.status === 'initiated').length,
    totalSSOLinks: ssoLinks.size
  };
}
