/**
 * SUTAR Agent ID Service - Auth Service
 * Authentication and token management for agents
 */

import { v4 as uuidv4 } from "uuid";
import {
  AuthToken,
  AuthTokenType,
  Agent,
  AgentAuthRequest,
  AgentAuthResponse,
  AgentStatus,
  VerificationStatus,
} from "../types/index.js";
import { storageService } from "./storage.service.js";
import { agentService } from "./agent.service.js";

export interface TokenGenerationOptions {
  type: AuthTokenType;
  scope?: string[];
  expiresIn?: number; // milliseconds
}

export interface TokenValidationResult {
  valid: boolean;
  token?: AuthToken;
  agent?: Agent;
  error?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RevokeTokenRequest {
  tokenId?: string;
  agentId: string;
  allTokens?: boolean;
}

export class AuthService {
  private readonly DEFAULT_ACCESS_TOKEN_TTL = 3600000; // 1 hour
  private readonly DEFAULT_REFRESH_TOKEN_TTL = 604800000; // 7 days
  private readonly MAX_TOKENS_PER_AGENT = 10;

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  async authenticate(request: AgentAuthRequest): Promise<AgentAuthResponse | null> {
    const startTime = Date.now();

    try {
      let agent: Agent | null = null;

      switch (request.method) {
        case "api_key":
          agent = await this.authenticateWithApiKey(request.credentials.apiKey!);
          break;
        case "password":
          agent = await this.authenticateWithPassword(request.credentials.password!);
          break;
        case "oauth":
          agent = await this.authenticateWithOAuth(request.credentials.oauthToken!);
          break;
        case "token":
          agent = await this.authenticateWithRefreshToken(request.credentials.refreshToken!);
          break;
        default:
          console.error(`[AuthService] Unknown authentication method: ${request.method}`);
          return null;
      }

      if (!agent) {
        console.log(`[AuthService] Authentication failed - invalid credentials`);
        return null;
      }

      // Check agent status
      if (agent.status !== AgentStatus.ACTIVE) {
        console.log(`[AuthService] Authentication failed - agent not active (status: ${agent.status})`);
        return null;
      }

      // Check verification status
      if (agent.verification.status !== VerificationStatus.VERIFIED) {
        console.log(`[AuthService] Authentication failed - agent not verified`);
        return null;
      }

      // Generate tokens
      const accessToken = await this.generateToken(agent.id, {
        type: AuthTokenType.ACCESS,
        scope: request.scope,
        expiresIn: this.DEFAULT_ACCESS_TOKEN_TTL,
      });

      const refreshToken = await this.generateToken(agent.id, {
        type: AuthTokenType.REFRESH,
        scope: request.scope,
        expiresIn: this.DEFAULT_REFRESH_TOKEN_TTL,
      });

      // Record activity
      await agentService.recordActivity(agent.id, "authentication", {
        method: request.method,
      });

      const duration = Date.now() - startTime;
      console.log(`[AuthService] Agent ${agent.agentId} authenticated in ${duration}ms`);

      return {
        accessToken: accessToken.token,
        refreshToken: refreshToken.token,
        expiresIn: this.DEFAULT_ACCESS_TOKEN_TTL / 1000,
        tokenType: "Bearer",
        scope: accessToken.scope,
      };
    } catch (error) {
      console.error(`[AuthService] Authentication error:`, error);
      return null;
    }
  }

  async authenticateWithApiKey(apiKey: string): Promise<Agent | null> {
    return agentService.getAgentByApiKey(apiKey);
  }

  async authenticateWithPassword(password: string): Promise<Agent | null> {
    // Password-based auth would typically involve a lookup
    // For now, return null as we don't have password storage
    console.log(`[AuthService] Password authentication not implemented`);
    return null;
  }

  async authenticateWithOAuth(oauthToken: string): Promise<Agent | null> {
    // OAuth authentication would verify the token with an OAuth provider
    // For now, return null as we don't have OAuth integration
    console.log(`[AuthService] OAuth authentication not implemented`);
    return null;
  }

