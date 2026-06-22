/**
 * NeXha Ecosystem Connector - Business Logic Orchestrator
 *
 * Coordinates cross-OS workflows:
 * - When merchant orders → trigger procurement
 * - When inventory low → trigger reorder/RFQ
 * - When production complete → update distribution
 */

import { eventBus, ECOSYSTEM_EVENTS } from './event-bus.js';
import type { CloudEvent } from '@rez/shared-types';
import axios from 'axios';

// ============================================================================
// Service URLs
// ============================================================================

const SERVICES = {
  DISTRIBUTION: process.env.DISTRIBUTION_OS_URL || 'http://localhost:4300',
  FRANCHISE: process.env.FRANCHISE_OS_URL || 'http://localhost:4310',
  PROCUREMENT: process.env.PROCUREMENT_OS_URL || 'http://localhost:4320',
  MANUFACTURING: process.env.MANUFACTURING_OS_URL || 'http://localhost:4330',
  REZ_MERCHANT: process.env.REZ_MERCHANT_URL || 'http://localhost:4003',
  REZ_INTELLIGENCE: process.env.REZ_INTELLIGENCE_URL || 'http://localhost:4018',
  RTNM_FINANCE: process.env.RTNM_FINANCE_URL || 'http://localhost:4004',
};

// ============================================================================
// Cross-OS Workflows
// ============================================================================

class EcosystemOrchestrator {
  constructor() {
    this.setupEventSubscriptions();
  }

  private setupEventSubscriptions() {
    // Merchant inventory low → Trigger procurement
    eventBus.subscribe(
      ['inventory.low_stock', 'demand.inventory.low', ECOSYSTEM_EVENTS.INVENTORY_LOW],
      async (event) => {
        console.log('[Orchestrator] Inventory signal received:', event.data);
        await this.handleInventoryLow(event);
      },
      10 // High priority
    );

    // Merchant order placed → Update distribution
    eventBus.subscribe(
      ['order.placed', ECOSYSTEM_EVENTS.ORDER_PLACED],
      async (event) => {
        console.log('[Orchestrator] Order placed:', event.data);
        await this.handleOrderPlaced(event);
      },
      20
    );

    // Procurement fulfilled → Update inventory
    eventBus.subscribe(
      [ECOSYSTEM_EVENTS.PROCUREMENT_FULFILLED],
      async (event) => {
        console.log('[Orchestrator] Procurement fulfilled:', event.data);
        await this.handleProcurementFulfilled(event);
      },
      30
    );

    // Manufacturing batch released → Update distribution stock
    eventBus.subscribe(
      [ECOSYSTEM_EVENTS.BATCH_RELEASED, 'manufacturing.batch.released'],
      async (event) => {
        console.log('[Orchestrator] Batch released:', event.data);
        await this.handleBatchReleased(event);
      },
      30
    );

    // Demand predicted → Alert relevant services
    eventBus.subscribe(
      [ECOSYSTEM_EVENTS.DEMAND_PREDICTED, 'intelligence.demand.predicted'],
      async (event) => {
        console.log('[Orchestrator] Demand predicted:', event.data);
        await this.handleDemandPredicted(event);
      },
      40
    );

    // Franchise performance updated → Sync to analytics
    eventBus.subscribe(
      [ECOSYSTEM_EVENTS.FRANCHISE_PERFORMANCE_UPDATED, 'franchise.performance.updated'],
      async (event) => {
        console.log('[Orchestrator] Franchise performance updated:', event.data);
        await this.handleFranchisePerformance(event);
      },
      50
    );
  }

  // ==========================================================================
  // Workflow Handlers
  // ==========================================================================

  /**
   * Inventory low signal → Create RFQ or trigger reorder
   */
  private async handleInventoryLow(event: CloudEvent) {
    const data = event.data as {
      merchantId?: string;
      productId?: string;
      productName?: string;
      currentStock?: number;
      threshold?: number;
      source?: string;
    };

    try {
      // Get AI recommendation for reorder quantity
      let reorderQty = data.threshold ? data.threshold * 2 : 100;

      try {
        const prediction = await axios.post(`${SERVICES.REZ_INTELLIGENCE}/api/predict/reorder`, {
          productId: data.productId,
          currentStock: data.currentStock,
          historicalSales: 30, // days
        }, { timeout: 5000 });

        if (prediction.data?.suggestedQuantity) {
          reorderQty = prediction.data.suggestedQuantity;
        }
      } catch {
        // Fallback to threshold-based calculation
      }

      // Create procurement request
      logger.info([Orchestrator] Creating procurement for ${data.productName}, qty: ${reorderQty}`);

      // Notify distribution for van sale if applicable
      await axios.post(`${SERVICES.DISTRIBUTION}/webhooks/nexha`, {
        type: 'inventory.reorder',
        source: 'ecosystem-connector',
        data: {
          productId: data.productId,
          productName: data.productName,
          quantity: reorderQty,
          merchantId: data.merchantId,
        },
      });

    } catch (error) {
      console.error('[Orchestrator] Error handling inventory low:', error);
    }
  }

  /**
   * Order placed → Update relevant services
   */
  private async handleOrderPlaced(event: CloudEvent) {
    const data = event.data as {
      orderId?: string;
      merchantId?: string;
      items?: Array<{ productId: string; quantity: number }>;
      total?: number;
    };

    try {
      // Send to REZ Intelligence for analytics
      await axios.post(`${SERVICES.REZ_INTELLIGENCE}/api/events/order`, {
        event: 'order.placed',
        orderId: data.orderId,
        merchantId: data.merchantId,
        total: data.total,
        itemCount: data.items?.length || 0,
      }).catch(() => {}); // Non-blocking

      // Notify distribution
      await axios.post(`${SERVICES.DISTRIBUTION}/webhooks/nexha`, {
        type: 'order.placed',
        source: 'ecosystem-connector',
        data,
      }).catch(() => {}); // Non-blocking

      logger.info([Orchestrator] Order ${data.orderId} propagated to services`);

    } catch (error) {
      console.error('[Orchestrator] Error handling order placed:', error);
    }
  }

