/**
 * Hojai LLM Adapter - Context Builder
 *
 * Builds rich context from employee data for LLM prompts
 */

import {
  EmployeeContext,
  ChatMessage,
  MessageRole
} from './types/index.js';
import { promptTemplates } from './promptTemplates.js';

// ============================================================================
// CONTEXT BUILDER
// ============================================================================

export interface ContextBuilderOptions {
  maxHistoryMessages?: number;
  maxMemoryItems?: number;
  includeSystemPrompt?: boolean;
  language?: string;
}

export interface BuiltContext {
  systemPrompt: string;
  messages: ChatMessage[];
  estimatedTokens: number;
}

/**
 * Builds context from employee data for LLM requests
 */
export class ContextBuilder {
  private options: Required<ContextBuilderOptions>;
  private readonly logger: Console;

  constructor(options: ContextBuilderOptions = {}, logger?: Console) {
    this.options = {
      maxHistoryMessages: options.maxHistoryMessages || 20,
      maxMemoryItems: options.maxMemoryItems || 10,
      includeSystemPrompt: options.includeSystemPrompt ?? true,
      language: options.language || 'en'
    };
    this.logger = logger || console;
  }

  /**
   * Build complete context for a chat request
   */
  build(employee: EmployeeContext, conversation: ChatMessage[]): BuiltContext {
    const systemPrompt = this.options.includeSystemPrompt
      ? this.buildSystemPrompt(employee)
      : '';

    const recentMessages = conversation.slice(-this.options.maxHistoryMessages);
    const memoryMessages = this.buildMemoryMessages(employee);

    const messages: ChatMessage[] = [];

    if (memoryMessages.length > 0) {
      messages.push(...memoryMessages);
    }

    messages.push(...recentMessages);

    const estimatedTokens = this.estimateTokens(systemPrompt + messages.map(m => m.content).join(' '));

    return {
      systemPrompt,
      messages,
      estimatedTokens
    };
  }

  /**
   * Build system prompt for an employee
   */
  buildSystemPrompt(employee: EmployeeContext): string {
    const template = promptTemplates.getForRole(employee.role);

    return template({
      name: employee.name,
      capabilities: employee.capabilities,
      knowledge: employee.knowledge,
      tone: employee.tone || 'professional',
      language: employee.language || this.options.language,
      timezone: employee.timezone
    });
  }

  /**
   * Build memory context messages
   */
  buildMemoryMessages(employee: EmployeeContext): ChatMessage[] {
    if (!employee.recentMemory || employee.recentMemory.length === 0) {
      return [];
    }

    const sortedMemory = [...employee.recentMemory]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, this.options.maxMemoryItems);

    const memoryContent = sortedMemory
      .map(m => `[${m.type.toUpperCase()}] ${m.content}`)
      .join('\n');

