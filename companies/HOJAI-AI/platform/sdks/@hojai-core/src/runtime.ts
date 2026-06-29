/**
 * HOJAI Runtime
 */

import { Client } from './client';

export interface RuntimeContext {
  executionId: string;
  timestamp: number;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export class Runtime {
  private client: Client;
  private currentContext?: RuntimeContext;

  constructor(client: Client) {
    this.client = client;
  }

  async execute<T>(
    fn: (ctx: RuntimeContext) => Promise<T>,
    context?: Partial<RuntimeContext>
  ): Promise<T> {
    const ctx: RuntimeContext = {
      executionId: generateId(),
      timestamp: Date.now(),
      tenantId: context?.tenantId,
      userId: context?.userId,
      metadata: context?.metadata,
    };

    this.currentContext = ctx;

    try {
      // Log execution start
      this.client.logger.info('Runtime execution started', { executionId: ctx.executionId });

      const result = await fn(ctx);

      // Log success
      this.client.logger.info('Runtime execution completed', {
        executionId: ctx.executionId,
        duration: Date.now() - ctx.timestamp,
      });

      return result;
    } catch (error) {
      // Log failure
      this.client.logger.error('Runtime execution failed', {
        executionId: ctx.executionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      this.currentContext = undefined;
    }
  }

  getContext(): RuntimeContext | undefined {
    return this.currentContext;
  }

  async health(): Promise<{ status: string; uptime: number }> {
    return this.client.request('GET', '/runtime/health');
  }

  async stats(): Promise<{ executions: number; errors: number; avgDuration: number }> {
    return this.client.request('GET', '/runtime/stats');
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
