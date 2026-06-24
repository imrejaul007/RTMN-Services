/**
 * DepartmentBaseClient
 *
 * Tiny shared base for the 9 Department OS sub-clients. Each sub-client
 * targets its specific port and exposes its own domain methods. The base
 * only holds the resolved HojaiConfig (with port-overridden baseUrl when
 * applicable) so sub-clients don't have to repeat that logic.
 *
 * Sub-clients in this SDK don't share a template surface (unlike
 * IndustryBaseClient which 22 of the 26 industries inherited from).
 * Every Department OS has a fundamentally different domain model
 * (leads vs campaigns vs employees vs ledgers), so each sub-client
 * is a standalone class.
 */

import type { HojaiConfig } from './foundation-config.js';

export class DepartmentBaseClient {
  /** Resolved config. If a per-port override was set, baseUrl points at it. */
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig, port?: number) {
    if (port !== undefined) {
      this.config = { ...config, baseUrl: `http://localhost:${port}` };
    } else {
      this.config = config;
    }
  }
}

/** Map of industry key → Department OS port. Used by the facade. */
export const DEPARTMENT_PORTS: Record<string, number> = {
  sales: 5055,
  marketing: 5500,
  customerSuccess: 4050,
  procurement: 5096,
  workforce: 5077,
  finance: 4801,
  operations: 5250,
  cxo: 5100,
  revenueIntelligence: 5400,
};
