import axios from 'axios';
import type { FlowMode, MemoryEntry, Task, UserPreferences } from '../types';

const API_URL = process.env.HOJAI_FLOW_URL || 'http://localhost:4561';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// ============================================================================
// FLOW EXECUTION
// ============================================================================

export interface ExecuteFlowParams {
  input: string;
  mode: FlowMode;
  audioData?: string;
  userId: string;
  tenantId?: string;
}

export interface ExecuteFlowResponse {
  success: boolean;
  data: {
    flowId: string;
    input: string;
    output: string;
    audioUrl?: string;
    context: {
      memories: MemoryEntry[];
      contextString: string;
    };
    intent?: {
      predicted: string;
      confidence: number;
    };
    timing: {
      totalMs: number;
      memoryMs: number;
      intentMs: number;
      reasoningMs: number;
      llmMs: number;
    };
  };
}

export async function executeFlow(params: ExecuteFlowParams): Promise<ExecuteFlowResponse> {
  const response = await api.post('/api/flow/execute', {
    tenantId: params.tenantId || 'default',
    userId: params.userId,
    input: params.input,
    mode: params.mode,
    audioData: params.audioData,
    options: {
      useReasoning: params.mode === 'ask',
      useVoice: params.mode === 'flow',
    },
  });
  return response.data;
}

// ============================================================================
// MEMORY
// ============================================================================

export interface GetMemoryParams {
  userId: string;
  tiers?: string[];
  tenantId?: string;
}

export async function getMemory(params: GetMemoryParams): Promise<{ success: boolean; data: MemoryEntry[] }> {
  const response = await api.get('/api/flow/memory', {
    params: {
      userId: params.userId,
      tiers: params.tiers?.join(','),
    },
    headers: {
      'x-tenant-id': params.tenantId || 'default',
    },
  });
  return response.data;
}

export interface StoreMemoryParams {
  userId: string;
  content: string;
  tier?: string;
  importance?: number;
  tenantId?: string;
}

export async function storeMemory(params: StoreMemoryParams): Promise<{ success: boolean; data: MemoryEntry }> {
  const response = await api.post('/api/memories/by-tier', {
    userId: params.userId,
    content: params.content,
    tier: params.tier,
    importance: params.importance,
    type: 'conversation',
  }, {
    headers: {
      'x-tenant-id': params.tenantId || 'default',
    },
  });
  return response.data;
}

// ============================================================================
// TASKS
// ============================================================================

export interface CreateTaskParams {
  userId: string;
  title: string;
  description?: string;
  action?: Task['action'];
  tenantId?: string;
}

export async function createTask(params: CreateTaskParams): Promise<{ success: boolean; data: Task }> {
  const response = await api.post('/api/tasks', {
    userId: params.userId,
    title: params.title,
    description: params.description,
    action: params.action,
    status: 'pending',
  }, {
    headers: {
      'x-tenant-id': params.tenantId || 'default',
    },
  });
  return response.data;
}

export async function getTasks(userId: string, tenantId?: string): Promise<{ success: boolean; data: Task[] }> {
  const response = await api.get('/api/tasks', {
    params: { userId },
    headers: {
      'x-tenant-id': tenantId || 'default',
    },
  });
  return response.data;
}

export async function updateTaskStatus(taskId: string, status: Task['status'], tenantId?: string): Promise<{ success: boolean }> {
  const response = await api.patch(`/api/tasks/${taskId}`, { status }, {
    headers: {
      'x-tenant-id': tenantId || 'default',
    },
  });
  return response.data;
}

// ============================================================================
// KNOWLEDGE
// ============================================================================

export interface KnowledgeSearchParams {
  userId: string;
  query: string;
  tenantId?: string;
}

export async function searchKnowledge(params: KnowledgeSearchParams): Promise<{ success: boolean; data: Array<{ title: string; content: string; relevance: number }> }> {
  const response = await api.post('/api/knowledge/search', {
    userId: params.userId,
    query: params.query,
  }, {
    headers: {
      'x-tenant-id': params.tenantId || 'default',
    },
  });
  return response.data;
}

// ============================================================================
// PREFERENCES
// ============================================================================

export async function getPreferences(userId: string): Promise<{ success: boolean; data: UserPreferences }> {
  const response = await api.get('/api/preferences', {
    params: { userId },
  });
  return response.data;
}

export async function updatePreferences(userId: string, updates: Partial<UserPreferences>): Promise<{ success: boolean }> {
  const response = await api.patch('/api/preferences', { userId, ...updates });
  return response.data;
}

// ============================================================================
// HEALTH
// ============================================================================

export async function checkHealth(): Promise<{ status: string; service: string }> {
  const response = await api.get('/health');
  return response.data;
}

export default api;
