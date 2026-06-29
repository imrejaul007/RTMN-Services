/**
 * CompanyOS API Client
 *
 * Client for communicating with CompanyOS Control Plane.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4010';

export interface CreateCompanyRequest {
  name: string;
  industry: string;
  departments: string[];
  ai_departments: Record<string, { enabled: boolean; head: string }>;
}

export interface CreateCompanyResponse {
  success: boolean;
  companyId?: string;
  manifest?: any;
  error?: string;
}

export interface CompanyState {
  companyId: string;
  name: string;
  industry: string;
  status: 'composing' | 'active' | 'failed';
  departments: string[];
  extensions: string[];
  workers: string[];
}

export interface DepartmentPack {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  aiWorkers: string[];
  port: number;
}

export interface IndustryExtension {
  id: string;
  name: string;
  industry: string;
  version: string;
  modules: string[];
}

class CompanyOSClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, options);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // ========================================
  // HEALTH
  // ========================================

  async health(): Promise<{ status: string; version: string }> {
    return this.request('GET', '/health');
  }

  // ========================================
  // COMPANIES
  // ========================================

  async createCompany(request: CreateCompanyRequest): Promise<CreateCompanyResponse> {
    return this.request<CreateCompanyResponse>('POST', '/api/company/create', request);
  }

  async getCompanyState(companyId: string): Promise<CompanyState | null> {
    try {
      return await this.request<CompanyState>('GET', `/api/company/${companyId}/state`);
    } catch {
      return null;
    }
  }

  async getCompanyManifest(companyId: string): Promise<any | null> {
    try {
      return await this.request('GET', `/api/company/${companyId}/manifest`);
    } catch {
      return null;
    }
  }

  async deleteCompany(companyId: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/api/company/${companyId}`);
  }

  // ========================================
  // CATALOG
  // ========================================

  async getPacks(): Promise<{ count: number; packs: DepartmentPack[] }> {
    return this.request('GET', '/api/packs');
  }

  async getExtensions(): Promise<{ count: number; extensions: IndustryExtension[] }> {
    return this.request('GET', '/api/extensions');
  }

  async getDependencies(industry: string): Promise<{
    required: string[];
    optional: string[];
    autoInstalled: string[];
  }> {
    return this.request('GET', `/api/dependencies/${industry}`);
  }

  // ========================================
  // WORKERS
  // ========================================

  async getWorkers(companyId: string): Promise<any> {
    return this.request('GET', `/api/company/${companyId}/workers`);
  }

  async deployWorker(
    companyId: string,
    workerId: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.request('POST', `/api/company/${companyId}/workers/deploy`, { workerId });
  }

  async stopWorker(
    companyId: string,
    workerId: string
  ): Promise<{ success: boolean }> {
    return this.request('POST', `/api/company/${companyId}/workers/stop`, { workerId });
  }

  // ========================================
  // HEALTH MONITORING
  // ========================================

  async getFleetHealth(): Promise<{
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  }> {
    return this.request('GET', '/api/fleet/health');
  }
}

export const api = new CompanyOSClient();
