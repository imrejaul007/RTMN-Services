/**
 * SUTAR Agent ID Service - Verification Service
 * Agent credential and identity verification
 */

import { v4 as uuidv4 } from "uuid";
import {
  VerificationStatus,
  Agent,
  AgentStatus,
  AgentVerification,
  AgentVerificationRequest,
  AgentVerificationResponse,
  IdentityEvent,
  IdentityEventType,
} from "../types/index.js";
import { storageService } from "./storage.service.js";
import { agentService } from "./agent.service.js";

export interface VerificationChallenge {
  id: string;
  agentId: string;
  method: VerificationMethod;
  challenge: string;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  createdAt: string;
}

export type VerificationMethod = "email" | "phone" | "api_key" | "oauth" | "manual" | "sms" | "totp";

export interface VerificationResult {
  success: boolean;
  verificationStatus: VerificationStatus;
  message: string;
  verifiedAt?: string;
}

export interface VerificationPolicy {
  requireVerification: boolean;
  verificationMethods: VerificationMethod[];
  verificationTimeout: number; // milliseconds
  maxAttempts: number;
  autoVerifyDomains?: string[];
  blockedDomains?: string[];
}

export class VerificationService {
  private challenges: Map<string, VerificationChallenge> = new Map();
  private readonly DEFAULT_VERIFICATION_TIMEOUT = 3600000; // 1 hour
  private readonly DEFAULT_MAX_ATTEMPTS = 3;

  // Default verification policy
  private verificationPolicy: VerificationPolicy = {
    requireVerification: true,
    verificationMethods: ["email", "api_key", "manual"],
    verificationTimeout: this.DEFAULT_VERIFICATION_TIMEOUT,
    maxAttempts: this.DEFAULT_MAX_ATTEMPTS,
  };

  // ============================================================================
  // Agent Verification
  // ============================================================================

  async verifyAgent(
    agentId: string,
    request: AgentVerificationRequest
  ): Promise<AgentVerificationResponse> {
    const startTime = Date.now();

    try {
      const agent = await agentService.getAgent(agentId);

      if (!agent) {
        return {
          verified: false,
          verificationStatus: VerificationStatus.REJECTED,
          message: "Agent not found",
        };
      }

      // Check if already verified
      if (agent.verification.status === VerificationStatus.VERIFIED) {
        return {
          verified: true,
          verificationStatus: VerificationStatus.VERIFIED,
          message: "Agent is already verified",
        };
      }

      // Perform verification based on method
      let result: VerificationResult;

      switch (request.verificationMethod) {
        case "email":
          result = await this.verifyByEmail(agent, request.verificationToken);
          break;
        case "phone":
          result = await this.verifyByPhone(agent, request.verificationToken);
          break;
        case "api_key":
          result = await this.verifyByApiKey(agent, request.proof);
          break;
        case "oauth":
          result = await this.verifyByOAuth(agent, request.verificationToken);
          break;
        case "manual":
          result = await this.verifyManually(agent, request.proof);
          break;
        default:
          result = {
            success: false,
            verificationStatus: VerificationStatus.REJECTED,
            message: `Unsupported verification method: ${request.verificationMethod}`,
          };
      }

      // Update agent verification status if successful
      if (result.success) {
        await this.updateAgentVerificationStatus(agentId, {
          status: result.verificationStatus,
          verifiedAt: result.verifiedAt || new Date().toISOString(),
          verifiedBy: request.verificationMethod,
        });

        // Activate the agent
        await agentService.activateAgent(agentId);

        // Create verification event
        await this.createVerificationEvent(agentId, {
          method: request.verificationMethod,
          status: "success",
        });
      }

      const duration = Date.now() - startTime;
      console.log(`[VerificationService] Verified agent ${agentId} in ${duration}ms`);

      return {
        verified: result.success,
        verificationStatus: result.verificationStatus,
        message: result.message,
      };
    } catch (error) {
      console.error(`[VerificationService] Verification error:`, error);
      return {
        verified: false,
        verificationStatus: VerificationStatus.REJECTED,
        message: "Verification failed due to internal error",
      };
    }
  }

