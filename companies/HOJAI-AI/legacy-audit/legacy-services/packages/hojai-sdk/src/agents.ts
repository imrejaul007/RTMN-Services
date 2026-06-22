/**
 * HOJAI SDK - Agent Management
 *
 * Utilities for creating and managing AI agents.
 *
 * @example
 * ```typescript
 * import { createAgentBuilder, defineTools, defineSystemPrompt } from '@hojai/sdk/agents';
 *
 * const agent = createAgentBuilder()
 *   .name('My Agent')
 *   .type('assistant')
 *   .model('claude-3-5-sonnet')
 *   .systemPrompt('You are a helpful assistant...')
 *   .tools(defineTools(['search', 'calculator']))
 *   .build();
 * ```
 */

import type {
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentExecution,
  AgentConfig,
  ToolDefinition,
  Message,
} from './types.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Agent builder interface
 */
export interface AgentBuilder {
  name(name: string): AgentBuilder;
  description(description: string): AgentBuilder;
  type(type: string): AgentBuilder;
  model(model: string): AgentBuilder;
  temperature(temperature: number): AgentBuilder;
  maxTokens(maxTokens: number): AgentBuilder;
  systemPrompt(prompt: string): AgentBuilder;
  tools(tools: ToolDefinition[]): AgentBuilder;
  addTool(tool: ToolDefinition): AgentBuilder;
  memory(enabled: boolean): AgentBuilder;
  customSetting(key: string, value: unknown): AgentBuilder;
  build(): CreateAgentRequest;
}

/**
 * Agent execution options
 */
export interface AgentExecutionOptions {
  message: string;
  sessionId?: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  stream?: boolean;
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  response: string;
  sessionId: string;
  toolCalls?: Array<{
    tool: string;
    arguments: Record<string, unknown>;
    result?: unknown;
  }>;
  metadata?: Record<string, unknown>;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  latencyMs: number;
}

/**
 * Predefined agent types
 */
export enum PredefinedAgentType {
  EXECUTIVE_ASSISTANT = 'executive_assistant',
  SALES_SDR = 'sales_sdr',
  SUPPORT_AGENT = 'support_agent',
  SALON_CONSULTANT = 'salon_consultant',
  RESTAURANT_CONSULTANT = 'restaurant_consultant',
  BILLING_ASSISTANT = 'billing_assistant',
  HR_ASSISTANT = 'hr_assistant',
  CUSTOM = 'custom',
}

// ============================================================================
// AGENT BUILDER
// ============================================================================

/**
 * Create an agent builder
 */
export function createAgentBuilder(): AgentBuilder {
  const state: {
    name?: string;
    description?: string;
    type?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    tools?: ToolDefinition[];
    memoryEnabled?: boolean;
    customSettings?: Record<string, unknown>;
  } = {
    tools: [],
    memoryEnabled: true,
    customSettings: {},
  };

  return {
    name(name: string): AgentBuilder {
      state.name = name;
      return this;
    },

    description(description: string): AgentBuilder {
      state.description = description;
      return this;
    },

    type(type: string): AgentBuilder {
      state.type = type;
      return this;
    },

    model(model: string): AgentBuilder {
      state.model = model;
      return this;
    },

    temperature(temperature: number): AgentBuilder {
      state.temperature = Math.max(0, Math.min(2, temperature));
      return this;
    },

    maxTokens(maxTokens: number): AgentBuilder {
      state.maxTokens = Math.max(1, maxTokens);
      return this;
    },

    systemPrompt(prompt: string): AgentBuilder {
      state.systemPrompt = prompt;
      return this;
    },

    tools(tools: ToolDefinition[]): AgentBuilder {
      state.tools = tools;
      return this;
    },

    addTool(tool: ToolDefinition): AgentBuilder {
      state.tools = [...(state.tools || []), tool];
      return this;
    },

    memory(enabled: boolean): AgentBuilder {
      state.memoryEnabled = enabled;
      return this;
    },

    customSetting(key: string, value: unknown): AgentBuilder {
      state.customSettings = { ...state.customSettings, [key]: value };
      return this;
    },

    build(): CreateAgentRequest {
      if (!state.name) {
        throw new Error('Agent name is required');
      }
      if (!state.type) {
        throw new Error('Agent type is required');
      }

      const config: AgentConfig = {
        model: state.model || 'claude-3-5-sonnet-20240620',
        temperature: state.temperature ?? 0.7,
        maxTokens: state.maxTokens ?? 4096,
        systemPrompt: state.systemPrompt,
        tools: state.tools?.map((t) => t.name),
        memoryEnabled: state.memoryEnabled,
        customSettings: state.customSettings,
      };

      return {
        name: state.name,
        description: state.description,
        type: state.type,
        config,
      };
    },
  };
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Define a tool
 */
export function defineTool(config: {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler?: (...args: unknown[]) => unknown;
}): ToolDefinition {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters,
  };
}

