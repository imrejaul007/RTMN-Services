/**
 * Workforce OS SDK client (port 5077)
 *
 * HR, employees, departments, recruitment, attendance, leave, payroll,
 * performance, learning, benefits, expenses. 10 AI HR agents behind the scenes.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Money } from './types.js';

export type EmployeeStatus = 'active' | 'on-leave' | 'probation' | 'terminated' | 'suspended';
export type LeaveType = 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'unpaid' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface HrDepartment {
  id: string;
  name: string;
  parentId?: string;
  managerId?: string;
  headcount?: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  departmentId?: string;
  managerId?: string;
  hireDate: string;
  status: EmployeeStatus;
  salary?: Money;
  skills?: string[];
  /** 0-5 performance rating */
  performanceRating?: number;
  createdAt: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkInAt?: string;
  checkOutAt?: string;
  /** 'present' | 'absent' | 'late' | 'remote' | 'leave' */
  status: 'present' | 'absent' | 'late' | 'remote' | 'leave';
  hoursWorked?: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  reason?: string;
  status: LeaveStatus;
  approverId?: string;
  createdAt: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  period: string; // 'YYYY-MM'
  gross: Money;
  net: Money;
  deductions: { tax: Money; insurance: Money; other: Money };
  paidAt?: string;
}

export class WorkforceClient {
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: `http://localhost:5077` };
  }

  // ─── Departments ───

  async listDepartments(): Promise<HrDepartment[]> {
    return request<HrDepartment[]>(this.config, 'GET', '/api/departments');
  }

  async getDepartment(id: string): Promise<HrDepartment> {
    return request<HrDepartment>(this.config, 'GET', `/api/departments/${encodeURIComponent(id)}`);
  }

  async createDepartment(input: { name: string; parentId?: string; managerId?: string }): Promise<HrDepartment> {
    return request<HrDepartment>(this.config, 'POST', '/api/departments', input);
  }

  // ─── Employees ───

  async listEmployees(input: { status?: EmployeeStatus; departmentId?: string; managerId?: string; limit?: number } = {}): Promise<Employee[]> {
    return request<Employee[]>(this.config, 'GET', `/api/employees${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getEmployee(id: string): Promise<Employee> {
    return request<Employee>(this.config, 'GET', `/api/employees/${encodeURIComponent(id)}`);
  }

  async createEmployee(input: { name: string; email: string; phone?: string; role: string; departmentId?: string; managerId?: string; hireDate: string; salary?: Money; skills?: string[] }): Promise<Employee> {
    return request<Employee>(this.config, 'POST', '/api/employees', input);
  }

  async updateEmployee(id: string, patch: Partial<Employee>): Promise<Employee> {
    return request<Employee>(this.config, 'PUT', `/api/employees/${encodeURIComponent(id)}`, patch);
  }

  async terminateEmployee(id: string, input: { reason: string; lastDay: string }): Promise<Employee> {
    return request<Employee>(this.config, 'POST', `/api/employees/${encodeURIComponent(id)}/terminate`, input);
  }

  // ─── Attendance ───

  async listAttendance(input: { employeeId?: string; from: string; to: string; status?: Attendance['status'] }): Promise<Attendance[]> {
    return request<Attendance[]>(this.config, 'GET', `/api/attendance${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async checkIn(employeeId: string): Promise<Attendance> {
    return request<Attendance>(this.config, 'POST', '/api/attendance/check-in', { employeeId });
  }

  async checkOut(employeeId: string): Promise<Attendance> {
    return request<Attendance>(this.config, 'POST', '/api/attendance/check-out', { employeeId });
  }

  // ─── Leave ───

  async listLeaveRequests(input: { employeeId?: string; status?: LeaveStatus; from?: string; to?: string } = {}): Promise<LeaveRequest[]> {
    return request<LeaveRequest[]>(this.config, 'GET', `/api/leave${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async requestLeave(input: { employeeId: string; type: LeaveType; from: string; to: string; reason?: string }): Promise<LeaveRequest> {
    return request<LeaveRequest>(this.config, 'POST', '/api/leave', input);
  }

  async approveLeave(id: string, approverId: string): Promise<LeaveRequest> {
    return request<LeaveRequest>(this.config, 'POST', `/api/leave/${encodeURIComponent(id)}/approve`, { approverId });
  }

  // ─── Payroll ───

  async listPayroll(input: { employeeId?: string; period?: string }): Promise<Payroll[]> {
    return request<Payroll[]>(this.config, 'GET', `/api/payroll${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async runPayroll(input: { period: string; employeeIds?: string[] }): Promise<{ period: string; processed: number; total: Money }> {
    return request(this.config, 'POST', '/api/payroll/run', input);
  }
}
