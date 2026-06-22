/**
 * Type definitions for HOJAI AI Churn Model Service
 */

export interface ChurnPredictionRequest {
  customerId: string;
  features: {
    daysSinceLastPurchase: number;
    totalOrders: number;
    averageOrderValue: number;
    engagementScore: number;
    supportTickets: number;
  };
}

export interface ChurnFactor {
  name: string;
  impact: number;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ChurnPredictionResponse {
  customerId: string;
  probability: number;
  riskLevel: RiskLevel;
  factors: ChurnFactor[];
  confidence: number;
  modelVersion: string;
  timestamp: string;
}

export interface TrainRequest {
  customerId: string;
  features: ChurnPredictionRequest['features'];
  label: boolean; // true = churned
}

export interface TrainResponse {
  modelId: string;
  status: 'training' | 'completed' | 'failed';
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    auc?: number;
  };
  trainingSamples: number;
  timestamp: string;
}

export interface ModelInfo {
  id: string;
  version: string;
  status: 'active' | 'training' | 'archived';
  createdAt: string;
  updatedAt: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
  };
  featureImportance: Array<{
    feature: string;
    importance: number;
  }>;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    memory: boolean;
    model: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
