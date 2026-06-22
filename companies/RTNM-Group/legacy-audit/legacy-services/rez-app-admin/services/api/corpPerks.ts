/**
 * CorpPerks API Service
 *
 * API client for CorpPerks endpoints (benefits, employees, GST invoices)
 */

import { apiClient } from './apiClient';

// Types
export interface Benefit {
  _id: string;
  name: string;
  description?: string;
  benefitType: 'meal' | 'travel' | 'gift' | 'wellness' | 'flex' | 'learning';
  amount: number;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  rules?: {
    minAmount?: number;
    maxAmount?: number;
    requiresApproval?: boolean;
    autoApprovalLimit?: number;
    rolloverEnabled?: boolean;
    rolloverMaxAmount?: number;
  };
  eligibilityCriteria?: {
    departments?: string[];
    levels?: string[];
    employmentTypes?: string[];
  };
  enrolledEmployees: number;
  totalAllocated: number;
  totalUtilized: number;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  _id: string;
  userId: {
    _id: string;
    name?: string;
    email?: string;
    phoneNumber?: string;
  };
  employeeId: string;
  department: string;
  level: string;
  designation?: string;
  employmentType?: 'full_time' | 'part_time' | 'contractor';
  corpRole: 'corp_admin' | 'corp_hr' | 'corp_finance' | 'corp_manager' | 'corp_employee';
  enrollmentStatus: 'pending' | 'enrolled' | 'suspended' | 'terminated';
  enrolledAt?: string;
  terminatedAt?: string;
  benefits?: BenefitEnrollment[];
  stats?: {
    totalOrders: number;
    totalSpend: number;
    totalSavings: number;
    lastOrderAt?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export type BenefitEnrollmentBenefitType = Benefit['benefitType'];

export interface BenefitEnrollment {
  benefitId?: string | Benefit;
  benefitType: BenefitEnrollmentBenefitType;
  allocatedAmount: number;
  utilizedAmount?: number;
  remainingAmount: number;
  enrolledAt?: string;
  lastResetDate?: string;
  rolloverAmount?: number;
  isActive: boolean;
}

export interface GSTInvoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  generatedAt?: string;
  issuer?: {
    name: string;
    address?: string;
    gstIn: string;
    pan?: string;
  };
  recipient: {
    companyName: string;
    contactPerson?: string;
    address?: string;
    gstIn: string;
  };
  transaction: {
    type: 'dining' | 'hotel' | 'gifting' | 'travel';
    description?: string;
    invoiceType?: 'tax_invoice' | 'bill_of_supply';
    reverseCharge?: boolean;
    placeOfSupply?: string;
    supplyDate?: string;
  };
  lineItems?: Array<{
    description: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    discount: number;
    taxableValue: number;
  }>;
  taxSummary: {
    taxableAmount: number;
    cgstRate?: number;
    cgstAmount: number;
    sgstRate?: number;
    sgstAmount: number;
    igstRate?: number;
    igstAmount: number;
    totalTax: number;
    grandTotal: number;
    amountInWords?: string;
  };
  itc?: {
    eligible: boolean;
    itcAmount: number;
    itcReason?: string;
  };
  eInvoice?: {
    irn: string;
    ackNo: string;
    ackDate: string;
    qrCode: string;
  };
  status: 'draft' | 'issued' | 'cancelled' | 'amended';
  metadata?: {
    companyId?: string;
    orderId?: string;
    bookingId?: string;
    paymentId?: string;
    createdBy?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface GSTCalculation {
  hsnCode: string;
  description: string;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  grandTotal: number;
  itcEligible: boolean;
  itcAmount: number;
}

export interface GSTR1Report {
  period: string;
  summary: {
    totalInvoices: number;
    totalTaxableValue: number;
    totalCGST: number;
    totalSGST: number;
    totalIGST: number;
    totalITCClaimable: number;
  };
  invoices: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    recipientGSTIN: string;
    recipientName: string;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    placeOfSupply: string;
  }>;
}

export interface CreateBenefitRequest {
  name: string;
  description?: string;
  benefitType: Benefit['benefitType'];
  amount: number;
  periodType: Benefit['periodType'];
  rules?: Benefit['rules'];
  eligibilityCriteria?: Benefit['eligibilityCriteria'];
  startDate: string;
  endDate?: string;
}

export interface EnrollEmployeeRequest {
  userId: string;
  employeeId: string;
  department: string;
  level: string;
  designation?: string;
  employmentType?: Employee['employmentType'];
  managerId?: string;
  corpRole?: Employee['corpRole'];
  benefits?: Array<{ benefitId: string; allocatedAmount: number }>;
}

export interface AllocateBenefitRequest {
  employeeId: string;
  benefitId: string;
  amount: number;
}

export interface CreateInvoiceRequest {
  companyId: string;
  companyPrefix: string;
  serviceType: 'dining' | 'hotel' | 'gifting' | 'travel';
  companyName: string;
  companyGSTIN: string;
  companyAddress?: string;
  contactPerson?: string;
  amount: number;
  issuerState: string;
  description?: string;
  orderId?: string;
  bookingId?: string;
  paymentId?: string;
}

// Helper to get company ID from storage or context
function getCompanyId(): string {
  // In a real implementation, this would come from auth context
  return 'demo-company';
}

// CorpPerks API Service
export const corpPerksApi = {
  // ========== Benefits ==========

  /**
   * Get all benefit packages for the company
   */
  async getBenefits(params?: {
    type?: Benefit['benefitType'];
    isActive?: boolean;
  }): Promise<{ data: Benefit[] }> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.set('type', params.type);
    if (params?.isActive !== undefined) queryParams.set('isActive', String(params.isActive));

    const response = await apiClient.get<{ data: Benefit[] }>(`/api/corp/benefits?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return { data: response.data?.data || [] };
  },

  /**
   * Get a single benefit by ID
   */
  async getBenefit(id: string): Promise<Benefit | null> {
    const response = await apiClient.get<{ data: Benefit }>(`/api/corp/benefits/${id}`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || null;
  },

  /**
   * Create a new benefit package
   */
  async createBenefit(data: CreateBenefitRequest): Promise<Benefit> {
    const response = await apiClient.post<{ data: Benefit }>('/api/corp/benefits', data as unknown as Record<string, unknown>, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to create benefit');
    }
    return response.data!.data;
  },

  /**
   * Update a benefit package
   */
  async updateBenefit(id: string, data: Partial<CreateBenefitRequest>): Promise<Benefit> {
    const response = await apiClient.put<{ data: Benefit }>(`/api/corp/benefits/${id}`, data, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to update benefit');
    }
    return response.data!.data;
  },

  /**
   * Delete a benefit package
   */
  async deleteBenefit(id: string): Promise<void> {
    const response = await apiClient.delete(`/api/corp/benefits/${id}`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete benefit');
    }
  },

  // ========== Employees ==========

  /**
   * Get all employees for the company
   */
  async getEmployees(params?: {
    department?: string;
    enrollmentStatus?: Employee['enrollmentStatus'];
    corpRole?: Employee['corpRole'];
    page?: number;
    limit?: number;
  }): Promise<{
    data: Employee[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.department) queryParams.set('department', params.department);
    if (params?.enrollmentStatus) queryParams.set('enrollmentStatus', params.enrollmentStatus);
    if (params?.corpRole) queryParams.set('corpRole', params.corpRole);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 20));

    const response = await apiClient.get<{
      data: Employee[];
      pagination: { total: number; page: number; limit: number; pages: number };
    }>(`/api/corp/employees?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 20, pages: 0 },
    };
  },

