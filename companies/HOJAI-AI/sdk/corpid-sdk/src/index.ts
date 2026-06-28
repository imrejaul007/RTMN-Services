/**
 * CorpID SDK - Universal Identity OS for JavaScript/TypeScript
 *
 * @example
 * ```typescript
 * import { CorpID } from '@hojai/corpid-sdk';
 *
 * const client = new CorpID({
 *   baseUrl: 'http://localhost:4702',
 *   apiKey: 'your-api-key'
 * });
 *
 * // Register user
 * const user = await client.users.create({
 *   email: 'alice@example.com',
 *   name: 'Alice Smith',
 *   password: 'secure-password'
 * });
 *
 * // Create agent
 * const agent = await client.agents.create({
 *   name: 'sales-bot',
 *   permissions: ['leads:read', 'orders:write'],
 *   budget: { monthly: 50000 }
 * });
 * ```
 */

import type { RequestInit } from 'node-fetch';

// ============================================================================
// Types
// ============================================================================

export interface CorpIDConfig {
  /** Base URL of CorpID service (default: http://localhost:4702) */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** JWT access token (alternative to apiKey) */
  accessToken?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'manager' | 'user';
  businessId?: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role?: 'superadmin' | 'admin' | 'manager' | 'user';
  businessId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface MFAStatus {
  enabled: boolean;
  backupCodesRemaining?: number;
}

export interface MFASetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

// Agent types
export interface Agent {
  agentId: string;
  name: string;
  description?: string;
  ownerId: string;
  businessId?: string;
  permissions: string[];
  scopes: string[];
  budget: {
    monthly: number;
    spent: number;
    currency: string;
  };
  status: 'active' | 'suspended' | 'revoked' | 'pending';
  trustScore: number;
  trustLevel: string;
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  model?: string;
  provider?: string;
  permissions?: string[];
  scopes?: string[];
  budget?: {
    monthly: number;
    currency?: string;
  };
  capabilities?: string[];
  tags?: string[];
}

export interface AgentBudget {
  monthly: number;
  spent: number;
  currency: string;
}

// Workload types
export interface WorkloadIdentity {
  workloadId: string;
  type: 'container' | 'cron' | 'ci-cd' | 'api-gateway' | 'etl' | 'workflow' | 'lambda' | 'service';
  name: string;
  ownerId: string;
  scopes: string[];
  status: 'active' | 'suspended' | 'rotated' | 'decommissioned';
  credentials: {
    keyId: string;
    rotatedAt?: string;
    nextRotationAt?: string;
  };
  createdAt: string;
}

export interface CreateWorkloadInput {
  name: string;
  type: WorkloadIdentity['type'];
  description?: string;
  scopes: string[];
  rotationPolicy?: {
    intervalDays?: number;
    autoRotate?: boolean;
  };
  runtime?: {
    environment?: 'production' | 'staging' | 'development';
    region?: string;
  };
}

// Delegation types
export interface Delegation {
  delegationId: string;
  delegatorId: string;
  delegateId: string;
  scope: string[];
  attenuationFactor: number;
  effectiveTrustScore: number;
  expiresAt?: string;
  status: 'active' | 'expired' | 'revoked' | 'pending_approval';
  createdAt: string;
}

export interface CreateDelegationInput {
  delegateId: string;
  scope: string[];
  attenuationFactor?: number;
  expiresAt?: string;
  constraints?: {
    maxValue?: number;
    maxCallsPerDay?: number;
    allowedEntities?: string[];
    timeWindow?: { startHour: number; endHour: number };
  };
}

// Trust types
export interface TrustScore {
  corpId: string;
  score: number;
  level: 'platinum' | 'gold' | 'silver' | 'bronze' | 'iron' | 'restricted';
  dimensions?: TrustDimension[];
  lastUpdated: string;
}

export interface TrustLevels {
  [key: string]: { min: number; max: number };
}

export interface TrustDimension {
  dimension: string;
  score: number;
  level: string;
  weight: number;
  description: string;
  sources: string[];
}

// Timeline types
export interface TimelineEntry {
  id: string;
  entityId: string;
  eventType: string;
  title: string;
  description?: string;
  icon?: string;
  category: string;
  impact: 'positive' | 'negative' | 'neutral';
  timestamp: string;
  actor?: string;
}

export interface TimelineSummary {
  entityId: string;
  period: string;
  totalEvents: number;
  categories: Record<string, number>;
  mostActiveDay?: string;
  lastActivity?: string;
  highlights: string[];
  riskIndicators: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
}

// Webhook types
export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  createdAt: string;
}