  /**
   * Procurement fulfilled → Update inventory
   */
  private async handleProcurementFulfilled(event: CloudEvent) {
    const data = event.data as {
      orderId?: string;
      supplierId?: string;
      items?: Array<{ productId: string; quantity: number }>;
    };

    try {
      // Notify REZ Merchant to update inventory
      await axios.post(`${SERVICES.REZ_MERCHANT}/api/webhooks/nexha`, {
        type: 'inventory.replenished',
        source: 'nexha-procurement',
        data: {
          orderId: data.orderId,
          items: data.items,
        },
      }).catch(() => {});

      logger.info([Orchestrator] Procurement ${data.orderId} fulfilled, inventory updated`);

    } catch (error) {
      console.error('[Orchestrator] Error handling procurement fulfilled:', error);
    }
  }

  /**
   * Batch released → Update distribution inventory
   */
  private async handleBatchReleased(event: CloudEvent) {
    const data = event.data as {
      batchId?: string;
      productId?: string;
      quantity?: number;
    };

    try {
      // Update distribution stock
      await axios.post(`${SERVICES.DISTRIBUTION}/api/inventory/update`, {
        productId: data.productId,
        quantity: data.quantity,
        type: 'production',
        source: 'nexha-manufacturing',
      }).catch(() => {});

      logger.info([Orchestrator] Batch ${data.batchId} released to distribution`);

    } catch (error) {
      console.error('[Orchestrator] Error handling batch released:', error);
    }
  }

  /**
   * Demand predicted → Alert relevant services
   */
  private async handleDemandPredicted(event: CloudEvent) {
    const data = event.data as {
      productId?: string;
      predictedDemand?: number;
      confidence?: number;
      period?: string;
    };

    if (!data.confidence || data.confidence < 0.7) {
      return; // Ignore low confidence predictions
    }

    try {
      // Alert procurement for stock buildup
      if (data.predictedDemand && data.predictedDemand > 1000) {
        logger.info([Orchestrator] High demand predicted for ${data.productId}: ${data.predictedDemand}`);

        await axios.post(`${SERVICES.PROCUREMENT}/api/alerts/high-demand`, {
          productId: data.productId,
          predictedDemand: data.predictedDemand,
          period: data.period,
        }).catch(() => {});
      }

    } catch (error) {
      console.error('[Orchestrator] Error handling demand predicted:', error);
    }
  }

  /**
   * Franchise performance updated → Sync to analytics
   */
  private async handleFranchisePerformance(event: CloudEvent) {
    const data = event.data as {
      franchiseId?: string;
      revenue?: number;
      orders?: number;
      score?: number;
    };

    try {
      // Update brand analytics
      await axios.post(`${SERVICES.REZ_INTELLIGENCE}/api/events/franchise`, {
        event: 'franchise.performance',
        franchiseId: data.franchiseId,
        revenue: data.revenue,
        orders: data.orders,
        score: data.score,
      }).catch(() => {});

    } catch (error) {
      console.error('[Orchestrator] Error handling franchise performance:', error);
    }
  }

  // ==========================================================================
  // Manual Triggers
  // ==========================================================================

  /**
   * Emit a demand signal
   */
  async emitDemandSignal(data: {
    merchantId: string;
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
  }): Promise<void> {
    await eventBus.publish({
      specversion: '1.0',
      id: crypto.randomUUID(),
      source: 'ecosystem-connector',
      type: ECOSYSTEM_EVENTS.DEMAND_SIGNAL,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data,
    });
  }

  /**
   * Emit an order placed event
   */
  async emitOrderPlaced(data: {
    orderId: string;
    merchantId: string;
    items: Array<{ productId: string; quantity: number }>;
    total: number;
  }): Promise<void> {
    await eventBus.publish({
      specversion: '1.0',
      id: crypto.randomUUID(),
      source: 'ecosystem-connector',
      type: ECOSYSTEM_EVENTS.ORDER_PLACED,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data,
    });
  }
}

export const orchestrator = new EcosystemOrchestrator();
