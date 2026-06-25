/**
 * CapabilityOS SDK - Client for CapabilityOS (port 4270).
 *
 * Methods: registerCapability, getCapability, updateCapability, deleteCapability, listCapabilities, matchCapabilities, getFederationStats
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface CapabilityOSListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  timestamp: string;
}

export class CapabilityOSClient {
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

export class CapabilityOS {
  readonly capabilityOS: CapabilityOSClient;
  readonly config: ReturnType<typeof resolveConfig>;
  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.capabilityOS = new CapabilityOSClient(resolved);
  }
}

export { HojaiConfig, resolveConfig } from './foundation-config.js';
export { request, HttpError } from './utils.js';
export { HttpError as CapabilityOSHttpError } from './utils.js';
export default CapabilityOS;
