/**
 * HOJAI Customer Intelligence SDK
 * Unified SDK for all Customer Intelligence services
 *
 * @example
 * ```typescript
 * import { CustomerIntelligenceSDK } from '@hojai/customer-intelligence-sdk';
 *
 * const sdk = new CustomerIntelligenceSDK({
 *   gatewayUrl: 'http://localhost:4896',
 *   apiKey: 'your-api-key'
 * });
 *
 * // Full customer analysis
 * const result = await sdk.analyze({ phone: '+91XXXXXXXXXX' });
 * console.log(result.data.trust_score);
 *
 * // COD recommendation
 * const cod = await sdk.cod.recommend({ orderHistory: { total: 10, completed: 9, returned: 1 } });
 * console.log(cod.data.allowed);
 * ```
 */

import { BaseClient, withRetry } from './client.js';
import type {
  CustomerIntelligenceConfig,
  SDKResponse,
  AnalyzeInput,
  AnalyzeOutput,
  HealthStatus,
  TrustScoreInput,
  TrustScoreOutput,
  CodRecommendationInput,
  CodRecommendation,
  ReturnRiskInput,
  ReturnRiskAssessment,
  SupportProfileInput,
  SupportProfile,
  SellingPreferencesInput,
  SellingPreferences,
  LoyaltyProfileInput,
  LoyaltyProfile,
  CommunicationPreferencesInput,
  CommunicationPreferences,
  RiskScores,
  CustomerSegments,
  RecommendationInput,
  RecommendationOutput,
  GraphResolveInput,
  GraphResolveOutput,
  GraphNetwork,
  UsageRecord,
  UsageReport,
} from './types.js';

/**
 * Identity Module - Customer identity resolution
 */
export class IdentityModule extends BaseClient {
  constructor(config: CustomerIntelligenceConfig) {
    const url = config.services?.identity || config.gatewayUrl || 'http://localhost:4896';
    super(config, url);
  }

  /**
   * Resolve customer identity from various identifiers
   */
  async resolve(input: GraphResolveInput): Promise<SDKResponse<GraphResolveOutput>> {
    return this.post<GraphResolveOutput>('/api/identity/resolve', input);
  }

  /**
   * Get customer by ID
   */
  async get(customerId: string): Promise<SDKResponse<{ customerId: string; sources: string[] }>> {
    return this.get<{ customerId: string; sources: string[] }>(`/api/identity/${customerId}`);
  }

  /**
   * Link identifiers to existing customer
   */
  async link(input: { customerId: string; phone?: string; email?: string; deviceId?: string }): Promise<SDKResponse<{ linked: boolean }>> {
    return this.post<{ linked: boolean }>('/api/identity/link', input);
  }
}

/**
 * Trust Score Module - Customer trust scoring
 */
export class TrustModule extends BaseClient {
  constructor(config: CustomerIntelligenceConfig) {
    const url = config.services?.trust || config.gatewayUrl || 'http://localhost:4896';
    super(config, url);
  }

  /**
   * Calculate trust score for a customer
   */
  async score(input: TrustScoreInput): Promise<SDKResponse<TrustScoreOutput>> {
    return this.post<TrustScoreOutput>('/api/trust/score', input);
  }

  /**
   * Get trust history for a customer
   */
  async history(customerId: string): Promise<SDKResponse<{ scores: TrustScoreOutput[] }>> {
    return this.get<{ scores: TrustScoreOutput[] }>(`/api/trust/history/${customerId}`);
  }
}

/**
 * COD Intelligence Module - Cash on Delivery recommendations
 */
export class CodModule extends BaseClient {
  constructor(config: CustomerIntelligenceConfig) {
    const url = config.services?.cod || config.gatewayUrl || 'http://localhost:4896';
    super(config, url);
  }

  /**
   * Get COD recommendation for a customer
   */
  async recommend(input: CodRecommendationInput): Promise<SDKResponse<CodRecommendation>> {
    return this.post<CodRecommendation>('/api/cod/recommend', input);
  }

  /**
   * Batch COD recommendations
   */
  async recommendBatch(inputs: CodRecommendationInput[]): Promise<SDKResponse<{ recommendations: CodRecommendation[] }>> {
    return this.post<{ recommendations: CodRecommendation[] }>('/api/cod/recommend/batch', { inputs });
  }
}

/**
 * Return Risk Module - Return abuse detection
 */
export class ReturnsModule extends BaseClient {
  constructor(config: CustomerIntelligenceConfig) {
    const url = config.services?.returns || config.gatewayUrl || 'http://localhost:4896';
    super(config, url);
  }

  /**
   * Assess return risk for a customer
   */
  async risk(input: ReturnRiskInput): Promise<SDKResponse<ReturnRiskAssessment>> {
    return this.post<ReturnRiskAssessment>('/api/returns/risk', input);
  }

  /**
   * Batch return risk assessment
   */
  async riskBatch(inputs: ReturnRiskInput[]): Promise<SDKResponse<{ assessments: ReturnRiskAssessment[] }>> {
    return this.post<{ assessments: ReturnRiskAssessment[] }>('/api/returns/risk/batch', { inputs });
  }
}