  async verifyByEmail(agent: Agent, token?: string): Promise<VerificationResult> {
    if (!token) {
      return {
        success: false,
        verificationStatus: VerificationStatus.PENDING,
        message: "Verification token required",
      };
    }

    // Validate email format
    if (!agent.metadata.email || !this.isValidEmail(agent.metadata.email)) {
      return {
        success: false,
        verificationStatus: VerificationStatus.REJECTED,
        message: "Valid email address required for email verification",
      };
    }

    // Check if domain is blocked
    if (this.isBlockedDomain(agent.metadata.email)) {
      return {
        success: false,
        verificationStatus: VerificationStatus.REJECTED,
        message: "Email domain is blocked",
      };
    }

    // In a real implementation, we would:
    // 1. Generate a verification token and send email
    // 2. Store the token and validate it here
    // For demo, we accept any token that starts with "verify_"
    if (token.startsWith("verify_")) {
      return {
        success: true,
        verificationStatus: VerificationStatus.VERIFIED,
        message: "Email verification successful",
        verifiedAt: new Date().toISOString(),
      };
    }

    return {
      success: false,
      verificationStatus: VerificationStatus.PENDING,
      message: "Invalid verification token",
    };
  }

  async verifyByPhone(agent: Agent, token?: string): Promise<VerificationResult> {
    if (!token) {
      return {
        success: false,
        verificationStatus: VerificationStatus.PENDING,
        message: "Verification code required",
      };
    }

    if (!agent.metadata.phone) {
      return {
        success: false,
        verificationStatus: VerificationStatus.REJECTED,
        message: "Phone number required for phone verification",
      };
    }

    // In a real implementation, we would validate SMS OTP
    // For demo, we accept any code that is 6 digits
    if (/^\d{6}$/.test(token)) {
      return {
        success: true,
        verificationStatus: VerificationStatus.VERIFIED,
        message: "Phone verification successful",
        verifiedAt: new Date().toISOString(),
      };
    }

    return {
      success: false,
      verificationStatus: VerificationStatus.PENDING,
      message: "Invalid verification code",
    };
  }

  async verifyByApiKey(agent: Agent, apiKey?: string): Promise<VerificationResult> {
    if (!apiKey) {
      return {
        success: false,
        verificationStatus: VerificationStatus.REJECTED,
        message: "API key required for verification",
      };
    }

    // Validate API key
    const verifiedAgent = await agentService.getAgentByApiKey(apiKey);

    if (verifiedAgent && verifiedAgent.id === agent.id) {
      return {
        success: true,
        verificationStatus: VerificationStatus.VERIFIED,
        message: "API key verification successful",
        verifiedAt: new Date().toISOString(),
      };
    }

    return {
      success: false,
      verificationStatus: VerificationStatus.REJECTED,
      message: "Invalid API key",
    };
  }

  async verifyByOAuth(agent: Agent, oauthToken?: string): Promise<VerificationResult> {
    if (!oauthToken) {
      return {
        success: false,
        verificationStatus: VerificationStatus.REJECTED,
        message: "OAuth token required for verification",
      };
    }

    // In a real implementation, we would validate with OAuth provider
    // For demo, we accept any token that starts with "oauth_"
    if (oauthToken.startsWith("oauth_")) {
      return {
        success: true,
        verificationStatus: VerificationStatus.VERIFIED,
        message: "OAuth verification successful",
        verifiedAt: new Date().toISOString(),
      };
    }

    return {
      success: false,
      verificationStatus: VerificationStatus.REJECTED,
      message: "Invalid OAuth token",
    };
  }

