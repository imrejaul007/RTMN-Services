/**
 * DiscoveryOS SDK - Client for DiscoveryOS (port 4272).
 *
 * Methods: discover, index, bulkIndex, getIndexed, removeIndexed, getIndexStats
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface DiscoveryOSListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  timestamp: string;
}

export class DiscoveryOSClient {
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

export class DiscoveryOS {
  readonly discoveryOS: DiscoveryOSClient;
  readonly config: ReturnType<typeof resolveConfig>;
  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.discoveryOS = new DiscoveryOSClient(resolved);
  }
}

export { HojaiConfig, resolveConfig } from './foundation-config.js';
export { request, HttpError } from './utils.js';
export { HttpError as DiscoveryOSHttpError } from './utils.js';
export default DiscoveryOS;
