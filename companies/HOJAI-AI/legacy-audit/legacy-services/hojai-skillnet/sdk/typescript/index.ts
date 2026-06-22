/**
 * HOJAI SkillNet TypeScript SDK
 * AI Skill Marketplace & Lifecycle Management
 */

export interface SkillNetConfig {
  baseUrl: string;
  tenantId: string;
  apiKey?: string;
  token?: string;
}

export interface PredictionRequest {
  userId?: string;
  features: Record<string, unknown>;
}

export interface Prediction {
  id: string;
  tenant_id: string;
  user_id?: string;
  type: string;
  model: string;
  score: number;
  confidence: number;
  features: Record<string, unknown>;
  prediction: unknown;
  created_at: string;
}

export interface Recommendation {
  id: string;
  tenant_id: string;
  user_id?: string;
  type: string;
  items: RecommendationItem[];
  strategy: string;
  created_at: string;
}

export interface RecommendationItem {
  id: string;
  type: string;
  score: number;
  reason?: string;
}

export interface Insight {
  id: string;
  tenant_id: string;
  user_id?: string;
  type: string;
  title: string;
  description?: string;
  severity: string;
  recommendation?: string;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface Event {
  id: string;
  tenant_id: string;
  type: string;
  source?: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  occurred_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  plan: string;
  quota: { api_calls: number; storage: number; users: number };
  usage: { api_calls: number; storage: number; users: number };
  status: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  tenant_id: string;
  name: string;
  key: string;
  permissions: string[];
  status: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export class SkillNetClient {
  private config: SkillNetConfig;

  constructor(config: SkillNetConfig) {
    this.config = config;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': this.config.tenantId,
      ...(options.headers || {})
    };

    if (this.config.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.config.token}`;
    } else if (this.config.apiKey) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...options,
      headers
    });

    const data = await response.json() as ApiResponse<T>;

    if (!data.success) {
      throw new Error(data.error?.message || 'Request failed');
    }

    return data.data as T;
  }

  // Health
  async health() {
    return this.request<{ status: string; service: string; version: string }>('/health');
  }

  // Predictions
  async createChurnPrediction(request: PredictionRequest) {
    return this.request<{ prediction: Prediction }>('/predictions/churn', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async createLTVPrediction(request: PredictionRequest) {
    return this.request<{ prediction: Prediction }>('/predictions/ltv', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async createIntentPrediction(request: PredictionRequest) {
    return this.request<{ prediction: Prediction }>('/predictions/intent', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async getPredictions(type?: string, limit = 50) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    params.set('limit', limit.toString());
    return this.request<{ predictions: Prediction[]; count: number }>(`/predictions?${params}`);
  }

  // Recommendations
  async createProductRecommendation(userId?: string) {
    return this.request<{ recommendation: Recommendation }>('/recommendations/product', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  async getRecommendations(type?: string, limit = 20) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    params.set('limit', limit.toString());
    return this.request<{ recommendations: Recommendation[]; count: number }>(`/recommendations?${params}`);
  }

  // Insights
  async createInsight(insight: Partial<Insight>) {
    return this.request<{ insight: Insight }>('/insights', {
      method: 'POST',
      body: JSON.stringify(insight)
    });
  }

  async getInsights(type?: string, severity?: string, limit = 50) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (severity) params.set('severity', severity);
    params.set('limit', limit.toString());
    return this.request<{ insights: Insight[]; count: number }>(`/insights?${params}`);
  }

  // Events
  async publishEvent(type: string, data: Record<string, unknown>, source?: string) {
    return this.request<{ event: Event }>('/events', {
      method: 'POST',
      body: JSON.stringify({ type, data, source })
    });
  }

  async getEvents(type?: string, limit = 100, offset = 0) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());
    return this.request<{ events: Event[]; pagination: { total: number } }>(`/events?${params}`);
  }

  // Tenants
  async createTenant(name: string, plan = 'free') {
    return this.request<{ tenant: Tenant }>('/tenants', {
      method: 'POST',
      body: JSON.stringify({ name, plan })
    });
  }

  async getTenants() {
    return this.request<{ tenants: Tenant[]; count: number }>('/tenants');
  }

  // API Keys
  async createApiKey(name: string, permissions = ['read']) {
    return this.request<{ apiKey: ApiKey }>('/apikeys', {
      method: 'POST',
      body: JSON.stringify({ tenantId: this.config.tenantId, name, permissions })
    });
  }

  // Stats
  async getStats() {
    return this.request<{ predictions: number; recommendations: number; insights: number; events: number }>('/stats');
  }
}

export default SkillNetClient;
