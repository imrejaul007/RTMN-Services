/**
 * Hojai Model Registry Types
 */

export type ModelStage = 'dev' | 'staging' | 'production';

/**
 * Individual model version with metadata and metrics
 */
export interface ModelVersion {
  version: string;
  created_at: string;
  description?: string;
  metrics?: Record<string, number>;
  stage: ModelStage;
  metadata?: Record<string, unknown>;
}

/**
 * Complete model info with all versions
 */
export interface ModelInfo {
  name: string;
  versions: ModelVersion[];
}

/**
 * Request to register a new model version
 */
export interface RegisterModelRequest {
  name: string;
  version: string;
  description?: string;
  metrics?: Record<string, number>;
  stage?: ModelStage;
  metadata?: Record<string, unknown>;
}

/**
 * Request to update model stage
 */
export interface UpdateStageRequest {
  stage: ModelStage;
}

/**
 * Response for model registration
 */
export interface RegisterModelResponse {
  success: boolean;
  model: ModelInfo;
  message: string;
}

/**
 * Response for listing models
 */
export interface ListModelsResponse {
  models: ModelInfo[];
  total: number;
}

/**
 * Response for getting model versions
 */
export interface GetModelVersionsResponse {
  name: string;
  versions: ModelVersion[];
  total: number;
}

/**
 * Response for getting specific version
 */
export interface GetModelVersionResponse {
  name: string;
  version: ModelVersion;
  found: boolean;
}

/**
 * Response for getting latest version
 */
export interface GetLatestVersionResponse {
  name: string;
  version: ModelVersion | null;
  found: boolean;
}

/**
 * Response for stage update
 */
export interface UpdateStageResponse {
  success: boolean;
  name: string;
  version: string;
  previous_stage: ModelStage;
  new_stage: ModelStage;
  message: string;
}

/**
 * Response for version deletion
 */
export interface DeleteVersionResponse {
  success: boolean;
  name: string;
  version: string;
  deleted: boolean;
  message: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  storage: 'in-memory';
  timestamp: string;
  version: string;
  models_registered: number;
  total_versions: number;
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
