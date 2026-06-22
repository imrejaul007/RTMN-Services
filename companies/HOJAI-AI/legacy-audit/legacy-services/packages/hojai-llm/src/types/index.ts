import { z } from 'zod';

// ============================================================================
// LLM REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Supported LLM providers
 */
export enum LLMProvider {
  CLAUDE = 'claude',
  OPENAI = 'openai'
}

/**
 * Message role enum
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant'
}

/**
 * Supported Claude models
 */
export enum ClaudeModel {
  CLAUDE_3_5_SONNET = 'claude-3-5-sonnet-20240620',
  CLAUDE_3_5_HAIKU = 'claude-3-5-haiku-20240307',
  CLAUDE_3_OPUS = 'claude-3-opus-20240229',
  CLAUDE_3_SONNET = 'claude-3-sonnet-20240229',
  CLAUDE_3_HAIKU = 'claude-3-haiku-20240307'
}

/**
 * Supported OpenAI models
 */
export enum OpenAIModel {
  GPT_4O = 'gpt-4o',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4 = 'gpt-4',
  GPT_35_TURBO = 'gpt-3.5-turbo'
}

/**
 * Task types for model routing
 */
export enum TaskType {
  REASONING = 'reasoning',           // Complex analysis, problem-solving
  CREATIVE = 'creative',             // Writing, brainstorming
  CLASSIFICATION = 'classification',  // Categorization, sentiment
  EXTRACTION = 'extraction',          // Structured data extraction
  SUMMARIZATION = 'summarization',    // Condensing content
  CONVERSATION = 'conversation',     // Chat, dialogue
  CODE = 'code',                     // Code generation, review
  DOCUMENT = 'document'              // Document understanding
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;
}

/**
 * Streaming chunk structure
 */
export interface StreamingChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
  delta?: string;
  usage?: TokenUsage;
  error?: string;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number;
}

/**
 * LLM request options
 */
export interface LLMRequestOptions {
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  stream?: boolean;
  timeout?: number;
}

/**
 * LLM response structure
 */
export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  usage: TokenUsage;
  finishReason: string;
  requestId: string;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// EMPLOYEE CONTEXT TYPES
// ============================================================================

/**
 * Employee role types
 */
export enum EmployeeRole {
  SALES = 'sales',
  SUPPORT = 'support',
  ANALYST = 'analyst',
  WRITER = 'writer',
  CODER = 'coder',
  MANAGER = 'manager',
  RECRUITER = 'recruiter',
  ACCOUNTANT = 'accountant',
  CUSTOM = 'custom'
}

/**
 * Employee capability
 */
export interface EmployeeCapability {
  name: string;
  description: string;
  examples?: string[];
  confidence: number; // 0-1
}

/**
 * Employee knowledge domain
 */
export interface EmployeeKnowledge {
  domain: string;
  topics: string[];
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  sources?: string[];
}

/**
 * Employee memory item
 */
export interface EmployeeMemory {
  id: string;
  type: 'interaction' | 'fact' | 'preference' | 'decision';
  content: string;
  importance: number; // 0-1
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Employee context for prompt building
 */
export interface EmployeeContext {
  id: string;
  tenantId: string;
  name: string;
  role: EmployeeRole;
  capabilities: EmployeeCapability[];
  knowledge: EmployeeKnowledge[];
  recentMemory: EmployeeMemory[];
  preferences: Record<string, unknown>;
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
  language?: string;
  timezone?: string;
}

// ============================================================================
// MODEL CONFIG TYPES
// ============================================================================

/**
 * Model configuration
 */
export interface ModelConfig {
  provider: LLMProvider;
  model: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  systemPrompt?: string;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Model routing rule
 */
export interface ModelRoutingRule {
  taskType: TaskType;
  primary: {
    provider: LLMProvider;
    model: string;
  };
  fallback?: {
    provider: LLMProvider;
    model: string;
  };
  maxTokens?: number;
  temperature?: number;
}

// ============================================================================
// ANALYSIS TYPES
// ============================================================================

/**
 * Query analysis request
 */
export interface QueryAnalysisRequest {
  query: string;
  context?: {
    recentConversations?: ChatMessage[];
    relevantFacts?: string[];
    userIntent?: string;
  };
}

/**
 * Query analysis response
 */
export interface QueryAnalysisResponse {
  intent: string;
  entities: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  complexity: 'simple' | 'moderate' | 'complex';
  suggestedTaskType: TaskType;
  confidence: number;
}

/**
 * Document analysis request
 */
export interface DocumentAnalysisRequest {
  content: string;
  documentType: 'email' | 'contract' | 'report' | 'invoice' | 'support_ticket' | 'other';
  extractFields?: string[];
  summaryLength?: 'short' | 'medium' | 'long';
}

/**
 * Document analysis response
 */
export interface DocumentAnalysisResponse {
  summary: string;
  keyPoints: string[];
  extractedData?: Record<string, unknown>;
  sentiment?: 'positive' | 'neutral' | 'negative';
  entities?: {
    people?: string[];
    organizations?: string[];
    dates?: string[];
    amounts?: string[];
  };
  confidence: number;
}

// ============================================================================
// TEXT GENERATION TYPES
// ============================================================================

/**
 * Text generation request
 */
export interface TextGenerationRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

/**
 * Text generation response
 */
export interface TextGenerationResponse {
  text: string;
  usage: TokenUsage;
  finishReason: string;
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const ChatMessageSchema = z.object({
  role: z.nativeEnum(MessageRole),
  content: z.string().min(0),
  name: z.string().optional()
});

export const LLMRequestOptionsSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  stopSequences: z.array(z.string()).optional(),
  stream: z.boolean().optional(),
  timeout: z.number().positive().optional()
});

export const EmployeeContextSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  role: z.nativeEnum(EmployeeRole),
  capabilities: z.array(z.object({
    name: z.string(),
    description: z.string(),
    examples: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1)
  })).optional(),
  knowledge: z.array(z.object({
    domain: z.string(),
    topics: z.array(z.string()),
    expertiseLevel: z.enum(['beginner', 'intermediate', 'expert']),
    sources: z.array(z.string()).optional()
  })).optional(),
  recentMemory: z.array(z.object({
    id: z.string(),
    type: z.enum(['interaction', 'fact', 'preference', 'decision']),
    content: z.string(),
    importance: z.number().min(0).max(1),
    timestamp: z.date(),
    metadata: z.record(z.unknown()).optional()
  })).optional(),
  preferences: z.record(z.unknown()).optional(),
  tone: z.enum(['formal', 'casual', 'friendly', 'professional']).optional(),
  language: z.string().optional(),
  timezone: z.string().optional()
});

export const ModelConfigSchema = z.object({
  provider: z.nativeEnum(LLMProvider),
  model: z.string().min(1),
  maxTokens: z.number().positive().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).optional(),
  systemPrompt: z.string().optional(),
  retryAttempts: z.number().int().nonnegative().default(3),
  retryDelay: z.number().nonnegative().default(1000),
  timeout: z.number().positive().default(60000)
});

export const ModelRoutingRuleSchema = z.object({
  taskType: z.nativeEnum(TaskType),
  primary: z.object({
    provider: z.nativeEnum(LLMProvider),
    model: z.string()
  }),
  fallback: z.object({
    provider: z.nativeEnum(LLMProvider),
    model: z.string()
  }).optional(),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional()
});

