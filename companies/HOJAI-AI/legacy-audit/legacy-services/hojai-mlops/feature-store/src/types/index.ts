/**
 * Hojai Feature Store Types
 */

export type FeatureValueType = number | string | boolean;

export type FeatureType = 'number' | 'string' | 'boolean';

/**
 * Individual feature with metadata
 */
export interface Feature {
  name: string;
  value: FeatureValueType;
  type: FeatureType;
  timestamp: string;
}

/**
 * Complete feature set for an entity
 */
export interface FeatureSet {
  entity_id: string;
  features: Record<string, Feature>;
  last_updated: string;
}

/**
 * Request to store features for an entity
 */
export interface StoreFeaturesRequest {
  features: Array<{
    name: string;
    value: FeatureValueType;
  }>;
}

/**
 * Response for feature retrieval
 */
export interface GetFeaturesResponse {
  entity_id: string;
  features: Record<string, Feature>;
  last_updated: string;
  found: boolean;
}

/**
 * Response for single feature retrieval
 */
export interface GetFeatureResponse {
  entity_id: string;
  feature: Feature | null;
  found: boolean;
}

/**
 * Batch request for multiple entities
 */
export interface BatchGetRequest {
  entity_ids: string[];
  feature_names?: string[];
}

/**
 * Batch response
 */
export interface BatchGetResponse {
  results: Array<{
    entity_id: string;
    features: Record<string, Feature>;
    last_updated: string;
    found: boolean;
  }>;
}

/**
 * Delete response
 */
export interface DeleteResponse {
  entity_id: string;
  deleted: boolean;
  features_deleted: number;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  redis: 'connected' | 'disconnected';
  timestamp: string;
  version: string;
}

/**
 * API Error response
 */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}
