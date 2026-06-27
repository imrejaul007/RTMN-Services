/**
 * Workday Workers API
 *
 * Provides operations for managing workers including:
 * - Worker retrieval (list, get by ID, get by email, get by supervisor)
 * - Organization hierarchy traversal
 * - Compensation and pay information
 * - Location and benefits data
 * - Skills and qualifications
 */

import { WorkdayClient } from './client.js';
import {
  WorkdayWorker,
  WorkdaySupervisoryOrganization,
  WorkdayCostCenter,
  WorkdayLocation,
  WorkdayPayGroup,
  WorkdayCompensation,
  WorkerQueryParams,
  WorkerListResponse,
  WorkdaySkills,
  WorkerSkills,
  WorkdayBenefit,
  WorkdayApiResponse
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Workers API
// ============================================================================

export class WorkersApi {
  private client: WorkdayClient;

  constructor(client: WorkdayClient) {
    this.client = client;
  }

  /**
   * Get a paginated list of workers
   * @param params - Query parameters for filtering and pagination
   */
  async getWorkers(params?: WorkerQueryParams): Promise<WorkerListResponse> {
    logger.debug('Fetching workers', { params });

    const queryParams: Record<string, string | number | boolean> = {};

    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.active !== undefined) queryParams.active = params.active;
    if (params?.searchText) queryParams.searchText = params.searchText;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.ascending !== undefined) queryParams.ascending = params.ascending;

    // Add WQL filter for supervisor
    if (params?.supervisorId) {
      queryParams.supervisory_organization = params.supervisorId;
    }

    // Add WQL filter for organization
    if (params?.organizationId) {
      queryParams.organization = params.organizationId;
    }

    // Add WQL filter for location
    if (params?.locationId) {
      queryParams.location = params.locationId;
    }

    // Include fields
    if (params?.include) {
      queryParams.include = params.include.join(',');
    }

    const response = await this.client.get<{ data: WorkdayWorker[]; total: number }>(
      '/workers',
      { params: queryParams }
    );

    const workers = response.data?.data || response.data as unknown as WorkdayWorker[] || [];
    const total = response.data?.total || response.meta?.total || workers.length;
    const limit = params?.limit || 100;
    const offset = params?.offset || 0;

    return {
      data: Array.isArray(workers) ? workers : [workers],
      total,
      limit,
      offset,
      hasMore: offset + workers.length < total
    };
  }

  /**
   * Get a worker by their ID
   * @param id - Workday worker ID
   */
  async getWorker(id: string): Promise<WorkdayWorker> {
    logger.debug('Fetching worker by ID', { workerId: id });

    const response = await this.client.get<WorkdayWorker>(`/workers/${id}`);
    return this.transformWorkerResponse(response.data);
  }

  /**
   * Get a worker by their email address
   * @param email - Worker's primary email address
   */
  async getWorkerByEmail(email: string): Promise<WorkdayWorker | null> {
    logger.debug('Looking up worker by email', { email });

    try {
      // Use WQL to search by email
      const response = await this.client.get<{ data: WorkdayWorker[] }>(
        '/workers',
        {
          params: {
            searchText: email,
            limit: 1
          }
        }
      );

      const workers = response.data?.data || [];
      if (workers.length > 0) {
        // Filter by exact email match
        const matchedWorker = workers.find(
          w => w.primaryWorkEmail?.toLowerCase() === email.toLowerCase()
        );
        if (matchedWorker) {
          return this.transformWorkerResponse(matchedWorker);
        }
      }

      return null;
    } catch (error) {
      logger.warn('Worker lookup by email failed', { email, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Get all direct reports for a supervisor
   * @param supervisorId - Workday ID of the supervisor
   */
  async getWorkerBySupervisor(supervisorId: string): Promise<WorkdayWorker[]> {
    logger.debug('Fetching direct reports', { supervisorId });

    const response = await this.client.get<{ data: WorkdayWorker[] }>(
      '/workers',
      {
        params: {
          supervisory_organization: supervisorId,
          active: true,
          limit: 500
        }
      }
    );

    const workers = response.data?.data || [];
    return Array.isArray(workers) ? workers.map(w => this.transformWorkerResponse(w)) : [this.transformWorkerResponse(workers)];
  }

  /**
   * Get the organization hierarchy for a worker
   * @param id - Workday worker ID
   */
  async getWorkerOrgPath(id: string): Promise<WorkdaySupervisoryOrganization[]> {
    logger.debug('Fetching organization path', { workerId: id });

    const response = await this.client.get<{
      supervisory_organizations?: WorkdaySupervisoryOrganization[];
    }>(`/workers/${id}/organizations`);

    const orgs = response.data?.supervisory_organizations || [];
    return Array.isArray(orgs) ? orgs : [orgs];
  }

  /**
   * Get compensation information for a worker
   * @param id - Workday worker ID
   */
  async getWorkerCompensation(id: string): Promise<WorkdayCompensation> {
    logger.debug('Fetching worker compensation', { workerId: id });

    const response = await this.client.get<WorkdayCompensation>(
      `/workers/${id}/compensation`
    );

    return response.data;
  }

  /**
   * Get work locations for a worker
   * @param id - Workday worker ID
   */
  async getWorkerLocations(id: string): Promise<WorkdayLocation[]> {
    logger.debug('Fetching worker locations', { workerId: id });

    const response = await this.client.get<{
      locations?: WorkdayLocation[];
    }>(`/workers/${id}/locations`);

    const locations = response.data?.locations || [];
    return Array.isArray(locations) ? locations : [locations];
  }

  /**
   * Get benefits information for a worker
   * @param id - Workday worker ID
   */
  async getWorkerBenefits(id: string): Promise<WorkdayBenefit[]> {
    logger.debug('Fetching worker benefits', { workerId: id });

    const response = await this.client.get<{
      benefits?: WorkdayBenefit[];
    }>(`/workers/${id}/benefits`);

    const benefits = response.data?.benefits || [];
    return Array.isArray(benefits) ? benefits : [benefits];
  }

  /**
   * Get skills and qualifications for a worker
   * @param id - Workday worker ID
   */
  async getWorkerSkills(id: string): Promise<WorkerSkills> {
    logger.debug('Fetching worker skills', { workerId: id });

    const response = await this.client.get<WorkerSkills>(`/workers/${id}/skills`);
    return response.data;
  }

  /**
   * Get worker time off balances
   * @param id - Workday worker ID
   */
  async getWorkerTimeOffBalances(id: string): Promise<unknown[]> {
    logger.debug('Fetching worker time off balances', { workerId: id });

    const response = await this.client.get<{ data: unknown[] }>(
      `/workers/${id}/time-off-balances`
    );

    return response.data?.data || [];
  }

  /**
   * Get worker pay stubs
   * @param id - Workday worker ID
   * @param limit - Maximum number of pay stubs to return
   */
  async getWorkerPayStubs(id: string, limit: number = 12): Promise<unknown[]> {
    logger.debug('Fetching worker pay stubs', { workerId: id, limit });

    const response = await this.client.get<{ data: unknown[] }>(
      `/workers/${id}/pay-stubs`,
      { params: { limit } }
    );

    return response.data?.data || [];
  }

  /**
   * Get worker photo
   * @param id - Workday worker ID
   */
  async getWorkerPhoto(id: string): Promise<{ mimeType: string; data: string } | null> {
    logger.debug('Fetching worker photo', { workerId: id });

    try {
      const response = await this.client.get<{ mimeType: string; data: string }>(
        `/workers/${id}/photo`
      );
      return response.data;
    } catch {
      // Photo may not exist
      return null;
    }
  }

  // ============================================================================
  // WQL (Workday Query Language) Support
  // ============================================================================

  /**
   * Execute a custom WQL query for workers
   * @param query - WQL query object
   */
  async executeWqlQuery(query: {
    SelectFields: string[];
    Where?: string;
    OrderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
    Limit?: number;
    Offset?: number;
  }): Promise<WorkdayWorker[]> {
    logger.debug('Executing WQL query for workers', { query });

    const wqlQuery = {
      wd: {
        Query: {
          'wd:SelectFields': query.SelectFields.map(field => ({
            '@wd:FieldPath': field
          })),
          ...(query.Where && { 'wd:Where': { '@wd:Condition': query.Where } }),
          ...(query.OrderBy && {
            'wd:OrderBy': query.OrderBy.map(order => ({
              '@wd:SortOrder': order.direction,
              '@wd:FieldPath': order.field
            }))
          }),
          ...(query.Limit && { '@wd:Limit': query.Limit }),
          ...(query.Offset && { '@wd:Offset': query.Offset })
        }
      }
    };

    const response = await this.client.post<{ data: WorkdayWorker[] }>(
      '/workers',
      wqlQuery,
      {
        headers: {
          'Content-Type': 'application/vnd.workday.workers+json'
        }
      }
    );

    return response.data?.data || [];
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Transform raw Workday worker response to our type
   */
  private transformWorkerResponse(worker: WorkdayWorker | unknown): WorkdayWorker {
    if (!worker || typeof worker !== 'object') {
      throw new Error('Invalid worker data');
    }

    const w = worker as Record<string, unknown>;

    return {
      id: String(w.id || w['wd:Worker_Reference']?.['wd:ID'] || ''),
      descriptor: String(w.descriptor || w['wd:Descriptor'] || ''),
      firstName: String(w.firstName || w['wd:Name_Data']?.['wd:Legal_First_Name'] || ''),
      lastName: String(w.lastName || w['wd:Name_Data']?.['wd:Legal_Last_Name'] || ''),
      preferredName: w.preferredName as string || w['wd:Name_Data']?.['wd:Preferred_First_Name'] as string,
      primaryWorkEmail: w.primaryWorkEmail as string || w['wd:Contact_Data']?.['wd:Email_Address'] as string,
      businessTitle: w.businessTitle as string || w['wd:Business_Title'] as string,
      supervisoryOrganization: this.transformSupervisoryOrg(w.supervisoryOrganization as Record<string, unknown>),
      managerId: w.managerId as string || w['wd:Supervisory_Organization_Reference']?.['wd:ID'] as string,
      hireDate: w.hireDate ? new Date(w.hireDate as string) : undefined,
      terminationDate: w.terminationDate ? new Date(w.terminationDate as string) : undefined,
      active: w.active !== undefined ? Boolean(w.active) : true,
      workerStatus: w.workerStatus as string,
      customFields: w.customFields as Record<string, unknown>
    };
  }

  /**
   * Transform supervisory organization reference
   */
  private transformSupervisoryOrg(org: Record<string, unknown> | undefined): WorkdaySupervisoryOrganization | undefined {
    if (!org) return undefined;

    return {
      id: String(org.id || org['wd:Organization_Reference']?.['wd:ID'] || ''),
      descriptor: String(org.descriptor || org['wd:Descriptor'] || ''),
      name: String(org.name || org['wd:Organization_Name'] || ''),
      parentOrgId: org.parentOrgId as string,
      leaderId: org.leaderId as string,
      orgType: org.orgType as string
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let workersApiInstance: WorkersApi | null = null;

/**
 * Get or create a WorkersApi instance
 */
export function getWorkersApi(client?: WorkdayClient): WorkersApi {
  if (!workersApiInstance && client) {
    workersApiInstance = new WorkersApi(client);
  }
  if (!workersApiInstance) {
    throw new Error('WorkersApi not initialized. Provide client on first call.');
  }
  return workersApiInstance;
}

/**
 * Reset the WorkersApi instance (for testing)
 */
export function resetWorkersApi(): void {
  workersApiInstance = null;
}

export default WorkersApi;