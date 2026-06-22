/**
 * RTMZ SDK - TypeScript client for RTMZ services
 */

// Client configuration
export interface RTMZConfig {
  apiUrl: string;
  authUrl: string;
  apiKey?: string;
}

// Auth service types
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Service response types
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// RTMZ Client class
export class RTMZClient {
  private config: RTMZConfig;
  private token?: string;

  constructor(config: RTMZConfig) {
    this.config = config;
  }

  setToken(token: string): void {
    this.token = token;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.config.apiUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<AuthToken> {
    return this.request<AuthToken>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getUser(): Promise<User> {
    return this.request<User>('/api/v1/auth/userinfo');
  }

  // GraphQL
  async graphql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    return this.request<T>('/graphql', {
      method: 'POST',
      body: JSON.stringify({ query, variables }),
    });
  }

  // AutoML
  async trainModel(config: any): Promise<{ jobId: string }> {
    return this.request('/api/v1/automl/train', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getTrainingStatus(jobId: string): Promise<any> {
    return this.request(`/api/v1/automl/status/${jobId}`);
  }

  // Invoice OCR
  async processInvoice(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/api/v1/invoice/process', {
      method: 'POST',
      body: formData as any,
    });
  }

  // Contracts
  async createContract(data: any): Promise<any> {
    return this.request('/api/v1/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getContract(id: string): Promise<any> {
    return this.request(`/api/v1/contracts/${id}`);
  }

  // Legal
  async analyzeDocument(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/api/v1/legal/analyze', {
      method: 'POST',
      body: formData as any,
    });
  }

  // Ranking
  async submitRanking(items: any[], model?: string): Promise<any> {
    return this.request('/api/v1/ranking/submit', {
      method: 'POST',
      body: JSON.stringify({ items, model }),
    });
  }
}

// Factory function
export function createClient(config: RTMZConfig): RTMZClient {
  return new RTMZClient(config);
}

// Default export
export default RTMZClient;

// Re-export forensics client
export { ForensicsClient, createForensicsClient, ForensicsConfig } from './forensics.js';
export type {
  Investigation,
  InvestigationType,
  InvestigationStatus,
  InvestigationPriority,
  Evidence,
  EvidenceType,
  DeepfakeAnalysis,
  CustodyChain,
  CustodyTransfer,
  FinancialAnalysis,
  FinancialFinding,
  FinancialAnomaly,
  SocialProfile,
  SocialConnection,
  LocationData,
  ForensicsTool
} from './forensics.js';