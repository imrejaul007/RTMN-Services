/**
 * HOJAI Agent Runtime
 * Production AI agent execution with Claude/GPT integration
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

// LLM Providers
export type LLMProvider = 'anthropic' | 'openai' | 'google' | 'ollama';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  timeout?: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description?: string;
  skills: string[];
  instructions: string;
  tools: Tool[];
  memory?: MemoryConfig;
  twins?: string[];
  llm?: LLMConfig;
  maxIterations?: number;
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface Tool {
  name: string;
  description: string;
  schema: z.ZodSchema;
  handler: ToolHandler;
}

export type ToolHandler = (
  params: any,
  context: AgentContext
) => Promise<ToolResult>;

export interface ToolResult {
  success: boolean;
  output?: any;
  error?: string;
}

export interface MemoryConfig {
  type: 'short_term' | 'long_term' | 'hybrid';
  maxItems?: number;
  relevanceThreshold?: number;
}

export interface AgentContext {
  id: string;
  agentId: string;
  sessionId: string;
  input: any;
  state: Record<string, any>;
  memory: MemoryItem[];
  tools: ToolResult[];
  iterations: number;
  metadata: Record<string, any>;
}

export interface MemoryItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  sessionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: any;
  output?: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  tokens?: { input: number; output: number; total: number };
  cost?: number;
  iterations: number;
  memory: MemoryItem[];
}

export interface AgentEvent {
  type: string;
  timestamp: Date;
  data: any;
}

// Validation schemas
export const CreateAgentSchema = z.object({
  name: z.string().min(1),
  role: z.string(),
  description: z.string().optional(),
  skills: z.array(z.string()).default([]),
  instructions: z.string(),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })).default([]),
  llm: z.object({
    provider: z.enum(['anthropic', 'openai', 'google', 'ollama']).default('anthropic'),
    model: z.string().default('claude-3-5-sonnet-20241022'),
    maxTokens: z.number().default(4096),
    temperature: z.number().min(0).max(2).default(0.7),
  }).optional(),
});

export const ExecuteAgentSchema = z.object({
  input: z.any(),
  sessionId: z.string().optional(),
  context: z.record(z.any()).optional(),
  stream: z.boolean().default(false),
});

// LLM Client interface
interface LLMClient {
  complete(prompt: string, config: LLMConfig): Promise<LLMResponse>;
  stream(prompt: string, config: LLMConfig): AsyncGenerator<string>;
}

interface LLMResponse {
  content: string;
  tokens?: { input: number; output: number };
  cost?: number;
  model: string;
}

// Agent Runtime class
export class AgentRuntime extends EventEmitter {
  private agents = new Map<string, Agent>();
  private sessions = new Map<string, AgentExecution[]>();
  private tools = new Map<string, Tool>();
  private llmClients = new Map<LLMProvider, LLMClient>();
  private memoryStore = new Map<string, MemoryItem[]>();

  constructor() {
    super();
  }

  // Register an agent
  register(agent: Agent): void {
    this.validateAgent(agent);
    this.agents.set(agent.id, agent);
    this.emit('agent.registered', { agentId: agent.id });
  }

  // Get agent
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  // List agents
  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  // Register a tool
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
    this.emit('tool.registered', { toolName: tool.name });
  }

  // Register LLM client
  registerLLMClient(provider: LLMProvider, client: LLMClient): void {
    this.llmClients.set(provider, client);
  }

  // Execute an agent
  async execute(
    agentId: string,
    input: any,
    options?: { sessionId?: string; context?: Record<string, any>; stream?: boolean }
  ): Promise<AgentExecution> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const sessionId = options?.sessionId || uuid();
    const executionId = uuid();

    const execution: AgentExecution = {
      id: executionId,
      agentId,
      sessionId,
      status: 'running',
      input,
      startedAt: new Date(),
      iterations: 0,
      memory: [],
    };

    this.emit('execution.start', { executionId, agentId, sessionId });

    try {
      // Initialize memory
      const memory = this.getSessionMemory(sessionId);

      // Add user input to memory
      memory.push({
        id: uuid(),
        role: 'user',
        content: typeof input === 'string' ? input : JSON.stringify(input),
        timestamp: new Date(),
      });

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(agent);

      // Build conversation
      const conversation = this.buildConversation(memory, systemPrompt);

      // Call LLM
      const llmConfig = agent.llm || {
        provider: 'anthropic' as LLMProvider,
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 4096,
        temperature: 0.7,
      };

      const client = this.llmClients.get(llmConfig.provider);
      if (!client) {
        throw new Error(`LLM client not configured: ${llmConfig.provider}`);
      }

      // Main agent loop
      let output: any;
      let iterations = 0;
      const maxIterations = agent.maxIterations || 10;

      while (iterations < maxIterations) {
        execution.iterations = iterations;

        this.emit('iteration.start', { executionId, iteration: iterations });

        // Get LLM response
        const response = await client.complete(conversation, llmConfig);

        // Add assistant response to memory
        memory.push({
          id: uuid(),
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
        });

        // Parse and execute tools
        const toolCalls = this.parseToolCalls(response.content);

        if (toolCalls.length === 0) {
          // No tools to call, this is the final response
          output = response.content;
          execution.tokens = response.tokens;
          execution.cost = response.cost;
          break;
        }

        // Execute tools
        for (const call of toolCalls) {
          const tool = this.tools.get(call.name);
          if (!tool) {
            memory.push({
              id: uuid(),
              role: 'assistant',
              content: `Tool "${call.name}" not found.`,
              timestamp: new Date(),
            });
            continue;
          }

          const result = await this.executeTool(tool, call.params, {
            id: executionId,
            agentId,
            sessionId,
            input,
            state: {},
            memory,
            tools: [],
            iterations,
            metadata: {},
          });

          // Add tool result to memory
          const toolResult = result.success
            ? `Tool ${call.name} result: ${JSON.stringify(result.output)}`
            : `Tool ${call.name} error: ${result.error}`;

          memory.push({
            id: uuid(),
            role: 'user',
            content: `<function_calls>\n${toolResult}\n</function_calls>`,
            timestamp: new Date(),
          });

          execution.tools?.push(result);
        }

        iterations++;
      }

      execution.output = output;
      execution.memory = memory;
      execution.status = 'completed';
      execution.completedAt = new Date();

      this.emit('execution.complete', { executionId, output, tokens: execution.tokens });

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date();
      this.emit('execution.error', { executionId, error: execution.error });
    }

    // Store session
    this.storeExecution(sessionId, execution);
    return execution;
  }

  // Stream execution
  async *stream(
    agentId: string,
    input: any,
    options?: { sessionId?: string }
  ): AsyncGenerator<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const sessionId = options?.sessionId || uuid();
    const memory = this.getSessionMemory(sessionId);

    memory.push({
      id: uuid(),
      role: 'user',
      content: typeof input === 'string' ? input : JSON.stringify(input),
      timestamp: new Date(),
    });

    const systemPrompt = this.buildSystemPrompt(agent);
    const conversation = this.buildConversation(memory, systemPrompt);
    const llmConfig = agent.llm || { provider: 'anthropic' as LLMProvider, model: 'claude-3-5-sonnet-20241022' };
    const client = this.llmClients.get(llmConfig.provider);

    if (!client) {
      throw new Error(`LLM client not configured: ${llmConfig.provider}`);
    }

    // Stream response
    for await (const chunk of await client.stream(conversation, llmConfig)) {
      yield chunk;
    }
  }

  // Tool execution
  private async executeTool(
    tool: Tool,
    params: any,
    context: AgentContext
  ): Promise<ToolResult> {
    try {
      const validated = tool.schema.parse(params);
      const result = await tool.handler(validated, context);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }

  // Parse tool calls from LLM response
  private parseToolCalls(content: string): { name: string; params: any }[] {
    const calls: { name: string; params: any }[] = [];

    // Parse XML-style tool calls
    const toolCallRegex = /<tool_call>\s*<name>([^<]+)<\/name>\s*<params>([^<]+)<\/params>\s*<\/tool_call>/g;
    let match;

    while ((match = toolCallRegex.exec(content)) !== null) {
      try {
        calls.push({
          name: match[1].trim(),
          params: JSON.parse(match[2].trim()),
        });
      } catch {
        // Skip malformed calls
      }
    }

    return calls;
  }

  // Build system prompt
  private buildSystemPrompt(agent: Agent): string {
    return `${agent.instructions}

You have access to tools. To use a tool, respond with:

<tool_call>
<name>tool_name</name>
<params>${JSON.stringify({ param1: "value1" })}</params>
</tool_call>

Skills: ${agent.skills.join(', ') || 'none'}
Role: ${agent.role}
Description: ${agent.description || 'No description'}`;
  }

  // Build conversation
  private buildConversation(memory: MemoryItem[], systemPrompt: string): string {
    const messages: string[] = [`[SYSTEM]\n${systemPrompt}\n[/SYSTEM]`];

    for (const item of memory) {
      const prefix = item.role === 'user' ? '[USER]' : '[ASSISTANT]';
      messages.push(`${prefix}\n${item.content}\n[/${item.role === 'user' ? 'USER' : 'ASSISTANT']}`);
    }

    return messages.join('\n\n');
  }

  // Memory management
  private getSessionMemory(sessionId: string): MemoryItem[] {
    if (!this.memoryStore.has(sessionId)) {
      this.memoryStore.set(sessionId, []);
    }
    return this.memoryStore.get(sessionId)!;
  }

  private storeExecution(sessionId: string, execution: AgentExecution): void {
    const sessions = this.sessions.get(sessionId) || [];
    sessions.push(execution);
    this.sessions.set(sessionId, sessions);
  }

  // Get session history
  getSession(sessionId: string): AgentExecution[] {
    return this.sessions.get(sessionId) || [];
  }

  // Validate agent
  private validateAgent(agent: Agent): void {
    if (!agent.id || !agent.name || !agent.instructions) {
      throw new Error('Agent must have id, name, and instructions');
    }
  }

  // Delete agent
  deleteAgent(id: string): boolean {
    return this.agents.delete(id);
  }

  // Clear session
  clearSession(sessionId: string): void {
    this.memoryStore.delete(sessionId);
    this.sessions.delete(sessionId);
  }
}

// Built-in tools
export function createBuiltinTools(): Tool[] {
  return [
    // Calculator
    {
      name: 'calculator',
      description: 'Perform mathematical calculations',
      schema: z.object({ expression: z.string() }),
      handler: async (params) => {
        try {
          // Safe math evaluation
          const result = Function(`"use strict"; return (${params.expression})`)();
          return { success: true, output: { result } };
        } catch (e) {
          return { success: false, error: 'Invalid expression' };
        }
      },
    },

    // Date/Time
    {
      name: 'get_current_time',
      description: 'Get current date and time',
      schema: z.object({ format: z.string().optional() }),
      handler: async (params) => {
        const now = new Date();
        return {
          success: true,
          output: {
            iso: now.toISOString(),
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString(),
          },
        };
      },
    },

    // Search
    {
      name: 'web_search',
      description: 'Search the web for information',
      schema: z.object({ query: z.string() }),
      handler: async (params) => {
        // Placeholder - integrate with search API
        return {
          success: true,
          output: { results: [], query: params.query },
        };
      },
    },

    // Memory
    {
      name: 'remember',
      description: 'Store information in agent memory',
      schema: z.object({
        key: z.string(),
        value: z.any(),
      }),
      handler: async (params, context) => {
        context.state[`memory_${params.key}`] = params.value;
        return { success: true, output: { stored: true } };
      },
    },

    {
      name: 'recall',
      description: 'Recall stored information from memory',
      schema: z.object({ key: z.string() }),
      handler: async (params, context) => {
        const value = context.state[`memory_${params.key}`];
        return { success: true, output: { value } };
      },
    },
  ];
}

// Singleton
export const agentRuntime = new AgentRuntime();

// Register built-in tools
createBuiltinTools().forEach(tool => agentRuntime.registerTool(tool));

export default agentRuntime;
