/**
 * AgentOS SDK — Agent Execution Engine client (port 4804).
 */

import type { AgentOSConfig, ExecutionRequest, ExecutionResult } from './types.js';
import { AgentOSClient } from './client.js';
import { AgentNotFoundError } from './errors.js';

const DEFAULT_EXECUTION_PORT = 4804;

export class AgentExecutionClient {
  private readonly http: AgentOSClient;
  private readonly port: number;

  constructor(config: AgentOSConfig = {}) {
    this.http = new AgentOSClient(config);
    this.port = config.executionPort ?? DEFAULT_EXECUTION_PORT;
  }

  private url(path: string) { return this.http.url(this.port, path); }

  async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    try {
      return await this.http.post<ExecutionResult>(this.url('/api/execute'), req);
    } catch (err) {
      const ae = err as { statusCode?: number };
      if (ae?.statusCode === 404) throw new AgentNotFoundError(req.agentId);
      throw err;
    }
  }

  async waitForCompletion(executionId: string, intervalMs = 2000, maxWaitMs = 300_000): Promise<ExecutionResult> {
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      const result = await this.getExecution(executionId);
      if (result.status === 'completed' || result.status === 'failed' || result.status === 'cancelled') {
        return result;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return this.getExecution(executionId);
  }

  async getExecution(executionId: string): Promise<ExecutionResult> {
    return this.http.get<ExecutionResult>(this.url(`/api/executions/${encodeURIComponent(executionId)}`));
  }

  async listExecutions(agentId: string, limit = 50): Promise<ExecutionResult[]> {
    const res = await this.http.get<{ count: number; executions: ExecutionResult[] }>(
      this.url(`/api/executions?agentId=${encodeURIComponent(agentId)}&limit=${limit}`)
    );
    return res.executions ?? [];
  }

  async cancelExecution(executionId: string): Promise<ExecutionResult> {
    return this.http.post<ExecutionResult>(this.url(`/api/executions/${encodeURIComponent(executionId)}/cancel`));
  }

  async isHealthy(): Promise<boolean> { return this.http.ping(this.port); }
}
