/**
 * Genie Assistant Client
 *
 * Wraps three task-specific assistants:
 *   - genie-shopping-agent     (port 4728) — Consumer shopping assistant
 *   - genie-consultant-agent   (port 4739) — Domain expert consultant
 *   - genie-thinking-engine    (port 4719) — Reasoning + analysis tasks
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface ShoppingProduct {
  id: string;
  title: string;
  brand?: string;
  price: { amount: number; currency: string };
  rating?: number;
  reviewCount?: number;
  thumbnailUrl?: string;
  url: string;
  source: string;
  inStock: boolean;
}

export interface ShoppingOrder {
  id: string;
  userId: string;
  items: Array<{ productId: string; title: string; quantity: number; price: { amount: number; currency: string } }>;
  total: { amount: number; currency: string };
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  placedAt: string;
  estimatedDeliveryAt?: string;
}

export interface ConsultantTurn {
  id: string;
  userId: string;
  domain: 'legal' | 'medical' | 'finance' | 'tax' | 'tech' | 'business' | 'career' | 'education';
  question: string;
  answer: string;
  citations?: Array<{ source: string; url?: string }>;
  confidence: number;
  createdAt: string;
}

export interface ThinkingAnalysis {
  id: string;
  userId: string;
  kind: 'pros-cons' | 'decision-matrix' | 'what-if' | 'first-principles' | 'swot';
  prompt: string;
  analysis: Record<string, unknown>;
  recommendation?: string;
  createdAt: string;
}

export class AssistantClient {
  constructor(private config: HojaiConfig) {}

  // -------- Shopping agent (genie-shopping-agent) --------

  /** Search for products matching a query. */
  async shopping(input: { userId: string; query: string; maxPrice?: number; minRating?: number; limit?: number }): Promise<ShoppingProduct[]> {
    return request<ShoppingProduct[]>(this.config, 'POST', '/api/shopping/search', input);
  }

  /** Track an order placed via the shopping agent. */
  async trackOrder(orderId: string): Promise<ShoppingOrder> {
    return request<ShoppingOrder>(this.config, 'GET', `/api/track/${encodeURIComponent(orderId)}`);
  }

  /** List a user's order history. */
  async orderHistory(input: { userId: string; status?: ShoppingOrder['status']; limit?: number }): Promise<ShoppingOrder[]> {
    return request<ShoppingOrder[]>(this.config, 'GET', `/api/orders${buildQueryString(input as Record<string, unknown>)}`);
  }

  // -------- Consultant (genie-consultant-agent) --------

  /** Ask the consultant a question. */
  async ask(input: { userId: string; domain: ConsultantTurn['domain']; question: string; context?: Record<string, unknown> }): Promise<ConsultantTurn> {
    return request<ConsultantTurn>(this.config, 'POST', '/api/consultant/ask', input);
  }

  /** List the user's past consultant conversations. */
  async listConsultations(input: { userId: string; domain?: ConsultantTurn['domain']; limit?: number }): Promise<ConsultantTurn[]> {
    return request<ConsultantTurn[]>(this.config, 'GET', `/api/consultant/history${buildQueryString(input as Record<string, unknown>)}`);
  }

  // -------- Thinking engine (genie-thinking-engine) --------

  /** Run a structured analysis. */
  async analyze(input: { userId: string; kind: ThinkingAnalysis['kind']; prompt: string; context?: Record<string, unknown> }): Promise<ThinkingAnalysis> {
    return request<ThinkingAnalysis>(this.config, 'POST', '/api/thinking/analyze', input);
  }
}
