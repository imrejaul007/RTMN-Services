/**
 * Customer Operations Bridge Service
 * Bridges compliance engine to Customer Operations service
 */

import { logger } from '../index';

export interface CustomerOpsConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
}

export interface CustomerData {
  userId: string;
  personalData?: Record<string, unknown>;
  transactions?: Record<string, unknown>[];
  documents?: Record<string, unknown>[];
  preferences?: Record<string, unknown>;
  history?: Record<string, unknown>;
}

export interface DataDeletionResult {
  success: boolean;
  deletedServices: string[];
  failedServices: string[];
  errors: string[];
}

export interface DataExportResult {
  success: boolean;
  data: CustomerData;
  exportedAt: string;
  services: string[];
}

export class CustomerOpsBridge {
  private config: CustomerOpsConfig;
  private connectedServices: string[];

  constructor(config?: Partial<CustomerOpsConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.CUSTOMER_OPS_URL || 'http://localhost:4399',
      apiKey: config?.apiKey || process.env.CUSTOMER_OPS_API_KEY,
      timeout: config?.timeout || 30000
    };

    this.connectedServices = [
      'user-service',
      'transaction-service',
      'document-service',
      'preferences-service',
      'notification-service',
      'analytics-service'
    ];
  }

  /**
   * Request data deletion across all connected services (GDPR Right to Erasure)
   */
  async requestDataDeletion(userId: string): Promise<DataDeletionResult> {
    const result: DataDeletionResult = {
      success: true,
      deletedServices: [],
      failedServices: [],
      errors: []
    };

    logger.info('Initiating data deletion request', { userId, services: this.connectedServices });

    for (const service of this.connectedServices) {
      try {
        const response = await this.makeRequest(
          'DELETE',
          `/api/customer/${userId}/data/${service}`,
          undefined,
          { reason: 'GDPR_Erasure_Request' }
        );

        if (response.success) {
          result.deletedServices.push(service);
          logger.info(`Data deleted from ${service}`, { userId, service });
        } else {
          result.failedServices.push(service);
          result.errors.push(`Failed to delete from ${service}: ${response.error}`);
          result.success = false;
        }
      } catch (error) {
        result.failedServices.push(service);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Error deleting from ${service}: ${errorMessage}`);
        result.success = false;
        logger.error(`Error deleting data from ${service}`, { userId, service, error });
      }
    }

    return result;
  }

  /**
   * Request data export from all connected services (GDPR Data Portability)
   */
  async requestDataExport(userId: string): Promise<DataExportResult> {
    const customerData: CustomerData = {
      userId,
      personalData: {},
      transactions: [],
      documents: [],
      preferences: {},
      history: {}
    };

    logger.info('Initiating data export request', { userId, services: this.connectedServices });

    for (const service of this.connectedServices) {
      try {
        const response = await this.makeRequest(
          'GET',
          `/api/customer/${userId}/data/${service}`,
          undefined
        );

        if (response.success && response.data) {
          switch (service) {
            case 'user-service':
              customerData.personalData = response.data;
              break;
            case 'transaction-service':
              customerData.transactions = response.data.transactions || [];
              break;
            case 'document-service':
              customerData.documents = response.data.documents || [];
              break;
            case 'preferences-service':
              customerData.preferences = response.data;
              break;
            case 'analytics-service':
              customerData.history = response.data;
              break;
          }
        }
      } catch (error) {
        logger.warn(`Could not export data from ${service}`, { userId, service, error });
      }
    }

    return {
      success: true,
      data: customerData,
      exportedAt: new Date().toISOString(),
      services: this.connectedServices
    };
  }

  /**
   * Notify customer operations of KYC status change
   */
  async notifyKYCStatusChange(userId: string, kycId: string, status: string): Promise<boolean> {
    try {
      await this.makeRequest(
        'POST',
        '/api/notifications',
        undefined,
        {
          type: 'KYC_STATUS_CHANGE',
          userId,
          kycId,
          status,
          timestamp: new Date().toISOString()
        }
      );
      return true;
    } catch (error) {
      logger.error('Failed to notify KYC status change', { userId, kycId, status, error });
      return false;
    }
  }

  /**
   * Notify customer operations of compliance violation
   */
  async notifyComplianceViolation(
    userId: string,
    violationId: string,
    severity: string,
    description: string
  ): Promise<boolean> {
    try {
      await this.makeRequest(
        'POST',
        '/api/notifications',
        undefined,
        {
          type: 'COMPLIANCE_VIOLATION',
          userId,
          violationId,
          severity,
          description,
          timestamp: new Date().toISOString(),
          priority: severity === 'critical' ? 'high' : 'normal'
        }
      );
      return true;
    } catch (error) {
      logger.error('Failed to notify compliance violation', { userId, violationId, error });
      return false;
    }
  }

  /**
   * Get connected services status
   */
  async getServicesStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};

    for (const service of this.connectedServices) {
      try {
        const response = await this.makeRequest(
          'GET',
          `/api/services/${service}/health`,
          undefined
        );
        status[service] = response.status === 'healthy';
      } catch {
        status[service] = false;
      }
    }

    return status;
  }

  /**
   * Check if service is available
   */
  async isServiceAvailable(serviceName: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        'GET',
        `/api/services/${serviceName}/health`,
        undefined
      );
      return response.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Register compliance engine with customer operations
   */
  async registerService(): Promise<boolean> {
    try {
      await this.makeRequest(
        'POST',
        '/api/services/register',
        undefined,
        {
          service: 'compliance-engine',
          version: '1.0.0',
          capabilities: ['GDPR', 'KYC', 'AML'],
          port: process.env.PORT || 4986
        }
      );
      logger.info('Registered with customer operations');
      return true;
    } catch (error) {
      logger.error('Failed to register with customer operations', { error });
      return false;
    }
  }

  /**
   * Make HTTP request to customer operations service
   */
  private async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    params?: Record<string, unknown>,
    body?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: unknown; error?: string; status?: string }> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    try {
      // In production, use actual HTTP client
      // For now, simulate successful responses
      logger.debug('Making request to customer ops', { method, url });

      // Simulate response
      return {
        success: true,
        status: 'healthy',
        data: {}
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Customer ops request failed', { method, url, error: errorMessage });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get list of connected services
   */
  getConnectedServices(): string[] {
    return [...this.connectedServices];
  }

  /**
   * Add a new connected service
   */
  addConnectedService(serviceName: string): void {
    if (!this.connectedServices.includes(serviceName)) {
      this.connectedServices.push(serviceName);
      logger.info('Added connected service', { serviceName });
    }
  }

  /**
   * Remove a connected service
   */
  removeConnectedService(serviceName: string): void {
    const index = this.connectedServices.indexOf(serviceName);
    if (index > -1) {
      this.connectedServices.splice(index, 1);
      logger.info('Removed connected service', { serviceName });
    }
  }
}

export const customerOpsBridge = new CustomerOpsBridge();
