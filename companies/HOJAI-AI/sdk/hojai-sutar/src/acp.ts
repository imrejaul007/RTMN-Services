/**
 * ACP Client (Autonomous Collaboration Protocol)
 *
 * ACP is the universal protocol for AI-to-AI communication.
 * This client wraps the SUTAR ACP service for sending messages,
 * negotiating, and coordinating between agents.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type ACPMessageType = 'QUERY' | 'OFFER' | 'COUNTER' | 'ACCEPT' | 'REJECT' | 'ORDER' | 'TASK' | 'NOTIFY' | 'NEGOTIATE' | 'BROADCAST' | 'PING' | 'PONG';

export interface ACPMessage {
  id: string;
  type: ACPMessageType;
  sender: string;
  receiver: string | string[];
  conversationId?: string;
  payload: Record<string, unknown>;
  timestamp: string;
  ttl?: number;
  signature?: string;
}

export interface SendMessageRequest {
  type: ACPMessageType;
  sender: string;
  receiver: string | string[];
  payload: Record<string, unknown>;
  conversationId?: string;
  ttl?: number;
}

export interface NegotiationRequest {
  myAgentId: string;
  counterpartyId: string;
  topic: string;
  initialOffer: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  maxRounds?: number;
}

export interface NegotiationResult {
  negotiationId: string;
  status: 'in_progress' | 'agreed' | 'rejected' | 'timeout';
  rounds: { round: number; offer: Record<string, unknown>; response?: 'accept' | 'reject' | 'counter' }[];
  finalAgreement?: Record<string, unknown>;
}

export class ACPClient {
  constructor(private config: HojaiConfig) {}

  async send(input: SendMessageRequest): Promise<ACPMessage> {
    return request<ACPMessage>(this.config, 'POST', '/api/v1/acp/messages', input);
  }

  async listMessages(input: { conversationId?: string; since?: string; limit?: number }): Promise<ACPMessage[]> {
    return request<ACPMessage[]>(this.config, 'POST', '/api/v1/acp/messages/list', input);
  }

  async negotiate(input: NegotiationRequest): Promise<NegotiationResult> {
    return request<NegotiationResult>(this.config, 'POST', '/api/v1/acp/negotiate', input);
  }

  async getNegotiation(id: string): Promise<NegotiationResult> {
    return request<NegotiationResult>(this.config, 'GET', `/api/v1/acp/negotiations/${encodeURIComponent(id)}`);
  }

  async acceptNegotiation(id: string, finalTerms: Record<string, unknown>): Promise<NegotiationResult> {
    return request<NegotiationResult>(this.config, 'POST', `/api/v1/acp/negotiations/${encodeURIComponent(id)}/accept`, { finalTerms });
  }

  async rejectNegotiation(id: string, reason: string): Promise<NegotiationResult> {
    return request<NegotiationResult>(this.config, 'POST', `/api/v1/acp/negotiations/${encodeURIComponent(id)}/reject`, { reason });
  }

  async ping(agentId: string): Promise<{ alive: boolean; latencyMs: number }> {
    return request<{ alive: boolean; latencyMs: number }>(this.config, 'GET', `/api/v1/acp/ping?agentId=${encodeURIComponent(agentId)}`);
  }
}
