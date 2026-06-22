// ============================================================================
// SUTAR Identity OS - Trust Engine Service
// ============================================================================

import { TrustEngineResponse } from "../types/index.js";
import { logger } from "../utils/logger.js";

const TRUST_ENGINE_URL = process.env.TRUST_ENGINE_URL || "http://localhost:4180";

interface TrustEngineRequest {
  identityId: string;
  entityType: string;
  verificationType: string;
  kycLevel: string;
  documents?: Array<{
    type: string;
    documentNumber: string;
    verified: boolean;
  }>;
  metadata?: Record<string, unknown>;
}

export class TrustEngineService {
  private timeout: number;

  constructor(timeout: number = 10000) {
    this.timeout = timeout;
  }

  // Evaluate trust score for an identity
  async evaluateTrust(request: TrustEngineRequest): Promise<TrustEngineResponse> {
    try {
      logger.info("TrustEngineService", `Evaluating trust for identity: ${request.identityId}`);

      const response = await fetch(`${TRUST_ENGINE_URL}/api/v1/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Trust Engine returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as TrustEngineResponse;
      logger.info("TrustEngineService", `Trust evaluation complete for ${request.identityId}: score=${data.trustScore}`);

      return data;
    } catch (error) {
      logger.warn("TrustEngineService", `Trust Engine unavailable, using fallback: ${error}`);

      // Return a fallback response when Trust Engine is unavailable
      return this.getFallbackResponse(request);
    }
  }

  // Check document authenticity via Trust Engine
  async verifyDocument(
    documentType: string,
    documentNumber: string,
    metadata?: Record<string, unknown>
  ): Promise<{
    valid: boolean;
    score: number;
    checks: Record<string, boolean>;
    recommendations: string[];
  }> {
    try {
      const response = await fetch(`${TRUST_ENGINE_URL}/api/v1/documents/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: documentType,
          number: documentNumber,
          metadata,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Document verification failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.warn("TrustEngineService", `Document verification fallback: ${error}`);

      // Fallback: assume document is valid but with lower confidence
      return {
        valid: true,
        score: 0.7,
        checks: {
          format: true,
          checksum: true,
        },
        recommendations: ["Manual review recommended when Trust Engine is unavailable"],
      };
    }
  }

  // Get risk assessment
  async getRiskAssessment(identityId: string, context?: Record<string, unknown>): Promise<{
    riskLevel: "low" | "medium" | "high" | "critical";
    factors: Record<string, unknown>;
    recommendations: string[];
  }> {
    try {
      const response = await fetch(`${TRUST_ENGINE_URL}/api/v1/risk/${identityId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(context ?? {}),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Risk assessment failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.warn("TrustEngineService", `Risk assessment fallback: ${error}`);

      // Conservative fallback risk assessment
      return {
        riskLevel: "medium",
        factors: {
          source: "fallback",
          reason: "Trust Engine unavailable",
        },
        recommendations: ["Manual review required when Trust Engine is unavailable"],
      };
    }
  }

  // Generate trust badge based on score
  getTrustBadge(trustScore: number): {
    badge: string;
    color: string;
    level: number;
  } {
    if (trustScore >= 0.9) {
      return { badge: "trusted", color: "#10b981", level: 5 };
    } else if (trustScore >= 0.75) {
      return { badge: "premium", color: "#3b82f6", level: 4 };
    } else if (trustScore >= 0.5) {
      return { badge: "standard", color: "#6366f1", level: 3 };
    } else if (trustScore >= 0.25) {
      return { badge: "basic", color: "#f59e0b", level: 2 };
    } else {
      return { badge: "unverified", color: "#6b7280", level: 1 };
    }
  }

  // Calculate risk score based on KYC data
  calculateRiskScore(
    kycLevel: string,
    documentsVerified: number,
    totalDocuments: number,
    faceMatchVerified: boolean,
    biometricVerified: boolean
  ): number {
    let score = 0;

    // KYC level contribution (40%)
    const kycWeights: Record<string, number> = {
      basic: 0.25,
      standard: 0.5,
      enhanced: 0.75,
      premium: 1.0,
    };
    score += (kycWeights[kycLevel] ?? 0) * 0.4;

    // Document verification (30%)
    if (totalDocuments > 0) {
      const docRatio = documentsVerified / totalDocuments;
      score += docRatio * 0.3;
    }

    // Face match (15%)
    if (faceMatchVerified) {
      score += 0.15;
    }

    // Biometric verification (15%)
    if (biometricVerified) {
      score += 0.15;
    }

    return Math.min(1, Math.max(0, score));
  }

  // Fallback response when Trust Engine is unavailable
  private getFallbackResponse(request: TrustEngineRequest): TrustEngineResponse {
    const kycWeights: Record<string, number> = {
      basic: 0.25,
      standard: 0.5,
      enhanced: 0.75,
      premium: 1.0,
    };

    const baseScore = kycWeights[request.kycLevel] ?? 0.5;
    const trustScore = baseScore * 0.8; // 80% of max when using fallback

    return {
      trustScore,
      riskLevel: trustScore >= 0.7 ? "low" : trustScore >= 0.4 ? "medium" : "high",
      factors: {
        source: "fallback",
        kycLevel: request.kycLevel,
        entityType: request.entityType,
      },
      recommendations: [
        "Complete full KYC verification for accurate trust score",
        "Enable MFA for improved account security",
        "Submit additional documents for higher trust level",
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // Health check for Trust Engine
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${TRUST_ENGINE_URL}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const trustEngineService = new TrustEngineService();