/**
 * Nexha ACP Messaging Client
 *
 * Wraps nexha-acp-messaging: cross-Nexha negotiation, multi-party
 * message exchange for autonomous business deals.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type NegotiationStatus = 'open' | 'in_progress' | 'agreed' | 'rejected' | 'expired';

export interface NegotiationMessage {
  id: string;
  negotiationId: string;
  from: string;
  to: string | string[];
  type: 'offer' | 'counter' | 'accept' | 'reject' | 'query' | 'info';
  payload: Record<string, unknown>;
  sentAt: string;
}

export interface Negotiation {
  id: string;
  tenantId: string;
  parties: Array<{ partyId: string; role: 'buyer' | 'seller' | 'broker'; tenantId: string }>;
  topic: string;
  status: NegotiationStatus;
  currentOffer?: Record<string, unknown>;
  rounds: number;
  agreedTerms?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface CreateNegotiationInput {
  parties: Array<{ partyId: string; role: 'buyer' | 'seller' | 'broker'; tenantId: string }>;
  topic: string;
  initialOffer: Record<string, unknown>;
  expiresAt?: string;
}

export interface SendMessageInput {
  type: NegotiationMessage['type'];
  payload: Record<string, unknown>;
}

export class AcpClient {
  constructor(private config: HojaiConfig) {}

  async createNegotiation(input: CreateNegotiationInput): Promise<Negotiation> {
    return request<Negotiation>(this.config, 'POST', '/api/negotiations', input);
  }

  async listNegotiations(input: { status?: NegotiationStatus; partyId?: string } = {}): Promise<Negotiation[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Negotiation[]>(this.config, 'GET', `/api/negotiations?${params.toString()}`);
  }

  async getNegotiation(id: string): Promise<Negotiation> {
    return request<Negotiation>(this.config, 'GET', `/api/negotiations/${encodeURIComponent(id)}`);
  }

  async listMessages(negotiationId: string): Promise<NegotiationMessage[]> {
    return request<NegotiationMessage[]>(this.config, 'GET', `/api/negotiations/${encodeURIComponent(negotiationId)}/messages`);
  }

  async sendMessage(negotiationId: string, input: SendMessageInput): Promise<NegotiationMessage> {
    return request<NegotiationMessage>(this.config, 'POST', `/api/negotiations/${encodeURIComponent(negotiationId)}/messages`, input);
  }

  async stats(): Promise<{ totalNegotiations: number; byStatus: Record<NegotiationStatus, number>; avgRounds: number }> {
    return request(this.config, 'GET', '/api/stats');
  }
}