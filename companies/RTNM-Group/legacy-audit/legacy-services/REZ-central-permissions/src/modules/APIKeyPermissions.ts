/**
 * REZ Central Permissions - API Key Permissions Module
 * Handles API key-based permission checks
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { PermissionResult, Action, APIKey } from '../types';

interface APIKeyPermissionRequest {
  apiKeyId: string;
  action: Action;
  resource: string;
  resourceId?: string;
}

interface CreateAPIKeyRequest {
  name: string;
  merchantId?: string;
  permissions: string[];
  rateLimit?: number;
  expiresAt?: string;
}

// In-memory API key store
const apiKeyStore = new Map<string, APIKey>();
const keyHashIndex = new Map<string, string>(); // hash -> id

export class APIKeyPermissions {
  private defaultRateLimit = 1000;

  constructor(defaultRateLimit?: number) {
    if (defaultRateLimit) {
      this.defaultRateLimit = defaultRateLimit;
    }
  }

  /**
   * Check API key permission
   */
  async check(request: APIKeyPermissionRequest): Promise<PermissionResult> {
    const { apiKeyId, action, resource } = request;

    const apiKey = apiKeyStore.get(apiKeyId);

    if (!apiKey) {
      return {
        granted: false,
        reason: 'API key not found',
        evaluated_policies: [],
        evaluation_time_ms: 0,
      };
    }

    if (!apiKey.is_active) {
      return {
        granted: false,
        reason: 'API key is inactive',
        evaluated_policies: [apiKeyId],
        evaluation_time_ms: 0,
      };
    }

    // Check expiration
    if (apiKey.expires_at) {
      const expiresAt = new Date(apiKey.expires_at);
      if (expiresAt < new Date()) {
        return {
          granted: false,
          reason: 'API key has expired',
          evaluated_policies: [apiKeyId],
          evaluation_time_ms: 0,
        };
      }
    }

    // Check permissions
    const permissionString = `${resource}:${action}`;
    const wildcardResource = `*:${action}`;
    const wildcardAll = `*:*`;

    if (
      apiKey.permissions.includes('*:*') ||
      apiKey.permissions.includes(wildcardAll) ||
      apiKey.permissions.includes(wildcardResource) ||
      apiKey.permissions.includes(permissionString)
    ) {
      return {
        granted: true,
        reason: 'API key permission granted',
        matched_policy: apiKeyId,
        evaluated_policies: [apiKeyId],
        evaluation_time_ms: 0,
      };
    }

    return {
      granted: false,
      reason: `API key lacks permission: ${permissionString}`,
      evaluated_policies: [apiKeyId],
      evaluation_time_ms: 0,
    };
  }

  /**
   * Create new API key
   */
  async createKey(request: CreateAPIKeyRequest): Promise<{ key: APIKey; secret: string }> {
    const secret = this.generateSecret();
    const keyHash = this.hashSecret(secret);

    const apiKey: APIKey = {
      id: uuidv4(),
      key_hash: keyHash,
      name: request.name,
      merchant_id: request.merchantId,
      permissions: request.permissions,
      rate_limit: request.rateLimit || this.defaultRateLimit,
      expires_at: request.expiresAt,
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: 'system',
    };

    apiKeyStore.set(apiKey.id, apiKey);
    keyHashIndex.set(keyHash, apiKey.id);

    return { key: apiKey, secret };
  }

  /**
   * Validate API key secret
   */
  async validateKey(secret: string): Promise<APIKey | null> {
    const keyHash = this.hashSecret(secret);
    const keyId = keyHashIndex.get(keyHash);

    if (!keyId) {
      return null;
    }

    const apiKey = apiKeyStore.get(keyId);

    if (!apiKey || !apiKey.is_active) {
      return null;
    }

    // Check expiration
    if (apiKey.expires_at) {
      const expiresAt = new Date(apiKey.expires_at);
      if (expiresAt < new Date()) {
        return null;
      }
    }

    return apiKey;
  }

  /**
   * Revoke API key
   */
  async revokeKey(keyId: string): Promise<void> {
    const apiKey = apiKeyStore.get(keyId);
    if (apiKey) {
      apiKey.is_active = false;
      apiKeyStore.set(keyId, apiKey);
      keyHashIndex.delete(apiKey.key_hash);
    }
  }

  /**
   * Update API key permissions
   */
  async updatePermissions(keyId: string, permissions: string[]): Promise<void> {
    const apiKey = apiKeyStore.get(keyId);
    if (apiKey) {
      apiKey.permissions = permissions;
      apiKeyStore.set(keyId, apiKey);
    }
  }

  /**
   * Update rate limit
   */
  async updateRateLimit(keyId: string, rateLimit: number): Promise<void> {
    const apiKey = apiKeyStore.get(keyId);
    if (apiKey) {
      apiKey.rate_limit = rateLimit;
      apiKeyStore.set(keyId, apiKey);
    }
  }

  /**
   * Update expiration
   */
  async updateExpiration(keyId: string, expiresAt: string): Promise<void> {
    const apiKey = apiKeyStore.get(keyId);
    if (apiKey) {
      apiKey.expires_at = expiresAt;
      apiKeyStore.set(keyId, apiKey);
    }
  }

  /**
   * Get API key by ID
   */
  async getKey(keyId: string): Promise<APIKey | undefined> {
    return apiKeyStore.get(keyId);
  }

  /**
   * Get all API keys for merchant
   */
  async getKeysByMerchant(merchantId: string): Promise<APIKey[]> {
    return Array.from(apiKeyStore.values()).filter(k => k.merchant_id === merchantId);
  }

  /**
   * Update last used timestamp
   */
  async recordUsage(keyId: string): Promise<void> {
    const apiKey = apiKeyStore.get(keyId);
    if (apiKey) {
      apiKey.last_used_at = new Date().toISOString();
      apiKeyStore.set(keyId, apiKey);
    }
  }

  /**
   * Delete API key
   */
  async deleteKey(keyId: string): Promise<void> {
    const apiKey = apiKeyStore.get(keyId);
    if (apiKey) {
      keyHashIndex.delete(apiKey.key_hash);
      apiKeyStore.delete(keyId);
    }
  }

  /**
   * List all active API keys (without secrets)
   */
  async listKeys(): Promise<Omit<APIKey, 'key_hash'>[]> {
    return Array.from(apiKeyStore.values()).map(({ key_hash, ...rest }) => rest);
  }

  /**
   * Generate secure secret
   */
  private generateSecret(): string {
    return `rez_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Hash secret for storage
   */
  private hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(keyId: string, currentCount: number): Promise<boolean> {
    const apiKey = apiKeyStore.get(keyId);
    if (!apiKey) {
      return false;
    }

    return currentCount < (apiKey.rate_limit || this.defaultRateLimit);
  }
}
