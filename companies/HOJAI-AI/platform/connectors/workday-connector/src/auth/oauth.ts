/**
 * Workday OAuth 2.0 SAML Bearer Assertion Flow
 *
 * Workday uses OAuth 2.0 with SAML bearer assertion for server-to-server authentication.
 * This module handles:
 * - SAML assertion generation with X.509 certificate signing
 * - Token exchange (SAML -> OAuth access token)
 * - Token refresh and revocation
 * - Token validation
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { XMLSerializer } from '@xmldom/xmldom';
import {
  WorkdayConfig,
  WorkdayCredentials,
  SAMLAssertionConfig,
  SAMLAssertion,
  TokenResponse
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// SAML Assertion Generator
// ============================================================================

/**
 * Generate a SAML 2.0 bearer assertion for Workday OAuth
 * The assertion includes:
 * - Issuer: Your application's entity ID
 * - Subject: Workday username
 * - Audience: Workday token endpoint
 * - Digital signature using X.509 certificate
 */
export async function generateSamlAssertion(
  config: SAMLAssertionConfig
): Promise<SAMLAssertion> {
  const now = new Date();
  const expiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

  const assertionId = `_${crypto.randomUUID().replace(/-/g, '')}`;
  const issuerId = config.issuer;
  const subjectNameId = config.workdayUsername;
  const audience = config.audience;

  // Read private key for signing
  let privateKey: string;
  try {
    privateKey = fs.readFileSync(config.privateKeyPath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read private key: ${(error as Error).message}`);
  }

  // Build the SAML assertion XML
  const assertionXml = buildSamlAssertionXml({
    assertionId,
    issuerId,
    subjectNameId,
    audience,
    issueInstant: now.toISOString(),
    expiryInstant: expiry.toISOString()
  });

  // Sign the assertion
  const signedAssertion = await signSamlAssertion(assertionXml, privateKey, config.privateKeyPassword);

  return {
    assertion: signedAssertion,
    expiresAt: expiry
  };
}

/**
 * Build the SAML assertion XML structure
 */
function buildSamlAssertionXml(params: {
  assertionId: string;
  issuerId: string;
  subjectNameId: string;
  audience: string;
  issueInstant: string;
  expiryInstant: string;
}): string {
  const { assertionId, issuerId, subjectNameId, audience, issueInstant, expiryInstant } = params;

  // Generate unique IDs for the assertion and subject confirmation
  const subjectConfirmationId = `_${crypto.randomUUID().replace(/-/g, '')}`;
  const authnStatementId = `_${crypto.randomUUID().replace(/-/g, '')}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="${assertionId}"
                Version="2.0"
                IssueInstant="${issueInstant}">
  <saml:Issuer>${escapeXml(issuerId)}</saml:Issuer>
  <saml:Subject>
    <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified"
                 NameQualifier="${escapeXml(audience)}">${escapeXml(subjectNameId)}</saml:NameID>
    <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
      <saml:SubjectConfirmationData NotOnOrAfter="${expiryInstant}"
                                     Recipient="${escapeXml(audience)}"
                                     InResponseTo="_RDTRQ_Ping"/>
    </saml:SubjectConfirmation>
  </saml:Subject>
  <saml:Conditions NotBefore="${issueInstant}"
                   NotOnOrAfter="${expiryInstant}">
    <saml:AudienceRestriction>
      <saml:Audience>${escapeXml(audience)}</saml:Audience>
    </saml:AudienceRestriction>
  </saml:Conditions>
  <saml:AuthnStatement ID="${authnStatementId}"
                       AuthnInstant="${issueInstant}"
                       SessionIndex="${subjectConfirmationId}">
    <saml:AuthnContext>
      <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:Password</saml:AuthnContextClassRef>
    </saml:AuthnContext>
  </saml:AuthnStatement>
</saml:Assertion>`;
}

/**
 * Sign the SAML assertion using RSA-SHA256
 */
async function signSamlAssertion(
  assertionXml: string,
  privateKey: string,
  privateKeyPassword?: string
): Promise<string> {
  // Parse the XML
  const { DOMParser } = await import('@xmldom/xmldom');
  const doc = new DOMParser().parseFromString(assertionXml, 'text/xml');

  // Create a SignedInfo element with the signature
  const signedInfoXml = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
  <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
  <ds:Reference URI="#${doc.documentElement.getAttribute('ID')}">
    <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
    <ds:DigestValue></ds:DigestValue>
    <ds:Transforms>
      <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
      <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
    </ds:Transforms>
  </ds:Reference>
</ds:SignedInfo>`;

  // Calculate the digest value
  const canonicalXml = await canonicalizeXml(assertionXml);
  const digest = crypto.createHash('sha256').update(canonicalXml).digest('base64');

  // Replace the digest value placeholder
  const signedInfoWithDigest = signedInfoXml.replace('<ds:DigestValue></ds:DigestValue>', `<ds:DigestValue>${digest}</ds:DigestValue>`);

  // Sign the SignedInfo
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(await canonicalizeXml(signedInfoWithDigest));

  let key: string = privateKey;
  if (privateKeyPassword) {
    // Decrypt the private key if password is provided
    key = crypto.privateDecrypt(
      {
        key: privateKey,
        passphrase: privateKeyPassword
      },
      Buffer.alloc(0)
    ).toString();
  }

  const signature = signer.sign(key, 'base64');

  // Build the complete signature
  const signatureXml = `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  ${signedInfoWithDigest}
  <ds:SignatureValue>${signature}</ds:SignatureValue>
</ds:Signature>`;

  // Insert signature into the assertion
  const { DOMParser } = await import('@xmldom/xmldom');
  const signedDoc = new DOMParser().parseFromString(assertionXml, 'text/xml');
  const signatureDoc = new DOMParser().parseFromString(signatureXml, 'text/xml');

  // Import and append the signature node
  const importedSig = signedDoc.importNode(signatureDoc.documentElement, true);
  signedDoc.documentElement.insertBefore(importedSig, signedDoc.documentElement.firstChild);

  const serializer = new XMLSerializer();
  return serializer.serializeToString(signedDoc);
}

/**
 * Canonicalize XML using Exclusive Canonicalization (C14N)
 */
async function canonicalizeXml(xml: string): Promise<string> {
  // For production, use a proper C14N implementation
  // This is a simplified version
  const { DOMParser } = await import('@xmldom/xmldom');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  // Simple whitespace normalization
  let result = serializerToString(doc).trim();
  result = result.replace(/>\s+</g, '><');
  result = result.replace(/\s+/g, ' ');

  return result;
}

function serializerToString(node: Document | Element): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(node);
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================================
// Token Exchange & Management
// ============================================================================

/**
 * Exchange SAML assertion for OAuth access token
 */
export async function exchangeSamlForToken(
  samlAssertion: string,
  config: WorkdayConfig
): Promise<WorkdayCredentials> {
  const tokenEndpoint = `${config.apiBaseUrl || 'https://wd2-impl-services1.workday.com/ccx/oauth2'}/${config.tenantId}/token`;

  logger.debug('Exchanging SAML assertion for access token', { tenantId: config.tenantId });

  try {
    const response = await axios.post<TokenResponse>(
      tokenEndpoint,
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:saml2-bearer',
        assertion: samlAssertion,
        client_id: config.clientId,
        client_secret: config.clientSecret
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 30000
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      tokenType: response.data.token_type || 'Bearer',
      scope: response.data.scope
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('Token exchange failed', {
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Token exchange failed: ${error.response?.data?.error_description || error.message}`);
    }
    throw error;
  }
}

/**
 * Refresh the access token using refresh token
 */
export async function refreshToken(
  refreshTokenValue: string,
  config: WorkdayConfig
): Promise<WorkdayCredentials> {
  const tokenEndpoint = `${config.apiBaseUrl || 'https://wd2-impl-services1.workday.com/ccx/oauth2'}/${config.tenantId}/token`;

  logger.debug('Refreshing access token', { tenantId: config.tenantId });

  try {
    const response = await axios.post<TokenResponse>(
      tokenEndpoint,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
        client_id: config.clientId,
        client_secret: config.clientSecret
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 30000
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshTokenValue,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      tokenType: response.data.token_type || 'Bearer',
      scope: response.data.scope
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('Token refresh failed', {
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
    throw error;
  }
}

/**
 * Revoke an access or refresh token
 */
export async function revokeToken(
  token: string,
  config: WorkdayConfig
): Promise<void> {
  const revokeEndpoint = `${config.apiBaseUrl || 'https://wd2-impl-services1.workday.com/ccx/oauth2'}/${config.tenantId}/revoke`;

  logger.debug('Revoking token', { tenantId: config.tenantId });

  try {
    await axios.post(
      revokeEndpoint,
      new URLSearchParams({
        token,
        client_id: config.clientId,
        client_secret: config.clientSecret
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
  } catch (error) {
    // Log but don't throw - revocation failures are not critical
    logger.warn('Token revocation may have failed', { error: (error as Error).message });
  }
}

/**
 * Validate a token by checking its info
 */
export async function getTokenInfo(
  token: string,
  config: WorkdayConfig
): Promise<{ active: boolean; scope?: string; expiresIn?: number }> {
  const introspectEndpoint = `${config.apiBaseUrl || 'https://wd2-impl-services1.workday.com/ccx/oauth2'}/${config.tenantId}/introspect`;

  try {
    const response = await axios.post(
      introspectEndpoint,
      new URLSearchParams({
        token,
        client_id: config.clientId,
        client_secret: config.clientSecret
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    return {
      active: response.data.active === true,
      scope: response.data.scope,
      expiresIn: response.data.exp
    };
  } catch (error) {
    logger.error('Token introspection failed', { error: (error as Error).message });
    return { active: false };
  }
}

// ============================================================================
// Token Manager Class
// ============================================================================

/**
 * TokenManager handles automatic token refresh and caching
 */
export class TokenManager {
  private credentials: WorkdayCredentials | null = null;
  private config: WorkdayConfig;
  private refreshBufferMs: number = 5 * 60 * 1000; // Refresh 5 minutes before expiry

  constructor(config: WorkdayConfig) {
    this.config = config;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    if (this.needsRefresh()) {
      await this.refresh();
    }
    return this.credentials!.accessToken;
  }

  /**
   * Check if the current token needs to be refreshed
   */
  private needsRefresh(): boolean {
    if (!this.credentials) return true;
    const bufferMs = this.refreshBufferMs;
    return Date.now() + bufferMs >= this.credentials.expiresAt.getTime();
  }

  /**
   * Refresh the token
   */
  async refresh(): Promise<void> {
    logger.info('Refreshing Workday access token');

    if (this.credentials?.refreshToken) {
      // Use refresh token
      this.credentials = await refreshToken(this.credentials.refreshToken, this.config);
    } else {
      // Need to do full SAML assertion flow
      this.credentials = await this.authenticate();
    }

    logger.info('Token refreshed successfully', {
      expiresAt: this.credentials.expiresAt.toISOString()
    });
  }

  /**
   * Perform full authentication with SAML assertion
   */
  async authenticate(): Promise<WorkdayCredentials> {
    const samlConfig: SAMLAssertionConfig = {
      issuer: `wd2-impl-services1.workday.com/samltests/${this.config.tenantId}`,
      subjectNameId: this.config.clientId,
      audience: `https://wd2-impl-services1.workday.com/ccx/oauth2/${this.config.tenantId}`,
      privateKeyPath: this.config.privateKeyPath,
      privateKeyPassword: this.config.privateKeyPassword,
      certificatePath: this.config.privateKeyPath.replace('.key', '.crt'), // Assume cert alongside key
      workdayUsername: this.config.clientId
    };

    const samlAssertion = await generateSamlAssertion(samlConfig);
    this.credentials = await exchangeSamlForToken(samlAssertion.assertion, this.config);

    return this.credentials;
  }

  /**
   * Get current credentials (for debugging)
   */
  getCredentials(): WorkdayCredentials | null {
    return this.credentials;
  }

  /**
   * Set credentials directly (for loading from cache)
   */
  setCredentials(credentials: WorkdayCredentials): void {
    this.credentials = credentials;
  }

  /**
   * Clear stored credentials
   */
  clearCredentials(): void {
    this.credentials = null;
  }

  /**
   * Revoke current token
   */
  async revoke(): Promise<void> {
    if (this.credentials?.accessToken) {
      await revokeToken(this.credentials.accessToken, this.config);
      this.clearCredentials();
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a SAML assertion configuration from WorkdayConfig
 */
export function createSamlConfig(config: WorkdayConfig): SAMLAssertionConfig {
  const baseUrl = config.apiBaseUrl || 'https://wd2-impl-services1.workday.com';
  return {
    issuer: `${baseUrl}/samltests/${config.tenantId}`,
    subjectNameId: config.clientId,
    audience: `${baseUrl}/ccx/oauth2/${config.tenantId}`,
    privateKeyPath: config.privateKeyPath,
    privateKeyPassword: config.privateKeyPassword,
    certificatePath: config.privateKeyPath.replace('.key', '.crt'),
    workdayUsername: config.clientId
  };
}

/**
 * Generate a self-signed certificate for testing
 * In production, use certificates from Workday's certificate management
 */
export function generateSelfSignedCert(): { key: string; cert: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  return {
    key: privateKey,
    cert: publicKey
  };
}