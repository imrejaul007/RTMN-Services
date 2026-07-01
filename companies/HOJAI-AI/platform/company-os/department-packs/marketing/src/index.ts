/**
 * Marketing Department Pack - Index
 *
 * Runtime connector to Marketing OS (port 5500)
 * Provides marketing functionality for Company OS tenants
 */

export {
  MarketingRuntimeConnector,
  createMarketingConnector,
  type MarketingConfig,
  type Campaign,
  type Audience,
  type Journey,
  type JourneyStep,
  type Content,
  type Brand,
} from './runtime-connector.js';

// Default connector factory
import { MarketingRuntimeConnector, type MarketingConfig } from './runtime-connector.js';

export function createConnector(config: Partial<MarketingConfig> = {}): MarketingRuntimeConnector {
  return new MarketingRuntimeConnector({
    marketingOsUrl: config.marketingOsUrl || process.env.MARKETING_OS_URL || 'http://localhost:5500',
    tenantId: config.tenantId || 'default',
    apiKey: config.apiKey || process.env.INTERNAL_SERVICE_TOKEN,
  });
}

export default createConnector;
