/**
 * OAuth Flows - Real OAuth2 implementations for enterprise connectors
 */

import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// In-memory OAuth state store (would use Redis in production)
const oauthStates = new Map();
const tokenStore = new Map();

/**
 * OAuth Provider Configurations
 */
export const OAUTH_PROVIDERS = {
  // CRM
  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write', 'crm.objects.deals.read', 'crm.objects.deals.write'],
    defaultScope: 'crm.objects.contacts.read crm.objects.contacts.write'
  },
  salesforce: {
    id: 'salesforce',
    name: 'Salesforce',
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    scopes: ['api', 'refresh_token'],
    defaultScope: 'api refresh_token'
  },
  pipedrive: {
    id: 'pipedrive',
    name: 'Pipedrive',
    authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
    tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
    scopes: ['deal:read', 'deal:write', 'person:read', 'person:write'],
    defaultScope: 'deal:read deal:write person:read person:write'
  },
  zoho_crm: {
    id: 'zoho-crm',
    name: 'Zoho CRM',
    authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
    tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
    scopes: ['ZohoCRM.modules.ALL'],
    defaultScope: 'ZohoCRM.modules.ALL'
  },

  // Payments
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    scopes: ['read_only'],
    defaultScope: 'read_only'
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    authUrl: 'https://www.paypal.com/oauth2/authorize',
    tokenUrl: 'https://api.paypal.com/v1/oauth2/token',
    scopes: ['openid', 'https://uri.paypal.com/services/invoicing'],
    defaultScope: 'openid https://uri.paypal.com/services/invoicing'
  },
  square: {
    id: 'square',
    name: 'Square',
    authUrl: 'https://connect.squareup.com/oauth2/authorize',
    tokenUrl: 'https://connect.squareup.com/oauth2/token',
    scopes: ['MERCHANT_PROFILE_READ', 'PAYMENTS_READ', 'PAYMENTS_WRITE', 'ITEMS_READ', 'ITEMS_WRITE'],
    defaultScope: 'MERCHANT_PROFILE_READ PAYMENTS_READ PAYMENTS_WRITE ITEMS_READ ITEMS_WRITE'
  },

  // Commerce
  shopify: {
    id: 'shopify',
    name: 'Shopify',
    authUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
    tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
    scopes: ['read_orders', 'write_orders', 'read_products', 'write_products', 'read_customers', 'write_customers'],
    defaultScope: 'read_orders write_orders read_products write_products read_customers write_customers'
  },
  bigcommerce: {
    id: 'bigcommerce',
    name: 'BigCommerce',
    authUrl: 'https://login.bigcommerce.com/oauth2/authorize',
    tokenUrl: 'https://login.bigcommerce.com/oauth2/token',
    scopes: ['read_orders', 'write_orders', 'read_products', 'write_products'],
    defaultScope: 'read_orders write_orders read_products write_products'
  },

  // Email & Calendar
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    defaultScope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'
  },
  outlook: {
    id: 'outlook',
    name: 'Microsoft Outlook',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['openid', 'profile', 'email', 'Calendars.ReadWrite', 'Mail.ReadWrite'],
    defaultScope: 'openid profile email Calendars.ReadWrite Mail.ReadWrite'
  },

  // Storage
  google_drive: {
    id: 'google-drive',
    name: 'Google Drive',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ],
    defaultScope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file'
  },
  dropbox: {
    id: 'dropbox',
    name: 'Dropbox',
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    scopes: ['files.content.read', 'files.content.write', 'files.metadata.read'],
    defaultScope: 'files.content.read files.content.write files.metadata.read'
  },
  onedrive: {
    id: 'onedrive',
    name: 'OneDrive',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['Files.ReadWrite.All', 'Sites.ReadWrite.All'],
    defaultScope: 'Files.ReadWrite.All'
  },

  // Chat
  slack: {
    id: 'slack',
    name: 'Slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['channels:read', 'channels:write', 'chat:write', 'users:read', 'files:read', 'files:write'],
    defaultScope: 'channels:read channels:write chat:write users:read files:read files:write'
  },
  ms_teams: {
    id: 'ms-teams',
    name: 'Microsoft Teams',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['offline_access', 'Calendars.ReadWrite', 'Chat.ReadWrite', 'Team.ReadBasic.All'],
    defaultScope: 'offline_access Calendars.ReadWrite Chat.ReadWrite Team.ReadBasic.All'
  },

  // Accounting
  quickbooks: {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    authUrl: 'https://appcenter.intuit.com/connect/oauth2',
    tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    scopes: ['com.intuit.quickbooks.accounting'],
    defaultScope: 'com.intuit.quickbooks.accounting'
  },
  xero: {
    id: 'xero',
    name: 'Xero',
    authUrl: 'https://login.xero.com/oauth2/authorize',
    tokenUrl: 'https://identity.xero.com/connect/token',
    scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts'],
    defaultScope: 'openid profile email accounting.transactions accounting.contacts'
  },
  zoho_books: {
    id: 'zoho-books',
    name: 'Zoho Books',
    authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
    tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
    scopes: ['ZohoBooks.fullaccess.all'],
    defaultScope: 'ZohoBooks.fullaccess.all'
  },

  // Project Management
  jira: {
    id: 'jira',
    name: 'Jira',
    authUrl: 'https://auth.atlassian.com/authorize',
    tokenUrl: 'https://api.atlassian.com/oauth2/v1/token',
    scopes: ['read:jira-work', 'write:jira-work', 'offline_access'],
    defaultScope: 'read:jira-work write:jira-work offline_access'
  },
  asana: {
    id: 'asana',
    name: 'Asana',
    authUrl: 'https://app.asana.com/-/oauth_authorize',
    tokenUrl: 'https://app.asana.com/-/oauth_token',
    scopes: ['default'],
    defaultScope: 'default'
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: ['read_content', 'update_content', 'insert_database', 'query_database'],
    defaultScope: 'read_content update_content insert_database query_database'
  },

  // HR
  workday: {
    id: 'workday',
    name: 'Workday',
    authUrl: 'https://wd2-impl-services1.workday.com/ccx/oauth2/{tenant}/authorize',
    tokenUrl: 'https://wd2-impl-services1.workday.com/ccx/oauth2/{tenant}/token',
    scopes: ['default'],
    defaultScope: 'default'
  },
  gusto: {
    id: 'gusto',
    name: 'Gusto',
    authUrl: 'https://app.gusto.com/oauth/authorize',
    tokenUrl: 'https://app.gusto.com/oauth/token',
    scopes: ['read', 'write'],
    defaultScope: 'read write'
  }
};

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(providerId, redirectUri, state, customParams = {}) {
  const provider = OAUTH_PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown OAuth provider: ${providerId}`);
  }

  // Generate state if not provided
  const stateData = state || uuidv4();

  // Store state for verification
  oauthStates.set(stateData, {
    provider: providerId,
    redirectUri,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
  });

  // Build authorization URL based on provider
  let authUrl;
  const params = {
    client_id: process.env[`OAUTH_${providerId.toUpperCase()}_CLIENT_ID`] || 'demo_client_id',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: provider.defaultScope,
    state: stateData,
    ...customParams
  };

  switch (providerId) {
    case 'shopify':
      // Shopify requires shop parameter
      const shop = customParams.shop || 'demo.myshopify.com';
      authUrl = `https://${shop}/admin/oauth/authorize`;
      delete params.client_id;
      delete params.shop;
      params.client_id = process.env[`OAUTH_${providerId.toUpperCase()}_CLIENT_ID`] || 'demo_client_id';
      break;

    case 'slack':
      authUrl = provider.authUrl;
      params.user_scope = params.scope;
      delete params.scope;
      params.client_id = process.env.OAUTH_SLACK_CLIENT_ID || 'demo_client_id';
      break;

    case 'jira':
      authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com`;
      params.aid = process.env.OAUTH_JIRA_CLIENT_ID || 'demo_client_id';
      delete params.client_id;
      break;

    case 'notion':
      authUrl = provider.authUrl;
      params.owner = 'user';
      break;

    default:
      authUrl = provider.authUrl;
  }

  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined)
  ).toString();

  return `${authUrl}${authUrl.includes('?') ? '&' : '?'}${queryString}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCode(providerId, code, redirectUri, refreshToken = null) {
  const provider = OAUTH_PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown OAuth provider: ${providerId}`);
  }

  let tokenRequest = {
    grant_type: refreshToken ? 'refresh_token' : 'authorization_code',
    code: refreshToken ? undefined : code,
    refresh_token: refreshToken,
    redirect_uri: redirectUri,
    client_id: process.env[`OAUTH_${providerId.toUpperCase()}_CLIENT_ID`] || 'demo_client_id',
    client_secret: process.env[`OAUTH_${providerId.toUpperCase()}_CLIENT_SECRET`] || 'demo_client_secret'
  };

  // Remove undefined values
  tokenRequest = Object.fromEntries(
    Object.entries(tokenRequest).filter(([_, v]) => v !== undefined)
  );

  try {
    const response = await axios.post(provider.tokenUrl, new URLSearchParams(tokenRequest), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    const tokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type || 'Bearer',
      scope: response.data.scope,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (response.data.expires_in || 3600) * 1000).toISOString()
    };

    // Store tokens
    const tokenId = uuidv4();
    tokenStore.set(tokenId, {
      provider: providerId,
      tokens,
      createdAt: new Date().toISOString()
    });

    return {
      success: true,
      tokenId,
      tokens
    };
  } catch (error) {
    console.error(`OAuth token exchange failed for ${providerId}:`, error.response?.data || error.message);
    throw new Error(`Failed to exchange code: ${error.response?.data?.error_description || error.message}`);
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(tokenId) {
  const stored = tokenStore.get(tokenId);
  if (!stored) {
    throw new Error('Token not found');
  }

  const { tokens } = stored;

  // Check if token is still valid
  if (new Date(tokens.expiresAt) > new Date()) {
    return { success: true, tokens, message: 'Token still valid' };
  }

  // Refresh the token
  return exchangeCode(stored.provider, null, null, tokens.refreshToken);
}

/**
 * Verify OAuth state
 */
export function verifyState(state) {
  const stored = oauthStates.get(state);

  if (!stored) {
    return { valid: false, error: 'State not found' };
  }

  // Check expiration
  if (new Date(stored.expiresAt) < new Date()) {
    oauthStates.delete(state);
    return { valid: false, error: 'State expired' };
  }

  oauthStates.delete(state); // One-time use
  return { valid: true, provider: stored.provider, redirectUri: stored.redirectUri };
}

/**
 * Revoke OAuth token
 */
export async function revokeToken(providerId, accessToken) {
  const provider = OAUTH_PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown OAuth provider: ${providerId}`);
  }

  // Most providers have a revocation endpoint
  const revokeUrl = getRevokeUrl(providerId);

  if (revokeUrl) {
    try {
      await axios.post(revokeUrl, `token=${accessToken}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env[`OAUTH_${providerId.toUpperCase()}_CLIENT_ID`] || 'demo_client_id'}:${process.env[`OAUTH_${providerId.toUpperCase()}_CLIENT_SECRET`] || 'demo_client_secret'}`
          ).toString('base64')}`
        }
      });
    } catch (error) {
      console.error(`Token revocation failed for ${providerId}:`, error.message);
    }
  }
}

/**
 * Get revoke URL for provider
 */
function getRevokeUrl(providerId) {
  const revokeUrls = {
    google_drive: 'https://oauth2.googleapis.com/revoke',
    gmail: 'https://oauth2.googleapis.com/revoke',
    outlook: 'https://login.microsoftonline.com/common/oauth2/v2/logout',
    dropbox: 'https://api.dropboxapi.com/2/auth/token/revoke',
    slack: null, // Slack doesn't have revocation
    github: 'https://api.github.com/applications/:client_id/token'
  };
  return revokeUrls[providerId];
}

/**
 * Make authenticated API request
 */
export async function makeAuthenticatedRequest(providerId, endpoint, options = {}) {
  const stored = tokenStore.get(options.tokenId);
  if (!stored) {
    throw new Error('Token not found');
  }

  // Check and refresh token if needed
  let tokens = stored.tokens;
  if (new Date(tokens.expiresAt) < new Date(Date.now() + 5 * 60 * 1000)) { // Refresh if < 5 min left
    const refreshed = await refreshAccessToken(options.tokenId);
    tokens = refreshed.tokens;
  }

  const baseUrl = getBaseUrl(providerId);

  try {
    const response = await axios({
      method: options.method || 'GET',
      url: `${baseUrl}${endpoint}`,
      headers: {
        'Authorization': `${tokens.tokenType} ${tokens.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      data: options.data,
      params: options.params
    });

    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      const refreshed = await refreshAccessToken(options.tokenId);
      tokens = refreshed.tokens;

      // Retry request
      const retryResponse = await axios({
        method: options.method || 'GET',
        url: `${baseUrl}${endpoint}`,
        headers: {
          'Authorization': `${tokens.tokenType} ${tokens.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        data: options.data,
        params: options.params
      });

      return retryResponse.data;
    }
    throw error;
  }
}

/**
 * Get base URL for provider API
 */
function getBaseUrl(providerId) {
  const baseUrls = {
    hubspot: 'https://api.hubapi.com',
    salesforce: 'https://{instance}.salesforce.com/services/data/v58.0',
    pipedrive: 'https://api.pipedrive.com/v1',
    zoho_crm: 'https://www.zohoapis.com/crm/v2',
    stripe: 'https://api.stripe.com',
    paypal: 'https://api.paypal.com/v1',
    square: 'https://connect.squareup.com/v2',
    shopify: 'https://{shop}.myshopify.com/admin/api/2023-10',
    gmail: 'https://gmail.googleapis.com/gmail/v1',
    outlook: 'https://graph.microsoft.com/v1.0',
    google_drive: 'https://www.googleapis.com/drive/v3',
    slack: 'https://slack.com/api',
    quickbooks: 'https://quickbooks.api.intuit.com/v3',
    xero: 'https://api.xero.com/api.xro/2.0',
    jira: 'https://api.atlassian.com',
    asana: 'https://app.asana.com/api/1.0',
    notion: 'https://api.notion.com/v1'
  };
  return baseUrls[providerId] || '';
}

/**
 * List connected OAuth integrations
 */
export function listConnections() {
  const connections = [];

  for (const [tokenId, data] of tokenStore.entries()) {
    connections.push({
      tokenId,
      provider: data.provider,
      providerName: OAUTH_PROVIDERS[data.provider]?.name || data.provider,
      createdAt: data.createdAt,
      expiresAt: data.tokens.expiresAt,
      status: new Date(data.tokens.expiresAt) > new Date() ? 'active' : 'expired'
    });
  }

  return connections;
}

/**
 * Remove OAuth connection
 */
export async function removeConnection(tokenId) {
  const stored = tokenStore.get(tokenId);
  if (stored) {
    await revokeToken(stored.provider, stored.tokens.accessToken);
    tokenStore.delete(tokenId);
    return { success: true };
  }
  return { success: false, error: 'Connection not found' };
}
