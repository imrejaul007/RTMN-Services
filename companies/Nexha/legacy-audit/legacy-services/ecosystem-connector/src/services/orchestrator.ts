import { logger } from '../../shared/logger';
import { randomUUID } from 'crypto';
/**
 * NeXha Ecosystem Connector - Business Logic Orchestrator
 *
 * Coordinates cross-OS workflows with real API calls:
 * - When inventory low → Create RFQ + Match Suppliers + Create Deal
 * - When order placed → Update distribution + Trigger payment
 * - When production complete → Update distribution stock
 * - Supplier quotes → Record in Deal + Notify buyer
 * - Deal awarded → Create purchase order + Notify supplier agent
 * - Order delivered → Trigger payment settlement
 */

import { eventBus, ECOSYSTEM_EVENTS } from './event-bus.js';
import type { CloudEvent } from '@rez/shared-types';
import axios, { AxiosError } from 'axios';

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
  // SUTAR services
  SUTAR_IDENTITY: process.env.SUTAR_IDENTITY_URL || 'http://localhost:4147',
  SUTAR_TRUST: process.env.SUTAR_TRUST_URL || 'http://localhost:4180',
  SUTAR_REPUTATION: process.env.SUTAR_REPUTATION_URL || 'http://localhost:4185',
  SUTAR_INTENT: process.env.SUTAR_INTENT_URL || 'http://localhost:4154',
  SUTAR_GOAL: process.env.SUTAR_GOAL_URL || 'http://localhost:4242',
  SUTAR_NEGOTIATION: process.env.SUTAR_NEGOTIATION_URL || 'http://localhost:4191',
  SUTAR_CONTRACT: process.env.SUTAR_CONTRACT_URL || 'http://localhost:4190',
  SUTAR_MEMORY: process.env.SUTAR_MEMORY_URL || 'http://localhost:4143',
};

// Internal API key for service-to-service auth
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN || 'internal-service-token';

// Headers for internal service calls
function getServiceHeaders(authToken?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': authToken || `Bearer ${INTERNAL_TOKEN}`,
    'X-Internal-Service': 'ecosystem-connector',
  };
}

// ============================================================================
// Cross-OS Workflows
// ============================================================================

class EcosystemOrchestrator {
  constructor() {
    this.setupEventSubscriptions();
  }

  private setupEventSubscriptions() {
    // Merchant inventory low → Trigger procurement RFQ
    eventBus.subscribe(
      ['inventory.low_stock', 'demand.inventory.low', ECOSYSTEM_EVENTS.INVENTORY_LOW],
      async (event) => {
        logger.info('[Orchestrator] Inventory signal received:', event.data);
        await this.handleInventoryLow(event);
      },
      10 // High priority
    );

    // Order placed → Update distribution + emit procurement event
    eventBus.subscribe(
      ['order.placed', ECOSYSTEM_EVENTS.ORDER_PLACED],
      async (event) => {
        logger.info('[Orchestrator] Order placed:', event.data);
        await this.handleOrderPlaced(event);
      },
      20
    );

    // Procurement fulfilled → Update inventory
    eventBus.subscribe(
      [ECOSYSTEM_EVENTS.PROCUREMENT_FULFILLED],
      async (event) => {
        logger.info('[Orchestrator] Procurement fulfilled:', event.data);
        await this.handleProcurementFulfilled(event);
      },
      30
    );

    // Manufacturing batch released → Update distribution stock
    eventBus.subscribe(
      [ECOSYSTEM_EVENTS.BATCH_RELEASED, 'manufacturing.batch.released'],
      async (event) => {
        logger.info('[Orchestrator] Batch released:', event.data);
        await this.handleBatchReleased(event);
      },
      30
    );

    // Demand predicted → Alert procurement for stock buildup
    eventBus.subscribe(
      [ECOSYSTEM_EVENTS.DEMAND_PREDICTED, 'intelligence.demand.predicted'],
      async (event) => {
        logger.info('[Orchestrator] Demand predicted:', event.data);
        await this.handleDemandPredicted(event);
      },
      40
    );

    // Franchise performance updated → Sync to analytics
    eventBus.subscribe(
      [ECOSYSTEM_EVENTS.FRANCHISE_PERFORMANCE_UPDATED, 'franchise.performance.updated'],
      async (event) => {
        logger.info('[Orchestrator] Franchise performance updated:', event.data);
        await this.handleFranchisePerformance(event);
      },
      50
    );

    // Supplier quote received → Record in deal + notify buyer
    eventBus.subscribe(
      ['supplier.quote_received', 'procurement.quote_received'],
      async (event) => {
        logger.info('[Orchestrator] Supplier quote received:', event.data);
        await this.handleQuoteReceived(event);
      },
      15
    );

    // Deal awarded → Create purchase order + notify supplier
    eventBus.subscribe(
      ['deal.awarded', 'procurement.deal_awarded'],
      async (event) => {
        logger.info('[Orchestrator] Deal awarded:', event.data);
        await this.handleDealAwarded(event);
      },
      15
    );

    // Credit approved → Notify distribution
    eventBus.subscribe(
      [ECOSYSTEM_EVENTS.CREDIT_APPROVED],
      async (event) => {
        logger.info('[Orchestrator] Credit approved:', event.data);
        await this.handleCreditApproved(event);
      },
      20
    );

    // Payment received → Update order status
    eventBus.subscribe(
      [ECOSYSTEM_EVENTS.PAYMENT_RECEIVED],
      async (event) => {
        logger.info('[Orchestrator] Payment received:', event.data);
        await this.handlePaymentReceived(event);
      },
      25
    );
  }

