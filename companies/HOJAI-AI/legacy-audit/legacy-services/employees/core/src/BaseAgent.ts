/**
 * HOJAI AI - Base Agent Class
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: Foundation class for AI employees with real LLM integration
 */

import { z, ZodSchema } from 'zod';
import { AnthropicProvider } from '../../../hojai-llm/providers/src/providers/anthropic.provider.js';
import { OpenAIProvider } from '../../../hojai-llm/providers/src/providers/openai.provider.js';
import type { Message, ChatResponse, LLMProvider } from '../../../hojai-llm/providers/src/types/index.js';

// ============================================================================
// Tool Interface
// ============================================================================

export interface ToolParameter {
  name: string;
  description: string;
  schema: ZodSchema;
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  llmProvider?: 'anthropic' | 'openai';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  memoryEnabled?: boolean;
}

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: ToolResult;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

// ============================================================================
// Memory Store (Simple In-Memory Implementation)
// ============================================================================

interface MemoryEntry {
  id: string;
  type: 'conversation' | 'fact' | 'preference';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

class InMemoryStore {
  private store: Map<string, MemoryEntry> = new Map();
  private context: string[] = [];

  add(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): string {
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.store.set(id, {
      ...entry,
      id,
      createdAt: new Date(),
    });
    this.updateContext(entry);
    return id;
  }

  private updateContext(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): void {
    const contextEntry = `[${entry.type}] ${entry.content}`;
    this.context.push(contextEntry);
    // Keep only last 50 context entries
    if (this.context.length > 50) {
      this.context = this.context.slice(-50);
    }
  }

  recall(query?: string, limit = 10): MemoryEntry[] {
    const entries = Array.from(this.store.values());

    if (!query) {
      return entries.slice(-limit);
    }

    const queryLower = query.toLowerCase();
    return entries
      .filter(entry =>
        entry.content.toLowerCase().includes(queryLower) ||
        entry.type.toLowerCase().includes(queryLower)
      )
      .slice(-limit);
  }

  getContext(): string {
    return this.context.join('\n');
  }

  clear(): void {
    this.store.clear();
    this.context = [];
  }
}

// ============================================================================
// Base Agent Class
// ============================================================================

export class BaseAgent {
  public readonly name: string;
  public readonly description: string;

  protected llm: LLMProvider;
  protected tools: Tool[] = [];
  protected memoryStore: InMemoryStore;
  protected conversationHistory: ConversationMessage[] = [];
  protected systemPrompt: string;
  protected model: string;
  protected temperature: number;
  protected maxTokens: number;
  protected maxHistoryLength: number;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.description = config.description;
    this.systemPrompt = config.systemPrompt;
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 4096;
    this.maxHistoryLength = 50;

    // Initialize LLM provider
    if (config.llmProvider === 'openai') {
      this.llm = new OpenAIProvider();
    } else {
      this.llm = new AnthropicProvider();
    }

    // Initialize memory
    this.memoryStore = new InMemoryStore();

    // Add system prompt to conversation
    this.conversationHistory.push({
      role: 'system',
      content: this.systemPrompt,
    });

    // Register tools
    if (config.tools) {
      this.registerTools(config.tools);
    }
  }

  /**
   * Register tools with the agent
   */
  registerTools(tools: Tool[]): void {
    this.tools.push(...tools);
  }

  /**
   * Add a tool to the agent
   */
  addTool(tool: Tool): void {
    this.tools.push(tool);
  }

