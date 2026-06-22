/**
 * Hojai Model Router Types
 * Intelligent LLM Provider Routing Service
 */

// Task types for routing
export type TaskType = 'chat' | 'embed' | 'classify' | 'complete';

// Supported LLM providers
export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'meta';

/**
 * Request options for routing
 */
export interface RouteOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * Request to route to appropriate model
 */
export interface RouteRequest {
  task: TaskType;
  input: string;
  options?: RouteOptions;
}

/**
 * Response from routing
 */
export interface RouteResponse {
  provider: LLMProvider;
  model: string;
  response: unknown;
  latencyMs: number;
  cost: number;
}

/**
 * Fallback request when primary fails
 */
export interface FallbackRequest {
  originalRequest: RouteRequest;
  failedProvider: LLMProvider;
  error: string;
  attempt?: number;
}

/**
 * Fallback response
 */
export interface FallbackResponse {
  provider: LLMProvider;
  model: string;
  response: unknown;
  latencyMs: number;
  cost: number;
  attempts: number;
  successful: boolean;
}

/**
 * Provider information
 */
export interface ProviderInfo {
  name: LLMProvider;
  displayName: string;
  models: ProviderModel[];
  enabled: boolean;
  priority: number;
}

/**
 * Model within a provider
 */
export interface ProviderModel {
  name: string;
  taskType: TaskType;
  contextWindow: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
}

/**
 * Cost estimate for a task
 */
export interface CostEstimate {
  provider: LLMProvider;
  model: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedInputCost: number;
  estimatedOutputCost: number;
  totalCost: number;
}

/**
 * Response for listing providers
 */
export interface ListProvidersResponse {
  providers: ProviderInfo[];
  total: number;
}

/**
 * Response for getting costs
 */
export interface GetCostsResponse {
  estimates: CostEstimate[];
  currency: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  providers: Record<LLMProvider, boolean>;
  timestamp: string;
  version: string;
  totalRequests: number;
  averageLatencyMs: number;
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

/**
 * Stats tracking
 */
export interface RouterStats {
  totalRequests: number;
  requestsByTask: Record<TaskType, number>;
  requestsByProvider: Record<LLMProvider, number>;
  averageLatencyMs: Record<LLMProvider, number>;
  errorsByProvider: Record<LLMProvider, number>;
  totalCostByProvider: Record<LLMProvider, number>;
}