  // ==========================================================================
  // Workflow Handlers
  // ==========================================================================

  /**
   * Inventory low → Create RFQ + Match Suppliers + Create Deal + Send RFQ
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

    if (!data.merchantId || !data.productId) {
      logger.warn('[Orchestrator] Inventory event missing merchantId or productId');
      return;
    }

    try {
      // Step 1: Get AI recommendation for reorder quantity
      let reorderQty = data.threshold ? data.threshold * 2 : 100;
      let suggestedPrice: number | undefined;
      let goalId: string | undefined;

      try {
        const prediction = await axios.post(`${SERVICES.REZ_INTELLIGENCE}/api/predict/reorder`, {
          productId: data.productId,
          currentStock: data.currentStock,
          historicalSales: 30,
        }, { timeout: 5000, headers: getServiceHeaders() });

        if (prediction.data?.suggestedQuantity) {
          reorderQty = prediction.data.suggestedQuantity;
        }
        if (prediction.data?.estimatedPrice) {
          suggestedPrice = prediction.data.estimatedPrice;
        }
      } catch {
        logger.info('[Orchestrator] Using threshold-based reorder quantity');
      }

      // Step 1b: Create goal in SUTAR GoalOS
      try {
        const goal = await axios.post(`${SERVICES.SUTAR_GOAL}/api/goals`, {
          type: 'inventory_replenishment',
          title: `Purchase ${data.productName}`,
          priority: data.currentStock === 0 ? 'urgent' : 'high',
          context: {
            productId: data.productId,
            quantity: reorderQty,
            targetPrice: suggestedPrice,
            merchantId: data.merchantId,
          },
        }, { timeout: 5000 });
        goalId = goal.data?.id;
        logger.info(`[Orchestrator] SUTAR Goal created: ${goalId}`);
      } catch {
        logger.info('[Orchestrator] SUTAR GoalOS not available');
      }

      // Step 2: Match suppliers with capability service
      let matchedSuppliers: Array<{ id: string; name: string; email: string }> = [];
      try {
        const match = await axios.get(`${SERVICES.PROCUREMENT}/api/suppliers/match`, {
          params: {
            category: 'general',
            minQuantity: reorderQty,
            maxPrice: suggestedPrice ? suggestedPrice * reorderQty * 1.2 : reorderQty * 1000,
          },
          timeout: 5000,
          headers: getServiceHeaders(),
        });
        matchedSuppliers = match.data.data || [];
      } catch {
        logger.info('[Orchestrator] No matched suppliers found, proceeding with RFQ anyway');
      }

      // Step 3: Create RFQ in ProcurementOS
      let rfqId: string | undefined;
      let rfqNumber: string | undefined;
      try {
        const rfqResponse = await axios.post(`${SERVICES.PROCUREMENT}/api/rfqs`, {
          buyerId: data.merchantId,
          buyerName: 'System Buyer',
          title: `Auto-PO: ${data.productName}`,
          description: `Automated RFQ from inventory signal. Current stock: ${data.currentStock}`,
          items: [{
            productName: data.productName,
            quantity: reorderQty,
            unit: 'units',
            specifications: `Product ID: ${data.productId}`,
          }],
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: data.currentStock === 0 ? 'urgent' : 'high',
          invitedSuppliers: matchedSuppliers.map(s => s.id),
        }, { timeout: 10000, headers: getServiceHeaders() });

        rfqId = rfqResponse.data.data?.id;
        rfqNumber = rfqResponse.data.data?.rfqNumber;
        logger.info(`[Orchestrator] Created RFQ: ${rfqNumber}`);
      } catch (err) {
        const axiosErr = err as AxiosError;
        logger.error('[Orchestrator] Failed to create RFQ:', axiosErr.message);
        return;
      }

      // Step 4: Create Deal in ProcurementOS
      let dealId: string | undefined;
      if (rfqId && matchedSuppliers.length > 0) {
        try {
          const dealResponse = await axios.post(`${SERVICES.PROCUREMENT}/api/deals`, {
            rfqId,
            rfqNumber: rfqNumber || rfqId,
            buyerId: data.merchantId,
            buyerName: 'System Buyer',
            totalValue: suggestedPrice ? suggestedPrice * reorderQty : reorderQty * 500,
            suppliers: matchedSuppliers.map(s => ({
              supplierId: s.id,
              supplierName: s.name,
              email: s.email,
            })),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }, { timeout: 10000, headers: getServiceHeaders() });

          dealId = dealResponse.data.data?.id;
          logger.info(`[Orchestrator] Created Deal: ${dealResponse.data.data?.dealNumber}`);
        } catch (err) {
          const axiosErr = err as AxiosError;
          logger.error('[Orchestrator] Failed to create deal:', axiosErr.message);
        }
      }

      // Step 5: Send RFQ to matched suppliers via agent
      if (rfqId && dealId && matchedSuppliers.length > 0) {
        for (const supplier of matchedSuppliers) {
          try {
            await axios.post(`${SERVICES.PROCUREMENT}/api/agents/rfq`, {
              supplierId: supplier.id,
              supplierName: supplier.name,
              email: supplier.email,
              phone: '',
              rfqId,
              rfqNumber: rfqNumber || rfqId,
              dealId,
              items: [{ name: data.productName || 'Unknown', quantity: reorderQty, unit: 'units' }],
              totalAmount: suggestedPrice ? suggestedPrice * reorderQty : reorderQty * 500,
              deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              preferredChannel: 'email',
            }, { timeout: 10000, headers: getServiceHeaders() });
            logger.info(`[Orchestrator] RFQ sent to supplier: ${supplier.name}`);
          } catch {
            logger.warn(`[Orchestrator] Failed to send RFQ to ${supplier.name}`);
          }
        }
      }

      // Step 6: Emit procurement created event
      await eventBus.publish({
        specversion: '1.0',
        id: randomUUID(),
        source: 'ecosystem-connector',
        type: ECOSYSTEM_EVENTS.PROCUREMENT_CREATED,
        time: new Date().toISOString(),
        datacontenttype: 'application/json',
        data: {
          rfqId,
          rfqNumber,
          dealId,
          merchantId: data.merchantId,
          productId: data.productId,
          productName: data.productName,
          reorderQuantity: reorderQty,
          matchedSupplierCount: matchedSuppliers.length,
        },
      });

    } catch (error) {
      logger.error('[Orchestrator] Error handling inventory low:', error);
    }
  }

  /**
   * Order placed → Notify distribution + Update procurement status
   */
  private async handleOrderPlaced(event: CloudEvent) {
    const data = event.data as {
      orderId?: string;
      merchantId?: string;
      items?: Array<{ productId: string; quantity: number; name: string }>;
      total?: number;
    };

    try {
      // Notify distribution about the order for van sale planning
      await axios.post(`${SERVICES.DISTRIBUTION}/webhooks/nexha`, {
        type: 'order.placed',
        source: 'ecosystem-connector',
        data,
      }).catch(() => {});

      // Notify intelligence for analytics
      await axios.post(`${SERVICES.REZ_INTELLIGENCE}/api/events/order`, {
        event: 'order.placed',
        orderId: data.orderId,
        merchantId: data.merchantId,
        total: data.total,
        itemCount: data.items?.length || 0,
      }).catch(() => {});

      logger.info(`[Orchestrator] Order ${data.orderId} propagated to services`);

    } catch (error) {
      logger.error('[Orchestrator] Error handling order placed:', error);
    }
  }

