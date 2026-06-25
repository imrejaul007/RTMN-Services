/**
 * FederationOS SDK - Client for FederationOS (port 4273).
 *
 * Methods: joinNexha, listNexhas, getNexha, updateNexha, suspendNexha, activateNexha, getPeers, initiateHandshake, respondHandshake, revokeHandshake, listHandshakes, createPolicy, listPolicies, getPolicy, updatePolicy
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface FederationOSListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  timestamp: string;
}

export class FederationOSClient {
  constructor(private config: HojaiConfig) {}

  async info(): Promise<{ success: boolean; data: any; error?: string; timestamp: string }> {
    const r = await request<any>(this.config, 'GET', '/api/v1/info');
    return r;
  }

  async stats(): Promise<any> {
    const r = await request<any>(this.config, 'GET', '/api/v1/stats');
    return r;
  }
}

export class FederationOS {
  readonly federationOS: FederationOSClient;
  readonly config: ReturnType<typeof resolveConfig>;
  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.federationOS = new FederationOSClient(resolved);
  }
}

export { HojaiConfig, resolveConfig } from './foundation-config.js';
export { request, HttpError } from './utils.js';
export { HttpError as FederationOSHttpError } from './utils.js';
export default FederationOS;
