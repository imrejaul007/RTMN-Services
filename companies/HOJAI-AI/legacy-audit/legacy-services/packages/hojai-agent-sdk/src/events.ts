/**
 * HOJAI Agent SDK - Events
 * Event bus integration for agents
 */

import type { AgentEvent, AgentExecutionEvent } from './index.js';
import { v4 as uuid } from 'uuid';

// ============================================================================
// EVENT TYPES
// ============================================================================

export type EventHandler = (event: AgentEvent) => void | Promise<void>;

export interface EventBusConfig {
  namespace?: string;
  debug?: boolean;
}

// ============================================================================
// EVENT BUS CLIENT
// ============================================================================

export class EventBusClient {
  private handlers: Map<string, EventHandler[]> = new Map();
  private eventHistory: AgentEvent[] = [];
  private config: EventBusConfig;

  constructor(config: EventBusConfig = {}) {
    this.config = {
      namespace: 'hojai',
      debug: false,
      ...config,
    };
  }

  /**
   * Emit an event
   */
  emit(type: string, data: Record<string, unknown>, options?: { agent?: string; userId?: string; sessionId?: string }): void {
    const event: AgentEvent = {
      type,
      agent: options?.agent || 'unknown',
      userId: options?.userId,
      sessionId: options?.sessionId,
      timestamp: new Date(),
      data,
    };

    // Store in history
    this.eventHistory.push(event);

    // Trim history if too large
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-500);
    }

    // Log if debug mode
    if (this.config.debug) {
      console.log(`[EventBus] ${type}:`, JSON.stringify(data, null, 2));
    }

    // Call handlers
    const handlers = this.handlers.get(type) || [];
    handlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error(`[EventBus] Handler error for ${type}:`, error);
      }
    });

    // Also call wildcard handlers
    const wildcardHandlers = this.handlers.get('*') || [];
    wildcardHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error(`[EventBus] Wildcard handler error:`, error);
      }
    });
  }

  /**
   * Subscribe to an event type
   */
  on(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to an event type (one-time)
   */
  once(type: string, handler: EventHandler): void {
    const wrappedHandler = (event: AgentEvent) => {
      handler(event);
      this.off(type, wrappedHandler);
    };
    this.on(type, wrappedHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off(type: string, handler: EventHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Get event history
   */
  getHistory(options?: { type?: string; agent?: string; userId?: string; limit?: number }): AgentEvent[] {
    let events = this.eventHistory;

    if (options?.type) {
      events = events.filter((e) => e.type === options.type);
    }
    if (options?.agent) {
      events = events.filter((e) => e.agent === options.agent);
    }
    if (options?.userId) {
      events = events.filter((e) => e.userId === options.userId);
    }

    if (options?.limit) {
      events = events.slice(-options.limit);
    }

    return events;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }
}

// ============================================================================
// PRE-BUILT EVENT EMITTERS
// ============================================================================

/**
 * Emit an agent execution started event
 */
export function emitExecutionStarted(
  agent: string,
  input: unknown,
  options?: { userId?: string; sessionId?: string }
): void {
  globalEventBus.emit('agent.execution.started', { input }, { agent, ...options });
}

/**
 * Emit an agent execution completed event
 */
export function emitExecutionCompleted(
  agent: string,
  input: unknown,
  output: unknown,
  duration: number,
  options?: { userId?: string; sessionId?: string }
): void {
  globalEventBus.emit('agent.execution.completed', { input, output, duration }, { agent, ...options });
}

/**
 * Emit an agent execution failed event
 */
export function emitExecutionFailed(
  agent: string,
  input: unknown,
  error: string,
  options?: { userId?: string; sessionId?: string }
): void {
  globalEventBus.emit('agent.execution.failed', { input, error }, { agent, ...options });
}

/**
 * Emit a tool execution event
 */
export function emitToolExecution(
  agent: string,
  toolName: string,
  args: Record<string, unknown>,
  result: unknown,
  duration: number,
  options?: { userId?: string; sessionId?: string }
): void {
  globalEventBus.emit(
    'tool.executed',
    { toolName, args, result, duration },
    { agent, ...options }
  );
}

/**
 * Emit a memory event
 */
export function emitMemoryEvent(
  agent: string,
  action: 'store' | 'recall' | 'update' | 'delete',
  entryType: string,
  content: string,
  options?: { userId?: string; sessionId?: string }
): void {
  globalEventBus.emit('memory.operation', { action, entryType, content }, { agent, ...options });
}

// ============================================================================
// GLOBAL EVENT BUS
// ============================================================================

export const globalEventBus = new EventBusClient();

// ============================================================================
// EVENT TYPES EXPORT
// ============================================================================

// Types are already exported above in this file