  /**
   * Procurement fulfilled → Notify REZ Merchant to update inventory
   */
  private async handleProcurementFulfilled(event: CloudEvent) {
    const data = event.data as {
      orderId?: string;
      supplierId?: string;
      items?: Array<{ productId: string; quantity: number }>;
    };

    try {
      await axios.post(`${SERVICES.REZ_MERCHANT}/api/webhooks/nexha`, {
        type: 'inventory.replenished',
        source: 'nexha-procurement',
        data: {
          orderId: data.orderId,
          items: data.items,
        },
      }).catch(() => {});

      logger.info(`[Orchestrator] Procurement ${data.orderId} fulfilled, inventory updated`);

    } catch (error) {
      logger.error('[Orchestrator] Error handling procurement fulfilled:', error);
    }
  }

  /**
   * Manufacturing batch released → Update distribution stock
   */
  private async handleBatchReleased(event: CloudEvent) {
    const data = event.data as {
      batchId?: string;
      productIds?: string[];
      quantities?: number[];
      warehouseId?: string;
    };

    try {
      await axios.post(`${SERVICES.DISTRIBUTION}/webhooks/nexha`, {
        type: 'inventory.replenished',
        source: 'nexha-manufacturing',
        data: {
          batchId: data.batchId,
          items: (data.productIds || []).map((id, i) => ({
            productId: id,
            quantity: data.quantities?.[i] || 0,
          })),
          warehouseId: data.warehouseId,
        },
      }).catch(() => {});

      logger.info(`[Orchestrator] Batch ${data.batchId} released to distribution`);

    } catch (error) {
      logger.error('[Orchestrator] Error handling batch released:', error);
    }
  }