/**
 * Define multiple tools
 */
export function defineTools(names: string[]): ToolDefinition[] {
  return names.map((name) => ({
    name,
    description: `Tool: ${name}`,
    parameters: {},
  }));
}

// ============================================================================
// SYSTEM PROMPT TEMPLATES
// ============================================================================

/**
 * System prompt templates for different agent types
 */
export const systemPromptTemplates = {
  /**
   * Executive assistant prompt
   */
  executiveAssistant: `You are Alex, an expert Executive Assistant.

Your capabilities:
- Calendar management and scheduling
- Email composition and management
- Task creation and tracking
- Information recall and memory

Your personality:
- Professional and efficient
- Proactive in suggesting follow-ups
- Excellent at organizing complex schedules
- Remember previous conversations and context

Guidelines:
1. Always confirm details before taking action
2. Suggest relevant follow-up actions
3. Maintain calendar-aware perspective
4. Remember personal preferences and recurring items`,

  /**
   * Sales SDR prompt
   */
  salesSDR: `You are a skilled Sales Development Representative (SDR).

Your goals:
- Identify qualified leads
- Engage prospects with personalized outreach
- Schedule meetings with sales team
- Maintain CRM hygiene

Your approach:
- Research prospects before reaching out
- Personalize messages based on context
- Focus on value proposition
- Handle objections gracefully

Tone:
- Professional but personable
- Curious about their needs
- Confident but not pushy`,

  /**
   * Support agent prompt
   */
  supportAgent: `You are a helpful Customer Support Agent.

Your mission:
- Resolve customer issues quickly and accurately
- Provide clear and helpful information
- Escalate when appropriate
- Ensure customer satisfaction

Guidelines:
1. Listen actively to understand the issue
2. Provide step-by-step solutions when possible
3. Be patient and empathetic
4. Follow up to ensure resolution
5. Document interactions for future reference`,

  /**
   * Salon consultant prompt
   */
  salonConsultant: `You are a Salon Growth Consultant helping beauty business owners.

Your expertise:
- Customer acquisition and retention
- Service pricing strategies
- Marketing for salons
- Staff management and training
- Inventory management

Your approach:
- Data-driven recommendations
- Practical, actionable advice
- Focus on profitability and growth
- Consider seasonality and trends`,

  /**
   * Restaurant consultant prompt
   */
  restaurantConsultant: `You are a Restaurant Growth Consultant helping restaurant owners.

Your expertise:
- Menu optimization
- Customer experience improvement
- Operational efficiency
- Marketing and promotions
- Cost control

Your approach:
- Balance quality and profitability
- Focus on customer satisfaction
- Practical, implementable advice
- Consider local market dynamics`,
};

/**
 * Get system prompt for a predefined agent type
 */
export function getSystemPrompt(type: PredefinedAgentType | string): string | undefined {
  return systemPromptTemplates[type as keyof typeof systemPromptTemplates];
}

// ============================================================================
// PREDEFINED AGENTS
// ============================================================================

/**
 * Create a predefined agent configuration
 */
