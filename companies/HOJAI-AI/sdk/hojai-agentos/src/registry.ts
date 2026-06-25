/**
 * AgentOS SDK — Agent Registry client (port 4803).
 *
 * Full agent lifecycle: create → deploy → pause → resume → heartbeat → retire.
 * Plus version snapshots, capability search, execution, observability.
 */

import type {
  AgentOSConfig,
  AgentSummary,
  CreateAgentOptions,
  UpdateAgentOptions,
  AgentVersion,
  AgentSearchOptions,
  ExecutionRequest,
  ExecutionResult,
  AgentMetrics,
} from './types.js';
import { AgentOSClient } from './client.js';
import { AgentNotFoundError, AgentValidationError, AgentLifecycleError } from './errors.js';

const DEFAULT_REGISTRY_PORT = 4803;
const DEFAULT_EXECUTION_PORT = 4804;
const DEFAULT_OBSERV_PORT = 4810;

export class AgentRegistryClient {
  private readonly http: AgentOSClient;
  private readonly registryPort: number;
  private readonly executionPort: number;
  private readonly observPort: number;

  constructor(config: AgentOSConfig = {}) {
    this.http = new AgentOSClient(config);
    this.registryPort = config.registryPort ?? DEFAULT_REGISTRY_PORT;
    this.executionPort = config.executionPort ?? DEFAULT_EXECUTION_PORT;
    this.observPort = config.observabilityPort ?? DEFAULT_OBSERV_PORT;
  }

  private reg(path: string) { return this.http.url(this.registryPort, path); }
  private exec(path: string) { return this.http.url(this.executionPort, path); }
  private obs(path: string) { return this.http.url(this.observPort, path); }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async create(options: CreateAgentOptions): Promise<AgentSummary> {
    const body = { ...options, version: options.version ?? '1.0.0' };
    try {
      return await this.http.post<AgentSummary>(this.reg('/api/agents'), body);
    } catch (err) {
      if (err instanceof AgentValidationError) throw err;
      const ae = err as { statusCode?: number; details?: unknown };
      if (ae?.statusCode === 400) throw new AgentValidationError((ae.details as string[]) ?? []);
      throw err;
    }
  }

  async list(options: AgentSearchOptions = {}): Promise<AgentSummary[]> {
    const params = new URLSearchParams();
    if (options.type) params.set('type', options.type);
    if (options.status) params.set('status', options.status);
    if (options.capability) params.set('capability', options.capability);
    const qs = params.toString();
    const res = await this.http.get<{ count: number; agents: AgentSummary[] }>(
      this.reg(`/api/agents${qs ? `?${qs}` : ''}`)
    );
    return res.agents ?? [];
  }

  async get(agentId: string): Promise<AgentSummary> {
    try {
      return await this.http.get<AgentSummary>(this.reg(`/api/agents/${encodeURIComponent(agentId)}`));
    } catch (err) {
      const ae = err as { statusCode?: number };
      if (ae?.statusCode === 404) throw new AgentNotFoundError(agentId);
      throw err;
    }
  }

  async update(agentId: string, changes: UpdateAgentOptions): Promise<AgentSummary> {
    try {
      return await this.http.patch<AgentSummary>(
        this.reg(`/api/agents/${encodeURIComponent(agentId)}`),
        changes
      );
    } catch (err) {
      const ae = err as { statusCode?: number; details?: unknown };
      if (ae?.statusCode === 400) throw new AgentValidationError((ae.details as string[]) ?? []);
      if (ae?.statusCode === 404) throw new AgentNotFoundError(agentId);
      throw err;
    }
  }

