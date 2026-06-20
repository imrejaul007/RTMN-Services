// Type definitions for the HOJAI TypeScript Agent SDK

export interface AgentManifest {
  name: string;
  owner: string;
  scopes: string[];
}

export interface AgentRequest {
  agent_id: string;
  input: string;
  context?: Record<string, any>;
}

export interface AgentResponse {
  output: string;
  tokens_used: number;
  capability_token_id?: string;
}

export interface HojaiClientOptions {
  baseUrl?: string;
  apiKey?: string;
}