/**
 * Support Intelligence Module - Support behavior profiling
 */
export class SupportModule extends BaseClient {
  constructor(config: CustomerIntelligenceConfig) {
    const url = config.services?.support || config.gatewayUrl || 'http://localhost:4896';
    super(config, url);
  }

  /**
   * Get support profile for a customer
   */
  async profile(input: SupportProfileInput): Promise<SDKResponse<SupportProfile>> {
    return this.post<SupportProfile>('/api/support/profile', input);
  }

  /**
   * Get support history
   */
  async history(customerId: string): Promise<SDKResponse<{ tickets: unknown[] }>> {
    return this.get<{ tickets: unknown[] }>(`/api/support/history/${customerId}`);
  }
}

/**
 * Sales Intelligence Module - Selling preferences
 */
export class SalesModule extends BaseClient {
  constructor(config: CustomerIntelligenceConfig) {
    const url = config.services?.sales || config.gatewayUrl || 'http://localhost:4896';
    super(config, url);
  }

  /**
   * Get selling preferences for a customer
   */
  async preferences(input: SellingPreferencesInput): Promise<SDKResponse<SellingPreferences>> {
    return this.post<SellingPreferences>('/api/sales/preferences', input);
  }

  /**
   * Get customer segment
   */
  async segment(customerId: string): Promise<SDKResponse<CustomerSegments>> {
    return this.get<CustomerSegments>(`/api/sales/segment/${customerId}`);
  }
}

/**
 * Twin Module - Customer digital twin
 */
export class TwinModule extends BaseClient {
  constructor(config: CustomerIntelligenceConfig) {
    const url = config.services?.twin || config.gatewayUrl || 'http://localhost:4896';
    super(config, url);
  }

  /**
   * Get full customer twin profile
   */
  async profile(customerId: string): Promise<SDKResponse<Record<string, unknown>>> {
    return this.get<Record<string, unknown>>(`/api/twin/${customerId}`);
  }

  /**
   * Update customer twin
   */
  async update(customerId: string, data: Record<string, unknown>): Promise<SDKResponse<{ updated: boolean }>> {
    return this.patch<{ updated: boolean }>(`/api/twin/${customerId}`, data);
  }

  /**
   * Add event to customer twin
   */
  async event(customerId: string, event: Record<string, unknown>): Promise<SDKResponse<{ added: boolean }>> {
    return this.post<{ added: boolean }>(`/api/twin/${customerId}/events`, event);
  }
}

/**
 * Recommendations Module - Next best action
 */
export class RecommendationsModule extends BaseClient {
  constructor(config: CustomerIntelligenceConfig) {
    const url = config.services?.recommendations || config.gatewayUrl || 'http://localhost:4896';
    super(config, url);
  }

  /**
   * Get personalized recommendations
   */
  async get(input: RecommendationInput): Promise<SDKResponse<RecommendationOutput>> {
    return this.post<RecommendationOutput>('/api/recommend', input);
  }

  /**
   * Get next best action
   */
  async nextBestAction(customerId?: string, context?: Record<string, unknown>): Promise<SDKResponse<{ action: string; confidence: number; alternatives: string[] }>> {
    return this.post<{ action: string; confidence: number; alternatives: string[] }>('/api/recommend/next-best-action', { customerId, context });
  }
}

/**
 * Graph Module - Customer relationship graph
 */
export class GraphModule extends BaseClient {
  constructor(config: CustomerIntelligenceConfig) {
    const url = config.services?.graph || config.gatewayUrl || 'http://localhost:4896';
    super(config, url);
  }

  /**
   * Resolve customer from identifiers
   */
  async resolve(input: GraphResolveInput): Promise<SDKResponse<GraphResolveOutput>> {
    return this.post<GraphResolveOutput>('/api/graph/resolve', input);
  }

  /**
   * Get customer connections
   */
  async connections(customerId: string): Promise<SDKResponse<{ connections: GraphNetwork['connections'] }>> {
    return this.get<{ connections: GraphNetwork['connections'] }>(`/api/graph/${customerId}/connections`);
  }

  /**
   * Get customer network
   */
  async network(customerId: string): Promise<SDKResponse<GraphNetwork>> {
    return this.get<GraphNetwork>(`/api/graph/${customerId}/network`);
  }
}

/**
 * Risk Module - Fraud and churn scoring
 */
export class RiskModule extends BaseClient {
  constructor(config: CustomerIntelligenceConfig) {
    const url = config.services?.risk || config.gatewayUrl || 'http://localhost:4896';
    super(config, url);
  }

  /**
   * Get risk scores for a customer
   */
  async scores(customerId?: string, input?: Record<string, unknown>): Promise<SDKResponse<RiskScores>> {
    return this.post<RiskScores>('/api/risk/scores', { customerId, ...input });
  }

  /**
   * Get fraud probability
   */
  async fraud(input: Record<string, unknown>): Promise<SDKResponse<{ probability: number; level: string }>> {
    return this.post<{ probability: number; level: string }>('/api/risk/fraud', input);
  }

