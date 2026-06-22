/**
 * HOJAI Agent SDK - Core
 * Base interfaces and types for all HOJAI agents
 * Version: 1.0.0 | Date: June 3, 2026
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// ============================================================================
// AGENT TYPES
// ============================================================================

export type AgentDivision =
  | 'engineering'
  | 'marketing'
  | 'sales'
  | 'paid-media'
  | 'design'
  | 'product'
  | 'project-management'
  | 'testing'
  | 'support'
  | 'finance'
  | 'game-development'
  | 'spatial-computing'
  | 'specialized'
  | 'academic';

export type AgentLevel = 'L1' | 'L2' | 'L3' | 'L4';

export type LLMProvider = 'anthropic' | 'openai' | 'google' | 'local';

export interface AgentConfig {
  name: string;
  description: string;
  division: AgentDivision;
  level?: AgentLevel;
  port: number;
  version?: string;
  llmProvider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// ============================================================================
// PERSONA TYPES (from Agency Agents)
// ============================================================================

export interface PersonaIdentity {
  name: string;
  role: string;
  personality: string;
  memory: string;
  experience: string;
}

export interface PersonaCoreMission {
  primary: string[];
  editorIntegration?: string[];
  webApplication?: string[];
  performance?: string[];
  codeQuality?: string[];
}

export interface PersonaCriticalRules {
  [key: string]: string[] | undefined;
  performanceFirst?: string[];
  accessibility?: string[];
  security?: string[];
  dataPrivacy?: string[];
  quality?: string[];
}

export interface PersonaDeliverable {
  type: string;
  description: string;
  template?: string;
  example?: string;
}

export interface PersonaWorkflow {
  name: string;
  steps: string[];
}

export interface PersonaSuccessMetrics {
  [key: string]: string | number | boolean;
}

export interface AgentPersona {
  identity: PersonaIdentity;
  coreMission: PersonaCoreMission;
  criticalRules: PersonaCriticalRules;
  technicalDeliverables?: PersonaDeliverable[];
  workflows?: PersonaWorkflow[];
  communicationStyle?: string[];
  learningAndMemory?: string[];
  successMetrics?: PersonaSuccessMetrics;
  advancedCapabilities?: string[];
  vibe?: string;
  emoji?: string;
  color?: string;
}

// ============================================================================
// TOOL TYPES
// ============================================================================

export interface ToolParameter {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  default?: unknown;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  category?: string;
}

export interface ToolExecution {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration?: number;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// MEMORY TYPES
// ============================================================================

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

// ============================================================================
// EVENT TYPES
// ============================================================================

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

// ============================================================================
// API TYPES
// ============================================================================

export interface ChatRequest {
  message: string;
  context?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    content: string;
    toolCalls?: ToolExecution[];
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
  meta: {
    requestId: string;
    timestamp: string;
    agent: string;
    responseTimeMs?: number;
  };
}

export interface ExecuteRequest {
  action: string;
  parameters?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    requestId: string;
    timestamp: string;
    agent: string;
  };
}

// ============================================================================
// BASE AGENT CLASS
// ============================================================================

export abstract class BaseHOJAIAgent {
  public config: AgentConfig;
  public persona: AgentPersona;
  public tools: ToolDefinition[] = [];
  public router: Router;

  constructor(config: AgentConfig, persona: AgentPersona) {
    this.config = {
      version: '1.0.0',
      llmProvider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 4096,
      ...config,
    };

    this.persona = persona;
    this.router = Router();
    this.setupRoutes();
  }

  protected abstract setupRoutes(): void;

  public getSystemPrompt(): string {
    return this.buildSystemPrompt();
  }

  protected buildSystemPrompt(): string {
    const { identity, coreMission, criticalRules, communicationStyle } = this.persona;

    let prompt = `# ${identity.name}\n\n`;
    prompt += `You are **${identity.name}**, ${identity.role}.\n\n`;
    prompt += `**Personality**: ${identity.personality}\n`;
    prompt += `**Memory**: ${identity.memory}\n`;
    prompt += `**Experience**: ${identity.experience}\n\n`;

    if (coreMission) {
      prompt += `## Your Core Mission\n\n`;
      if (coreMission.primary) {
        prompt += `### Primary Responsibilities\n`;
        coreMission.primary.forEach((item) => {
          prompt += `- ${item}\n`;
        });
        prompt += '\n';
      }
      if (coreMission.webApplication) {
        prompt += `### Web Application Development\n`;
        coreMission.webApplication.forEach((item) => {
          prompt += `- ${item}\n`;
        });
        prompt += '\n';
      }
      if (coreMission.performance) {
        prompt += `### Performance Optimization\n`;
        coreMission.performance.forEach((item) => {
          prompt += `- ${item}\n`;
        });
        prompt += '\n';
      }
    }

    if (criticalRules && Object.keys(criticalRules).length > 0) {
      prompt += `## Critical Rules You Must Follow\n\n`;
      Object.entries(criticalRules).forEach(([category, rules]) => {
        if (rules && rules.length > 0) {
          prompt += `### ${this.formatCategory(category)}\n`;
          rules.forEach((rule) => {
            prompt += `- ${rule}\n`;
          });
          prompt += '\n';
        }
      });
    }

    if (communicationStyle && communicationStyle.length > 0) {
      prompt += `## Communication Style\n\n`;
      communicationStyle.forEach((style) => {
        prompt += `- ${style}\n`;
      });
      prompt += '\n';
    }

    if (this.tools.length > 0) {
      prompt += `## Available Tools\n\n`;
      prompt += `You have access to the following tools:\n\n`;
      this.tools.forEach((tool) => {
        prompt += `### ${tool.name}\n`;
        prompt += `${tool.description}\n`;
        prompt += `Parameters:\n`;
        tool.parameters.forEach((param) => {
          const required = param.required ? '(required)' : '(optional)';
          prompt += `- ${param.name} ${required}: ${param.description}\n`;
        });
        prompt += '\n';
      });
    }

    return prompt;
  }

  protected formatCategory(category: string): string {
    return category
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  public getToolNames(): string[] {
    return this.tools.map((t) => t.name);
  }

  public getHealthStatus(): Record<string, unknown> {
    return {
      name: this.config.name,
      status: 'healthy',
      version: this.config.version,
      division: this.config.division,
      port: this.config.port,
      tools: this.getToolNames().length,
      persona: {
        name: this.persona.identity.name,
        role: this.persona.identity.role,
      },
    };
  }
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  context: z.record(z.unknown()).optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

export const ExecuteRequestSchema = z.object({
  action: z.string().min(1),
  parameters: z.record(z.unknown()).optional(),
  context: z.record(z.unknown()).optional(),
});

// ============================================================================
// EXPORTS
// ============================================================================

export * from './types.js';
export * from './persona.js';
export * from './tools.js';
export * from './memory.js';
export * from './events.js';


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-agent-sdk',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
