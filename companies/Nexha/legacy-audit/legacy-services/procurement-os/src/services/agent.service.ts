/**
 * NeXha ProcurementOS - Supplier Agent
 *
 * Handles autonomous communication between buyers and suppliers:
 * - Sends RFQ invitations to matched suppliers
 * - Receives and evaluates supplier quotes
 * - Manages negotiation rounds
 * - Tracks supplier response SLAs
 * - Escalates non-responsive suppliers
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';
import axios from 'axios';

// ============================================================================
// Types
// ============================================================================

export type NegotiationRound = 'initial' | 'counter_offer' | 'final' | 'accepted' | 'rejected' | 'withdrawn';
export type SupplierResponseStatus = 'pending' | 'viewed' | 'responded' | 'negotiating' | 'accepted' | 'declined' | 'expired';
export type AgentAction = 'send_rfq' | 'send_reminder' | 'send_counter' | 'accept' | 'reject' | 'escalate';

export interface SupplierAgent {
  supplierId: string;
  supplierName: string;
  email: string;
  phone: string;
  preferredChannel: 'email' | 'sms' | 'whatsapp' | 'api';
  webhookUrl?: string;
  apiKey?: string;
  slaHours: number;        // Expected response time in hours
  isActive: boolean;
  lastContactedAt?: Date;
}

export interface AgentMessage {
  id: string;
  messageId: string;
  agentId: string;
  supplierId: string;
  rfqId: string;
  dealId: string;
  direction: 'outbound' | 'inbound';
  channel: 'email' | 'sms' | 'whatsapp' | 'api' | 'portal';
  subject?: string;
  body: string;
  attachments?: Array<{ name: string; url: string }>;
  action?: AgentAction;
  round: NegotiationRound;
  quotedAmount?: number;
  previousAmount?: number;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  responseAt?: Date;
}

export interface NegotiationSession {
  id: string;
  dealId: string;
  supplierId: string;
  supplierName: string;
  rfqId: string;
  rfqNumber: string;
  currentRound: NegotiationRound;
  rounds: NegotiationRoundEntry[];
  status: 'active' | 'completed' | 'expired' | 'escalated';
  bestQuote: {
    amount: number;
    validUntil: Date;
    terms: string;
  } | null;
  targetPrice?: number;
  bestPrice?: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface NegotiationRoundEntry {
  round: NegotiationRound;
  supplierId: string;
  supplierName: string;
  quotedAmount: number;
  deliveryDays: number;
  paymentTerms: string;
  notes?: string;
  timestamp: Date;
  action: AgentAction;
}

// ============================================================================
// Schemas
// ============================================================================

export const SendRFQSchema = z.object({
  supplierId: z.string().uuid(),
  rfqId: z.string().uuid(),
  dealId: z.string().uuid(),
  preferredChannel: z.enum(['email', 'sms', 'whatsapp', 'api', 'portal']).default('email'),
});

export const RecordResponseSchema = z.object({
  dealId: z.string().uuid(),
  supplierId: z.string().uuid(),
  quotedAmount: z.number().positive(),
  deliveryDays: z.number().int().positive(),
  paymentTerms: z.string(),
  notes: z.string().optional(),
  validUntil: z.string().datetime(),
  action: z.enum(['accept', 'counter_offer', 'reject']),
});

export type SendRFQInput = z.infer<typeof SendRFQSchema>;
export type RecordResponseInput = z.infer<typeof RecordResponseSchema>;

// ============================================================================
// Supplier Agent Service
// ============================================================================

export class SupplierAgentService {
  private agents = new Map<string, SupplierAgent>();
  private messages = new Map<string, AgentMessage>();
  private negotiations = new Map<string, NegotiationSession>();

  /**
   * Register a supplier agent (webhook/API endpoint for supplier automation)
   */
  registerAgent(supplierId: string, agent: Omit<SupplierAgent, 'isActive'>): SupplierAgent {
    const full: SupplierAgent = { ...agent, isActive: true };
    this.agents.set(supplierId, full);
    return full;
  }

  /**
   * Get agent for a supplier
   */
  getAgent(supplierId: string): SupplierAgent | null {
    return this.agents.get(supplierId) || null;
  }

  /**
   * Send RFQ to a supplier via their preferred channel
   * Returns the message record created
   */
  async sendRFQToSupplier(input: {
    supplierId: string;
    supplierName: string;
    email: string;
    phone: string;
    rfqId: string;
    rfqNumber: string;
    dealId: string;
    items: Array<{ name: string; quantity: number; unit: string }>;
    totalAmount: number;
    deadline: Date;
    preferredChannel: SupplierAgent['preferredChannel'];
    webhookUrl?: string;
    apiKey?: string;
  }): Promise<AgentMessage> {
    const agent = this.getOrCreateAgent(input);
    const messageId = randomUUID();

    const message: AgentMessage = {
      id: randomUUID(),
      messageId,
      agentId: agent.supplierId,
      supplierId: input.supplierId,
      rfqId: input.rfqId,
      dealId: input.dealId,
      direction: 'outbound',
      channel: input.preferredChannel === 'portal' ? 'api' : input.preferredChannel,
      body: this.buildRFQMessage(input),
      action: 'send_rfq',
      round: 'initial',
      quotedAmount: input.totalAmount,
      sentAt: new Date(),
    };

    this.messages.set(messageId, message);

    // Send via the appropriate channel
    await this.dispatchMessage(agent, message);

    return message;
  }

  /**
   * Record a supplier's quote response
   */
  async recordSupplierResponse(
    input: RecordResponseInput & { supplierName: string; rfqNumber: string }
  ): Promise<NegotiationSession | null> {
    const session = this.negotiations.get(input.dealId);
    if (!session) return null;

    const round: NegotiationRound =
      input.action === 'accept' ? 'accepted' :
      input.action === 'reject' ? 'rejected' :
      input.action === 'counter_offer' ? 'counter_offer' : 'responded';

    const entry: NegotiationRoundEntry = {
      round,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      quotedAmount: input.quotedAmount,
      deliveryDays: input.deliveryDays,
      paymentTerms: input.paymentTerms,
      notes: input.notes,
      timestamp: new Date(),
      action: input.action === 'accept' ? 'accept' : input.action === 'reject' ? 'reject' : 'send_counter',
    };

    // Update best quote tracking
    if (!session.bestQuote || input.quotedAmount < session.bestQuote.amount) {
      session.bestQuote = {
        amount: input.quotedAmount,
        validUntil: new Date(input.validUntil),
        terms: input.paymentTerms,
      };
      session.bestPrice = input.quotedAmount;
    }

    session.rounds.push(entry);
    session.currentRound = round;
    session.updatedAt = new Date();

    if (round === 'accepted') {
      session.status = 'completed';
    } else if (round === 'counter_offer') {
      session.status = 'active';
    }

    this.negotiations.set(input.dealId, session);

    // Create inbound message record
    const inboundMsg: AgentMessage = {
      id: randomUUID(),
      messageId: randomUUID(),
      agentId: input.supplierId,
      supplierId: input.supplierId,
      rfqId: session.rfqId,
      dealId: input.dealId,
      direction: 'inbound',
      channel: 'api',
      body: `Quote received: ₹${input.quotedAmount.toLocaleString()} for ${input.rfqNumber}`,
      action: input.action === 'accept' ? 'accept' : input.action === 'reject' ? 'reject' : 'send_counter',
      round,
      quotedAmount: input.quotedAmount,
      previousAmount: session.bestQuote?.amount,
      responseAt: new Date(),
    };
    this.messages.set(inboundMsg.id, inboundMsg);

    return session;
  }

  /**
   * Send a reminder to non-responsive supplier
   */
  async sendReminder(
    dealId: string,
    supplierId: string,
    message: string
  ): Promise<AgentMessage | null> {
    const session = this.negotiations.get(dealId);
    if (!session) return null;

    const agent = this.agents.get(supplierId);
    if (!agent) return null;

    const msg: AgentMessage = {
      id: randomUUID(),
      messageId: randomUUID(),
      agentId: supplierId,
      supplierId,
      rfqId: session.rfqId,
      dealId,
      direction: 'outbound',
      channel: agent.preferredChannel === 'portal' ? 'api' : agent.preferredChannel,
      body: message,
      action: 'send_reminder',
      round: session.currentRound,
      sentAt: new Date(),
    };

    this.messages.set(msg.id, msg);
    await this.dispatchMessage(agent, msg);
    return msg;
  }

  /**
   * Get negotiation session for a deal
   */
  getSession(dealId: string): NegotiationSession | null {
    return this.negotiations.get(dealId) || null;
  }

  /**
   * Get all messages for a deal
   */
  getMessages(dealId: string): AgentMessage[] {
    return Array.from(this.messages.values())
      .filter(m => m.dealId === dealId)
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }

  /**
   * Get sessions awaiting supplier response
   */
  getPendingSessions(): NegotiationSession[] {
    const now = new Date();
    return Array.from(this.negotiations.values())
      .filter(s => s.status === 'active' && s.expiresAt < now);
  }

  /**
   * Create a negotiation session for a deal
   */
  createSession(input: {
    dealId: string;
    rfqId: string;
    rfqNumber: string;
    supplierId: string;
    supplierName: string;
    initialAmount: number;
    targetPrice?: number;
    slaHours?: number;
  }): NegotiationSession {
    const slaHours = input.slaHours || 48;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + slaHours);

    const session: NegotiationSession = {
      id: randomUUID(),
      dealId: input.dealId,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      rfqId: input.rfqId,
      rfqNumber: input.rfqNumber,
      currentRound: 'initial',
      rounds: [],
      status: 'active',
      bestQuote: null,
      targetPrice: input.targetPrice,
      bestPrice: input.initialAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt,
    };

    this.negotiations.set(input.dealId, session);
    return session;
  }

  /**
   * Accept a counter-offer (buyer sends final terms to supplier)
   */
  async sendCounterOffer(
    dealId: string,
    counterAmount: number,
    deliveryDays: number,
    paymentTerms: string
  ): Promise<NegotiationSession | null> {
    const session = this.negotiations.get(dealId);
    if (!session) return null;

    const agent = this.agents.get(session.supplierId);
    if (!agent) return null;

    session.currentRound = 'counter_offer';
    session.updatedAt = new Date();
    this.negotiations.set(dealId, session);

    const msg: AgentMessage = {
      id: randomUUID(),
      messageId: randomUUID(),
      agentId: agent.supplierId,
      supplierId: session.supplierId,
      rfqId: session.rfqId,
      dealId,
      direction: 'outbound',
      channel: agent.preferredChannel === 'portal' ? 'api' : agent.preferredChannel,
      body: `Counter offer: ₹${counterAmount.toLocaleString()} (delivery ${deliveryDays} days, ${paymentTerms})`,
      action: 'send_counter',
      round: 'counter_offer',
      quotedAmount: counterAmount,
      previousAmount: session.bestQuote?.amount,
      sentAt: new Date(),
    };

    this.messages.set(msg.id, msg);
    await this.dispatchMessage(agent, msg);
    return session;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private getOrCreateAgent(input: {
    supplierId: string;
    supplierName: string;
    email: string;
    phone: string;
    preferredChannel: SupplierAgent['preferredChannel'];
    webhookUrl?: string;
    apiKey?: string;
  }): SupplierAgent {
    const existing = this.agents.get(input.supplierId);
    if (existing) return existing;

    const agent: SupplierAgent = {
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      email: input.email,
      phone: input.phone,
      preferredChannel: input.preferredChannel,
      webhookUrl: input.webhookUrl,
      apiKey: input.apiKey,
      slaHours: 48,
      isActive: true,
      lastContactedAt: new Date(),
    };
    this.agents.set(input.supplierId, agent);
    return agent;
  }

  private buildRFQMessage(input: {
    rfqNumber: string;
    items: Array<{ name: string; quantity: number; unit: string }>;
    totalAmount: number;
    deadline: Date;
  }): string {
    const itemsList = input.items.map(i => `• ${i.name}: ${i.quantity} ${i.unit}`).join('\n');
    return `
New RFQ Received: ${input.rfqNumber}

Items:
${itemsList}

Total Value: ₹${input.totalAmount.toLocaleString()}
Response Deadline: ${input.dealDeadline.toLocaleDateString()}

Please submit your best quote at your earliest.
    `.trim();
  }

  /**
   * Dispatch message via the supplier's preferred channel
   */
  private async dispatchMessage(agent: SupplierAgent, message: AgentMessage): Promise<void> {
    agent.lastContactedAt = new Date();

    switch (agent.preferredChannel) {
      case 'api':
        if (agent.webhookUrl) {
          await this.sendViaWebhook(agent, message);
        }
        break;
      case 'email':
        await this.sendViaEmail(agent, message);
        break;
      case 'whatsapp':
        await this.sendViaWhatsApp(agent, message);
        break;
      case 'sms':
        await this.sendViaSMS(agent, message);
        break;
      default:
        // Portal notification handled asynchronously
        break;
    }
  }

  private async sendViaWebhook(agent: SupplierAgent, message: AgentMessage): Promise<void> {
    if (!agent.webhookUrl) return;
    try {
      await axios.post(agent.webhookUrl, {
        event: 'rfq_received',
        messageId: message.messageId,
        dealId: message.dealId,
        rfqId: message.rfqId,
        body: message.body,
        action: message.action,
        quotedAmount: message.quotedAmount,
        timestamp: message.sentAt.toISOString(),
      }, {
        headers: {
          'Content-Type': 'application/json',
          ...(agent.apiKey ? { 'Authorization': `Bearer ${agent.apiKey}` } : {}),
        },
        timeout: 10000,
      });
    } catch {
      // Logged by caller
    }
  }

  private async sendViaEmail(agent: SupplierAgent, message: AgentMessage): Promise<void> {
    // In production, integrate with email service (SendGrid, Resend, etc.)
    console.log(`[Email] To: ${agent.email} | Subject: RFQ ${message.messageId} | ${message.body.slice(0, 80)}`);
  }

  private async sendViaWhatsApp(agent: SupplierAgent, message: AgentMessage): Promise<void> {
    // In production, integrate with WhatsApp Business API
    console.log(`[WhatsApp] To: ${agent.phone} | ${message.body.slice(0, 80)}`);
  }

  private async sendViaSMS(agent: SupplierAgent, message: AgentMessage): Promise<void> {
    // In production, integrate with SMS provider (Twilio, MSG91, etc.)
    console.log(`[SMS] To: ${agent.phone} | ${message.body.slice(0, 80)}`);
  }
}

// ============================================================================
// Exports
// ============================================================================

export const supplierAgentService = new SupplierAgentService();
