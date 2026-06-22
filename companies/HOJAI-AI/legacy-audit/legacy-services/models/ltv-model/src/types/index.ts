/**
 * Type definitions for HOJAI AI LTV Model Service
 */

/**
 * Customer features for LTV prediction
 */
export interface LTVFeatures {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  daysActive: number;
  retentionRate: number;
}

/**
 * Request payload for LTV prediction
 */
export interface LTVPredictionRequest {
  customerId: string;
  features: LTVFeatures;
}

/**
 * Time-based LTV predictions
 */
export interface LTVPredictionTimeframe {
  threeMonth: number;
  sixMonth: number;
  twelveMonth: number;
}

/**
 * Customer tier based on LTV
 */
export type LTVTier = 'bronze' | 'silver' | 'gold' | 'platinum';

/**
 * Response payload for LTV prediction
 */
export interface LTVPredictionResponse {
  customerId: string;
  ltv: number;
  confidence: number;
  tier: LTVTier;
  prediction: LTVPredictionTimeframe;
  modelVersion: string;
  timestamp: string;
}

/**
 * Feature contribution to the prediction
 */
export interface LTVFeatureContribution {
  name: string;
  contribution: number;
  direction: 'positive' | 'negative';
}

/**
 * Training sample for model training
 */
export interface LTVTrainSample {
  customerId: string;
  features: LTVFeatures;
  actualLTV: number;
}

/**
 * Batch training request
 */
export interface LTVTrainRequest {
  samples: LTVTrainSample[];
}

/**
 * Training result metrics
 */
export interface LTVTrainMetrics {
  mse?: number;
  rmse?: number;
  mae?: number;
  r2?: number;
  mape?: number;
}

/**
 * Training response
 */
export interface LTVTrainResponse {
  modelId: string;
  status: 'training' | 'completed' | 'failed';
  metrics: LTVTrainMetrics;
  trainingSamples: number;
  timestamp: string;
}

/**
 * Model information
 */
export interface LTVModelInfo {
  id: string;
  version: string;
  status: 'active' | 'training' | 'archived';
  createdAt: string;
  updatedAt: string;
  metrics: LTVTrainMetrics;
  featureImportance: Array<{
    feature: string;
    importance: number;
  }>;
}

/**
 * Health check response
 */
export interface LTVHealthCheckResponse {
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

/**
 * API error response
 */
export interface LTVApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
