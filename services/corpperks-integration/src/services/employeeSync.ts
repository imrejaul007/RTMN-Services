import axios, { AxiosInstance } from 'axios';
import { EmployeeProfile } from '../models/EmployeeProfile';
import { logger } from '../index';

interface TwinSyncResult {
  success: boolean;
  twinId?: string;
  twinType?: string;
  error?: string;
  syncedAt?: string;
}

interface SyncMetadata {
  sourceService: string;
  syncType: 'create' | 'update' | 'delete';
  timestamp: string;
  retryCount: number;
  previousVersion?: number;
  newVersion?: number;
}

class EmployeeSyncService {
  private httpClient: AxiosInstance;
  private employeeTwinUrl: string;
  private syncQueue: Map<string, SyncMetadata> = new Map();
  private maxRetries: number = 3;

  constructor() {
    this.employeeTwinUrl = process.env.EMPLOYEE_TWIN_URL || 'http://localhost:3011';

    this.httpClient = axios.create({
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'corpperks-integration',
        'X-Source-System': 'corpperks'
      }
    });
  }

  /**
   * Sync employee profile to Employee Twin
   */
  async syncEmployeeToTwin(employee: EmployeeProfile): Promise<TwinSyncResult> {
    try {
      logger.info(`Syncing employee ${employee.employeeId} to Employee Twin`);

      // Prepare twin payload
      const twinPayload = this.transformToTwinFormat(employee);

      // Attempt to sync
      const response = await this.httpClient.post(
        `${this.employeeTwinUrl}/api/twin/sync`,
        twinPayload,
        {
          params: {
            operation: employee.status === 'terminated' ? 'update' : 'upsert'
          }
        }
      );

      const twinId = response.data?.twinId || `EMP-TWIN-${employee.employeeId.substring(0, 8)}`;

      logger.info(`Employee ${employee.employeeId} synced to Employee Twin: ${twinId}`);

      return {
        success: true,
        twinId,
        twinType: 'employee-twin',
        syncedAt: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error(`Failed to sync employee to twin: ${error.message}`);

      // Record sync attempt
      this.recordSyncAttempt(employee.employeeId, {
        sourceService: 'corpperks-integration',
        syncType: 'update',
        timestamp: new Date().toISOString(),
        retryCount: 0
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Transform employee profile to Employee Twin format
   */
  private transformToTwinFormat(employee: EmployeeProfile): any {
    return {
      // Core identity
      twinId: employee.twins.employeeTwinId,
      twinType: 'employee',
      sourceSystem: 'corpperks',
      sourceId: employee.employeeId,

      // Personal information
      identity: {
        employeeId: employee.employeeId,
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        middleName: employee.middleName,
        preferredName: employee.preferredName,
        email: employee.email,
        phone: employee.phone,
        dateOfBirth: employee.dateOfBirth,
        gender: employee.gender
      },

      // Employment details
      employment: {
        companyId: employee.companyId,
        companyName: employee.companyName,
        department: employee.department,
        division: employee.division,
        jobTitle: employee.jobTitle,
        jobCode: employee.jobCode,
        jobLevel: employee.jobLevel,
        employmentType: employee.employmentType,
        status: employee.status,
        hireDate: employee.hireDate,
        startDate: employee.startDate,
        terminationDate: employee.terminationDate
      },

      // Work information
      work: {
        location: employee.workLocation,
        workPhone: employee.workPhone,
        workEmail: employee.workEmail,
        schedule: employee.workSchedule
      },

      // Manager relationship
      reporting: {
        managerId: employee.managerId,
        managerName: employee.managerName,
        managerEmail: employee.managerEmail,
        directReports: employee.directReports
      },

      // Metadata
      metadata: {
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
        version: employee.version,
        syncStatus: employee.syncStatus,
        lastSyncedAt: employee.lastSyncedAt
      },

      // Related twins
      relatedTwins: {
        paymentTwinId: employee.twins.paymentTwinId,
        industryTwinId: employee.twins.industryTwinId
      },

      // Events for audit trail
      events: [
        {
          type: 'profile.updated',
          timestamp: new Date().toISOString(),
          source: 'corpperks-integration',
          data: {
            changedFields: ['updatedAt', 'syncStatus'],
            newVersion: employee.version
          }
        }
      ]
    };
  }

  /**
   * Batch sync multiple employees
   */
  async batchSyncEmployees(employees: EmployeeProfile[]): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: TwinSyncResult[];
  }> {
    const results: TwinSyncResult[] = {
      total: employees.length,
      successful: 0,
      failed: 0,
      results: []
    };

    for (const employee of employees) {
      const result = await this.syncEmployeeToTwin(employee);
      results.results.push(result);

      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }
    }

    logger.info(`Batch sync completed: ${results.successful}/${results.total} successful`);
    return results;
  }

  /**
   * Get employee twin status
   */
  async getTwinStatus(employeeId: string): Promise<{
    exists: boolean;
    twinId?: string;
    lastSync?: string;
    version?: number;
  }> {
    try {
      const response = await this.httpClient.get(
        `${this.employeeTwinUrl}/api/twin/status/${employeeId}`
      );

      return {
        exists: true,
        twinId: response.data.twinId,
        lastSync: response.data.lastSync,
        version: response.data.version
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { exists: false };
      }
      logger.error(`Failed to get twin status: ${error.message}`);
      return { exists: false };
    }
  }

  /**
   * Delete employee from twin
   */
  async deleteFromTwin(employeeId: string): Promise<TwinSyncResult> {
    try {
      await this.httpClient.delete(
        `${this.employeeTwinUrl}/api/twin/${employeeId}`
      );

      logger.info(`Employee ${employeeId} deleted from Employee Twin`);

      return {
        success: true,
        syncedAt: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error(`Failed to delete employee from twin: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record sync attempt for retry logic
   */
  private recordSyncAttempt(employeeId: string, metadata: SyncMetadata): void {
    this.syncQueue.set(employeeId, metadata);
  }

  /**
   * Get pending sync items
   */
  getPendingSyncs(): Array<{ employeeId: string; metadata: SyncMetadata }> {
    return Array.from(this.syncQueue.entries()).map(([employeeId, metadata]) => ({
      employeeId,
      metadata
    }));
  }

  /**
   * Retry failed syncs
   */
  async retryFailedSyncs(employees: EmployeeProfile[]): Promise<{
    retried: number;
    successful: number;
    stillFailing: number;
  }> {
    const pending = this.getPendingSyncs();
    const results = {
      retried: 0,
      successful: 0,
      stillFailing: 0
    };

    for (const item of pending) {
      const employee = employees.find(e => e.employeeId === item.employeeId);
      if (!employee) continue;

      const metadata = item.metadata;
      if (metadata.retryCount >= this.maxRetries) {
        results.stillFailing++;
        continue;
      }

      // Update retry count
      metadata.retryCount++;
      metadata.timestamp = new Date().toISOString();

      const result = await this.syncEmployeeToTwin(employee);

      if (result.success) {
        results.successful++;
        results.retried++;
        this.syncQueue.delete(item.employeeId);
      } else {
        this.recordSyncAttempt(item.employeeId, metadata);
        results.retried++;
      }
    }

    return results;
  }

  /**
   * Verify twin synchronization
   */
  async verifySync(employeeId: string, employee: EmployeeProfile): Promise<{
    verified: boolean;
    differences: string[];
  }> {
    const differences: string[] = [];

    try {
      const status = await this.getTwinStatus(employeeId);

      if (!status.exists) {
        differences.push('Twin does not exist');
        return { verified: false, differences };
      }

      // In production, compare full twin data with source
      // For now, just verify existence and basic fields
      if (status.version !== employee.version) {
        differences.push(`Version mismatch: twin=${status.version}, source=${employee.version}`);
      }

      return {
        verified: differences.length === 0,
        differences
      };
    } catch (error: any) {
      differences.push(`Verification error: ${error.message}`);
      return { verified: false, differences };
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats(employees: EmployeeProfile[]): {
    total: number;
    synced: number;
    pending: number;
    failed: number;
    syncRate: number;
  } {
    const synced = employees.filter(e => e.syncStatus === 'synced').length;
    const pending = employees.filter(e => e.syncStatus === 'pending').length;
    const failed = employees.filter(e => e.syncStatus === 'failed').length;

    return {
      total: employees.length,
      synced,
      pending,
      failed,
      syncRate: employees.length > 0 ? (synced / employees.length) * 100 : 0
    };
  }
}

// Export singleton instance
export const employeeSyncService = new EmployeeSyncService();

// Export sync function for use in routes
export async function syncEmployeeToTwin(employee: EmployeeProfile): Promise<TwinSyncResult> {
  return employeeSyncService.syncEmployeeToTwin(employee);
}

export default employeeSyncService;
