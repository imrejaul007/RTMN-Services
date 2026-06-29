/**
 * HOJAI Permissions
 */

import { Client } from './client';

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'execute')[];
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export class PermissionManager {
  private client: Client;
  private cache = new Map<string, Permission[]>();

  constructor(client: Client) {
    this.client = client;
  }

  async check(
    principal: { type: 'user' | 'agent' | 'system'; id: string },
    permission: string,
    resource?: { type: string; id: string }
  ): Promise<boolean> {
    try {
      const res = await this.client.request<{ allowed: boolean }>('POST', '/permissions/check', {
        principal,
        permission,
        resource,
      });
      return res.allowed;
    } catch (e) {
      return false;
    }
  }

  async getPermissions(principal: { type: string; id: string }): Promise<Permission[]> {
    const cacheKey = `${principal.type}:${principal.id}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const permissions = await this.client.request<Permission[]>(
      'GET',
      `/permissions/${principal.type}/${principal.id}`
    );

    this.cache.set(cacheKey, permissions);
    return permissions;
  }

  async grant(
    principal: { type: string; id: string },
    permission: string
  ): Promise<void> {
    await this.client.request('POST', '/permissions/grant', {
      principal,
      permission,
    });
    this.cache.clear();
  }

  async revoke(
    principal: { type: string; id: string },
    permission: string
  ): Promise<void> {
    await this.client.request('POST', '/permissions/revoke', {
      principal,
      permission,
    });
    this.cache.clear();
  }

  clearCache(): void {
    this.cache.clear();
  }
}