  async verifyManually(agent: Agent, proof?: string): Promise<VerificationResult> {
    if (!proof) {
      return {
        success: false,
        verificationStatus: VerificationStatus.PENDING,
        message: "Manual verification proof required",
      };
    }

    // Manual verification typically requires admin approval
    // For demo, we accept proof that is not empty
    if (proof && proof.length >= 10) {
      return {
        success: true,
        verificationStatus: VerificationStatus.VERIFIED,
        message: "Manual verification successful",
        verifiedAt: new Date().toISOString(),
      };
    }

    return {
      success: false,
      verificationStatus: VerificationStatus.PENDING,
      message: "Insufficient verification proof",
    };
  }

  // ============================================================================
  // Verification Challenge Management
  // ============================================================================

  async createChallenge(agentId: string, method: VerificationMethod): Promise<VerificationChallenge | null> {
    const agent = await agentService.getAgent(agentId);

    if (!agent) {
      return null;
    }

    // Check if challenge already exists
    const existingChallenge = Array.from(this.challenges.values()).find(
      c => c.agentId === agentId && c.method === method && !c.verified
    );

    if (existingChallenge) {
      // Check if existing challenge is still valid
      if (new Date(existingChallenge.expiresAt) > new Date()) {
        return existingChallenge;
      }
    }

    const challenge: VerificationChallenge = {
      id: uuidv4(),
      agentId,
      method,
      challenge: this.generateChallenge(),
      expiresAt: new Date(Date.now() + this.verificationPolicy.verificationTimeout).toISOString(),
      attempts: 0,
      maxAttempts: this.verificationPolicy.maxAttempts,
      verified: false,
      createdAt: new Date().toISOString(),
    };

    this.challenges.set(challenge.id, challenge);

    // In a real implementation, send the challenge via the specified method
    console.log(`[VerificationService] Created ${method} challenge for agent ${agentId}: ${challenge.challenge}`);

    return challenge;
  }

  async validateChallenge(challengeId: string, response: string): Promise<VerificationResult> {
    const challenge = this.challenges.get(challengeId);

    if (!challenge) {
      return {
        success: false,
        verificationStatus: VerificationStatus.REJECTED,
        message: "Challenge not found",
      };
    }

    if (challenge.verified) {
      return {
        success: false,
        verificationStatus: VerificationStatus.REJECTED,
        message: "Challenge already verified",
      };
    }

    if (new Date(challenge.expiresAt) < new Date()) {
      return {
        success: false,
        verificationStatus: VerificationStatus.EXPIRED,
        message: "Challenge has expired",
      };
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      return {
        success: false,
        verificationStatus: VerificationStatus.REJECTED,
        message: "Maximum verification attempts exceeded",
      };
    }

    // Increment attempts
    challenge.attempts++;

    // Validate response
    if (response === challenge.challenge) {
      challenge.verified = true;

      // Verify the agent - map method to supported type
      const methodMap: Record<string, "email" | "phone" | "api_key" | "oauth" | "manual"> = {
        email: "email",
        phone: "phone",
        api_key: "api_key",
        oauth: "oauth",
        manual: "manual",
        sms: "phone",
        totp: "api_key",
      };
      const mappedMethod = methodMap[challenge.method] || "manual";

      const result = await this.verifyAgent(challenge.agentId, {
        verificationMethod: mappedMethod,
        verificationToken: response,
      });

      return {
        success: result.verified,
        verificationStatus: result.verificationStatus,
        message: result.message,
      };
    }

    return {
      success: false,
      verificationStatus: VerificationStatus.PENDING,
      message: `Invalid response (${challenge.maxAttempts - challenge.attempts} attempts remaining)`,
    };
  }

  async getChallenge(challengeId: string): Promise<VerificationChallenge | null> {
    return this.challenges.get(challengeId) || null;
  }

  async cancelChallenge(challengeId: string): Promise<boolean> {
    return this.challenges.delete(challengeId);
  }

  // ============================================================================
  // Verification Status
  // ============================================================================

  async getVerificationStatus(agentId: string): Promise<AgentVerification | null> {
    const agent = await agentService.getAgent(agentId);

    if (!agent) {
      return null;
    }

    return agent.verification;
  }

