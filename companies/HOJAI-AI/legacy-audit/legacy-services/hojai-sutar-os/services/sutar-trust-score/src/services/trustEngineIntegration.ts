// Trust Engine Integration Service - Connect with external Trust Engine (port 4180)

import axios, { AxiosInstance } from "axios";
import {
  TrustEngineRequest,
  TrustEngineResponse,
  TrustScore,
  TrustLevel,
  TrustFactor,
  EntityType,
  TrustFactorType
} from "../types";
import TrustScoreService from "./trustScoreService";

/**
 * Trust Engine Integration Service configuration
 */
interface TrustEngineConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  apiKey?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TrustEngineConfig = {
  baseUrl: "http://localhost:4180",
  timeout: 10000,
  retries: 3
};

/**
 * Trust Engine Integration Service class
 */
export class TrustEngineIntegrationService {
  private client: AxiosInstance;
  private config: TrustEngineConfig;
  private trustScoreService: TrustScoreService;
  private connected: boolean = false;
  private lastHealthCheck: Date | null = null;

  constructor(
    config: Partial<TrustEngineConfig> = {},
    trustScoreService: TrustScoreService
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.trustScoreService = trustScoreService;

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey && { "X-API-Key": this.config.apiKey })
      }
    });
  }

  /**
   * Check connection to Trust Engine
   */
  async healthCheck(): Promise<{
    connected: boolean;
    latency: number;
    status: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await this.client.get("/health", { timeout: 5000 });
      const latency = Date.now() - startTime;
      this.connected = true;
      this.lastHealthCheck = new Date();

      return {
        connected: true,
        latency,
        status: response.data?.status || "healthy"
      };
    } catch (error) {
      this.connected = false;

      return {
        connected: false,
        latency: Date.now() - startTime,
        status: "unavailable"
      };
    }
  }

  /**
   * Get trust score from Trust Engine
   */
  async getTrustScoreFromEngine(entityId: string): Promise<TrustEngineResponse> {
    try {
      const response = await this.client.post<TrustEngineResponse>("/api/v1/evaluate", {
        entityId,
        action: "GET_SCORE"
      });

      return response.data;
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Submit trust score to Trust Engine
   */
  async submitTrustScoreToEngine(score: TrustScore): Promise<TrustEngineResponse> {
    try {
      const response = await this.client.post<TrustEngineResponse>("/api/v1/score", {
        entityId: score.entityId,
        entityType: score.entityType,
        score: score.score,
        level: score.level,
        factors: score.factors.map(f => ({
          type: f.type,
          score: f.score,
          weight: f.weight
        })),
        calculatedAt: score.calculatedAt
      });

      return response.data;
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verify identity with Trust Engine
   */
  async verifyIdentity(entityId: string): Promise<TrustEngineResponse> {
    try {
      const response = await this.client.post<TrustEngineResponse>("/api/v1/verify", {
        entityId,
        verificationType: "FULL"
      });

      return response.data;
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check network trust with Trust Engine
   */
  async checkNetworkTrust(entityId: string): Promise<TrustEngineResponse> {
    try {
      const response = await this.client.post<TrustEngineResponse>("/api/v1/network/check", {
        entityId
      });

      return response.data;
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Sync trust scores with Trust Engine
   */
  async syncWithTrustEngine(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const allScores = this.trustScoreService.getAllTrustScores();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const score of allScores) {
      const result = await this.submitTrustScoreToEngine(score);
      if (result.success) {
        synced++;
      } else {
        failed++;
        errors.push(`${score.entityId}: ${result.error}`);
      }
    }

    return { synced, failed, errors };
  }

  /**
   * Pull trust scores from Trust Engine
   */
  async pullTrustScoresFromEngine(entityIds: string[]): Promise<{
    scores: TrustScore[];
    failed: string[];
  }> {
    const scores: TrustScore[] = [];
    const failed: string[] = [];

    for (const entityId of entityIds) {
      const result = await this.getTrustScoreFromEngine(entityId);

      if (result.success && result.data) {
        const score = this.convertToTrustScore(entityId, result.data);
        if (score) {
          scores.push(score);
        }
      } else {
        failed.push(entityId);
      }
    }

    return { scores, failed };
  }

  /**
   * Get aggregated trust data from Trust Engine
   */
  async getAggregatedTrustData(): Promise<{
    totalEntities: number;
    averageScore: number;
    levelDistribution: Record<TrustLevel, number>;
  } | null> {
    try {
      const response = await this.client.get("/api/v1/aggregate");
      return response.data;
    } catch (error) {
      console.error("[TRUST_ENGINE] Failed to get aggregated data:", error);
      return null;
    }
  }

  /**
   * Register as a trust score provider
   */
  async registerAsProvider(): Promise<boolean> {
    try {
      const response = await this.client.post("/api/v1/providers/register", {
        serviceName: "sutar-trust-score",
        serviceUrl: `http://localhost:${process.env.PORT || 4181}`,
        capabilities: [
          "TRUST_SCORE_CALCULATION",
          "TRUST_HISTORY",
          "TRUST_BADGES",
          "TRUST_RECOMMENDATIONS",
          "TRUST_ALERTS"
        ],
        version: "1.0.0"
      });

      return response.data?.success || false;
    } catch (error) {
      console.error("[TRUST_ENGINE] Failed to register as provider:", error);
      return false;
    }
  }

  /**
   * Query Trust Engine for cross-entity trust relationships
   */
  async getTrustRelationships(entityId: string): Promise<{
    trustedBy: string[];
    trusts: string[];
    mutualTrusts: string[];
  } | null> {
    try {
      const response = await this.client.get(`/api/v1/relationships/${entityId}`);
      return response.data;
    } catch (error) {
      console.error("[TRUST_ENGINE] Failed to get trust relationships:", error);
      return null;
    }
  }

  /**
   * Submit trust endorsement
   */
  async submitEndorsement(
    fromEntityId: string,
    toEntityId: string,
    endorsement: {
      score: number;
      category: string;
      comment?: string;
    }
  ): Promise<TrustEngineResponse> {
    try {
      const response = await this.client.post<TrustEngineResponse>("/api/v1/endorsements", {
        fromEntityId,
        toEntityId,
        ...endorsement
      });

      return response.data;
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get trust endorsements for an entity
   */
  async getEndorsements(entityId: string): Promise<Array<{
    fromEntityId: string;
    score: number;
    category: string;
    comment?: string;
    timestamp: string;
  }>> {
    try {
      const response = await this.client.get(`/api/v1/endorsements/${entityId}`);
      return response.data || [];
    } catch (error) {
      console.error("[TRUST_ENGINE] Failed to get endorsements:", error);
      return [];
    }
  }

  /**
   * Request trust verification from external verifier
   */
  async requestExternalVerification(
    entityId: string,
    verificationLevel: "BASIC" | "STANDARD" | "ENHANCED"
  ): Promise<TrustEngineResponse> {
    try {
      const response = await this.client.post<TrustEngineResponse>("/api/v1/verification/request", {
        entityId,
        verificationLevel
      });

      return response.data;
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if connected to Trust Engine
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get last health check time
   */
  getLastHealthCheck(): Date | null {
    return this.lastHealthCheck;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TrustEngineConfig>): void {
    this.config = { ...this.config, ...config };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey && { "X-API-Key": this.config.apiKey })
      }
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): TrustEngineConfig {
    return { ...this.config };
  }

  /**
   * Convert Trust Engine response to TrustScore
   */
  private convertToTrustScore(
    entityId: string,
    data: NonNullable<TrustEngineResponse["data"]>
  ): TrustScore | null {
    if (data.score === undefined || data.level === undefined) {
      return null;
    }

    const factors: TrustFactor[] = (data.factors || []).map(f => ({
      type: f.type as TrustFactorType,
      name: f.type.replace(/_/g, " "),
      description: "",
      score: f.score,
      weight: f.weight || 0.1,
      contribution: (f.score * (f.weight || 0.1)) / 100,
      lastUpdated: new Date().toISOString(),
      evidence: []
    }));

    return {
      entityId,
      entityType: EntityType.AGENT,
      score: data.score,
      level: data.level,
      factors,
      totalWeight: factors.reduce((sum, f) => sum + f.weight, 0),
      confidence: 80,
      calculatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Format error message
   */
  private formatError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return `Trust Engine error: ${error.response.status} - ${error.response.data?.message || error.message}`;
      }
      if (error.request) {
        return "Trust Engine unreachable";
      }
      return error.message;
    }
    return String(error);
  }

  /**
   * Retry wrapper for API calls
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.config.retries
  ): Promise<T> {
    let lastError: unknown;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError;
  }
}

export default TrustEngineIntegrationService;