  /**
   * Get churn probability
   */
  async churn(customerId?: string, input?: Record<string, unknown>): Promise<SDKResponse<{ probability: number; level: string }>> {
    return this.post<{ probability: number; level: string }>('/api/risk/churn', { customerId, ...input });
  }
}

/**
 * Loyalty Module - LTV and retention
 */
export class LoyaltyModule extends BaseClient {
  constructor(config: CustomerIntelligenceConfig) {
    const url = config.services?.loyalty || config.gatewayUrl || 'http://localhost:4896';
    super(config, url);
  }

  /**
   * Get loyalty profile
   */
  async profile(input: LoyaltyProfileInput): Promise<SDKResponse<LoyaltyProfile>> {
    return this.post<LoyaltyProfile>('/api/loyalty/profile', input);
  }

  /**
   * Get retention recommendations
   */
  async retention(customerId: string): Promise<SDKResponse<{ recommendations: string[] }>> {
    return this.get<{ recommendations: string[] }>(`/api/loyalty/retention/${customerId}`);
  }
}

/**
 * Communication Module - Channel and tone preferences
 */
export class CommunicationModule extends BaseClient {
  constructor(config: CustomerIntelligenceConfig) {
    const url = config.services?.communication || config.gatewayUrl || 'http://localhost:4896';
    super(config, url);
  }

  /**
   * Get communication preferences
   */
  async preferences(input: CommunicationPreferencesInput): Promise<SDKResponse<CommunicationPreferences>> {
    return this.post<CommunicationPreferences>('/api/communication/preferences', input);
  }

  /**
   * Get best time to contact
   */
  async bestTime(customerId: string): Promise<SDKResponse<{ time: string; score: number }>> {
    return this.get<{ time: string; score: number }>(`/api/communication/best-time/${customerId}`);
  }
}

/**
 * Usage Module - Usage tracking and reporting
 */
export class UsageModule extends BaseClient {
  constructor(config: CustomerIntelligenceConfig) {
    const url = config.gatewayUrl || 'http://localhost:4896';
    super(config, url);
  }

  /**
   * Track API usage
   */
  async track(record: UsageRecord): Promise<SDKResponse<{ tracked: boolean }>> {
    return this.post<{ tracked: boolean }>('/api/usage/track', record);
  }

  /**
   * Get usage report
   */
  async report(startDate: string, endDate: string): Promise<SDKResponse<UsageReport>> {
    return this.get<UsageReport>('/api/usage/report', { startDate, endDate });
  }
}

/**
 * Main Customer Intelligence SDK Class
 */
export class CustomerIntelligenceSDK extends BaseClient {
  public identity: IdentityModule;
  public trust: TrustModule;
  public cod: CodModule;
  public returns: ReturnsModule;
  public support: SupportModule;
  public sales: SalesModule;
  public twin: TwinModule;
  public recommendations: RecommendationsModule;
  public graph: GraphModule;
  public risk: RiskModule;
  public loyalty: LoyaltyModule;
  public communication: CommunicationModule;
  public usage: UsageModule;

  constructor(config: CustomerIntelligenceConfig) {
    const url = config.gatewayUrl || 'http://localhost:4896';
    super(config, url);

    // Initialize all modules
    this.identity = new IdentityModule(config);
    this.trust = new TrustModule(config);
    this.cod = new CodModule(config);
    this.returns = new ReturnsModule(config);
    this.support = new SupportModule(config);
    this.sales = new SalesModule(config);
    this.twin = new TwinModule(config);
    this.recommendations = new RecommendationsModule(config);
    this.graph = new GraphModule(config);
    this.risk = new RiskModule(config);
    this.loyalty = new LoyaltyModule(config);
    this.communication = new CommunicationModule(config);
    this.usage = new UsageModule(config);
  }

  /**
   * Full customer analysis - returns all signals in one call
   */
  async analyze(input: AnalyzeInput): Promise<SDKResponse<AnalyzeOutput>> {
    const startTime = Date.now();

    try {
      const result = await this.post<AnalyzeOutput>('/api/customer/analyze', input);

      // Track usage
      if (this.config.retries !== 0) {
        await this.usage.track({
          operation: 'analyze',
          customerId: result.data?.customer_id,
          timestamp: new Date().toISOString(),
          success: result.success,
          latencyMs: Date.now() - startTime,
        });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Analysis failed',
        code: 'ANALYSIS_ERROR',
      };
    }
  }

  /**
   * Health check for all services
   */
  async health(): Promise<SDKResponse<HealthStatus>> {
    return this.get<HealthStatus>('/health');
  }

  /**
   * Get customer by ID
   */
  async customer(customerId: string): Promise<SDKResponse<Record<string, unknown>>> {
    return this.get<Record<string, unknown>>(`/api/customer/${customerId}`);
  }

  /**
   * Track customer event
   */
  async trackEvent(customerId: string, event: Record<string, unknown>): Promise<SDKResponse<{ tracked: boolean }>> {
    return this.post<{ tracked: boolean }>(`/api/customer/${customerId}/events`, event);
  }
}

// Convenience exports
export const createSDK = (config: CustomerIntelligenceConfig) => new CustomerIntelligenceSDK(config);
export default CustomerIntelligenceSDK;