export function createPredefinedAgent(
  type: PredefinedAgentType,
  name: string,
  customizations?: Partial<CreateAgentRequest>
): CreateAgentRequest {
  const baseConfig: Record<PredefinedAgentType, Partial<CreateAgentRequest>> = {
    [PredefinedAgentType.EXECUTIVE_ASSISTANT]: {
      type: 'assistant',
      description: 'AI Executive Assistant for scheduling, email, and task management',
      config: {
        model: 'claude-3-5-sonnet-20240620',
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: systemPromptTemplates.executiveAssistant,
        tools: ['create_event', 'send_email', 'create_task', 'remember'],
        memoryEnabled: true,
      },
    },

    [PredefinedAgentType.SALES_SDR]: {
      type: 'sales',
      description: 'AI Sales Development Representative for lead generation and outreach',
      config: {
        model: 'claude-3-5-sonnet-20240620',
        temperature: 0.5,
        maxTokens: 2048,
        systemPrompt: systemPromptTemplates.salesSDR,
        tools: ['search_company', 'find_contacts', 'enrich_lead', 'send_outreach', 'schedule_meeting'],
        memoryEnabled: true,
      },
    },

    [PredefinedAgentType.SUPPORT_AGENT]: {
      type: 'support',
      description: 'AI Customer Support Agent for handling inquiries and issues',
      config: {
        model: 'claude-3-5-sonnet-20240620',
        temperature: 0.3,
        maxTokens: 2048,
        systemPrompt: systemPromptTemplates.supportAgent,
        tools: ['search_knowledge', 'create_ticket', 'escalate', 'lookup_order'],
        memoryEnabled: true,
      },
    },

    [PredefinedAgentType.SALON_CONSULTANT]: {
      type: 'consultant',
      description: 'AI Consultant for salon business growth and optimization',
      config: {
        model: 'claude-3-5-sonnet-20240620',
        temperature: 0.6,
        maxTokens: 4096,
        systemPrompt: systemPromptTemplates.salonConsultant,
        tools: ['analyze_revenue', 'generate_recommendations', 'create_marketing_plan'],
        memoryEnabled: false,
      },
    },

    [PredefinedAgentType.RESTAURANT_CONSULTANT]: {
      type: 'consultant',
      description: 'AI Consultant for restaurant business growth and optimization',
      config: {
        model: 'claude-3-5-sonnet-20240620',
        temperature: 0.6,
        maxTokens: 4096,
        systemPrompt: systemPromptTemplates.restaurantConsultant,
        tools: ['analyze_menu', 'suggest_pricing', 'create_promotion'],
        memoryEnabled: false,
      },
    },

    [PredefinedAgentType.BILLING_ASSISTANT]: {
      type: 'billing',
      description: 'AI Assistant for billing inquiries and payment processing',
      config: {
        model: 'claude-3-5-sonnet-20240620',
        temperature: 0.3,
        maxTokens: 2048,
        systemPrompt: 'You are a helpful billing assistant. Provide accurate billing information and help resolve payment issues.',
        tools: ['lookup_invoice', 'process_refund', 'update_payment_method'],
        memoryEnabled: false,
      },
    },

    [PredefinedAgentType.HR_ASSISTANT]: {
      type: 'hr',
      description: 'AI HR Assistant for employee inquiries and management',
      config: {
        model: 'claude-3-5-sonnet-20240620',
        temperature: 0.5,
        maxTokens: 4096,
        systemPrompt: 'You are a helpful HR assistant. Answer policy questions and guide employees through HR processes.',
        tools: ['lookup_policy', 'submit_leave_request', 'get_benefits_info'],
        memoryEnabled: true,
      },
    },

    [PredefinedAgentType.CUSTOM]: {
      type: 'custom',
      description: 'Custom AI agent',
      config: {
        model: 'claude-3-5-sonnet-20240620',
        temperature: 0.7,
        maxTokens: 4096,
        memoryEnabled: true,
      },
    },
  };

  const config = baseConfig[type];
  if (!config) {
    throw new Error(`Unknown predefined agent type: ${type}`);
  }

  return {
    name,
    ...config,
    ...customizations,
    config: {
      ...config.config,
      ...customizations?.config,
    },
  } as CreateAgentRequest;
}

// ============================================================================
// AGENT UTILITIES
// ============================================================================

/**
 * Calculate estimated cost for an agent
 */
export function estimateAgentCost(config: AgentConfig): {
  per1KInput: number;
  per1KOutput: number;
  estimatedPerMessage: number;
} {
  // Pricing based on model (approximate)
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-3-5-sonnet-20240620': { input: 3, output: 15 }, // $3/$15 per 1M tokens
    'claude-3-opus-20240229': { input: 15, output: 75 },
    'claude-3-sonnet-20240229': { input: 3, output: 15 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-4': { input: 30, output: 60 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  };

  const modelPricing = pricing[config.model || 'claude-3-5-sonnet-20240620'] || pricing['claude-3-5-sonnet-20240620'];

  // Estimate ~100 input tokens, ~50 output tokens per message
  const estimatedInputTokens = 100;
  const estimatedOutputTokens = 50;

  return {
    per1KInput: modelPricing.input,
    per1KOutput: modelPricing.output,
    estimatedPerMessage:
      (estimatedInputTokens / 1000) * modelPricing.input +
      (estimatedOutputTokens / 1000) * modelPricing.output,
  };
}

/**
 * Validate agent configuration
 */
export function validateAgentConfig(config: AgentConfig): string[] {
  const errors: string[] = [];

  if (!config.model) {
    errors.push('Model is required');
  }

  if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
    errors.push('Temperature must be between 0 and 2');
  }

  if (config.maxTokens !== undefined && config.maxTokens < 1) {
    errors.push('Max tokens must be at least 1');
  }

  if (config.systemPrompt && config.systemPrompt.length > 100000) {
    errors.push('System prompt is too long (max 100,000 characters)');
  }

  return errors;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  type AgentBuilder,
  type AgentExecutionOptions,
  type AgentExecutionResult,
  PredefinedAgentType,
};

export default {
  createAgentBuilder,
  defineTool,
  defineTools,
  systemPromptTemplates,
  getSystemPrompt,
  createPredefinedAgent,
  estimateAgentCost,
  validateAgentConfig,
  PredefinedAgentType,
};
