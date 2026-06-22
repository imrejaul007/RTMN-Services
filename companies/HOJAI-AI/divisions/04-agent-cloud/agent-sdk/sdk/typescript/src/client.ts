// TypeScript SDK for building HOJAI AI agents
// Source served by services/agent-sdk (port 4187)

import { AgentManifest, AgentRequest, AgentResponse, HojaiClientOptions } from './types';

export class HojaiAgentClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(options: HojaiClientOptions) {
    this.baseUrl = options.baseUrl || 'http://localhost:4186';
    this.apiKey = options.apiKey || '';
  }

  /** Register a new agent with the security registry */
  async register(manifest: AgentManifest): Promise<{ id: string }> {
    return this.post('/api/agents', manifest);
  }

  /** Issue a capability token for this agent */
  async issueCapabilityToken(agentId: string, capabilities: string[]): Promise<any> {
    return this.post('/api/capability-tokens', { agent_id: agentId, capabilities });
  }

  /** Verify a capability token before invoking an action */
  async verifyCapabilityToken(token: any, requiredCapability: string): Promise<boolean> {
    const res: any = await this.post('/api/capability-tokens/verify', { token, required_capability: requiredCapability });
    return res.valid === true;
  }

  /** Scan input for threats (credential exposure, injection, etc.) */
  async scan(input: string): Promise<{ safe: boolean; threats: any[] }> {
    return this.post('/api/scan', { input });
  }

  /** Quarantine an agent */
  async quarantine(agentId: string): Promise<void> {
    await this.post(`/api/agents/${agentId}/quarantine`, {});
  }

  private async post(path: string, body: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  }
}

/** Helper: build a sales-assistant agent manifest */
export function salesAssistantManifest(name: string): AgentManifest {
  return {
    name,
    owner: 'sales-team',
    scopes: ['read:contacts', 'write:leads', 'invoke:llm']
  };
}