/**
 * Nexha-SUTAR Bridge Service
 *
 * Connects Nexha commerce events to SUTAR autonomous workforce:
 * - Emits events TO SUTAR services (Identity, Trust, Reputation, Intent Bus, GoalOS)
 * - Receives events FROM SUTAR
 */

import axios from 'axios';

const SUTAR_SERVICES = {
  identity: process.env.SUTAR_IDENTITY_URL || 'http://localhost:4147',
  trust: process.env.SUTAR_TRUST_URL || 'http://localhost:4180',
  reputation: process.env.SUTAR_REPUTATION_URL || 'http://localhost:4185',
  intent: process.env.SUTAR_INTENT_URL || 'http://localhost:4154',
  goal: process.env.SUTAR_GOAL_URL || 'http://localhost:4242',
  negotiation: process.env.SUTAR_NEGOTIATION_URL || 'http://localhost:4191',
  memory: process.env.SUTAR_MEMORY_URL || 'http://localhost:4143',
  flow: process.env.SUTAR_FLOW_URL || 'http://localhost:4244',
};

export class NexhaSutarBridge {
  private eventHistory: Array<{ type: string; data: Record<string, unknown>; timestamp: string }> = [];

  async emitInventoryLow(data: {
    buyerId: string;
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
  }): Promise<void> {
    const event = { type: 'inventory.low_stock', data, timestamp: new Date().toISOString() };
    this.eventHistory.push(event);

    await this.emitToSutar('goal', {
      type: 'inventory_replenishment',
      goal: `Purchase ${data.productName} (qty: ${data.threshold})`,
      buyerId: data.buyerId,
      productId: data.productId,
      priority: data.currentStock === 0 ? 'urgent' : 'high',
    });
  }

  async emitRFQCreated(data: {
    rfqId: string;
    dealId: string;
    buyerId: string;
    supplierId: string;
    supplierName: string;
    items: Array<{ name: string; quantity: number }>;
    targetPrice?: number;
  }): Promise<void> {
    const event = { type: 'rfq.created', data, timestamp: new Date().toISOString() };
    this.eventHistory.push(event);

    await this.emitToSutar('intent', {
      type: 'rfq.received',
      rfqId: data.rfqId,
      buyerId: data.buyerId,
      supplierId: data.supplierId,
      items: data.items,
      targetPrice: data.targetPrice,
    });
  }

  async emitQuoteReceived(data: {
    dealId: string;
    supplierId: string;
    supplierName: string;
    quotedAmount: number;
    deliveryDays: number;
  }): Promise<void> {
    const event = { type: 'quote.received', data, timestamp: new Date().toISOString() };
    this.eventHistory.push(event);

    await this.emitToSutar('reputation', {
      entityId: data.supplierId,
      entityType: 'supplier',
      metrics: { quote_responses: 1 },
    });
  }

  async emitOrderDelivered(data: {
    dealId: string;
    supplierId: string;
    buyerId: string;
    onTime: boolean;
    qualityPass: boolean;
    actualAmount: number;
  }): Promise<void> {
    const event = { type: 'order.delivered', data, timestamp: new Date().toISOString() };
    this.eventHistory.push(event);

    await this.emitToSutar('reputation', {
      entityId: data.supplierId,
      entityType: 'supplier',
      metrics: {
        on_time: data.onTime ? 1 : 0,
        quality_pass: data.qualityPass ? 1 : 0,
        amount: data.actualAmount,
      },
    });

    await this.emitToSutar('memory', {
      type: 'transaction.recorded',
      supplierId: data.supplierId,
      buyerId: data.buyerId,
      dealId: data.dealId,
      amount: data.actualAmount,
    });
  }

  async receiveSutarEvent(event: { type: string; data: Record<string, unknown> }): Promise<void> {
    this.eventHistory.push({ ...event, timestamp: new Date().toISOString() });
    console.log('[Bridge] Received SUTAR event:', event.type);
  }

  getHistory(limit = 100) {
    return this.eventHistory.slice(-limit);
  }

  private async emitToSutar(service: keyof typeof SUTAR_SERVICES, data: Record<string, unknown>): Promise<void> {
    const baseUrl = SUTAR_SERVICES[service];
    if (!baseUrl) return;
    try {
      await axios.post(`${baseUrl}/api/events`, {
        type: data.type || 'event',
        source: 'nexha-procurement',
        data,
        timestamp: new Date().toISOString(),
      }, { timeout: 5000 });
    } catch {
      // Non-blocking
    }
  }
}

export const nexhaSutarBridge = new NexhaSutarBridge();
