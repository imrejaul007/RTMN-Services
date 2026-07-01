/**
 * Operations Department Pack - Index
 *
 * Runtime connector to Operations OS (port 5250)
 * Provides operations management for Company OS tenants
 */

export {
  OperationsRuntimeConnector,
  createOperationsConnector,
  type OperationsConfig,
  type Project,
  type Task,
  type Process,
  type ProcessStep,
  type Incident,
  type SOP,
} from './runtime-connector.js';

// Default connector factory
import { OperationsRuntimeConnector, type OperationsConfig } from './runtime-connector.js';

export function createConnector(config: Partial<OperationsConfig> = {}): OperationsRuntimeConnector {
  return new OperationsRuntimeConnector({
    operationsOsUrl: config.operationsOsUrl || process.env.OPERATIONS_OS_URL || 'http://localhost:5250',
    tenantId: config.tenantId || 'default',
    apiKey: config.apiKey || process.env.INTERNAL_SERVICE_TOKEN,
  });
}

export default createConnector;
