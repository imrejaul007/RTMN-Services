/**
 * Workday Time Off / Absence API
 *
 * Provides operations for managing time off requests and balances:
 * - Time off balance retrieval
 * - Time off request CRUD operations
 * - Request approval/denial
 * - Accrual rate information
 */

import { WorkdayClient } from './client.js';
import {
  WorkdayTimeOffRequest,
  WorkdayTimeOffBalance,
  WorkdayTimeOffType,
  TimeOffRequestInput,
  TimeOffQueryParams,
  TimeOffBalanceQueryParams,
  AccrualRate,
  WorkdayTimeOffStatus
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Time Off API
// ============================================================================

export class TimeOffApi {
  private client: WorkdayClient;

  constructor(client: WorkdayClient) {
    this.client = client;
  }

  // ============================================================================
  // Time Off Balances
  // ============================================================================

  /**
   * Get time off balances for a worker
   * @param workerId - Workday worker ID
   * @param params - Optional query parameters
   */
  async getTimeOffBalances(
    workerId: string,
    params?: TimeOffBalanceQueryParams
  ): Promise<WorkdayTimeOffBalance[]> {
    logger.debug('Fetching time off balances', { workerId, params });

    const queryParams: Record<string, string | number | boolean> = {};

    if (params?.asOfDate) queryParams.asOfDate = params.asOfDate;
    if (params?.timeOffTypeId) queryParams.timeOffTypeId = params.timeOffTypeId;
    if (params?.includeProjectedBalance) queryParams.includeProjectedBalance = params.includeProjectedBalance;

    const response = await this.client.get<{
      data?: WorkdayTimeOffBalance[];
      time_off_balances?: WorkdayTimeOffBalance[];
    }>(`/workers/${workerId}/time-off-balances`, { params: queryParams });

    const balances = response.data?.data ||
      response.data?.time_off_balances ||
      [];
    return Array.isArray(balances) ? balances : [balances];
  }

  /**
   * Get time off balance for a specific type
   * @param workerId - Workday worker ID
   * @param timeOffTypeId - Workday time off type ID
   */
  async getTimeOffBalanceByType(
    workerId: string,
    timeOffTypeId: string
  ): Promise<WorkdayTimeOffBalance | null> {
    logger.debug('Fetching time off balance by type', { workerId, timeOffTypeId });

    const balances = await this.getTimeOffBalances(workerId, { timeOffTypeId });
    return balances.find(b => b.timeOffType.id === timeOffTypeId) || null;
  }

  /**
   * Get projected time off balance (including pending requests)
   * @param workerId - Workday worker ID
   * @param futureDate - Date to project balance to
   */
  async getProjectedBalance(
    workerId: string,
    futureDate: string
  ): Promise<WorkdayTimeOffBalance[]> {
    logger.debug('Fetching projected time off balance', { workerId, futureDate });

    const response = await this.client.get<{
      data?: WorkdayTimeOffBalance[];
      projected_balances?: WorkdayTimeOffBalance[];
    }>(`/workers/${workerId}/time-off-balances/projected`, {
      params: { asOfDate: futureDate, includeProjectedBalance: true }
    });

    const balances = response.data?.data ||
      response.data?.projected_balances ||
      [];
    return Array.isArray(balances) ? balances : [balances];
  }

  // ============================================================================
  // Time Off Requests
  // ============================================================================

  /**
   * Get a paginated list of time off requests
   * @param params - Query parameters for filtering and pagination
   */
  async getTimeOffRequests(params?: TimeOffQueryParams): Promise<{
    data: WorkdayTimeOffRequest[];
    total: number;
    hasMore: boolean;
  }> {
    logger.debug('Fetching time off requests', { params });

    const queryParams: Record<string, string | number | boolean> = {};

    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.workerId) queryParams.workerId = params.workerId;
    if (params?.status) queryParams.status = params.status.join(',');
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;
    if (params?.timeOffTypeId) queryParams.timeOffTypeId = params.timeOffTypeId;
    if (params?.includeDetails) queryParams.includeDetails = params.includeDetails;

    const response = await this.client.get<{
      data?: WorkdayTimeOffRequest[];
      time_off_requests?: WorkdayTimeOffRequest[];
      total?: number;
    }>('/time-off-requests', { params: queryParams });

    const requests = response.data?.data ||
      response.data?.time_off_requests ||
      [];
    const total = response.data?.total || requests.length;

    return {
      data: Array.isArray(requests) ? requests.map(r => this.transformTimeOffRequest(r)) : [this.transformTimeOffRequest(requests)],
      total,
      hasMore: (params?.offset || 0) + requests.length < total
    };
  }

  /**
   * Get a time off request by ID
   * @param id - Workday time off request ID
   */
  async getTimeOffRequest(id: string): Promise<WorkdayTimeOffRequest> {
    logger.debug('Fetching time off request by ID', { requestId: id });

    const response = await this.client.get<WorkdayTimeOffRequest>(
      `/time-off-requests/${id}`
    );

    return this.transformTimeOffRequest(response.data);
  }

  /**
   * Submit a new time off request
   * @param workerId - Workday worker ID
   * @param data - Request details
   */
  async requestTimeOff(
    workerId: string,
    data: TimeOffRequestInput
  ): Promise<WorkdayTimeOffRequest> {
    logger.debug('Submitting time off request', { workerId, data });

    const requestBody = {
      workerId,
      timeOffTypeId: data.timeOffTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
      comments: data.comments,
      partialDay: data.partialDay,
      partialDays: data.partialDays
    };

    const response = await this.client.post<WorkdayTimeOffRequest>(
      `/workers/${workerId}/time-off-requests`,
      requestBody
    );

    return this.transformTimeOffRequest(response.data);
  }

  /**
   * Approve a time off request
   * @param requestId - Workday time off request ID
   * @param approverComments - Optional approver comments
   */
  async approveTimeOff(
    requestId: string,
    approverComments?: string
  ): Promise<WorkdayTimeOffRequest> {
    logger.debug('Approving time off request', { requestId });

    const response = await this.client.post<WorkdayTimeOffRequest>(
      `/time-off-requests/${requestId}/approve`,
      {
        comments: approverComments
      }
    );

    return this.transformTimeOffRequest(response.data);
  }

  /**
   * Deny a time off request
   * @param requestId - Workday time off request ID
   * @param reason - Required denial reason
   */
  async denyTimeOff(
    requestId: string,
    reason: string
  ): Promise<WorkdayTimeOffRequest> {
    logger.debug('Denying time off request', { requestId, reason });

    const response = await this.client.post<WorkdayTimeOffRequest>(
      `/time-off-requests/${requestId}/deny`,
      {
        reason
      }
    );

    return this.transformTimeOffRequest(response.data);
  }

  /**
   * Cancel a time off request
   * @param requestId - Workday time off request ID
   * @param cancelReason - Optional cancellation reason
   */
  async cancelTimeOff(
    requestId: string,
    cancelReason?: string
  ): Promise<WorkdayTimeOffRequest> {
    logger.debug('Cancelling time off request', { requestId });

    const response = await this.client.post<WorkdayTimeOffRequest>(
      `/time-off-requests/${requestId}/cancel`,
      {
        reason: cancelReason
      }
    );

    return this.transformTimeOffRequest(response.data);
  }

  /**
   * Get pending approvals for a supervisor
   * @param supervisorId - Workday supervisor ID
   */
  async getPendingApprovals(supervisorId: string): Promise<WorkdayTimeOffRequest[]> {
    logger.debug('Fetching pending approvals', { supervisorId });

    const response = await this.client.get<{
      data?: WorkdayTimeOffRequest[];
      pending_requests?: WorkdayTimeOffRequest[];
    }>(`/supervisors/${supervisorId}/time-off-pending`);

    const requests = response.data?.data ||
      response.data?.pending_requests ||
      [];
    return Array.isArray(requests) ? requests.map(r => this.transformTimeOffRequest(r)) : [this.transformTimeOffRequest(requests)];
  }

  // ============================================================================
  // Time Off Types
  // ============================================================================

  /**
   * Get all available time off types
   */
  async getTimeOffTypes(): Promise<WorkdayTimeOffType[]> {
    logger.debug('Fetching time off types');

    const response = await this.client.get<{
      data?: WorkdayTimeOffType[];
      time_off_types?: WorkdayTimeOffType[];
    }>('/time-off-types');

    const types = response.data?.data ||
      response.data?.time_off_types ||
      [];
    return Array.isArray(types) ? types : [types];
  }

  /**
   * Get a time off type by ID
   * @param id - Workday time off type ID
   */
  async getTimeOffType(id: string): Promise<WorkdayTimeOffType> {
    logger.debug('Fetching time off type by ID', { typeId: id });

    const response = await this.client.get<WorkdayTimeOffType>(`/time-off-types/${id}`);
    return response.data;
  }

  // ============================================================================
  // Accrual Rates
  // ============================================================================

  /**
   * Get accrual rates for time off types
   * @param params - Optional query parameters
   */
  async getTimeOffAccrualRates(params?: {
    limit?: number;
    offset?: number;
    timeOffTypeId?: string;
  }): Promise<{
    data: AccrualRate[];
    total: number;
    hasMore: boolean;
  }> {
    logger.debug('Fetching accrual rates', { params });

    const queryParams: Record<string, string | number> = {};

    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.timeOffTypeId) queryParams.timeOffTypeId = params.timeOffTypeId;

    const response = await this.client.get<{
      data?: AccrualRate[];
      accrual_rates?: AccrualRate[];
      total?: number;
    }>('/time-off-accrual-rates', { params: queryParams });

    const rates = response.data?.data ||
      response.data?.accrual_rates ||
      [];
    const total = response.data?.total || rates.length;

    return {
      data: Array.isArray(rates) ? rates : [rates],
      total,
      hasMore: (params?.offset || 0) + rates.length < total
    };
  }

  /**
   * Get accrual rate for a specific time off type
   * @param timeOffTypeId - Workday time off type ID
   */
  async getAccrualRateByType(timeOffTypeId: string): Promise<AccrualRate[]> {
    logger.debug('Fetching accrual rate by type', { timeOffTypeId });

    const response = await await this.getTimeOffAccrualRates({ timeOffTypeId });
    return response.data;
  }

  // ============================================================================
  // Calendar / Schedule
  // ============================================================================

  /**
   * Get time off calendar for a date range
   * @param workerId - Workday worker ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   */
  async getTimeOffCalendar(
    workerId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    date: string;
    status: 'WORKING' | 'TIME_OFF' | 'HOLIDAY';
    timeOffType?: WorkdayTimeOffType;
  }[]> {
    logger.debug('Fetching time off calendar', { workerId, startDate, endDate });

    const response = await this.client.get<{
      data?: { date: string; status: string; timeOffType?: WorkdayTimeOffType }[];
      calendar?: { date: string; status: string; timeOffType?: WorkdayTimeOffType }[];
    }>(`/workers/${workerId}/time-off-calendar`, {
      params: { startDate, endDate }
    });

    const calendar = response.data?.data || response.data?.calendar || [];
    return Array.isArray(calendar) ? calendar : [calendar];
  }

  /**
   * Get team calendar (time off for direct reports)
   * @param supervisorId - Workday supervisor ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   */
  async getTeamCalendar(
    supervisorId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    workerId: string;
    workerName: string;
    entries: { date: string; status: string; timeOffType?: WorkdayTimeOffType }[];
  }[]> {
    logger.debug('Fetching team calendar', { supervisorId, startDate, endDate });

    const response = await this.client.get<{
      data?: {
        workerId: string;
        workerName: string;
        entries: { date: string; status: string; timeOffType?: WorkdayTimeOffType }[];
      }[];
      team_calendar?: {
        workerId: string;
        workerName: string;
        entries: { date: string; status: string; timeOffType?: WorkdayTimeOffType }[];
      }[];
    }>(`/supervisors/${supervisorId}/team-calendar`, {
      params: { startDate, endDate }
    });

    const calendar = response.data?.data || response.data?.team_calendar || [];
    return Array.isArray(calendar) ? calendar : [calendar];
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Transform raw Workday time off request response
   */
  private transformTimeOffRequest(request: WorkdayTimeOffRequest | unknown): WorkdayTimeOffRequest {
    if (!request || typeof request !== 'object') {
      throw new Error('Invalid time off request data');
    }

    const r = request as Record<string, unknown>;

    return {
      id: String(r.id || r['wd:Request_Reference']?.['wd:ID'] || ''),
      descriptor: String(r.descriptor || r['wd:Descriptor'] || ''),
      workerId: String(r.workerId || r['wd:Worker_Reference']?.['wd:ID'] || ''),
      workerName: String(r.workerName || r['wd:Worker_Name'] || ''),
      type: this.transformTimeOffType(r.type as Record<string, unknown>),
      startDate: new Date(r.startDate as string || r['wd:Start_Date'] as string),
      endDate: new Date(r.endDate as string || r['wd:End_Date'] as string),
      totalDays: Number(r.totalDays || r['wd:Total_Days'] || 0),
      status: String(r.status || r['wd:Status'] || 'SUBMITTED') as WorkdayTimeOffStatus,
      statusDate: r.statusDate ? new Date(r.statusDate as string) : undefined,
      submittedDate: r.submittedDate ? new Date(r.submittedDate as string) : undefined,
      approvedBy: r.approvedBy as string,
      approvedByName: r.approvedByName as string,
      denialReason: r.denialReason as string,
      comments: r.comments as string,
      cancelReason: r.cancelReason as string,
      balanceImpact: r.balanceImpact as number,
      createdAt: r.createdAt ? new Date(r.createdAt as string) : undefined
    };
  }

  /**
   * Transform time off type
   */
  private transformTimeOffType(type: Record<string, unknown> | unknown): WorkdayTimeOffType {
    if (!type || typeof type !== 'object') {
      return {
        id: '',
        descriptor: '',
        name: '',
        code: ''
      };
    }

    const t = type as Record<string, unknown>;

    return {
      id: String(t.id || t['wd:Time_Off_Type_Reference']?.['wd:ID'] || ''),
      descriptor: String(t.descriptor || t['wd:Descriptor'] || ''),
      name: String(t.name || t['wd:Name'] || ''),
      code: String(t.code || t['wd:Code'] || ''),
      category: t.category as string,
      color: t.color as string
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let timeOffApiInstance: TimeOffApi | null = null;

/**
 * Get or create a TimeOffApi instance
 */
export function getTimeOffApi(client?: WorkdayClient): TimeOffApi {
  if (!timeOffApiInstance && client) {
    timeOffApiInstance = new TimeOffApi(client);
  }
  if (!timeOffApiInstance) {
    throw new Error('TimeOffApi not initialized. Provide client on first call.');
  }
  return timeOffApiInstance;
}

/**
 * Reset the TimeOffApi instance (for testing)
 */
export function resetTimeOffApi(): void {
  timeOffApiInstance = null;
}

export default TimeOffApi;