  async delete(agentId: string): Promise<void> {
    try {
      await this.http.del<{ deleted: boolean; id: string }>(
        this.reg(`/api/agents/${encodeURIComponent(agentId)}`)
      );
    } catch (err) {
      const ae = err as { statusCode?: number };
      if (ae?.statusCode === 404) throw new AgentNotFoundError(agentId);
      throw err;
    }
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  /** Deploy: creates or activates the agent. */
  async deploy(options: CreateAgentOptions): Promise<AgentSummary> {
    try {
      const agents = await this.list({ capability: options.capabilities?.[0] });
      const existing = agents.find((a) => a.name === options.name);
      if (existing) {
        if (existing.status === 'active') return existing;
        return this.update(existing.id, { status: 'active' });
      }
    } catch { /* fall through to create */ }
    const created = await this.create(options);
    return this.update(created.id, { status: 'active' });
  }

  async pause(agentId: string): Promise<AgentSummary> {
    const agent = await this.get(agentId);
    if (agent.status === 'retired') throw new AgentLifecycleError(agentId, 'pause', 'agent is retired');
    if (agent.status === 'paused') return agent;
    return this.update(agentId, { status: 'paused' });
  }

  async resume(agentId: string): Promise<AgentSummary> {
    const agent = await this.get(agentId);
    if (agent.status === 'retired') throw new AgentLifecycleError(agentId, 'resume', 'agent is retired');
    if (agent.status === 'active') return agent;
    return this.update(agentId, { status: 'active' });
  }

  async heartbeat(agentId: string): Promise<AgentSummary> {
    try {
      return await this.http.post<AgentSummary>(
        this.reg(`/api/agents/${encodeURIComponent(agentId)}/heartbeat`)
      );
    } catch (err) {
      const ae = err as { statusCode?: number };
      if (ae?.statusCode === 404) throw new AgentNotFoundError(agentId);
      throw err;
    }
  }

  // ─── Versioning ─────────────────────────────────────────────────────────

  async getVersions(agentId: string): Promise<AgentVersion[]> {
    try {
      const res = await this.http.get<{ agentId: string; count: number; versions: AgentVersion[] }>(
        this.reg(`/api/agents/${encodeURIComponent(agentId)}/versions`)
      );
      return res.versions ?? [];
    } catch (err) {
      const ae = err as { statusCode?: number };
      if (ae?.statusCode === 404) throw new AgentNotFoundError(agentId);
      throw err;
    }
  }

  async snapshot(agentId: string): Promise<AgentVersion> {
    try {
      return await this.http.post<AgentVersion>(
        this.reg(`/api/agents/${encodeURIComponent(agentId)}/versions`)
      );
    } catch (err) {
      const ae = err as { statusCode?: number };
      if (ae?.statusCode === 404) throw new AgentNotFoundError(agentId);
      throw err;
    }
  }

  // ─── Execution ───────────────────────────────────────────────────────────

  async execute(agentId: string, task: string, input?: Record<string, unknown>): Promise<ExecutionResult> {
    const body: ExecutionRequest = { agentId, task, input };
    try {
      return await this.http.post<ExecutionResult>(this.exec('/api/execute'), body);
    } catch (err) {
      const ae = err as { statusCode?: number };
      if (ae?.statusCode === 404) throw new AgentNotFoundError(agentId);
      throw err;
    }
  }

  async getExecution(executionId: string): Promise<ExecutionResult> {
    return this.http.get<ExecutionResult>(
      this.exec(`/api/executions/${encodeURIComponent(executionId)}`)
    );
  }

  // ─── Observability ───────────────────────────────────────────────────────

  async getMetrics(agentId: string): Promise<AgentMetrics> {
    return this.http.get<AgentMetrics>(
      this.obs(`/api/agents/${encodeURIComponent(agentId)}/metrics`)
    );
  }

  // ─── Health ─────────────────────────────────────────────────────────────

  async isHealthy(): Promise<boolean> { return this.http.ping(this.registryPort); }

  async healthCheck() {
    return {
      registry: await this.http.ping(this.registryPort),
      execution: await this.http.ping(this.executionPort),
      observability: await this.http.ping(this.observPort),
    };
  }
}