export interface CreateWebhookInput {
  url: string;
  events: string[];
  secret?: string;
}

// Relationship types
export interface RelationshipNode {
  nodeId: string;
  entityType: string;
  entityId: string;
  properties: Record<string, any>;
}

export interface RelationshipEdge {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
  properties?: Record<string, any>;
}

// ============================================================================
// CorpID Client
// ============================================================================

export class CorpID {
  private baseUrl: string;
  private apiKey?: string;
  private accessToken?: string;
  private timeout: number;

  constructor(config: CorpIDConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:4702';
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
    this.timeout = config.timeout || 30000;
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new CorpIDError(data.error || data.message || `HTTP ${response.status}`, response.status);
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new CorpIDError(`Request timeout after ${this.timeout}ms`, 408);
      }
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------

  /**
   * Register a new user
   */
  async register(input: CreateUserInput): Promise<User> {
    const data = await this.request<{ user: User }>('POST', '/auth/register', input);
    return data.user;
  }

  /**
   * Login with email and password
   */
  async login(input: LoginInput): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>('POST', '/auth/login', input);
    this.accessToken = data.accessToken;
    return data;
  }

  /**
   * Login with MFA verification
   */
  async loginWithMFA(mfaToken: string, code: string): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>('POST', '/auth/mfa-verify', {
      mfaToken,
      code,
    });
    this.accessToken = data.accessToken;
    return data;
  }

  /**
   * Refresh access token
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const data = await this.request<{ accessToken: string; expiresIn: number }>(
      'POST',
      '/auth/refresh',
      { refreshToken }
    );
    this.accessToken = data.accessToken;
    return data;
  }

  /**
   * Logout (invalidate tokens)
   */
  async logout(): Promise<void> {
    await this.request('POST', '/auth/logout');
    this.accessToken = undefined;
  }

  /**
   * Get current user info
   */
  async me(): Promise<User> {
    const data = await this.request<{ user: User }>('GET', '/auth/me');
    return data.user;
  }

  // --------------------------------------------------------------------------
  // MFA
  // --------------------------------------------------------------------------

  /**
   * Setup MFA for current user
   */
  async mfaSetup(): Promise<MFASetupResponse> {
    return this.request<MFASetupResponse>('POST', '/api/mfa/setup');
  }

  /**
   * Verify MFA code and enable MFA
   */
  async mfaVerify(code: string): Promise<{ enabled: boolean }> {
    return this.request<{ enabled: boolean }>('POST', '/api/mfa/verify', { code });
  }

  /**
   * Get MFA status for current user
   */
  async mfaStatus(): Promise<MFAStatus> {
    return this.request<MFAStatus>('GET', '/api/mfa/status');
  }

  /**
   * Disable MFA
   */
  async mfaDisable(password: string, code: string): Promise<{ disabled: boolean }> {
    return this.request<{ disabled: boolean }>('POST', '/api/mfa/disable', { password, code });
  }

  // --------------------------------------------------------------------------
  // Users
  // --------------------------------------------------------------------------

  /**
   * List all users (admin only)
   */
  async usersList(params?: { businessId?: string; role?: string; limit?: number }): Promise<User[]> {
    const query = new URLSearchParams();
    if (params?.businessId) query.set('businessId', params.businessId);
    if (params?.role) query.set('role', params.role);
    if (params?.limit) query.set('limit', String(params.limit));
    const path = query.toString() ? `/api/users?${query}` : '/api/users';
    const data = await this.request<{ users: User[] }>('GET', path);
    return data.users;
  }

  /**
   * Get user by ID
   */
  async userGet(id: string): Promise<User> {
    const data = await this.request<{ user: User }>('GET', `/api/users/${id}`);
    return data.user;
  }

  /**
   * Create user (admin only)
   */
  async userCreate(input: CreateUserInput): Promise<User> {
    const data = await this.request<{ user: User }>('POST', '/api/users', input);
    return data.user;
  }

  /**
   * Update user
   */
  async userUpdate(id: string, updates: Partial<User>): Promise<User> {
    const data = await this.request<{ user: User }>('PUT', `/api/users/${id}`, updates);
    return data.user;
  }

  /**
   * Delete user (admin only)
   */
  async userDelete(id: string): Promise<void> {
    await this.request('DELETE', `/api/users/${id}`);
  }

  /**
   * Get user profile
   */
  async profile(): Promise<User> {
    const data = await this.request<{ user: User }>('GET', '/api/profile');
    return data.user;
  }

  /**
   * Update profile
   */
  async profileUpdate(updates: { name?: string; email?: string }): Promise<User> {
    const data = await this.request<{ user: User }>('PUT', '/api/profile', updates);
    return data.user;
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request('PUT', '/api/profile/password', {
      currentPassword,
      newPassword,
    });
  }

  // --------------------------------------------------------------------------
  // Agents
  // --------------------------------------------------------------------------

  /**
   * List all agent capabilities
   */
  async agentCapabilities(): Promise<{ capabilities: string[] }> {
    return this.request<{ capabilities: string[] }>('GET', '/api/agents/capabilities');
  }

  /**
   * Create agent passport
   */
  async agentCreate(input: CreateAgentInput): Promise<Agent> {
    const data = await this.request<{ agent: Agent }>('POST', '/api/agents', input);
    return data.agent;
  }

  /**
   * List agents
   */
  async agentsList(params?: { ownerId?: string; status?: string }): Promise<Agent[]> {
    const query = new URLSearchParams();
    if (params?.ownerId) query.set('ownerId', params.ownerId);
    if (params?.status) query.set('status', params.status);
    const path = query.toString() ? `/api/agents?${query}` : '/api/agents';
    const data = await this.request<{ agents: Agent[] }>('GET', path);
    return data.agents;
  }

  /**
   * Get agent by ID
   */
  async agentGet(agentId: string): Promise<Agent> {
    const data = await this.request<{ agent: Agent }>('GET', `/api/agents/${agentId}`);
    return data.agent;
  }

  /**
   * Update agent
   */
  async agentUpdate(agentId: string, updates: Partial<Agent>): Promise<Agent> {
    const data = await this.request<{ agent: Agent }>('PUT', `/api/agents/${agentId}`, updates);
    return data.agent;
  }

  /**
   * Suspend agent
   */
  async agentSuspend(agentId: string, reason: string): Promise<void> {
    await this.request('POST', `/api/agents/${agentId}/suspend`, { reason });
  }

  /**
   * Resume agent
   */
  async agentResume(agentId: string): Promise<void> {
    await this.request('POST', `/api/agents/${agentId}/resume`);
  }

  /**
   * Revoke agent passport
   */
  async agentRevoke(agentId: string): Promise<void> {
    await this.request('DELETE', `/api/agents/${agentId}`);
  }

  /**
   * Get agent budget
   */
  async agentBudget(agentId: string): Promise<AgentBudget> {
    return this.request<AgentBudget>('GET', `/api/agents/${agentId}/budget`);
  }

  /**
   * Add permissions to agent
   */
  async agentAddPermissions(agentId: string, permissions: string[]): Promise<Agent> {
    const data = await this.request<{ agent: Agent }>('POST', `/api/agents/${agentId}/permissions`, {
      permissions,
    });
    return data.agent;
  }

  // --------------------------------------------------------------------------
  // Workloads
  // --------------------------------------------------------------------------

  /**
   * Register workload identity
   */
  async workloadCreate(input: CreateWorkloadInput): Promise<WorkloadIdentity> {
    const data = await this.request<{ workload: WorkloadIdentity }>('POST', '/api/workloads', input);
    return data.workload;
  }

  /**
   * List workloads
   */
  async workloadsList(): Promise<WorkloadIdentity[]> {
    const data = await this.request<{ workloads: WorkloadIdentity[] }>('GET', '/api/workloads');
    return data.workloads;
  }

  /**
   * Get workload
   */
  async workloadGet(workloadId: string): Promise<WorkloadIdentity> {
    const data = await this.request<{ workload: WorkloadIdentity }>('GET', `/api/workloads/${workloadId}`);
    return data.workload;
  }

  /**
   * Rotate workload credentials
   */
  async workloadRotate(workloadId: string): Promise<{ workloadId: string; keyId: string; nextRotationAt: string }> {
    return this.request('POST', `/api/workloads/${workloadId}/rotate`);
  }

  /**
   * Deregister workload
   */
  async workloadDelete(workloadId: string): Promise<void> {
    await this.request('DELETE', `/api/workloads/${workloadId}`);
  }

  // --------------------------------------------------------------------------
  // Delegations
  // --------------------------------------------------------------------------

  /**
   * Create delegation
   */
  async delegationCreate(input: CreateDelegationInput): Promise<Delegation> {
    const data = await this.request<{ delegation: Delegation }>('POST', '/api/delegations', input);
    return data.delegation;
  }

  /**
   * List delegations
   */
  async delegationsList(params?: { status?: string }): Promise<Delegation[]> {
    const query = params?.status ? `?status=${params.status}` : '';
    const data = await this.request<{ delegations: Delegation[] }>('GET', `/api/delegations${query}`);
    return data.delegations;
  }

  /**
   * Get my issued delegations
   */
  async delegationsIssued(params?: { status?: string }): Promise<Delegation[]> {
    const query = params?.status ? `?status=${params.status}` : '';
    const data = await this.request<{ delegations: Delegation[] }>('GET', `/api/delegations/issued${query}`);
    return data.delegations;
  }

  /**
   * Get my received delegations
   */
  async delegationsReceived(params?: { status?: string }): Promise<Delegation[]> {
    const query = params?.status ? `?status=${params.status}` : '';
    const data = await this.request<{ delegations: Delegation[] }>('GET', `/api/delegations/received${query}`);
    return data.delegations;
  }

  /**
   * Get delegation chain for entity
   */
  async delegationChain(entityId: string): Promise<{ chain: Delegation[]; chainLength: number }> {
    return this.request('GET', `/api/delegations/chain/${entityId}`);
  }

  /**
   * Approve delegation
   */
  async delegationApprove(delegationId: string): Promise<Delegation> {
    const data = await this.request<{ delegation: Delegation }>('POST', `/api/delegations/${delegationId}/approve`);
    return data.delegation;
  }

  /**
   * Reject delegation
   */
  async delegationReject(delegationId: string): Promise<Delegation> {
    const data = await this.request<{ delegation: Delegation }>('POST', `/api/delegations/${delegationId}/reject`);
    return data.delegation;
  }

  /**
   * Revoke delegation
   */
  async delegationRevoke(delegationId: string): Promise<void> {
    await this.request('DELETE', `/api/delegations/${delegationId}`);
  }

  /**
   * Check SUTAR authority
   */
  async authorityCheck(
    agentId: string,
    requiredScope: string,
    context?: { value?: number; entityId?: string }
  ): Promise<{ authorized: boolean; reason?: string; effectiveTrust?: number }> {
    return this.request('POST', '/api/delegations/check', {
      agentId,
      requiredScope,
      context,
    });
  }

  // --------------------------------------------------------------------------
  // Trust
  // --------------------------------------------------------------------------

  /**
   * Get trust score for entity
   */
  async trustScore(corpId: string): Promise<TrustScore> {
    return this.request<TrustScore>('GET', `/api/trust/score/${corpId}`);
  }

  /**
   * Get all trust dimensions for entity
   */
  async trustDimensions(corpId: string): Promise<TrustScore> {
    return this.request<TrustScore>('GET', `/api/trust/score/${corpId}/dimensions`);
  }

  /**
   * Get specific trust dimension
   */
  async trustDimension(corpId: string, dimension: string): Promise<TrustDimension> {
    return this.request<TrustDimension>('GET', `/api/trust/score/${corpId}/dimensions/${dimension}`);
  }

  /**
   * Get trust levels
   */
  async trustLevels(): Promise<TrustLevels> {
    const data = await this.request<{ levels: TrustLevels }>(
      'GET',
      '/api/trust/levels'
    );
    return data.levels;
  }

  // --------------------------------------------------------------------------
  // Timeline
  // --------------------------------------------------------------------------

  /**
   * Get timeline for entity
   */
  async timeline(
    entityId: string,
    params?: { category?: string; from?: string; to?: string; limit?: number }
  ): Promise<TimelineEntry[]> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.limit) query.set('limit', String(params.limit));
    const path = query.toString() ? `/api/timeline/${entityId}?${query}` : `/api/timeline/${entityId}`;
    const data = await this.request<{ timeline: TimelineEntry[] }>('GET', path);
    return data.timeline;
  }

  /**
   * Get timeline summary
   */
  async timelineSummary(
    entityId: string,
    period: '7d' | '30d' | '90d' = '30d'
  ): Promise<TimelineSummary> {
    const data = await this.request<{ summary: TimelineSummary }>(
      'GET',
      `/api/timeline/${entityId}/summary?period=${period}`
    );
    return data.summary;
  }

  /**
   * Add annotation to timeline
   */
  async timelineAnnotate(
    entityId: string,
    input: { title: string; description?: string; category?: string; impact?: string }
  ): Promise<TimelineEntry> {
    return this.request<TimelineEntry>('POST', `/api/timeline/${entityId}/annotate`, input);
  }

  // --------------------------------------------------------------------------
  // Relationships
  // --------------------------------------------------------------------------

  /**
   * Create relationship node
   */
  async relationshipNodeCreate(
    entityType: string,
    entityId: string,
    properties?: Record<string, any>
  ): Promise<RelationshipNode> {
    return this.request<RelationshipNode>('POST', '/api/relationships/nodes', {
      entityType,
      entityId,
      properties,
    });
  }

  /**
   * Get related nodes
   */
  async relationshipRelated(nodeId: string, depth: number = 2): Promise<RelationshipNode[]> {
    return this.request<{ related: RelationshipNode[] }>(
      'GET',
      `/api/relationships/nodes/${nodeId}/related?depth=${depth}`
    ).then(r => r.related);
  }

  /**
   * Create relationship edge
   */
  async relationshipEdgeCreate(
    sourceNodeId: string,
    targetNodeId: string,
    edgeType: string,
    properties?: Record<string, any>
  ): Promise<RelationshipEdge> {
    return this.request<RelationshipEdge>('POST', '/api/relationships/edges', {
      sourceNodeId,
      targetNodeId,
      edgeType,
      properties,
    });
  }

  // --------------------------------------------------------------------------
  // Sessions
  // --------------------------------------------------------------------------

  /**
   * List active sessions
   */
  async sessions(): Promise<Array<{ token: string; createdAt: string; lastUsedAt?: string }>> {
    const data = await this.request<{ sessions: any[] }>('GET', '/api/auth/sessions');
    return data.sessions;
  }

  /**
   * Revoke all sessions
   */
  async sessionsRevokeAll(): Promise<void> {
    await this.request('DELETE', '/api/auth/sessions');
  }
}

// ============================================================================
// Error Class
// ============================================================================

export class CorpIDError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'CorpIDError';
  }
}

// ============================================================================
// Named Exports
// ============================================================================

export default CorpID;