  async updateVerificationStatus(agentId: string, status: VerificationStatus): Promise<boolean> {
    const agent = await agentService.getAgent(agentId);

    if (!agent) {
      return false;
    }

    await storageService.updateAgent(agentId, {
      verification: {
        ...agent.verification,
        status,
      },
    });

    return true;
  }

  async requestReverification(agentId: string, method: VerificationMethod): Promise<{
    success: boolean;
    challenge?: VerificationChallenge;
    message: string;
  }> {
    const agent = await agentService.getAgent(agentId);

    if (!agent) {
      return {
        success: false,
        message: "Agent not found",
      };
    }

    const challenge = await this.createChallenge(agentId, method);

    if (!challenge) {
      return {
        success: false,
        message: "Failed to create verification challenge",
      };
    }

    return {
      success: true,
      challenge,
      message: `Verification challenge sent via ${method}`,
    };
  }

  // ============================================================================
  // Verification Policy Management
  // ============================================================================

  getVerificationPolicy(): VerificationPolicy {
    return { ...this.verificationPolicy };
  }

  updateVerificationPolicy(policy: Partial<VerificationPolicy>): void {
    this.verificationPolicy = {
      ...this.verificationPolicy,
      ...policy,
    };
    console.log(`[VerificationService] Updated verification policy`);
  }

  // ============================================================================
  // Verification Statistics
  // ============================================================================

  async getVerificationStats(): Promise<{
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    expired: number;
    unverified: number;
    verificationRate: number;
    byMethod: Record<string, number>;
  }> {
    const agents = await agentService.getAllAgents();

    const stats = {
      total: agents.length,
      verified: 0,
      pending: 0,
      rejected: 0,
      expired: 0,
      unverified: 0,
      verificationRate: 0,
      byMethod: {} as Record<string, number>,
    };

    for (const agent of agents) {
      const status = agent.verification.status;
      stats[status]++;
      if (agent.verification.verifiedBy) {
        stats.byMethod[agent.verification.verifiedBy] = (stats.byMethod[agent.verification.verifiedBy] || 0) + 1;
      }
    }

    if (stats.total > 0) {
      stats.verificationRate = (stats.verified / stats.total) * 100;
    }

    return stats;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateChallenge(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `vfy_${timestamp}_${random}`;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isBlockedDomain(email: string): boolean {
    if (!this.verificationPolicy.blockedDomains) {
      return false;
    }
    const domain = email.split("@")[1];
    return this.verificationPolicy.blockedDomains.includes(domain);
  }

  private async updateAgentVerificationStatus(
    agentId: string,
    updates: Partial<AgentVerification>
  ): Promise<void> {
    const agent = await agentService.getAgent(agentId);

    if (!agent) {
      return;
    }

    const updatedVerification: AgentVerification = {
      ...agent.verification,
      ...updates,
    };

    await storageService.updateAgent(agentId, {
      verification: updatedVerification,
    });
  }

  private async createVerificationEvent(
    agentId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const event: IdentityEvent = {
      id: uuidv4(),
      type: IdentityEventType.AGENT_VERIFIED,
      agentId,
      data,
      timestamp: new Date().toISOString(),
    };

    await storageService.addEvent(event);
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  cleanupExpiredChallenges(): number {
    const now = new Date();
    let count = 0;

    for (const [id, challenge] of this.challenges.entries()) {
      if (new Date(challenge.expiresAt) < now || challenge.attempts >= challenge.maxAttempts) {
        this.challenges.delete(id);
        count++;
      }
    }

    if (count > 0) {
      console.log(`[VerificationService] Cleaned up ${count} expired challenges`);
    }

    return count;
  }

  // Start periodic cleanup
  constructor() {
    setInterval(() => this.cleanupExpiredChallenges(), 60000);
  }
}

// Singleton instance
export const verificationService = new VerificationService();
