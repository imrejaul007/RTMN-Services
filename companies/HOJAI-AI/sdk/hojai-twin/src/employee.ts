/**
 * Employee Twin Client (port 4730) — Employee, Performance, Skills.
 *
 * Specialized surface for the employee twin — performance reviews,
 * skill tracking, manager assignment, time-off.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Money } from './types.js';

export interface EmployeeTwin {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  managerId?: string;
  hireDate: string;
  /** 0-5 performance rating */
  performanceRating?: number;
  skills: string[];
  salary?: Money;
  status: 'active' | 'on-leave' | 'terminated' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  period: string; // 'YYYY-Qn'
  rating: number; // 0-5
  strengths: string[];
  improvements: string[];
  goals: Array<{ id: string; title: string; dueAt: string }>;
  createdAt: string;
}

export class EmployeeTwinClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4730` }; }

  async listEmployees(input: { department?: string; managerId?: string; status?: EmployeeTwin['status']; limit?: number } = {}): Promise<EmployeeTwin[]> {
    return request<EmployeeTwin[]>(this.config, 'GET', `/api/twins/employees${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async getEmployee(id: string): Promise<EmployeeTwin> {
    return request<EmployeeTwin>(this.config, 'GET', `/api/twins/employee/${encodeURIComponent(id)}`);
  }
  async createEmployee(input: { userId: string; name: string; email: string; role: string; department?: string; managerId?: string; hireDate: string; salary?: Money }): Promise<EmployeeTwin> {
    return request<EmployeeTwin>(this.config, 'POST', '/api/twins/employee', input);
  }
  async updateEmployee(id: string, patch: Partial<EmployeeTwin>): Promise<EmployeeTwin> {
    return request<EmployeeTwin>(this.config, 'PUT', `/api/twins/employee/${encodeURIComponent(id)}`, patch);
  }
  async addSkill(id: string, skill: string): Promise<EmployeeTwin> {
    return request<EmployeeTwin>(this.config, 'POST', `/api/twins/employee/${encodeURIComponent(id)}/skills`, { skill });
  }
  async removeSkill(id: string, skill: string): Promise<EmployeeTwin> {
    return request<EmployeeTwin>(this.config, 'DELETE', `/api/twins/employee/${encodeURIComponent(id)}/skills/${encodeURIComponent(skill)}`);
  }
  async listPerformanceReviews(id: string, input: { limit?: number } = {}): Promise<PerformanceReview[]> {
    return request<PerformanceReview[]>(this.config, 'GET', `/api/twins/employee/${encodeURIComponent(id)}/reviews${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async addPerformanceReview(id: string, review: Omit<PerformanceReview, 'id' | 'employeeId' | 'createdAt'>): Promise<PerformanceReview> {
    return request<PerformanceReview>(this.config, 'POST', `/api/twins/employee/${encodeURIComponent(id)}/reviews`, review);
  }
}
