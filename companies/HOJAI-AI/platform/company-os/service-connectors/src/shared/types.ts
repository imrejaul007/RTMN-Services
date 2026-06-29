/**
 * Shared Types
 *
 * Common types for all service connectors.
 */

export interface TenantContext {
  tenantId: string;
  companyId: string;
  config?: Record<string, unknown>;
}

export interface CompanyManifest {
  id: string;
  name: string;
  industry: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceEndpoint {
  name: string;
  url: string;
  health: string;
  lastChecked: string;
}

export interface ConnectorConfig {
  tenant: TenantContext;
  services: {
    [key: string]: string;
  };
}