  /**
   * Demand predicted → Alert procurement for stock buildup
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
      if (data.predictedDemand && data.predictedDemand > 1000) {
        logger.info(`[Orchestrator] High demand predicted for ${data.productId}: ${data.predictedDemand}`);

        // Emit demand signal to trigger RFQ
        await this.emitDemandSignal({
          merchantId: 'system',
          productId: data.productId || '',
          productName: 'High Demand Product',
          currentStock: 0,
          threshold: Math.ceil(data.predictedDemand * 0.3),
        });
      }

    } catch (error) {
      logger.error('[Orchestrator] Error handling demand predicted:', error);
    }
  }

  /**
   * Franchise performance → Sync to analytics
   */
  private async handleFranchisePerformance(event: CloudEvent) {
    const data = event.data as {
      franchiseId?: string;
      revenue?: number;
      orders?: number;
      score?: number;
    };

    try {
      await axios.post(`${SERVICES.REZ_INTELLIGENCE}/api/events/franchise`, {
        event: 'franchise.performance',
        franchiseId: data.franchiseId,
        revenue: data.revenue,
        orders: data.orders,
        score: data.score,
      }).catch(() => {});

    } catch (error) {
      logger.error('[Orchestrator] Error handling franchise performance:', error);
    }
  }

  /**
   * Supplier quote received → Record in deal + update buyer dashboard
   */
  private async handleQuoteReceived(event: CloudEvent) {
    const data = event.data as {
      dealId?: string;
      supplierId?: string;
      supplierName?: string;
      quotedAmount?: number;
      deliveryDays?: number;
      paymentTerms?: string;
      rfqNumber?: string;
    };

    if (!data.dealId) return;

    try {
      // Record quote in deal state machine
      await axios.post(`${SERVICES.PROCUREMENT}/api/deals/${data.dealId}/quotes`, {
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        quotedAmount: data.quotedAmount,
        deliveryDays: data.deliveryDays || 7,
        paymentTerms: data.paymentTerms || 'Net 30',
        validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      }, { timeout: 10000, headers: getServiceHeaders() });

      // Notify intelligence
      await axios.post(`${SERVICES.REZ_INTELLIGENCE}/api/events/quote`, {
        event: 'supplier.quote_received',
        dealId: data.dealId,
        supplierId: data.supplierId,
        amount: data.quotedAmount,
      }).catch(() => {});

      // Update reputation: communication score (RFQ response)
      await axios.post(`${SERVICES.PROCUREMENT}/api/reputation/delivery`, {
        supplierId: data.supplierId,
        supplierName: data.supplierName || 'Unknown',
        onTime: true,
        deliveryDays: 0,
        promisedDays: 0,
      }, { timeout: 5000, headers: getServiceHeaders() }).catch(() => {});

      // Sync to SUTAR Reputation
      await axios.post(`${SERVICES.SUTAR_REPUTATION}/api/reputation`, {
        entityId: data.supplierId,
        entityType: 'supplier',
        metrics: { communication_score: 100, quote_responses: 1 },
        source: 'nexha-ecosystem',
      }, { timeout: 5000 }).catch(() => {});

      // Emit to SUTAR Intent Bus (supplier responded to RFQ)
      await axios.post(`${SERVICES.SUTAR_INTENT}/api/events`, {
        type: 'rfq.quote_submitted',
        data: {
          dealId: data.dealId,
          supplierId: data.supplierId,
          supplierName: data.supplierName,
          quotedAmount: data.quotedAmount,
          deliveryDays: data.deliveryDays,
        },
        source: 'nexha-ecosystem',
        timestamp: new Date().toISOString(),
      }, { timeout: 5000 }).catch(() => {});

      logger.info(`[Orchestrator] Quote ₹${data.quotedAmount} from ${data.supplierName} recorded for deal ${data.dealId}`);

    } catch (error) {
      logger.error('[Orchestrator] Error handling quote received:', error);
    }
  }

