/**
 * Integration Health Monitoring Service
 *
 * Monitors health of all CorpPerks integrations:
 * - Makcorps (Hotel OTA)
 * - NextaBizz (Gifting)
 * - RTMN Finance (Wallet)
 * - HRIS Providers
 */

import { apiClient } from './apiClient';

// Types
export interface IntegrationHealth {
  id: string;
  name: string;
  category: 'ota' | 'procurement' | 'finance' | 'hris';
  status: 'healthy' | 'degraded' | 'down' | 'disconnected';
  connected: boolean;
  lastSyncAt?: string;
  lastHealthCheck?: string;
  metrics: {
    latency?: number;
    uptime?: number;
    errorRate?: number;
    successRate?: number;
  };
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }>;
}

export interface HealthCheckResult {
  integrationId: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  error?: string;
  checkedAt: string;
}

// Helper
function getCompanyId(): string {
  return 'demo-company';
}

// Integration Health API Service
export const integrationHealthApi = {
  /**
   * Get health status of all integrations
   */
  async getAllHealth(): Promise<IntegrationHealth[]> {
    const response = await apiClient.get<{ data: IntegrationHealth[] }>(
      '/api/integrations/health',
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },

  /**
   * Get health status of specific integration
   */
  async getHealth(integrationId: string): Promise<IntegrationHealth | null> {
    const response = await apiClient.get<{ data: IntegrationHealth }>(
      `/api/integrations/health/${integrationId}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || null;
  },

  /**
   * Trigger health check for an integration
   */
  async checkHealth(integrationId: string): Promise<HealthCheckResult> {
    const response = await apiClient.post<{ data: HealthCheckResult }>(
      `/api/integrations/health/${integrationId}/check`,
      {},
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Health check failed');
    }
    return response.data!.data;
  },

  /**
   * Get health history
   */
  async getHealthHistory(params?: {
    integrationId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Array<{
      integrationId: string;
      checks: HealthCheckResult[];
      date: string;
    }>;
    pagination: { total: number; page: number; limit: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.integrationId) queryParams.set('integrationId', params.integrationId);
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 50));

    const response = await apiClient.get<{
      data: Array<{
        integrationId: string;
        checks: HealthCheckResult[];
        date: string;
      }>;
      pagination: { total: number; page: number; limit: number };
    }>(`/api/integrations/health/history?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 50 },
    };
  },

  /**
   * Get integration metrics
   */
  async getMetrics(params?: {
    integrationId?: string;
    period?: 'day' | 'week' | 'month';
  }): Promise<{
    uptime: number;
    avgLatency: number;
    totalRequests: number;
    failedRequests: number;
    errorRate: number;
    dailyMetrics: Array<{
      date: string;
      requests: number;
      errors: number;
      latency: number;
    }>;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.integrationId) queryParams.set('integrationId', params.integrationId);
    if (params?.period) queryParams.set('period', params.period);

    const response = await apiClient.get<{
      data: {
        uptime: number;
        avgLatency: number;
        totalRequests: number;
        failedRequests: number;
        errorRate: number;
        dailyMetrics: Array<{
          date: string;
          requests: number;
          errors: number;
          latency: number;
        }>;
      };
    }>(`/api/integrations/health/metrics?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return (
      response.data?.data || {
        uptime: 100,
        avgLatency: 0,
        totalRequests: 0,
        failedRequests: 0,
        errorRate: 0,
        dailyMetrics: [],
      }
    );
  },

  /**
   * Get active alerts
   */
  async getAlerts(): Promise<
    Array<{
      id: string;
      integrationId: string;
      integrationName: string;
      severity: 'critical' | 'warning' | 'info';
      message: string;
      createdAt: string;
      acknowledged: boolean;
    }>
  > {
    const response = await apiClient.get<{
      data: Array<{
        id: string;
        integrationId: string;
        integrationName: string;
        severity: 'critical' | 'warning' | 'info';
        message: string;
        createdAt: string;
        acknowledged: boolean;
      }>;
    }>('/api/integrations/health/alerts', { headers: { 'x-company-id': getCompanyId() } });
    return response.data?.data || [];
  },

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const response = await apiClient.post(
      `/api/integrations/health/alerts/${alertId}/acknowledge`,
      {},
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to acknowledge alert');
    }
  },

  /**
   * Get webhook delivery status
   */
  async getWebhookStatus(integrationId: string): Promise<{
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    deliveryRate: number;
  }> {
    const response = await apiClient.get<{
      data: {
        total: number;
        delivered: number;
        failed: number;
        pending: number;
        deliveryRate: number;
      };
    }>(`/api/integrations/webhooks/${integrationId}/status`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return (
      response.data?.data || {
        total: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        deliveryRate: 0,
      }
    );
  },

  /**
   * Retry failed webhook
   */
  async retryWebhook(integrationId: string, webhookId: string): Promise<void> {
    const response = await apiClient.post(
      `/api/integrations/webhooks/${integrationId}/${webhookId}/retry`,
      {},
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to retry webhook');
    }
  },

  /**
   * Get integration sync status
   */
  async getSyncStatus(integrationId: string): Promise<{
    lastSyncAt?: string;
    nextSyncAt?: string;
    recordsSynced: number;
    recordsFailed: number;
    status: 'idle' | 'syncing' | 'error';
  }> {
    const response = await apiClient.get<{
      data: {
        lastSyncAt?: string;
        nextSyncAt?: string;
        recordsSynced: number;
        recordsFailed: number;
        status: 'idle' | 'syncing' | 'error';
      };
    }>(`/api/integrations/${integrationId}/sync/status`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return (
      response.data?.data || {
        recordsSynced: 0,
        recordsFailed: 0,
        status: 'idle',
      }
    );
  },

  /**
   * Trigger manual sync
   */
  async triggerSync(integrationId: string): Promise<{
    syncId: string;
    status: 'started';
  }> {
    const response = await apiClient.post<{ data: { syncId: string; status: 'started' } }>(
      `/api/integrations/${integrationId}/sync/trigger`,
      {},
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to trigger sync');
    }
    return response.data!.data;
  },
};

export default integrationHealthApi;
