/**
 * AgentOS SDK — Core TypeScript types.
 * Canonical source of truth for all interfaces used across the SDK.
 */

// ─── Agent types ────────────────────────────────────────────────────────────

export type AgentType = 'genie' | 'merchant' | 'system' | 'partner' | 'custom';
export type AgentStatus = 'draft' | 'active' | 'paused' | 'retired';

/** Minimal agent record as returned by agent-registry. */
export interface AgentSummary {
  id: string;
  name: string;
  version: string;
  type: AgentType;
  status: AgentStatus;
  owner: string;
  capabilities: string[];
  tools: string[];
  skills: string[];
  createdAt: string;
  updatedAt: string;
  lastHeartbeat: string | null;
  expired: boolean;
}

/** Full agent record including metadata. */
export interface Agent extends AgentSummary {
  metadata: Record<string, unknown>;
}

/** Payload for creating a new agent. */
export interface CreateAgentOptions {
  name: string;
  type: AgentType;
  owner: string;
  capabilities?: string[];
  tools?: string[];
  skills?: string[];
  metadata?: Record<string, unknown>;
  version?: string;
}

/** Payload for updating an existing agent. */
export interface UpdateAgentOptions {
  name?: string;
  type?: AgentType;
  status?: AgentStatus;
  capabilities?: string[];
  tools?: string[];
  skills?: string[];
  metadata?: Record<string, unknown>;
}

// ─── Version snapshot ────────────────────────────────────────────────────────

export interface AgentVersion {
  id: string;
  agentId: string;
  version: string;
  createdAt: string;
}

export interface VersionSnapshot extends AgentVersion {
  snapshot: Agent;
}

// ─── Lifecycle actions ──────────────────────────────────────────────────────

export type LifecycleAction = 'create' | 'deploy' | 'pause' | 'resume' | 'retire' | 'heartbeat';

export interface LifecycleEvent {
  agentId: string;
  action: LifecycleAction;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ─── Search & filter ─────────────────────────────────────────────────────────

export interface AgentSearchOptions {
  type?: AgentType;
  status?: AgentStatus;
  capability?: string;
  limit?: number;
  offset?: number;
}

// ─── Execution ───────────────────────────────────────────────────────────────

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ExecutionRequest {
  agentId: string;
  task: string;
  input?: Record<string, unknown>;
  timeout?: number; // ms
  priority?: 'low' | 'normal' | 'high';
}

export interface ExecutionResult {
  executionId: string;
  agentId: string;
  status: ExecutionStatus;
  result?: unknown;
  error?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

// ─── Orchestration ───────────────────────────────────────────────────────────

export interface OrchestrationPlan {
  planId: string;
  agentId: string;
  steps: OrchestrationStep[];
  status: 'planned' | 'running' | 'completed' | 'failed';
}

export interface OrchestrationStep {
  stepId: string;
  agentId: string;
  task: string;
  dependsOn: string[];
  status: ExecutionStatus;
  result?: unknown;
}

// ─── Observability ───────────────────────────────────────────────────────────

export interface AgentMetrics {
  agentId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgDurationMs: number;
  lastExecutionAt: string | null;
  uptimePercent: number;
  lastHeartbeat: string | null;
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface AgentOSConfig {
  /** Base URL of the AgentOS Hub (default: http://localhost:7300) */
  baseUrl?: string;
  /** agent-registry port (default: 4803) */
  registryPort?: number;
  /** agent-orchestrator port (default: 4807) */
  orchestratorPort?: number;
  /** agent-execution-engine port (default: 4804) */
  executionPort?: number;
  /** agent-observability port (default: 4810) */
  observabilityPort?: number;
  /** Internal service token for auth */
  apiKey?: string;
  /** Default request timeout in ms (default: 30000) */
  timeout?: number;
  /** Retry attempts on network failure (default: 3) */
  retries?: number;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  count: number;
  total: number;
  offset: number;
  limit: number;
  items: T[];
}
