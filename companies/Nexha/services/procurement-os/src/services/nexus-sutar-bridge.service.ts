/**
 * Nexha-SUTAR Bridge Service
 *
 * Connects Nexha commerce events to SUTAR autonomous workforce:
 * - Emits events TO SUTAR services (Identity, Trust, Reputation, Intent Bus, etc.)
 * - Receives events FROM SUTAR (counter-offers, agent responses, etc.)
 * - Powers the bidirectional buyer ↔ seller agent loop
 */

import { randomUUID } from 'crypto';
import axios from 'axios';

// ============================================================================
// Types
// ============================================================================

export type SutARServiceType =
  | 'identity' | 'trust' | 'reputation'
  | 'intent' | 'goal' | 'negotiation'
  | 'contract' | 'memory' | 'flow'
  | 'discovery' | 'simulation' | 'policy' | 'economy';

export interface NexhaEvent {
  type: string;
  source: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface SutarEvent {
  type: string;
  source: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// SUTAR service URLs
const SUTAR_SERVICES = {
  identity: process.env.SUTAR_IDENTITY_URL || 'http://localhost:4147',
  trust: process.env.SUTAR_TRUST_URL || 'http://localhost:4180',
  reputation: process.env.SUTAR_REPUTATION_URL || 'http://localhost:4185',
  intent: process.env.SUTAR_INTENT_URL || 'http://localhost:4154',
  goal: process.env.SUTAR_GOAL_URL || 'http://localhost:4242',
  negotiation: process.env.SUTAR_NEGOTIATION_URL || 'http://localhost:4191',
  contract: process.env.SUTAR_CONTRACT_URL || 'http://localhost:4190',
  memory: process.env.SUTAR_MEMORY_URL || process.env.SUTAR_MEMORY_BRIDGE_URL || 'http://localhost:4143',
  flow: process.env.SUTAR_FLOW_URL || process.env.SUTAR_FLOW_OS_URL || 'http://localhost:4244',
  discovery: process.env.SUTAR_DISCOVERY_URL || process.env.SUTAR_AGENT_NETWORK_URL || 'http://localhost:4155',
  simulation: process.env.SUTAR_SIMULATION_URL || 'http://localhost:4241',
  policy: process.env.SUTAR_POLICY_URL || 'http://localhost:4240',
  economy: process.env.SUTAR_ECONOMY_URL || 'http://localhost:4251',
};

// ============================================================================
// Nexha → SUTAR Bridge
// ============================================================================

export class NexhaSutarBridge {
  private eventHistory: NexhaEvent[] = [];
  private handlers: Map<string, (event: SutarEvent) => Promise<void>> = new Map();
  private maxHistory = 500;

  constructor() {
    this.setupSutarEventHandlers();
  }

  // ==========================================================================
  // BUYER EVENTS → SUTAR
  // ==========================================================================

  /**
   * Emit: Buyer needs inventory replenishment
   * → SUTAR GoalOS decomposes: Find supplier, negotiate, contract, fulfill
   */
  async emitInventoryLow(data: {
    buyerId: string;
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
    merchantId: string;
  }): Promise<void> {
    const event: NexhaEvent = {
      type: 'inventory.low_stock',
      source: 'nexha-procurement',
      data,
      timestamp: new Date().toISOString(),
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    // → SUTAR GoalOS: Decompose goal
    await this.emitToSutar('goal', {
      type: 'inventory_replenishment',
      goal: `Purchase ${data.productName} (qty: ${data.threshold}`,
      buyerId: data.buyerId,
      productId: data.productId,
      merchantId: data.merchantId,
      priority: data.currentStock === 0 ? 'urgent' : 'high',
    });
  }

  /**
   * Emit: Buyer sent RFQ to supplier
   * → SUTAR Intent Bus: Route to supplier agent
   */
  async emitRFQCreated(data: {
    rfqId: string;
    dealId: string;
    buyerId: string;
    supplierId: string;
    supplierName: string;
    items: Array<{ name: string; quantity: number }>;
    targetPrice?: number;
    deadline: string;
  }): Promise<void> {
    const event: NexhaEvent = {
      type: 'rfq.created',
      source: 'nexha-procurement',
      data,
      timestamp: new Date().toISOString(),
    };

    this.eventHistory.push(event);

    // → SUTAR Intent Bus
    await this.emitToSutar('intent', {
      type: 'rfq.received',
      rfqId: data.rfqId,
      buyerId: data.buyerId,
      supplierId: data.supplierId,
      items: data.items,
      targetPrice: data.targetPrice,
      deadline: data.deadline,
    });

    // → SUTAR Negotiation Engine
    await this.emitToSutar('negotiation', {
      type: 'rfq.sent',
      rfqId: data.rfqId,
      dealId: data.dealId,
      supplierId: data.supplierId,
      targetPrice: data.targetPrice,
      deadline: data.deadline,
    });
  }

  /**
   * Emit: Supplier submitted quote
   * → SUTAR Negotiation: Auto-evaluate counter-offers
   */
  async emitQuoteReceived(data: {
    dealId: string;
    supplierId: string;
    supplierName: string;
    quotedAmount: number;
    deliveryDays: number;
    paymentTerms: string;
    rfqNumber: string;
  }): Promise<void> {
    const event: NexhaEvent = {
      type: 'quote.received',
      source: 'nexha-procurement',
      data,
      timestamp: new Date().toISOString(),
    };

    this.eventHistory.push(event);

    // → SUTAR Negotiation Engine
    await this.emitToSutar('negotiation', {
      type: 'quote.received',
      dealId: data.dealId,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      quotedAmount: data.quotedAmount,
      deliveryDays: data.deliveryDays,
      paymentTerms: data.paymentTerms,
    });

    // → SUTAR Reputation: Track quote activity
    await this.emitToSutar('reputation', {
      type: 'quote.submitted',
      entityId: data.supplierId,
      entityType: 'supplier',
      metrics: { quote_activity: 1 },
    });
  }

  /**
   * Emit: Order delivered
   * → SUTAR Reputation: Update delivery score
   * → SUTAR Memory: Store transaction
   */
  async emitOrderDelivered(data: {
    dealId: string;
    supplierId: string;
    buyerId: string;
    onTime: boolean;
    qualityPass: boolean;
    actualAmount: number;
    expectedAmount: number;
    deliveryDays: number;
  }): Promise<void> {
    const event: NexhaEvent = {
      type: 'order.delivered',
      source: 'nexha-procurement',
      data,
      timestamp: new Date().toISOString(),
    };

    this.eventHistory.push(event);

    // → SUTAR Reputation: Update delivery score
    await this.emitToSutar('reputation', {
      type: 'delivery.completed',
      entityId: data.supplierId,
      entityType: 'supplier',
      metrics: {
        on_time: data.onTime ? 1 : 0,
        quality_pass: data.qualityPass ? 1 : 0,
        delivery_days: data.deliveryDays,
        amount: data.actualAmount,
      },
    });

    // → SUTAR Memory: Store transaction
    await this.emitToSutar('memory', {
      type: 'transaction.recorded',
      supplierId: data.supplierId,
      buyerId: data.buyerId,
      dealId: data.dealId,
      amount: data.actualAmount,
      quality: data.qualityPass ? 'pass' : 'fail',
      onTime: data.onTime,
    });

    // → SUTAR Economy: Record transaction value
    await this.emitToSutar('economy', {
      type: 'order.settled',
      supplierId: data.supplierId,
      buyerId: data.buyerId,
      amount: data.actualAmount,
    });
  }

  // ==========================================================================
  // SUTAR Events → Nexha Handlers
  // ==========================================================================

  private setupSutarEventHandlers(): void {
    // SUTAR Negotiation Engine sends counter-offers
    this.on('negotiation.counter_offer', async (event) => {
      // Forward to deal state machine
      console.log('[Bridge] Counter-offer from SUTAR:', event.data);
    });

    // SUTAR Discovery finds new suppliers
    this.on('discovery.supplier_matched', async (event) => {
      console.log('[Bridge] Supplier matched by SUTAR:', event.data);
    });

    // SUTAR Memory returns insights
    this.on('memory.insight', async (event) => {
      console.log('[Bridge] Memory insight:', event.data);
    });

    // SUTAR GoalOS completes goal decomposition
    this.on('goal.decomposed', async (event) => {
      console.log('[Bridge] Goal decomposed by SUTAR:', event.data);
    });
  }

  /**
   * Subscribe to SUTAR events
   */
  on(eventType: string, handler: (event: SutarEvent) => Promise<void>): void {
    this.handlers.set(eventType, handler);
  }

  /**
   * Emit to a SUTAR service
   */
  async emitToSutar(service: keyof typeof SUTAR_SERVICES, data: Record<string, unknown>): Promise<void> {
    const baseUrl = SUTAR_SERVICES[service];
    if (!baseUrl) return;

    try {
      const event = {
        type: data.type || 'event',
        source: 'nexha-procurement',
        data,
        timestamp: new Date().toISOString(),
      };

      await axios.post(`${baseUrl}/api/events`, event, { timeout: 5000 });
    } catch {
      // Non-blocking
    }
  }

  /**
   * Receive event from SUTAR
   * Called by SUTAR services
   */
  async receiveSutarEvent(event: SutarEvent): Promise<void> {
    this.eventHistory.push({
      type: event.type,
      source: 'sutar',
      data: event.data,
      timestamp: event.timestamp,
    });

    const handler = this.handlers.get(event.type);
    if (handler) {
      await handler(event);
    }

    // Also check wildcard handlers
    const wildcard = this.handlers.get('*');
    if (wildcard) {
      await wildcard(event);
    }
  }

  /**
   * Get event history
   */
  getHistory(limit = 100): NexhaEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get stats
   */
  getStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const e of this.eventHistory) {
      byType[e.type] = (byType[e.type] || 0) + 1;
    }
    return { total: this.eventHistory.length, byType };
  }
}

export const nexhaSutarBridge = new NexhaSutarBridge();
