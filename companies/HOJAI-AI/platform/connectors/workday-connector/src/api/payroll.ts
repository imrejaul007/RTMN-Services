/**
 * Workday Payroll API
 *
 * Provides operations for managing payroll data including:
 * - Pay groups
 * - Pay periods
 * - Worker payroll information
 * - Pay stubs
 * - Additional compensations
 */

import { WorkdayClient } from './client.js';
import {
  WorkdayPayGroup,
  WorkdayPayPeriod,
  WorkdayWorkerPayroll,
  WorkdayPayStub,
  WorkdayAdditionalCompensation,
  WorkdayEarning,
  WorkdayDeduction,
  WorkdayTax,
  WorkdayAccrual,
  PayrollQueryParams,
  PayPeriodQueryParams
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Payroll API
// ============================================================================

export class PayrollApi {
  private client: WorkdayClient;

  constructor(client: WorkdayClient) {
    this.client = client;
  }

  // ============================================================================
  // Pay Groups
  // ============================================================================

  /**
   * Get a paginated list of pay groups
   * @param params - Query parameters for filtering and pagination
   */
  async getPayGroups(params?: PayrollQueryParams): Promise<{
    data: WorkdayPayGroup[];
    total: number;
    hasMore: boolean;
  }> {
    logger.debug('Fetching pay groups', { params });

    const queryParams: Record<string, string | number | boolean> = {};

    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.active !== undefined) queryParams.active = params.active;
    if (params?.effectiveDate) queryParams.effectiveDate = params.effectiveDate;

    const response = await this.client.get<{
      data?: WorkdayPayGroup[];
      pay_groups?: WorkdayPayGroup[];
      total?: number;
    }>('/pay-groups', { params: queryParams });

    const payGroups = response.data?.data ||
      response.data?.pay_groups ||
      [];
    const total = response.data?.total || payGroups.length;

    return {
      data: Array.isArray(payGroups) ? payGroups.map(pg => this.transformPayGroup(pg)) : [this.transformPayGroup(payGroups)],
      total,
      hasMore: (params?.offset || 0) + payGroups.length < total
    };
  }

  /**
   * Get a pay group by ID
   * @param id - Workday pay group ID
   */
  async getPayGroup(id: string): Promise<WorkdayPayGroup> {
    logger.debug('Fetching pay group by ID', { payGroupId: id });

    const response = await this.client.get<WorkdayPayGroup>(`/pay-groups/${id}`);
    return this.transformPayGroup(response.data);
  }

  // ============================================================================
  // Pay Periods
  // ============================================================================

  /**
   * Get pay periods for a pay group
   * @param payGroupId - Workday pay group ID
   * @param params - Query parameters for filtering and pagination
   */
  async getPayPeriods(
    payGroupId: string,
    params?: PayPeriodQueryParams
  ): Promise<{
    data: WorkdayPayPeriod[];
    total: number;
    hasMore: boolean;
  }> {
    logger.debug('Fetching pay periods', { payGroupId, params });

    const queryParams: Record<string, string | number | boolean> = {};

    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;
    if (params?.status) queryParams.status = params.status;
    if (params?.isOpen !== undefined) queryParams.isOpen = params.isOpen;

    const response = await this.client.get<{
      data?: WorkdayPayPeriod[];
      pay_periods?: WorkdayPayPeriod[];
      total?: number;
    }>(`/pay-groups/${payGroupId}/pay-periods`, { params: queryParams });

    const periods = response.data?.data ||
      response.data?.pay_periods ||
      [];
    const total = response.data?.total || periods.length;

    return {
      data: Array.isArray(periods) ? periods.map(p => this.transformPayPeriod(p)) : [this.transformPayPeriod(periods)],
      total,
      hasMore: (params?.offset || 0) + periods.length < total
    };
  }

  /**
   * Get a specific pay period
   * @param payGroupId - Workday pay group ID
   * @param periodId - Workday pay period ID
   */
  async getPayPeriod(payGroupId: string, periodId: string): Promise<WorkdayPayPeriod> {
    logger.debug('Fetching pay period', { payGroupId, periodId });

    const response = await this.client.get<WorkdayPayPeriod>(
      `/pay-groups/${payGroupId}/pay-periods/${periodId}`
    );

    return this.transformPayPeriod(response.data);
  }

  /**
   * Get the current pay period for a pay group
   * @param payGroupId - Workday pay group ID
   */
  async getCurrentPayPeriod(payGroupId: string): Promise<WorkdayPayPeriod | null> {
    logger.debug('Fetching current pay period', { payGroupId });

    try {
      const response = await this.client.get<WorkdayPayPeriod>(
        `/pay-groups/${payGroupId}/pay-periods/current`
      );
      return this.transformPayPeriod(response.data);
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Worker Payroll
  // ============================================================================

  /**
   * Get payroll information for a worker
   * @param workerId - Workday worker ID
   */
  async getWorkerPayroll(workerId: string): Promise<WorkdayWorkerPayroll> {
    logger.debug('Fetching worker payroll', { workerId });

    const response = await this.client.get<WorkdayWorkerPayroll>(
      `/workers/${workerId}/payroll`
    );

    return this.transformWorkerPayroll(response.data);
  }

  /**
   * Get pay stubs for a worker
   * @param workerId - Workday worker ID
   * @param params - Optional query parameters (limit, startDate, endDate)
   */
  async getWorkerPayStubs(
    workerId: string,
    params?: {
      limit?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<WorkdayPayStub[]> {
    logger.debug('Fetching worker pay stubs', { workerId, params });

    const queryParams: Record<string, string | number> = {};

    if (params?.limit) queryParams.limit = params.limit;
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;

    const response = await this.client.get<{
      data?: WorkdayPayStub[];
      pay_stubs?: WorkdayPayStub[];
    }>(`/workers/${workerId}/pay-stubs`, { params: queryParams });

    const payStubs = response.data?.data ||
      response.data?.pay_stubs ||
      [];
    return Array.isArray(payStubs) ? payStubs.map(ps => this.transformPayStub(ps)) : [this.transformPayStub(payStubs)];
  }

  /**
   * Get a specific pay stub
   * @param workerId - Workday worker ID
   * @param payStubId - Workday pay stub ID
   */
  async getPayStub(workerId: string, payStubId: string): Promise<WorkdayPayStub> {
    logger.debug('Fetching pay stub', { workerId, payStubId });

    const response = await this.client.get<WorkdayPayStub>(
      `/workers/${workerId}/pay-stubs/${payStubId}`
    );

    return this.transformPayStub(response.data);
  }

  /**
   * Get additional compensations for a worker
   * @param workerId - Workday worker ID
   */
  async getWorkerAdditionalCompensations(workerId: string): Promise<WorkdayAdditionalCompensation[]> {
    logger.debug('Fetching worker additional compensations', { workerId });

    const response = await this.client.get<{
      data?: WorkdayAdditionalCompensation[];
      additional_compensations?: WorkdayAdditionalCompensation[];
    }>(`/workers/${workerId}/additional-compensations`);

    const compensations = response.data?.data ||
      response.data?.additional_compensations ||
      [];
    return Array.isArray(compensations) ? compensations : [compensations];
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Get payroll data for multiple workers
   * @param workerIds - Array of Workday worker IDs
   */
  async getBatchWorkerPayroll(workerIds: string[]): Promise<WorkdayWorkerPayroll[]> {
    logger.debug('Fetching batch worker payroll', { count: workerIds.length });

    const response = await this.client.post<{
      data?: WorkdayWorkerPayroll[];
      payroll_data?: WorkdayWorkerPayroll[];
    }>('/payroll/batch', {
      workerIds
    });

    const payrollData = response.data?.data ||
      response.data?.payroll_data ||
      [];
    return Array.isArray(payrollData) ? payrollData.map(p => this.transformWorkerPayroll(p)) : [this.transformWorkerPayroll(payrollData)];
  }

  /**
   * Get pay stubs for multiple workers
   * @param workerIds - Array of Workday worker IDs
   * @param payPeriodId - Pay period ID
   */
  async getBatchPayStubs(
    workerIds: string[],
    payPeriodId: string
  ): Promise<Map<string, WorkdayPayStub[]>> {
    logger.debug('Fetching batch pay stubs', { workerCount: workerIds.length, payPeriodId });

    const response = await this.client.post<Record<string, WorkdayPayStub[]>>(
      '/payroll/batch/pay-stubs',
      {
        workerIds,
        payPeriodId
      }
    );

    const result = new Map<string, WorkdayPayStub[]>();
    for (const [workerId, stubs] of Object.entries(response.data)) {
      result.set(workerId, stubs.map(ps => this.transformPayStub(ps)));
    }
    return result;
  }

  // ============================================================================
  // Payroll Reports
  // ============================================================================

  /**
   * Get payroll cost summary for an organization
   * @param organizationId - Workday organization ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   */
  async getPayrollCostSummary(
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    organizationId: string;
    organizationName: string;
    totalGrossPay: number;
    totalNetPay: number;
    totalDeductions: number;
    totalTaxes: number;
    workerCount: number;
    byPayGroup: {
      payGroupId: string;
      payGroupName: string;
      totalGrossPay: number;
      totalNetPay: number;
      workerCount: number;
    }[];
  }> {
    logger.debug('Fetching payroll cost summary', { organizationId, startDate, endDate });

    const response = await this.client.get<{
      organizationId: string;
      organizationName: string;
      totalGrossPay: number;
      totalNetPay: number;
      totalDeductions: number;
      totalTaxes: number;
      workerCount: number;
      byPayGroup: {
        payGroupId: string;
        payGroupName: string;
        totalGrossPay: number;
        totalNetPay: number;
        workerCount: number;
      }[];
    }>('/payroll/cost-summary', {
      params: {
        organizationId,
        startDate,
        endDate
      }
    });

    return response.data;
  }

  /**
   * Get payroll register (detailed payroll data)
   * @param payPeriodId - Pay period ID
   * @param params - Optional filters
   */
  async getPayrollRegister(
    payPeriodId: string,
    params?: {
      organizationId?: string;
      payGroupId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    data: {
      workerId: string;
      workerName: string;
      grossPay: number;
      netPay: number;
      earnings: WorkdayEarning[];
      deductions: WorkdayDeduction[];
      taxes: WorkdayTax[];
    }[];
    total: number;
    hasMore: boolean;
  }> {
    logger.debug('Fetching payroll register', { payPeriodId, params });

    const queryParams: Record<string, string | number> = {};

    if (params?.organizationId) queryParams.organizationId = params.organizationId;
    if (params?.payGroupId) queryParams.payGroupId = params.payGroupId;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;

    const response = await this.client.get<{
      data?: {
        workerId: string;
        workerName: string;
        grossPay: number;
        netPay: number;
        earnings: WorkdayEarning[];
        deductions: WorkdayDeduction[];
        taxes: WorkdayTax[];
      }[];
      register?: {
        workerId: string;
        workerName: string;
        grossPay: number;
        netPay: number;
        earnings: WorkdayEarning[];
        deductions: WorkdayDeduction[];
        taxes: WorkdayTax[];
      }[];
      total?: number;
    }>(`/pay-periods/${payPeriodId}/register`, { params: queryParams });

    const register = response.data?.data ||
      response.data?.register ||
      [];
    const total = response.data?.total || register.length;

    return {
      data: Array.isArray(register) ? register : [register],
      total,
      hasMore: (params?.offset || 0) + register.length < total
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Transform raw Workday pay group response
   */
  private transformPayGroup(pg: WorkdayPayGroup | unknown): WorkdayPayGroup {
    if (!pg || typeof pg !== 'object') {
      throw new Error('Invalid pay group data');
    }

    const p = pg as Record<string, unknown>;

    return {
      id: String(p.id || p['wd:Pay_Group_Reference']?.['wd:ID'] || ''),
      descriptor: String(p.descriptor || p['wd:Descriptor'] || ''),
      name: String(p.name || p['wd:Pay_Group_Name'] || ''),
      code: String(p.code || p['wd:Pay_Group_ID'] || ''),
      payFrequency: p.payFrequency as string,
      currency: p.currency as string,
      nextPayPeriodStart: p.nextPayPeriodStart ? new Date(p.nextPayPeriodStart as string) : undefined,
      nextPayPeriodEnd: p.nextPayPeriodEnd ? new Date(p.nextPayPeriodEnd as string) : undefined,
      inactive: p.inactive as boolean
    };
  }

  /**
   * Transform raw Workday pay period response
   */
  private transformPayPeriod(period: WorkdayPayPeriod | unknown): WorkdayPayPeriod {
    if (!period || typeof period !== 'object') {
      throw new Error('Invalid pay period data');
    }

    const p = period as Record<string, unknown>;

    return {
      id: String(p.id || p['wd:Pay_Period_Reference']?.['wd:ID'] || ''),
      descriptor: String(p.descriptor || p['wd:Descriptor'] || ''),
      payGroupId: String(p.payGroupId || ''),
      startDate: new Date(p.startDate as string || p['wd:Period_Start_Date'] as string),
      endDate: new Date(p.endDate as string || p['wd:Period_End_Date'] as string),
      payDate: new Date(p.payDate as string || p['wd:Pay_Date'] as string),
      periodStatus: String(p.periodStatus || p['wd:Period_Status'] || ''),
      processingStatus: p.processingStatus as string,
      isOpen: Boolean(p.isOpen ?? p['wd:Is_Open'] ?? false),
      isClosed: Boolean(p.isClosed ?? p['wd:Is_Closed'] ?? false)
    };
  }

  /**
   * Transform raw Workday worker payroll response
   */
  private transformWorkerPayroll(payroll: WorkdayWorkerPayroll | unknown): WorkdayWorkerPayroll {
    if (!payroll || typeof payroll !== 'object') {
      throw new Error('Invalid worker payroll data');
    }

    const p = payroll as Record<string, unknown>;

    return {
      workerId: String(p.workerId || p['wd:Worker_Reference']?.['wd:ID'] || ''),
      workerName: String(p.workerName || p['wd:Worker_Name'] || ''),
      payGroup: this.transformPayGroup(p.payGroup as Record<string, unknown>),
      effectiveDate: new Date(p.effectiveDate as string || new Date()),
      payRate: p.payRate as number,
      payRateType: p.payRateType as string,
      payFrequency: p.payFrequency as string,
      currency: p.currency as string,
      exemptStatus: p.exemptStatus as string,
      salariedExempt: p.salariedExempt as boolean,
      annualBenefitBase: p.annualBenefitBase as number,
      compensationGrade: p.compensationGrade as string,
      compensationStep: p.compensationStep as number,
      compensationRate: p.compensationRate as number,
      additionalCompensations: Array.isArray(p.additionalCompensations)
        ? p.additionalCompensations
        : []
    };
  }

  /**
   * Transform raw Workday pay stub response
   */
  private transformPayStub(stub: WorkdayPayStub | unknown): WorkdayPayStub {
    if (!stub || typeof stub !== 'object') {
      throw new Error('Invalid pay stub data');
    }

    const s = stub as Record<string, unknown>;

    return {
      id: String(s.id || s['wd:Pay_Stub_Reference']?.['wd:ID'] || ''),
      descriptor: String(s.descriptor || s['wd:Descriptor'] || ''),
      workerId: String(s.workerId || s['wd:Worker_Reference']?.['wd:ID'] || ''),
      payPeriodStart: new Date(s.payPeriodStart as string || s['wd:Pay_Period_Start'] as string),
      payPeriodEnd: new Date(s.payPeriodEnd as string || s['wd:Pay_Period_End'] as string),
      payDate: new Date(s.payDate as string || s['wd:Pay_Date'] as string),
      grossPay: Number(s.grossPay || s['wd:Gross_Pay'] || 0),
      netPay: Number(s.netPay || s['wd:Net_Pay'] || 0),
      currency: String(s.currency || s['wd:Currency'] || 'USD'),
      earnings: this.transformEarnings(s.earnings),
      deductions: this.transformDeductions(s.deductions),
      taxes: this.transformTaxes(s.taxes),
      accruals: this.transformAccruals(s.accruals)
    };
  }

  /**
   * Transform earnings
   */
  private transformEarnings(earnings: unknown): WorkdayEarning[] {
    if (!earnings) return [];
    const arr = Array.isArray(earnings) ? earnings : [earnings];
    return arr.map((e: unknown) => {
      const item = e as Record<string, unknown>;
      return {
        type: String(item.type || item['wd:Earning_Type'] || ''),
        typeDescriptor: String(item.typeDescriptor || item['wd:Earning_Type_Descriptor'] || ''),
        hours: item.hours as number,
        rate: item.rate as number,
        amount: Number(item.amount || item['wd:Amount'] || 0),
        ytdAmount: item.ytdAmount as number
      };
    });
  }

  /**
   * Transform deductions
   */
  private transformDeductions(deductions: unknown): WorkdayDeduction[] {
    if (!deductions) return [];
    const arr = Array.isArray(deductions) ? deductions : [deductions];
    return arr.map((d: unknown) => {
      const item = d as Record<string, unknown>;
      return {
        type: String(item.type || item['wd:Deduction_Type'] || ''),
        typeDescriptor: String(item.typeDescriptor || item['wd:Deduction_Type_Descriptor'] || ''),
        amount: Number(item.amount || item['wd:Amount'] || 0),
        ytdAmount: item.ytdAmount as number,
        isPreTax: Boolean(item.isPreTax ?? item['wd:Is_Pre_Tax'] ?? false)
      };
    });
  }

  /**
   * Transform taxes
   */
  private transformTaxes(taxes: unknown): WorkdayTax[] {
    if (!taxes) return [];
    const arr = Array.isArray(taxes) ? taxes : [taxes];
    return arr.map((t: unknown) => {
      const item = t as Record<string, unknown>;
      return {
        type: String(item.type || item['wd:Tax_Type'] || ''),
        typeDescriptor: String(item.typeDescriptor || item['wd:Tax_Type_Descriptor'] || ''),
        federal: item.federal as number,
        state: item.state as number,
        local: item.local as number,
        ytdAmount: item.ytdAmount as number
      };
    });
  }

  /**
   * Transform accruals
   */
  private transformAccruals(accruals: unknown): WorkdayAccrual[] | undefined {
    if (!accruals) return undefined;
    const arr = Array.isArray(accruals) ? accruals : [accruals];
    return arr.map((a: unknown) => {
      const item = a as Record<string, unknown>;
      return {
        type: String(item.type || item['wd:Accrual_Type'] || ''),
        typeDescriptor: String(item.typeDescriptor || item['wd:Accrual_Type_Descriptor'] || ''),
        balance: Number(item.balance || item['wd:Balance'] || 0),
        used: Number(item.used || item['wd:Used'] || 0),
        ytdAmount: item.ytdAmount as number
      };
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let payrollApiInstance: PayrollApi | null = null;

/**
 * Get or create a PayrollApi instance
 */
export function getPayrollApi(client?: WorkdayClient): PayrollApi {
  if (!payrollApiInstance && client) {
    payrollApiInstance = new PayrollApi(client);
  }
  if (!payrollApiInstance) {
    throw new Error('PayrollApi not initialized. Provide client on first call.');
  }
  return payrollApiInstance;
}

/**
 * Reset the PayrollApi instance (for testing)
 */
export function resetPayrollApi(): void {
  payrollApiInstance = null;
}

export default PayrollApi;