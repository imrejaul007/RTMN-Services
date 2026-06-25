/**
 * OpportunityOS SDK - Client for OpportunityOS (port 4274).
 *
 * Methods: postOpportunity, listOpportunities, getOpportunity, updateOpportunity, incrementBids, matchOpportunity, matchAll, getStats
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface OpportunityOSListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  timestamp: string;
}

export class OpportunityOSClient {
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

export class OpportunityOS {
  readonly opportunityOS: OpportunityOSClient;
  readonly config: ReturnType<typeof resolveConfig>;
  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.opportunityOS = new OpportunityOSClient(resolved);
  }
}

export { HojaiConfig, resolveConfig } from './foundation-config.js';
export { request, HttpError } from './utils.js';
export { HttpError as OpportunityOSHttpError } from './utils.js';
export default OpportunityOS;