  /**
   * Get a single employee by ID
   */
  async getEmployee(id: string): Promise<Employee | null> {
    const response = await apiClient.get<{ data: Employee }>(`/api/corp/employees/${id}`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || null;
  },

  /**
   * Enroll a new employee
   */
  async enrollEmployee(data: EnrollEmployeeRequest): Promise<Employee> {
    const response = await apiClient.post<{ data: Employee }>('/api/corp/employees', data as unknown as Record<string, unknown>, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to enroll employee');
    }
    return response.data!.data;
  },

  /**
   * Allocate a benefit to an employee
   */
  async allocateBenefit(employeeId: string, data: AllocateBenefitRequest): Promise<Employee> {
    const response = await apiClient.post<{ data: Employee }>(
      `/api/corp/employees/${employeeId}/benefits`,
      data as unknown as Record<string, unknown>,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to allocate benefit');
    }
    return response.data!.data;
  },

  /**
   * Get my corporate profile (for employee self-service)
   */
  async getMyProfile(): Promise<{
    employeeId: string;
    department: string;
    level: string;
    enrollmentStatus: Employee['enrollmentStatus'];
    corpRole: Employee['corpRole'];
    benefits: BenefitEnrollment[];
    stats: Employee['stats'];
  } | null> {
    const response = await apiClient.get<{
      data: {
        employeeId: string;
        department: string;
        level: string;
        enrollmentStatus: Employee['enrollmentStatus'];
        corpRole: Employee['corpRole'];
        benefits: BenefitEnrollment[];
        stats: Employee['stats'];
      };
    }>('/api/corp/me', {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data ?? null;
  },

  /**
   * Get my benefit summary
   */
  async getMyBenefitSummary(): Promise<
    Record<string, { allocated: number; utilized: number; remaining: number }>
  > {
    const response = await apiClient.get<{
      data: Record<string, { allocated: number; utilized: number; remaining: number }>;
    }>('/api/corp/me/benefits/summary', { headers: { 'x-company-id': getCompanyId() } });
    return response.data?.data ?? {};
  },

  // ========== GST Invoices ==========

  /**
   * Calculate GST for a transaction
   */
  async calculateGST(params: {
    amount: number;
    serviceType: 'dining' | 'hotel' | 'gifting' | 'travel';
    companyGSTIN: string;
    placeOfSupply: string;
    description?: string;
  }): Promise<GSTCalculation> {
    const response = await apiClient.post<{ data: GSTCalculation }>(
      '/api/gst/calculate',
      {
        ...params,
        issuerState: params.placeOfSupply,
      },
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to calculate GST');
    }
    return response.data!.data;
  },

  /**
   * Check ITC eligibility
   */
  async checkITCeligibility(params: {
    serviceType: 'dining' | 'hotel' | 'gifting' | 'travel';
    amount: number;
    companyType: 'regular' | 'composition';
  }): Promise<{ eligible: boolean; itcAmount: number; reason?: string }> {
    const response = await apiClient.post<{
      data: { eligible: boolean; itcAmount: number; reason?: string };
    }>('/api/gst/itc-check', params, { headers: { 'x-company-id': getCompanyId() } });
    if (!response.success) {
      throw new Error(response.message || 'Failed to check ITC eligibility');
    }
    return response.data!.data;
  },

  /**
   * Get all invoices for the company
   */
  async getInvoices(params?: {
    startDate?: string;
    endDate?: string;
    serviceType?: 'dining' | 'hotel' | 'gifting' | 'travel';
    page?: number;
    limit?: number;
  }): Promise<{ data: GSTInvoice[]; pagination: { total: number; page: number; limit: number } }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    if (params?.serviceType) queryParams.set('serviceType', params.serviceType);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 20));

    const response = await apiClient.get<{
      data: GSTInvoice[];
      pagination: { total: number; page: number; limit: number };
    }>(`/api/gst/invoices?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 20 },
    };
  },

  /**
   * Get a single invoice by number
   */
  async getInvoice(invoiceNumber: string): Promise<GSTInvoice | null> {
    const response = await apiClient.get<{ data: GSTInvoice }>(
      `/api/gst/invoices/${invoiceNumber}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || null;
  },

  /**
   * Create a new GST invoice
   */
  async createInvoice(data: CreateInvoiceRequest): Promise<{
    invoiceId: string;
    invoiceNumber: string;
    taxableAmount: number;
    totalTax: number;
    grandTotal: number;
    itcEligible: boolean;
  }> {
    const response = await apiClient.post<{
      data: {
        invoiceId: string;
        invoiceNumber: string;
        taxableAmount: number;
        totalTax: number;
        grandTotal: number;
        itcEligible: boolean;
      };
    }>('/api/gst/invoices', data as unknown as Record<string, unknown>, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to create invoice');
    }
    return response.data!.data;
  },

  /**
   * Generate GSTR-1 report
   */
  async generateGSTR1(month: number, year: number): Promise<GSTR1Report> {
    const response = await apiClient.post<{ data: GSTR1Report }>(
      '/api/gst/reports/gstr1',
      {
        companyId: getCompanyId(),
        month,
        year,
      },
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to generate GSTR-1 report');
    }
    return response.data!.data;
  },

  /**
   * Submit e-invoice to GST portal
   */
  async submitEInvoice(
    invoiceNumber: string
  ): Promise<{ irn: string; ackNo: string; qrCode: string }> {
    const response = await apiClient.post<{ data: { irn: string; ackNo: string; qrCode: string } }>(
      `/api/gst/einvoice/${invoiceNumber}`,
      {},
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to submit e-invoice');
    }
    return response.data!.data;
  },
};

export default corpPerksApi;
