/**
 * HR Department Pack - Runtime Connector
 *
 * This connector delegates to the actual Workforce OS service (5077).
 * Provides HR functionality for Company OS tenants.
 */

import axios, { AxiosInstance } from 'axios';

export interface HRConfig {
  workforceOsUrl: string;
  tenantId: string;
  apiKey?: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  status: 'active' | 'inactive' | 'onboarding';
  joinDate: string;
  salary?: number;
  managerId?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'sick' | 'casual' | 'earned' | 'unpaid';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  status: 'present' | 'absent' | 'late' | 'half-day';
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  status: 'pending' | 'processed' | 'paid';
}

export class HRRuntimeConnector {
  private client: AxiosInstance;
  private tenantId: string;

  constructor(config: HRConfig) {
    this.tenantId = config.tenantId;
    this.client = axios.create({
      baseURL: config.workforceOsUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': config.tenantId,
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    });
  }

  // ============================================
  // EMPLOYEE MANAGEMENT
  // ============================================

  async listEmployees(): Promise<Employee[]> {
    const response = await this.client.get('/api/employees');
    return response.data.employees || [];
  }

  async getEmployee(id: string): Promise<Employee | null> {
    try {
      const response = await this.client.get(`/api/employees/${id}`);
      return response.data.employee || null;
    } catch {
      return null;
    }
  }

  async createEmployee(data: Partial<Employee>): Promise<Employee> {
    const response = await this.client.post('/api/employees', data);
    return response.data.employee;
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    const response = await this.client.put(`/api/employees/${id}`, data);
    return response.data.employee;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    try {
      await this.client.delete(`/api/employees/${id}`);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // DEPARTMENTS
  // ============================================

  async listDepartments(): Promise<any[]> {
    const response = await this.client.get('/api/departments');
    return response.data.departments || [];
  }

  async createDepartment(data: any): Promise<any> {
    const response = await this.client.post('/api/departments', data);
    return response.data.department;
  }

  // ============================================
  // LEAVE MANAGEMENT
  // ============================================

  async listLeaveRequests(filters?: { employeeId?: string; status?: string }): Promise<LeaveRequest[]> {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.status) params.append('status', filters.status);

    const response = await this.client.get(`/api/leave?${params.toString()}`);
    return response.data.requests || [];
  }

  async applyLeave(data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const response = await this.client.post('/api/leave', data);
    return response.data.request;
  }

  async approveLeave(id: string, approverId: string): Promise<LeaveRequest> {
    const response = await this.client.put(`/api/leave/${id}/approve`, { approverId });
    return response.data.request;
  }

  async rejectLeave(id: string, reason: string): Promise<LeaveRequest> {
    const response = await this.client.put(`/api/leave/${id}/reject`, { reason });
    return response.data.request;
  }

  // ============================================
  // ATTENDANCE
  // ============================================

  async recordAttendance(data: Partial<Attendance>): Promise<Attendance> {
    const response = await this.client.post('/api/attendance', data);
    return response.data.attendance;
  }

  async getAttendance(date: string, employeeId?: string): Promise<Attendance[]> {
    const params = new URLSearchParams({ date });
    if (employeeId) params.append('employeeId', employeeId);

    const response = await this.client.get(`/api/attendance?${params.toString()}`);
    return response.data.records || [];
  }

  // ============================================
  // PAYROLL
  // ============================================

  async processPayroll(employeeId: string, month: string, year: number): Promise<PayrollRecord> {
    const response = await this.client.post('/api/payroll/process', {
      employeeId,
      month,
      year,
    });
    return response.data.record;
  }

  async getPayrollRecords(employeeId: string): Promise<PayrollRecord[]> {
    const response = await this.client.get(`/api/payroll/${employeeId}`);
    return response.data.records || [];
  }

  // ============================================
  // RECRUITMENT
  // ============================================

  async listJobOpenings(): Promise<any[]> {
    const response = await this.client.get('/api/jobs');
    return response.data.jobs || [];
  }

  async createJobOpening(data: any): Promise<any> {
    const response = await this.client.post('/api/jobs', data);
    return response.data.job;
  }

  async listApplications(jobId?: string): Promise<any[]> {
    const params = jobId ? `?jobId=${jobId}` : '';
    const response = await this.client.get(`/api/applications${params}`);
    return response.data.applications || [];
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// ============================================
// DEFAULT EXPORT
// ============================================

export function createHRConnector(tenantId: string): HRRuntimeConnector {
  return new HRRuntimeConnector({
    workforceOsUrl: process.env.WORKFORCE_OS_URL || 'http://localhost:5077',
    tenantId,
    apiKey: process.env.INTERNAL_SERVICE_TOKEN,
  });
}

export default HRRuntimeConnector;