  async authenticateWithRefreshToken(refreshToken: string): Promise<Agent | null> {
    const tokenHash = this.hashToken(refreshToken);
    const token = await storageService.getTokenByHash(tokenHash);

    if (!token) {
      return null;
    }

    if (!token.isActive) {
      return null;
    }

    if (token.type !== AuthTokenType.REFRESH) {
      return null;
    }

    if (new Date(token.expiresAt) < new Date()) {
      return null;
    }

    return agentService.getAgent(token.agentId);
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  async generateToken(agentId: string, options: TokenGenerationOptions): Promise<AuthToken> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (options.expiresIn || this.DEFAULT_ACCESS_TOKEN_TTL));

    const tokenId = uuidv4();
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);

    const token: AuthToken = {
      id: tokenId,
      agentId,
      type: options.type,
      token: rawToken,
      tokenHash,
      scope: options.scope || [],
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      isActive: true,
    };

    await storageService.setToken(token);

    // Cleanup old tokens if over limit
    await this.cleanupOldTokens(agentId);

    return token;
  }

  async validateToken(token: string): Promise<TokenValidationResult> {
    const tokenHash = this.hashToken(token);
    const storedToken = await storageService.getTokenByHash(tokenHash);

    if (!storedToken) {
      return { valid: false, error: "Token not found" };
    }

    if (!storedToken.isActive) {
      return { valid: false, error: "Token has been revoked" };
    }

    if (new Date(storedToken.expiresAt) < new Date()) {
      return { valid: false, error: "Token has expired" };
    }

    const agent = await agentService.getAgent(storedToken.agentId);

    if (!agent) {
      return { valid: false, error: "Agent not found" };
    }

    if (agent.status !== AgentStatus.ACTIVE) {
      return { valid: false, error: "Agent is not active" };
    }

    // Update last used timestamp
    await storageService.updateToken(storedToken.id, {
      lastUsedAt: new Date().toISOString(),
    });

    return {
      valid: true,
      token: storedToken,
      agent,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AgentAuthResponse | null> {
    const validation = await this.validateToken(refreshToken);

    if (!validation.valid || validation.token?.type !== AuthTokenType.REFRESH) {
      return null;
    }

    const agent = validation.agent!;

    // Revoke the old refresh token
    await this.revokeToken(validation.token!.id);

    // Generate new tokens
    const accessToken = await this.generateToken(agent.id, {
      type: AuthTokenType.ACCESS,
      expiresIn: this.DEFAULT_ACCESS_TOKEN_TTL,
    });

    const newRefreshToken = await this.generateToken(agent.id, {
      type: AuthTokenType.REFRESH,
      expiresIn: this.DEFAULT_REFRESH_TOKEN_TTL,
    });

    return {
      accessToken: accessToken.token,
      refreshToken: newRefreshToken.token,
      expiresIn: this.DEFAULT_ACCESS_TOKEN_TTL / 1000,
      tokenType: "Bearer",
      scope: accessToken.scope,
    };
  }

  async revokeToken(tokenId: string): Promise<boolean> {
    const token = await storageService.getToken(tokenId);

    if (!token) {
      return false;
    }

    return storageService.deleteToken(tokenId);
  }

  async revokeAllTokens(agentId: string): Promise<number> {
    return storageService.deleteTokensByAgent(agentId);
  }

  async getActiveTokens(agentId: string): Promise<AuthToken[]> {
    const tokens = await storageService.getTokensByAgent(agentId);
    return tokens.filter(t => t.isActive && new Date(t.expiresAt) > new Date());
  }

  // ============================================================================
  // API Key Management
  // ============================================================================

  async regenerateApiKey(agentId: string): Promise<string | null> {
    const agent = await agentService.getAgent(agentId);

    if (!agent) {
      return null;
    }

    const newApiKey = this.generateRawApiKey();
    const newApiKeyHash = this.hashToken(newApiKey);

    await storageService.updateAgent(agentId, {
      apiKeyHash: newApiKeyHash,
    });

    return newApiKey;
  }

  async revokeApiKey(agentId: string): Promise<boolean> {
    const agent = await agentService.getAgent(agentId);

    if (!agent) {
      return false;
    }

    await storageService.updateAgent(agentId, {
      apiKeyHash: undefined,
    });

    return true;
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  async createSession(agentId: string, metadata?: Record<string, unknown>): Promise<AuthToken | null> {
    const agent = await agentService.getAgent(agentId);

    if (!agent) {
      return null;
    }

    if (agent.status !== AgentStatus.ACTIVE) {
      return null;
    }

    return this.generateToken(agentId, {
      type: AuthTokenType.SESSION,
      scope: [],
      expiresIn: this.DEFAULT_ACCESS_TOKEN_TTL,
    });
  }

  async getSession(token: string): Promise<{
    session: AuthToken;
    agent: Agent;
  } | null> {
    const validation = await this.validateToken(token);

    if (!validation.valid || validation.token?.type !== AuthTokenType.SESSION) {
      return null;
    }

    return {
      session: validation.token!,
      agent: validation.agent!,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateRawToken(): string {
    const timestamp = Date.now().toString(36);
    const random = Array.from({ length: 48 }, () =>
      Math.random().toString(36).charAt(2)
    ).join("");
    return `tok_${timestamp}_${random}`;
  }

  private generateRawApiKey(): string {
    const prefix = "skt";
    const timestamp = Date.now().toString(36);
    const random = Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2)
    ).join("");
    return `${prefix}_${timestamp}_${random}`;
  }

  private hashToken(token: string): string {
    // Simple hash for demo - in production use proper crypto (bcrypt, argon2, etc.)
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private async cleanupOldTokens(agentId: string): Promise<void> {
    const tokens = await storageService.getTokensByAgent(agentId);

    if (tokens.length > this.MAX_TOKENS_PER_AGENT) {
      // Sort by creation date, oldest first
      tokens.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // Remove oldest tokens until under limit
      const toRemove = tokens.slice(0, tokens.length - this.MAX_TOKENS_PER_AGENT);
      for (const token of toRemove) {
        await storageService.deleteToken(token.id);
      }
    }
  }

  // ============================================================================
  // Token Statistics
  // ============================================================================

  async getTokenStats(agentId: string): Promise<{
    total: number;
    active: number;
    expired: number;
    byType: Record<AuthTokenType, number>;
  }> {
    const tokens = await storageService.getTokensByAgent(agentId);
    const now = new Date();

    const stats = {
      total: tokens.length,
      active: 0,
      expired: 0,
      byType: {} as Record<AuthTokenType, number>,
    };

    for (const type of Object.values(AuthTokenType)) {
      stats.byType[type] = 0;
    }

    for (const token of tokens) {
      stats.byType[token.type]++;

      if (token.isActive && new Date(token.expiresAt) > now) {
        stats.active++;
      } else {
        stats.expired++;
      }
    }

    return stats;
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  async revokeExpiredTokens(): Promise<number> {
    const agents = await agentService.getAllAgents();
    let revokedCount = 0;

    for (const agent of agents) {
      const tokens = await storageService.getTokensByAgent(agent.id);
      const now = new Date();

      for (const token of tokens) {
        if (token.isActive && new Date(token.expiresAt) < now) {
          await storageService.updateToken(token.id, { isActive: false });
          revokedCount++;
        }
      }
    }

    return revokedCount;
  }

  async cleanupInactiveSessions(maxAge: number = 86400000): Promise<number> {
    const agents = await agentService.getAllAgents();
    let cleanedCount = 0;
    const cutoff = new Date(Date.now() - maxAge);

    for (const agent of agents) {
      const tokens = await storageService.getTokensByAgent(agent.id);

      for (const token of tokens) {
        if (token.type === AuthTokenType.SESSION && token.isActive) {
          if (token.lastUsedAt && new Date(token.lastUsedAt) < cutoff) {
            await storageService.deleteToken(token.id);
            cleanedCount++;
          }
        }
      }
    }

    return cleanedCount;
  }
}

// Singleton instance
export const authService = new AuthService();
