/**
 * LawGens API Client
 * Client-side API integration for LawGens web apps
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5099';
const INTEGRATION_URL = process.env.NEXT_PUBLIC_INTEGRATION_URL || 'http://localhost:5098';

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'starter' | 'professional' | 'enterprise';
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
}

export interface Contract {
  id: string;
  type: string;
  title: string;
  status: 'draft' | 'analyzed' | 'signed';
  createdAt: string;
}

export interface CourtCase {
  id: string;
  title: string;
  court: string;
  status: string;
  date: string;
}

export interface AnalysisResult {
  score: number;
  risks: string[];
  recommendations: string[];
}

export interface PaymentResult {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
}

// ============================================
// API CLIENT
// ============================================

class LawGensAPI {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('lawgens_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = result.token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lawgens_token', result.token);
    }
    return result;
  }

  async register(data: { email: string; password: string; name: string; plan?: string }): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.token = result.token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lawgens_token', result.token);
    }
    return result;
  }

  async logout(): Promise<void> {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lawgens_token');
    }
  }

  async getProfile(): Promise<User> {
    return this.request<User>('/api/auth/profile');
  }

  // Contracts
  async analyzeContract(contractText: string, type: string): Promise<AnalysisResult> {
    return this.request<AnalysisResult>('/api/contracts/analyze', {
      method: 'POST',
      body: JSON.stringify({ contractText, contractType: type }),
    });
  }

  async generateContract(template: string, data: any): Promise<Contract> {
    return this.request<Contract>('/api/contracts/generate', {
      method: 'POST',
      body: JSON.stringify({ templateType: template, ...data }),
    });
  }

  async getContracts(): Promise<Contract[]> {
    return this.request<Contract[]>('/api/contracts');
  }

  // Court Cases
  async searchCases(query: string, options?: { court?: string; year?: number }): Promise<CourtCase[]> {
    return this.request<CourtCase[]>('/api/cases/search', {
      method: 'POST',
      body: JSON.stringify({ query, ...options }),
    });
  }

  async getCase(caseId: string): Promise<CourtCase> {
    return this.request<CourtCase>(`/api/cases/${caseId}`);
  }

  // Compliance
  async getComplianceStatus(): Promise<Record<string, { status: string; lastChecked: string }>> {
    return this.request('/api/compliance/status');
  }

  // Payments
  async createPayment(plan: string, amount: number): Promise<PaymentResult> {
    return this.request<PaymentResult>('/api/payments/create', {
      method: 'POST',
      body: JSON.stringify({ plan, amount }),
    });
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    return this.request<PaymentResult>(`/api/payments/${paymentId}`);
  }

  // Dashboard
  async getDashboard(): Promise<any> {
    return this.request('/api/dashboard');
  }
}

// Singleton instance
export const api = new LawGensAPI();

// ============================================
// INTEGRATION CLIENT (5098)
// ============================================

export const integrationApi = {
  async onboardUser(data: { userId: string; email: string; name: string; plan: string }) {
    return fetch(`${INTEGRATION_URL}/api/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json());
  },

  async healthCheck() {
    return fetch(`${INTEGRATION_URL}/health/detailed`).then(r => r.json());
  },

  async trackIntent(userId: string, action: string, data?: any) {
    return fetch(`${INTEGRATION_URL}/api/rez/intent/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, data }),
    }).then(r => r.json());
  },
};

// ============================================
// HELPERS
// ============================================

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

export function getPlanColor(plan: string): string {
  switch (plan) {
    case 'enterprise': return 'text-purple-400';
    case 'professional': return 'text-amber-400';
    default: return 'text-slate-400';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': case 'signed': return 'text-green-400';
    case 'pending': case 'processing': return 'text-amber-400';
    case 'failed': return 'text-red-400';
    default: return 'text-slate-400';
  }
}