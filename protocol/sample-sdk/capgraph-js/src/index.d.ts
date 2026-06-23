// TypeScript declarations for @rtmn/capgraph v0.1.0

export interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  industry?: string;
  endpoint?: string;
  trustScore?: number;       // 0..100, server-computed rollup
  registeredAt?: string;     // ISO-8601
}

export interface SearchQuery {
  q?: string;
  tags?: string[];
  minTrust?: number;
  industry?: string;
  limit?: number;
  cursor?: string;
}

export interface SearchResult {
  results: Agent[];
  nextCursor?: string;
}

export type TrustSignalKind = 'delivery' | 'quality' | 'dispute' | 'compliance';

export interface TrustSignal {
  agentId: string;
  kind: TrustSignalKind;
  score: number;             // 0..100
  evidenceRef?: string;
  reporterDid?: string;
}

export interface ClientOptions {
  baseUrl: string;
  token?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface CapgraphClient {
  baseUrl: string;
  fetchAgent(agentId: string): Promise<Agent>;
  searchCapabilities(q?: SearchQuery): Promise<SearchResult>;
  registerAgent(agent: Agent): Promise<Agent>;
  reportTrustSignal(signal: TrustSignal): Promise<{ ok: true; signalId: string }>;
}

export function createClient(opts: ClientOptions): CapgraphClient;
export class CapgraphError extends Error {
  status?: number;
  body?: unknown;
}
