/**
 * Legal Department Pack - Index
 *
 * Runtime connector to Legal OS (port 5035)
 * Provides legal management for Company OS tenants
 */

export {
  LegalRuntimeConnector,
  createLegalConnector,
  type LegalConfig,
  type Contract,
  type Party,
  type Clause,
  type LegalCase,
  type ComplianceItem,
  type IntellectualProperty,
} from './runtime-connector.js';

// Default connector factory
import { LegalRuntimeConnector, type LegalConfig } from './runtime-connector.js';

export function createConnector(config: Partial<LegalConfig> = {}): LegalRuntimeConnector {
  return new LegalRuntimeConnector({
    legalOsUrl: config.legalOsUrl || process.env.LEGAL_OS_URL || 'http://localhost:5035',
    tenantId: config.tenantId || 'default',
    apiKey: config.apiKey || process.env.INTERNAL_SERVICE_TOKEN,
  });
}

export default createConnector;