  /**
   * Deal awarded → Create purchase order + notify supplier
   */
  private async handleDealAwarded(event: CloudEvent) {
    const data = event.data as {
      dealId?: string;
      supplierId?: string;
      supplierName?: string;
      finalAmount?: number;
      orderId?: string;
    };

    if (!data.dealId) return;

    try {
      // Get deal details
      const dealResponse = await axios.get(`${SERVICES.PROCUREMENT}/api/deals/${data.dealId}`, {
        timeout: 5000,
        headers: getServiceHeaders(),
      });

      const deal = dealResponse.data.data;
      if (!deal) return;

      // Create purchase order in procurement
      let poId: string | undefined;
      try {
        const poResponse = await axios.post(`${SERVICES.PROCUREMENT}/api/orders`, {
          buyerId: deal.buyerId,
          buyerName: deal.buyerName,
          supplierId: data.supplierId,
          supplierName: data.supplierName,
          items: deal.quotes?.find((q: any) => q.supplierId === data.supplierId)?.items || [],
          total: data.finalAmount,
        }, { timeout: 10000, headers: getServiceHeaders() });

        poId = poResponse.data.data?.id;
        logger.info(`[Orchestrator] Purchase order ${poId} created for deal ${data.dealId}`);
      } catch {
        logger.warn('[Orchestrator] Could not create purchase order');
      }

      // Notify supplier agent
      await axios.post(`${SERVICES.PROCUREMENT}/api/agents/rfq`, {
        type: 'deal_awarded',
        dealId: data.dealId,
        supplierId: data.supplierId,
        finalAmount: data.finalAmount,
        orderId: poId,
      }, { timeout: 5000, headers: getServiceHeaders() }).catch(() => {});

      // Emit procurement fulfilled event
      await eventBus.publish({
        specversion: '1.0',
        id: randomUUID(),
        source: 'ecosystem-connector',
        type: ECOSYSTEM_EVENTS.PROCUREMENT_FULFILLED,
        time: new Date().toISOString(),
        datacontenttype: 'application/json',
        data: {
          dealId: data.dealId,
          orderId: poId,
          supplierId: data.supplierId,
        },
      });

    } catch (error) {
      logger.error('[Orchestrator] Error handling deal awarded:', error);
    }
  }