  /**
   * Get the tool definitions for LLM function calling
   */
  protected getToolDefinitions(): object[] {
    return this.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: this.schemaToObject(tool.parameters),
    }));
  }

  /**
   * Convert Zod schema to plain object for LLM
   */
  private schemaToObject(parameters: ToolParameter[]): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const param of parameters) {
      const schemaShape = param.schema.flatten();
      properties[param.name] = {
        type: 'object',
        description: param.description,
        ...schemaShape.shape,
      };

      // Check if field is required
      const shape = param.schema.shape;
      if (shape && !(param.name in (shape as Record<string, unknown>))) {
        // Field is optional
      } else {
        required.push(param.name);
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }

  /**
   * Main chat method - process user input and return response
   */
  async chat(input: string, context?: Record<string, unknown>): Promise<AgentResponse> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: context ? `${input}\n\nContext: ${JSON.stringify(context)}` : input,
    });

    // Trim history if needed
    this.trimHistory();

    try {
      // Convert to LLM message format
      const messages = this.prepareMessages();

      // Call LLM with tools
      const response = await this.llm.chat(messages, {
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
      });

      // Check if there are tool calls
      const toolCalls = this.parseToolCalls(response);

      if (toolCalls.length > 0) {
        // Execute tools and collect results
        const toolResults: ToolCall[] = [];

        for (const toolCall of toolCalls) {
          const result = await this.executeTool(toolCall.name, toolCall.arguments);
          toolCall.result = result;

          // Add tool result to conversation
          this.conversationHistory.push({
            role: 'tool',
            content: JSON.stringify(result),
            toolCallId: toolCall.id,
            toolName: toolCall.name,
          });

          toolResults.push(toolCall);
        }

        // Get final response after tool execution
        const finalResponse = await this.llm.chat(this.prepareMessages(), {
          model: this.model,
          temperature: this.temperature,
          maxTokens: this.maxTokens,
        });

        // Save to memory
        this.saveToMemory(input, finalResponse.content, toolResults);

        return {
          content: finalResponse.content,
          toolCalls: toolResults,
          usage: finalResponse.usage ? {
            promptTokens: finalResponse.usage.promptTokens,
            completionTokens: finalResponse.usage.completionTokens,
            totalTokens: finalResponse.usage.totalTokens,
          } : undefined,
        };
      }

      // No tools, return direct response
      this.saveToMemory(input, response.content);

      return {
        content: response.content,
        usage: response.usage ? {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
        } : undefined,
      };
    } catch (error) {
      console.error(`[${this.name}] Error in chat:`, error);
      throw error;
    }
  }

  /**
   * Prepare messages for LLM
   */
  protected prepareMessages(): Message[] {
    return this.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Parse tool calls from LLM response
   */
  private parseToolCalls(response: ChatResponse): { id: string; name: string; arguments: Record<string, unknown> }[] {
    const toolCalls: { id: string; name: string; arguments: Record<string, unknown> }[] = [];

    // Check for Claude-style tool use
    if (response.finishReason === 'function_call' && response.raw) {
      const raw = response.raw as { content?: { type: string; id?: string; name?: string; input?: unknown }[] };
      if (raw.content) {
        for (const block of raw.content) {
          if (block.type === 'tool_use' && block.id && block.name) {
            toolCalls.push({
              id: block.id,
              name: block.name,
              arguments: (block.input as Record<string, unknown>) || {},
            });
          }
        }
      }
    }

    // Also check for function calls in content
    if (response.content.startsWith('{')) {
      try {
        const parsed = JSON.parse(response.content);
        if (parsed.toolCalls) {
          for (const tc of parsed.toolCalls) {
            toolCalls.push({
              id: tc.id,
              name: tc.name,
              arguments: tc.input || {},
            });
          }
        }
      } catch {
        // Not JSON, ignore
      }
    }

    return toolCalls;
  }

  /**
   * Execute a tool by name
   */
  private async executeTool(name: string, arguments_: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.find(t => t.name === name);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' not found`,
      };
    }

    try {
      // Validate parameters against schema
      const validatedParams = this.validateToolParams(tool, arguments_);

      if (!validatedParams.success) {
        return {
          success: false,
          error: `Invalid parameters: ${validatedParams.error}`,
        };
      }

      // Execute tool
      const result = await tool.execute(validatedParams.data!);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error executing tool',
      };
    }
  }

  /**
   * Validate tool parameters against schema
   */
  private validateToolParams(tool: Tool, params: Record<string, unknown>): { success: boolean; data?: Record<string, unknown>; error?: string } {
    try {
      const validated: Record<string, unknown> = {};

      for (const param of tool.parameters) {
        const value = params[param.name];

        if (value === undefined) {
          // Check if required
          continue;
        }

        const result = param.schema.safeParse(value);
        if (result.success) {
          validated[param.name] = result.data;
        } else {
          return {
            success: false,
            error: `Parameter '${param.name}': ${result.error.message}`,
          };
        }
      }

      return { success: true, data: validated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation error',
      };
    }
  }

  /**
   * Save conversation to memory
   */
  private saveToMemory(input: string, output: string, toolCalls?: ToolCall[]): void {
    this.memoryStore.add({
      type: 'conversation',
      content: `User: ${input}\nAssistant: ${output}`,
      metadata: {
        toolsUsed: toolCalls?.map(tc => tc.name) || [],
      },
    });
  }

  /**
   * Save a fact to memory
   */
  remember(content: string, type: 'fact' | 'preference' = 'fact', metadata?: Record<string, unknown>): void {
    this.memoryStore.add({
      type,
      content,
      metadata,
    });
  }

  /**
   * Recall from memory
   */
  recall(query?: string): MemoryEntry[] {
    return this.memoryStore.recall(query);
  }

  /**
   * Get memory context for context injection
   */
  getMemoryContext(): string {
    return this.memoryStore.getContext();
  }

  /**
   * Trim conversation history to max length
   */
  private trimHistory(): void {
    if (this.conversationHistory.length > this.maxHistoryLength) {
      // Keep system prompt and last N messages
      const systemPrompt = this.conversationHistory.find(m => m.role === 'system');
      const otherMessages = this.conversationHistory.filter(m => m.role !== 'system');

      this.conversationHistory = [
        ...(systemPrompt ? [systemPrompt] : []),
        ...otherMessages.slice(-(this.maxHistoryLength - 1)),
      ];
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    const systemPrompt = this.conversationHistory.find(m => m.role === 'system');
    this.conversationHistory = systemPrompt ? [systemPrompt] : [];
  }

  /**
   * Clear all memory
   */
  clearMemory(): void {
    this.memoryStore.clear();
  }

  /**
   * Check if agent has tools
   */
  hasTools(): boolean {
    return this.tools.length > 0;
  }

  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return this.tools.map(t => t.name);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createAgent(config: AgentConfig): BaseAgent {
  return new BaseAgent(config);
}

// ============================================================================
// Export Types
// ============================================================================

export type { Message, ChatResponse, LLMProvider };
