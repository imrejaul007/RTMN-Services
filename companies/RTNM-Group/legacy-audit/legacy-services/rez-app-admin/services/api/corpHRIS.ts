/**
 * CorpPerks HRIS Integration API Service
 *
 * HRIS system integration for employee data synchronization
 */

import { apiClient } from './apiClient';

// Types
export interface HRISConfig {
  _id: string;
  companyId: string;
  provider: 'greythr' | 'zoho_people' | 'bamboo_hr' | 'workday' | 'sap_successfactors' | 'custom';
  status: 'active' | 'inactive' | 'error';
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'partial' | 'failed';
  config: {
    apiKey?: string;
    apiSecret?: string;
    webhookUrl?: string;
    baseUrl?: string;
    employeeIdField?: string;
    departmentField?: string;
    emailField?: string;
    nameField?: string;
    customMappings?: Record<string, string>;
  };
  syncSettings: {
    autoSync: boolean;
    syncInterval: 'hourly' | 'daily' | 'weekly';
    syncFields: string[];
    createOnSync: boolean;
    updateOnSync: boolean;
    deactivateOnSync: boolean;
  };
  errorLog: Array<{
    timestamp: string;
    error: string;
    recordsAffected: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface SyncResult {
  syncId: string;
  status: 'success' | 'partial' | 'failed';
  startedAt: string;
  completedAt: string;
  stats: {
    totalRecords: number;
    created: number;
    updated: number;
    deactivated: number;
    errors: number;
  };
  errors: Array<{
    employeeId: string;
    error: string;
  }>;
}

export interface EmployeeMapping {
  sourceField: string;
  targetField: string;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'none';
}

export interface HRISEmployee {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  designation?: string;
  level?: string;
  employmentType: 'full_time' | 'part_time' | 'contractor' | 'intern';
  managerId?: string;
  dateOfJoining: string;
  dateOfBirth?: string;
  status: 'active' | 'inactive' | 'terminated';
  [key: string]: any;
}

// Helper
function getCompanyId(): string {
  return 'demo-company';
}

// HRIS API Service
export const corpHRISApi = {
  // ========== Configuration ==========

  /**
   * Get HRIS configuration
   */
  async getConfig(): Promise<HRISConfig | null> {
    const response = await apiClient.get<{ data: HRISConfig }>('/api/corp/hris/config', {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || null;
  },

  /**
   * Save HRIS configuration
   */
  async saveConfig(data: Partial<HRISConfig>): Promise<HRISConfig> {
    const response = await apiClient.post<{ data: HRISConfig }>('/api/corp/hris/config', data, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to save HRIS config');
    }
    return response.data!.data;
  },

  /**
   * Update HRIS configuration
   */
  async updateConfig(id: string, data: Partial<HRISConfig>): Promise<HRISConfig> {
    const response = await apiClient.put<{ data: HRISConfig }>(
      `/api/corp/hris/config/${id}`,
      data,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to update HRIS config');
    }
    return response.data!.data;
  },

  /**
   * Test HRIS connection
   */
  async testConnection(config: Partial<HRISConfig>): Promise<{
    success: boolean;
    message: string;
    employeeCount?: number;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      employeeCount?: number;
    }>('/api/corp/hris/test-connection', config, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data || { success: false, message: 'Connection failed' };
  },

  // ========== Sync Operations ==========

  /**
   * Trigger manual sync
   */
  async triggerSync(): Promise<SyncResult> {
    const response = await apiClient.post<{ data: SyncResult }>(
      '/api/corp/hris/sync',
      {},
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to trigger sync');
    }
    return response.data!.data;
  },

  /**
   * Get sync history
   */
  async getSyncHistory(params?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<SyncResult[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);

    const response = await apiClient.get<{ data: SyncResult[] }>(
      `/api/corp/hris/sync/history?${queryParams}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    lastSyncAt?: string;
    lastSyncStatus?: 'success' | 'partial' | 'failed';
    nextScheduledSync?: string;
    isSyncing: boolean;
  }> {
    const response = await apiClient.get<{ data: any }>('/api/corp/hris/sync/status', {
      headers: { 'x-company-id': getCompanyId() },
    });
    return (
      response.data?.data || {
        lastSyncAt: undefined,
        lastSyncStatus: undefined,
        nextScheduledSync: undefined,
        isSyncing: false,
      }
    );
  },

  /**
   * Cancel ongoing sync
   */
  async cancelSync(): Promise<void> {
    const response = await apiClient.post(
      '/api/corp/hris/sync/cancel',
      {},
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to cancel sync');
    }
  },

  // ========== Field Mapping ==========

  /**
   * Get field mappings
   */
  async getFieldMappings(): Promise<EmployeeMapping[]> {
    const response = await apiClient.get<{ data: EmployeeMapping[] }>('/api/corp/hris/mappings', {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || DEFAULT_FIELD_MAPPINGS;
  },

  /**
   * Update field mappings
   */
  async updateFieldMappings(mappings: EmployeeMapping[]): Promise<EmployeeMapping[]> {
    const response = await apiClient.put<{ data: EmployeeMapping[] }>(
      '/api/corp/hris/mappings',
      mappings as unknown as Record<string, unknown>,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to update field mappings');
    }
    return response.data!.data;
  },

  // ========== Employee Preview ==========

  /**
   * Preview employees from HRIS (without importing)
   */
  async previewEmployees(): Promise<HRISEmployee[]> {
    const response = await apiClient.get<{ data: HRISEmployee[] }>('/api/corp/hris/preview', {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || [];
  },

  /**
   * Map preview employee to CorpPerks format
   */
  async mapEmployee(employee: HRISEmployee): Promise<{
    employeeId: string;
    department: string;
    level: string;
    designation?: string;
    employmentType: string;
    corpRole: string;
  }> {
    const response = await apiClient.post<{
      data: {
        employeeId: string;
        department: string;
        level: string;
        designation?: string;
        employmentType: string;
        corpRole: string;
      };
    }>('/api/corp/hris/map-employee', employee, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return (
      response.data?.data || {
        employeeId: employee.employeeId,
        department: employee.department,
        level: employee.level || 'L1',
        designation: employee.designation,
        employmentType: employee.employmentType,
        corpRole: 'corp_employee',
      }
    );
  },
};

// Default field mappings for common HRIS systems
const DEFAULT_FIELD_MAPPINGS: EmployeeMapping[] = [
  { sourceField: 'employee_id', targetField: 'employeeId', transform: 'trim' },
  { sourceField: 'first_name', targetField: 'firstName', transform: 'trim' },
  { sourceField: 'last_name', targetField: 'lastName', transform: 'trim' },
  { sourceField: 'email_address', targetField: 'email', transform: 'lowercase' },
  { sourceField: 'phone_number', targetField: 'phone', transform: 'trim' },
  { sourceField: 'department_name', targetField: 'department', transform: 'trim' },
  { sourceField: 'job_title', targetField: 'designation', transform: 'trim' },
  { sourceField: 'employment_status', targetField: 'status', transform: 'lowercase' },
  { sourceField: 'hire_date', targetField: 'dateOfJoining', transform: 'none' },
];

export default corpHRISApi;
