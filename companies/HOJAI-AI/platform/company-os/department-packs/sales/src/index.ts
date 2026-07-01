/**
 * Sales Department Pack - Index
 *
 * Runtime connector to Sales OS (port 5055)
 * Provides CRM and sales functionality for Company OS tenants
 */

export {
  SalesRuntimeConnector,
  createSalesConnector,
  type SalesConfig,
  type Lead,
  type Contact,
  type Account,
  type Opportunity,
  type Deal,
} from './runtime-connector.js';

// Default connector factory
import { SalesRuntimeConnector, type SalesConfig } from './runtime-connector.js';

export function createConnector(config: Partial<SalesConfig> = {}): SalesRuntimeConnector {
  return new SalesRuntimeConnector({
    salesOsUrl: config.salesOsUrl || process.env.SALES_OS_URL || 'http://localhost:5055',
    tenantId: config.tenantId || 'default',
    apiKey: config.apiKey || process.env.INTERNAL_SERVICE_TOKEN,
  });
}

export default createConnector;
