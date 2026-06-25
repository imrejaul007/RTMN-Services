/**
 * MarketOS SDK - Client for MarketOS (port 4275).
 *
 * Methods: listMarketPrices, getMarketPrice, getPriceTrend, listDemand, getDemand, listSupply, getSupply, listGaps, getGap, getReport, recordPrice, addDemand, addSupply
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface MarketOSListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  timestamp: string;
}

export class MarketOSClient {
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

export class MarketOS {
  readonly marketOS: MarketOSClient;
  readonly config: ReturnType<typeof resolveConfig>;
  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.marketOS = new MarketOSClient(resolved);
  }
}

export { HojaiConfig, resolveConfig } from './foundation-config.js';
export { request, HttpError } from './utils.js';
export { HttpError as MarketOSHttpError } from './utils.js';
export default MarketOS;