  /**
   * Credit approved → Notify distribution
   */
  private async handleCreditApproved(event: CloudEvent) {
    const data = event.data as {
      merchantId?: string;
      creditLimit?: number;
      tier?: string;
    };

    try {
      await axios.post(`${SERVICES.DISTRIBUTION}/webhooks/nexha`, {
        type: 'credit.approved',
        source: 'ecosystem-connector',
        data,
      }).catch(() => {});

    } catch (error) {
      logger.error('[Orchestrator] Error handling credit approved:', error);
    }
  }

  /**
   * Payment received → Update deal fulfillment + notify supplier
   */
  private async handlePaymentReceived(event: CloudEvent) {
    const data = event.data as {
      dealId?: string;
      orderId?: string;
      amount?: number;
      paymentMethod?: string;
      supplierId?: string;
      buyerId?: string;
    };

    if (!data.dealId) return;

    try {
      // Settle payment in deal state machine
      await axios.post(`${SERVICES.PROCUREMENT}/api/deals/${data.dealId}/payment`, {
        amount: data.amount,
      }, { timeout: 5000, headers: getServiceHeaders() }).catch(() => {});

      // Update reputation pipeline (payment score)
      if (data.supplierId) {
        await axios.post(`${SERVICES.PROCUREMENT}/api/reputation/payment`, {
          supplierId: data.supplierId,
          supplierName: data.supplierId,
          onTime: true,
          amount: data.amount,
        }, { timeout: 5000, headers: getServiceHeaders() }).catch(() => {});
      }

      // Record transaction memory
      if (data.supplierId && data.buyerId) {
        await axios.post(`${SERVICES.PROCUREMENT}/api/memory/transaction`, {
          supplierId: data.supplierId,
          buyerId: data.buyerId,
          productName: 'Order',
          quantity: 1,
          unitPrice: data.amount,
          totalAmount: data.amount,
          deliveryDays: 0,
          quality: 'pass',
          onTime: true,
          buyerReputation: 80,
        }, { timeout: 5000, headers: getServiceHeaders() }).catch(() => {});
      }

      // Sync to SUTAR Reputation
      if (data.supplierId) {
        await axios.post(`${SERVICES.SUTAR_REPUTATION}/api/reputation`, {
          entityId: data.supplierId,
          entityType: 'supplier',
          metrics: { payment_score: 100 },
          source: 'nexha-ecosystem',
        }, { timeout: 5000 }).catch(() => {});
      }

      // Sync to SUTAR Economy
      if (data.supplierId && data.amount) {
        await axios.post(`${SERVICES.SUTAR_FLOW}/api/transactions`, {
          type: 'order_settled',
          supplierId: data.supplierId,
          amount: data.amount,
          source: 'nexha-ecosystem',
        }, { timeout: 5000 }).catch(() => {});
      }

      logger.info(`[Orchestrator] Payment ₹${data.amount} received for deal ${data.dealId}`);

    } catch (error) {
      logger.error('[Orchestrator] Error handling payment received:', error);
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
      id: randomUUID(),
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
      id: randomUUID(),
      source: 'ecosystem-connector',
      type: ECOSYSTEM_EVENTS.ORDER_PLACED,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data,
    });
  }

  /**
   * Emit a supplier quote received event
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
    await eventBus.publish({
      specversion: '1.0',
      id: randomUUID(),
      source: 'ecosystem-connector',
      type: 'supplier.quote_received',
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data,
    });
  }

  /**
   * Emit a deal awarded event
   */
  async emitDealAwarded(data: {
    dealId: string;
    supplierId: string;
    supplierName: string;
    finalAmount: number;
  }): Promise<void> {
    await eventBus.publish({
      specversion: '1.0',
      id: randomUUID(),
      source: 'ecosystem-connector',
      type: 'deal.awarded',
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data,
    });
  }

  /**
   * Emit payment received event
   */
  async emitPaymentReceived(data: {
    dealId: string;
    orderId: string;
    amount: number;
    paymentMethod: string;
  }): Promise<void> {
    await eventBus.publish({
      specversion: '1.0',
      id: randomUUID(),
      source: 'ecosystem-connector',
      type: ECOSYSTEM_EVENTS.PAYMENT_RECEIVED,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data,
    });
  }
}

export const orchestrator = new EcosystemOrchestrator();
