/**
 * HR Department Pack - Index
 *
 * Runtime connector to Workforce OS (port 5077)
 * Provides HR functionality for Company OS tenants
 */

export {
  HRRuntimeConnector,
  createHRConnector,
  type HRConfig,
  type Employee,
  type LeaveRequest,
  type Attendance,
  type PayrollRecord,
} from './runtime-connector.js';

// Default connector factory
import { HRRuntimeConnector, type HRConfig } from './runtime-connector.js';

export function createConnector(config: Partial<HRConfig> = {}): HRRuntimeConnector {
  return new HRRuntimeConnector({
    workforceOsUrl: config.workforceOsUrl || process.env.WORKFORCE_OS_URL || 'http://localhost:5077',
    tenantId: config.tenantId || 'default',
    apiKey: config.apiKey || process.env.INTERNAL_SERVICE_TOKEN,
  });
}

export default createConnector;