    return [{
      role: MessageRole.SYSTEM,
      content: `Relevant context from recent interactions:\n${memoryContent}`
    }];
  }

  /**
   * Build context for a specific task
   */
  buildTaskContext(
    employee: EmployeeContext,
    taskType: string,
    taskData: Record<string, unknown>
  ): BuiltContext {
    const template = promptTemplates.getForTask(taskType);

    const systemPrompt = template({
      name: employee.name,
      role: employee.role,
      taskData,
      tone: employee.tone || 'professional',
      language: employee.language || this.options.language
    });

    return {
      systemPrompt,
      messages: [],
      estimatedTokens: this.estimateTokens(systemPrompt)
    };
  }

  /**
   * Truncate conversation to fit token limit
   */
  truncateToFit(
    messages: ChatMessage[],
    maxTokens: number,
    systemPromptTokens: number = 0
  ): ChatMessage[] {
    const availableTokens = maxTokens - systemPromptTokens - 100; // Reserve 100 tokens buffer

    let totalTokens = 0;
    const result: ChatMessage[] = [];

    // Process in reverse (newest first)
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgTokens = this.estimateTokens(msg.content);

      if (totalTokens + msgTokens <= availableTokens) {
        result.unshift(msg);
        totalTokens += msgTokens;
      } else {
        break;
      }
    }

    // Ensure we keep at least the system prompt and last user message
    if (result.length === 0 && messages.length > 0) {
      result.push(messages[messages.length - 1]);
    }

    this.logger.debug(`[ContextBuilder] Truncated ${messages.length} messages to ${result.length}, ~${totalTokens} tokens`);

    return result;
  }

  /**
   * Estimate token count for text
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English
    // This is an approximation; actual tokenizers may differ
    return Math.ceil(text.length / 4);
  }

  /**
   * Build context for document analysis
   */
  buildDocumentContext(
    employee: EmployeeContext,
    documentType: string,
    documentContent: string
  ): BuiltContext {
    const systemPrompt = promptTemplates.documentAnalysis({
      name: employee.name,
      role: employee.role,
      documentType,
      tone: employee.tone || 'professional'
    });

    const estimatedTokens = this.estimateTokens(systemPrompt + documentContent);

    return {
      systemPrompt,
      messages: [{
        role: MessageRole.USER,
        content: documentContent
      }],
      estimatedTokens
    };
  }

  /**
   * Build context for query analysis
   */
  buildAnalysisContext(
    employee: EmployeeContext,
    query: string
  ): BuiltContext {
    const systemPrompt = promptTemplates.queryAnalysis({
      name: employee.name,
      role: employee.role
    });

    return {
      systemPrompt,
      messages: [{
        role: MessageRole.USER,
        content: query
      }],
      estimatedTokens: this.estimateTokens(systemPrompt + query)
    };
  }
}

// ============================================================================
// SPECIALIZED CONTEXT BUILDERS
// ============================================================================

/**
 * Build context for sales employee
 */
export function buildSalesContext(
  employee: EmployeeContext,
  conversation: ChatMessage[]
): BuiltContext {
  const builder = new ContextBuilder();
  const context = builder.build(employee, conversation);

  // Add sales-specific system instructions
  const salesInstructions = `
You are helping a potential customer. Focus on:
- Understanding their needs and pain points
- Presenting relevant products/solutions
- Handling objections professionally
- Guiding toward a purchase decision
- Never be pushy; be helpful and consultative
`.trim();

  context.systemPrompt = `${context.systemPrompt}\n\n${salesInstructions}`;

  return context;
}

/**
 * Build context for support employee
 */
export function buildSupportContext(
  employee: EmployeeContext,
  conversation: ChatMessage[],
  ticketInfo?: {
    ticketId: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    category?: string;
  }
): BuiltContext {
  const builder = new ContextBuilder();
  const context = builder.build(employee, conversation);

  // Add support-specific system instructions
  const priorityLabel = ticketInfo?.priority?.toUpperCase() || 'MEDIUM';
  const ticketContext = ticketInfo
    ? `\nTicket ID: ${ticketInfo.ticketId}\nPriority: ${priorityLabel}`
    : '';

  const supportInstructions = `
You are helping a customer with a support issue.${ticketContext}
Focus on:
- Being empathetic and patient
- Understanding the exact issue
- Providing clear, actionable solutions
- Escalating when appropriate
- Following up on resolution
- Being thorough but efficient
`.trim();

  context.systemPrompt = `${context.systemPrompt}\n\n${supportInstructions}`;

  return context;
}

/**
 * Build context for analyst employee
 */
export function buildAnalystContext(
  employee: EmployeeContext,
  query: string,
  dataContext?: {
    metrics?: string[];
    timeframe?: string;
    comparisonPeriod?: string;
  }
): BuiltContext {
  const builder = new ContextBuilder();

  const systemPrompt = promptTemplates.analyst({
    name: employee.name,
    dataContext
  });

  return {
    systemPrompt,
    messages: [{
      role: MessageRole.USER,
      content: query
    }],
    estimatedTokens: builder.estimateTokens(systemPrompt + query)
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export function createContextBuilder(
  options?: ContextBuilderOptions,
  logger?: Console
): ContextBuilder {
  return new ContextBuilder(options, logger);
}
