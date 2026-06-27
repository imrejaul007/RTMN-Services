/**
 * Workday Organizations API
 *
 * Provides operations for managing organizations including:
 * - Supervisory organizations (reporting structure)
 * - Cost centers
 * - Business titles / job profiles
 * - Work locations
 * - Organization hierarchy traversal
 */

import { WorkdayClient } from './client.js';
import {
  WorkdaySupervisoryOrganization,
  WorkdayCostCenter,
  WorkdayBusinessTitle,
  WorkdayLocation,
  WorkdayOrganizationHierarchy,
  WorkdayWorker,
  OrganizationQueryParams
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Organizations API
// ============================================================================

export class OrganizationsApi {
  private client: WorkdayClient;

  constructor(client: WorkdayClient) {
    this.client = client;
  }

  // ============================================================================
  // Supervisory Organizations
  // ============================================================================

  /**
   * Get a paginated list of supervisory organizations
   * @param params - Query parameters for filtering and pagination
   */
  async getOrganizations(params?: OrganizationQueryParams): Promise<{
    data: WorkdaySupervisoryOrganization[];
    total: number;
    hasMore: boolean;
  }> {
    logger.debug('Fetching organizations', { params });

    const queryParams: Record<string, string | number | boolean> = {};

    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.active !== undefined) queryParams.active = params.active;
    if (params?.searchText) queryParams.searchText = params.searchText;
    if (params?.parentOrgId) queryParams.parentOrganization = params.parentOrgId;
    if (params?.includeChildren !== undefined) queryParams.includeChildren = params.includeChildren;

    const response = await this.client.get<{
      data?: WorkdaySupervisoryOrganization[];
      supervisory_organizations?: WorkdaySupervisoryOrganization[];
      total?: number;
    }>('/organizations', { params: queryParams });

    const organizations = response.data?.data ||
      response.data?.supervisory_organizations ||
      [];
    const total = response.data?.total || organizations.length;

    return {
      data: Array.isArray(organizations) ? organizations.map(o => this.transformOrganization(o)) : [this.transformOrganization(organizations)],
      total,
      hasMore: (params?.offset || 0) + organizations.length < total
    };
  }

  /**
   * Get a supervisory organization by ID
   * @param id - Workday organization ID
   */
  async getOrganization(id: string): Promise<WorkdaySupervisoryOrganization> {
    logger.debug('Fetching organization by ID', { organizationId: id });

    const response = await this.client.get<WorkdaySupervisoryOrganization>(
      `/organizations/${id}`
    );

    return this.transformOrganization(response.data);
  }

  /**
   * Get all workers in an organization
   * @param id - Workday organization ID
   */
  async getOrganizationWorkers(id: string): Promise<WorkdayWorker[]> {
    logger.debug('Fetching workers in organization', { organizationId: id });

    const response = await this.client.get<{
      data?: WorkdayWorker[];
      workers?: WorkdayWorker[];
    }>(`/organizations/${id}/workers`);

    const workers = response.data?.data || response.data?.workers || [];
    return Array.isArray(workers) ? workers : [workers];
  }

  /**
   * Get the hierarchy tree for an organization
   * @param id - Workday organization ID
   * @param depth - Maximum depth to traverse (default: 10)
   */
  async getOrganizationHierarchy(
    id: string,
    depth: number = 10
  ): Promise<WorkdayOrganizationHierarchy> {
    logger.debug('Fetching organization hierarchy', { organizationId: id, depth });

    const response = await this.client.get<WorkdayOrganizationHierarchy>(
      `/organizations/${id}/hierarchy`,
      { params: { depth } }
    );

    return this.transformHierarchyNode(response.data);
  }

  /**
   * Get children organizations under a parent
   * @param id - Workday organization ID
   */
  async getChildOrganizations(id: string): Promise<WorkdaySupervisoryOrganization[]> {
    logger.debug('Fetching child organizations', { organizationId: id });

    const response = await this.client.get<{
      data?: WorkdaySupervisoryOrganization[];
      organizations?: WorkdaySupervisoryOrganization[];
    }>(`/organizations/${id}/children`);

    const children = response.data?.data || response.data?.organizations || [];
    return Array.isArray(children) ? children : [children];
  }

  /**
   * Get the parent organization of an org
   * @param id - Workday organization ID
   */
  async getParentOrganization(id: string): Promise<WorkdaySupervisoryOrganization | null> {
    logger.debug('Fetching parent organization', { organizationId: id });

    try {
      const response = await this.client.get<WorkdaySupervisoryOrganization>(
        `/organizations/${id}/parent`
      );
      return this.transformOrganization(response.data);
    } catch {
      // No parent (top-level org)
      return null;
    }
  }

  // ============================================================================
  // Cost Centers
  // ============================================================================

  /**
   * Get a paginated list of cost centers
   * @param params - Query parameters for filtering and pagination
   */
  async getCostCenters(params?: OrganizationQueryParams): Promise<{
    data: WorkdayCostCenter[];
    total: number;
    hasMore: boolean;
  }> {
    logger.debug('Fetching cost centers', { params });

    const queryParams: Record<string, string | number | boolean> = {};

    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.active !== undefined) queryParams.active = params.active;
    if (params?.searchText) queryParams.searchText = params.searchText;

    const response = await this.client.get<{
      data?: WorkdayCostCenter[];
      cost_centers?: WorkdayCostCenter[];
      total?: number;
    }>('/cost-centers', { params: queryParams });

    const costCenters = response.data?.data ||
      response.data?.cost_centers ||
      [];
    const total = response.data?.total || costCenters.length;

    return {
      data: Array.isArray(costCenters) ? costCenters.map(c => this.transformCostCenter(c)) : [this.transformCostCenter(costCenters)],
      total,
      hasMore: (params?.offset || 0) + costCenters.length < total
    };
  }

  /**
   * Get a cost center by ID
   * @param id - Workday cost center ID
   */
  async getCostCenter(id: string): Promise<WorkdayCostCenter> {
    logger.debug('Fetching cost center by ID', { costCenterId: id });

    const response = await this.client.get<WorkdayCostCenter>(`/cost-centers/${id}`);
    return this.transformCostCenter(response.data);
  }

  /**
   * Get workers in a cost center
   * @param id - Workday cost center ID
   */
  async getCostCenterWorkers(id: string): Promise<WorkdayWorker[]> {
    logger.debug('Fetching workers in cost center', { costCenterId: id });

    const response = await this.client.get<{
      data?: WorkdayWorker[];
      workers?: WorkdayWorker[];
    }>(`/cost-centers/${id}/workers`);

    const workers = response.data?.data || response.data?.workers || [];
    return Array.isArray(workers) ? workers : [workers];
  }

  // ============================================================================
  // Business Titles / Job Profiles
  // ============================================================================

  /**
   * Get a paginated list of business titles
   * @param params - Query parameters for filtering and pagination
   */
  async getBusinessTitles(params?: OrganizationQueryParams): Promise<{
    data: WorkdayBusinessTitle[];
    total: number;
    hasMore: boolean;
  }> {
    logger.debug('Fetching business titles', { params });

    const queryParams: Record<string, string | number | boolean> = {};

    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.searchText) queryParams.searchText = params.searchText;

    const response = await this.client.get<{
      data?: WorkdayBusinessTitle[];
      business_titles?: WorkdayBusinessTitle[];
      total?: number;
    }>('/business-titles', { params: queryParams });

    const titles = response.data?.data ||
      response.data?.business_titles ||
      [];
    const total = response.data?.total || titles.length;

    return {
      data: Array.isArray(titles) ? titles : [titles],
      total,
      hasMore: (params?.offset || 0) + titles.length < total
    };
  }

  /**
   * Get a business title by ID
   * @param id - Workday business title ID
   */
  async getBusinessTitle(id: string): Promise<WorkdayBusinessTitle> {
    logger.debug('Fetching business title by ID', { titleId: id });

    const response = await this.client.get<WorkdayBusinessTitle>(`/business-titles/${id}`);
    return response.data;
  }

  // ============================================================================
  // Locations
  // ============================================================================

  /**
   * Get a paginated list of work locations
   * @param params - Query parameters for filtering and pagination
   */
  async getLocations(params?: OrganizationQueryParams): Promise<{
    data: WorkdayLocation[];
    total: number;
    hasMore: boolean;
  }> {
    logger.debug('Fetching locations', { params });

    const queryParams: Record<string, string | number | boolean> = {};

    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.active !== undefined) queryParams.active = params.active;
    if (params?.searchText) queryParams.searchText = params.searchText;

    const response = await this.client.get<{
      data?: WorkdayLocation[];
      locations?: WorkdayLocation[];
      total?: number;
    }>('/locations', { params: queryParams });

    const locations = response.data?.data ||
      response.data?.locations ||
      [];
    const total = response.data?.total || locations.length;

    return {
      data: Array.isArray(locations) ? locations.map(l => this.transformLocation(l)) : [this.transformLocation(locations)],
      total,
      hasMore: (params?.offset || 0) + locations.length < total
    };
  }

  /**
   * Get a location by ID
   * @param id - Workday location ID
   */
  async getLocation(id: string): Promise<WorkdayLocation> {
    logger.debug('Fetching location by ID', { locationId: id });

    const response = await this.client.get<WorkdayLocation>(`/locations/${id}`);
    return this.transformLocation(response.data);
  }

  /**
   * Get workers at a location
   * @param id - Workday location ID
   */
  async getLocationWorkers(id: string): Promise<WorkdayWorker[]> {
    logger.debug('Fetching workers at location', { locationId: id });

    const response = await this.client.get<{
      data?: WorkdayWorker[];
      workers?: WorkdayWorker[];
    }>(`/locations/${id}/workers`);

    const workers = response.data?.data || response.data?.workers || [];
    return Array.isArray(workers) ? workers : [workers];
  }

  /**
   * Get all countries/locations
   */
  async getCountries(): Promise<{ id: string; name: string; code: string }[]> {
    logger.debug('Fetching countries');

    const response = await this.client.get<{
      data?: { id: string; name: string; code: string }[];
    }>('/countries');

    return response.data?.data || [];
  }

  /**
   * Get all regions/states for a country
   * @param countryId - Workday country ID
   */
  async getRegions(countryId: string): Promise<{ id: string; name: string; code: string }[]> {
    logger.debug('Fetching regions for country', { countryId });

    const response = await this.client.get<{
      data?: { id: string; name: string; code: string }[];
    }>(`/countries/${countryId}/regions`);

    return response.data?.data || [];
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Transform raw Workday organization response
   */
  private transformOrganization(org: WorkdaySupervisoryOrganization | unknown): WorkdaySupervisoryOrganization {
    if (!org || typeof org !== 'object') {
      throw new Error('Invalid organization data');
    }

    const o = org as Record<string, unknown>;

    return {
      id: String(o.id || o['wd:Organization_Reference']?.['wd:ID'] || ''),
      descriptor: String(o.descriptor || o['wd:Descriptor'] || ''),
      name: String(o.name || o['wd:Organization_Name'] || o['wd:Descriptor'] || ''),
      parentOrgId: o.parentOrgId as string || o['wd:Parent_Organization_Reference']?.['wd:ID'] as string,
      parentOrgName: o.parentOrgName as string,
      leaderId: o.leaderId as string || o['wd:Organization_Leader_Reference']?.['wd:ID'] as string,
      leaderName: o.leaderName as string,
      orgType: o.orgType as string || 'Supervisory',
      inactive: o.inactive as boolean
    };
  }

  /**
   * Transform hierarchy node recursively
   */
  private transformHierarchyNode(node: WorkdayOrganizationHierarchy | unknown): WorkdayOrganizationHierarchy {
    if (!node || typeof node !== 'object') {
      throw new Error('Invalid hierarchy node');
    }

    const n = node as Record<string, unknown>;

    return {
      id: String(n.id || ''),
      name: String(n.name || n['wd:Organization_Name'] || ''),
      level: Number(n.level || 0),
      parent: n.parent ? this.transformHierarchyNode(n.parent) : undefined,
      children: Array.isArray(n.children)
        ? n.children.map(c => this.transformHierarchyNode(c))
        : [],
      workers: Array.isArray(n.workers) ? n.workers : []
    };
  }

  /**
   * Transform cost center
   */
  private transformCostCenter(cc: WorkdayCostCenter | unknown): WorkdayCostCenter {
    if (!cc || typeof cc !== 'object') {
      throw new Error('Invalid cost center data');
    }

    const c = cc as Record<string, unknown>;

    return {
      id: String(c.id || c['wd:Cost_Center_Reference']?.['wd:ID'] || ''),
      descriptor: String(c.descriptor || c['wd:Descriptor'] || ''),
      code: String(c.code || c['wd:Cost_Center_ID'] || ''),
      name: String(c.name || c['wd:Cost_Center_Name'] || ''),
      description: c.description as string,
      managerId: c.managerId as string,
      managerName: c.managerName as string,
      region: c.region as string,
      inactive: c.inactive as boolean
    };
  }

  /**
   * Transform location
   */
  private transformLocation(loc: WorkdayLocation | unknown): WorkdayLocation {
    if (!loc || typeof loc !== 'object') {
      throw new Error('Invalid location data');
    }

    const l = loc as Record<string, unknown>;

    return {
      id: String(l.id || l['wd:Location_Reference']?.['wd:ID'] || ''),
      descriptor: String(l.descriptor || l['wd:Descriptor'] || ''),
      name: String(l.name || l['wd:Location_Name'] || ''),
      country: l.country as string || l['wd:Address_Data']?.[0]?.['wd:Country'] as string,
      state: l.state as string || l['wd:Address_Data']?.[0]?.['wd:State_Province'] as string,
      city: l.city as string || l['wd:Address_Data']?.[0]?.['wd:City'] as string,
      postalCode: l.postalCode as string || l['wd:Address_Data']?.[0]?.['wd:Postal_Code'] as string,
      locationType: l.locationType as string,
      timeZone: l.timeZone as string,
      inactive: l.inactive as boolean
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let organizationsApiInstance: OrganizationsApi | null = null;

/**
 * Get or create an OrganizationsApi instance
 */
export function getOrganizationsApi(client?: WorkdayClient): OrganizationsApi {
  if (!organizationsApiInstance && client) {
    organizationsApiInstance = new OrganizationsApi(client);
  }
  if (!organizationsApiInstance) {
    throw new Error('OrganizationsApi not initialized. Provide client on first call.');
  }
  return organizationsApiInstance;
}

/**
 * Reset the OrganizationsApi instance (for testing)
 */
export function resetOrganizationsApi(): void {
  organizationsApiInstance = null;
}

export default OrganizationsApi;