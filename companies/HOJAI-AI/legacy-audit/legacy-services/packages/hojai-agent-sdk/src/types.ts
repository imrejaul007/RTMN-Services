/**
 * HOJAI Agent SDK - Types
 * Re-exports all types from index for convenient imports
 */

// Re-export types from index
export type {
  AgentDivision,
  AgentLevel,
  LLMProvider,
  AgentConfig,
  PersonaIdentity,
  PersonaCoreMission,
  PersonaCriticalRules,
  PersonaDeliverable,
  PersonaWorkflow,
  PersonaSuccessMetrics,
  AgentPersona,
  ToolParameter,
  ToolDefinition,
  ToolExecution,
  ToolResult,
  ChatRequest,
  ChatResponse,
  ExecuteRequest,
  APIResponse,
} from './index.js';

// Memory types - defined inline to avoid circular imports
export interface MemoryEntry {
  id: string;
  type: 'fact' | 'preference' | 'context' | 'conversation' | 'decision';
  content: string;
  category?: string;
  importance?: 'low' | 'medium' | 'high';
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt?: Date;
  expiresAt?: Date;
}

export interface MemoryContext {
  userId: string;
  sessionId?: string;
  entries: MemoryEntry[];
  summary?: string;
}

// Event types - defined inline to avoid circular imports
export interface AgentEvent {
  type: string;
  agent: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface AgentExecutionEvent extends AgentEvent {
  type: 'agent.execution.started' | 'agent.execution.completed' | 'agent.execution.failed';
  data: {
    input: unknown;
    output?: unknown;
    error?: string;
    duration?: number;
  };
}
