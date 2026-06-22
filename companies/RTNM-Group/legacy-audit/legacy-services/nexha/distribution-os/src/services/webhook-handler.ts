/**
 * NeXha DistributionOS - Webhook Handlers
 *
 * Handles incoming webhooks for:
 * - Inventory signals from merchants
 * - Order events from REZ Merchant
 * - Retailer data sync
 */

import type { CloudEvent } from '@rez/shared-types';
import { DISTRIBUTION_EVENTS } from '@rez/shared-types';
import { distributorService, collectionService } from './distribution.service.js';

// ============================================================================
// Inventory Signal Handler
// ============================================================================

export async function handleDistributionInventorySignal(event: CloudEvent): Promise<{
  success: boolean;
  action?: string;
  details?: Record<string, unknown>;
}> {
  const data = event.data as Record<string, unknown>;

  // Extract signal data
  const signalType = String(data.signalType || data.signal_type || 'low_stock');
  const currentStock = Number(data.currentStock || data.current_stock || 0);
  const threshold = Number(data.threshold || 0);

  // Determine urgency based on signal type and stock level
  let urgency: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
  if (signalType === 'out_of_stock' || currentStock === 0) {
    urgency = 'urgent';
  } else if (currentStock <= threshold * 0.5) {
    urgency = 'high';
  }

  // Create collection target for reordering
  const targetAmount = currentStock === 0 ? threshold * 2 : threshold - currentStock;

  logger.info([DistributionOS] Received ${signalType} signal`, {
    source: event.source,
    stock: currentStock,
    threshold,
    urgency,
    suggestedOrder: targetAmount,
  });

  return {
    success: true,
    action: 'signal_processed',
    details: {
      signalType,
      currentStock,
      threshold,
      urgency,
      suggestedOrder: targetAmount,
    },
  };
}

// ============================================================================
// Order Event Handler
// ============================================================================

export async function handleDistributionOrderEvent(event: CloudEvent): Promise<{
  success: boolean;
  action?: string;
  details?: Record<string, unknown>;
}> {
  const data = event.data as Record<string, unknown>;

  const orderId = String(data.orderId || data.id || '');
  const orderNumber = String(data.orderNumber || data.order_number || '');
  const status = String(data.status || data.newStatus || '');
  const total = Number(data.total || data.amount || 0);

  logger.info([DistributionOS] Order event: ${orderId}`, {
    type: event.type,
    status,
    total,
    source: event.source,
  });

  // Handle specific order statuses
  if (event.type.includes('delivered') || status === 'delivered') {
    // Update inventory or trigger reorder
    logger.info([DistributionOS] Order delivered: ${orderNumber}`);
  }

  return {
    success: true,
    action: 'order_processed',
    details: {
      orderId,
      orderNumber,
      status,
      total,
    },
  };
}

// ============================================================================
// Van Sale Sync Handler
// ============================================================================

export async function handleVanSaleSync(event: CloudEvent): Promise<{
  success: boolean;
  action?: string;
  details?: Record<string, unknown>;
}> {
  const data = event.data as Record<string, unknown>;

  const saleId = String(data.saleId || data.id || '');
  const distributorId = String(data.distributorId || '');
  const status = String(data.status || '');

  logger.info([DistributionOS] Van sale sync: ${saleId}`, {
    distributorId,
    status,
  });

  return {
    success: true,
    action: 'van_sale_synced',
    details: {
      saleId,
      distributorId,
      status,
    },
  };
}

// ============================================================================
// Collection Event Handler
// ============================================================================

export async function handleCollectionEvent(event: CloudEvent): Promise<{
  success: boolean;
  action?: string;
  details?: Record<string, unknown>;
}> {
  const data = event.data as Record<string, unknown>;

  const retailerId = String(data.retailerId || '');
  const amount = Number(data.amount || 0);
  const collectedBy = String(data.collectedBy || '');

  if (event.type.includes('recorded') || event.type.includes('created')) {
    // Record the collection
    if (retailerId && amount > 0) {
      const collection = await collectionService.recordCollection({
        retailerId,
        amount,
        paymentMethod: (data.paymentMethod as any) || 'cash',
        collectedBy,
      });

      logger.info([DistributionOS] Collection recorded: ${collection.id}`, {
        amount,
        retailerId,
      });

      return {
        success: true,
        action: 'collection_recorded',
        details: {
          collectionId: collection.id,
          amount,
          retailerId,
        },
      };
    }
  }

  return {
    success: true,
    action: 'collection_processed',
    details: { retailerId, amount },
  };
}

// ============================================================================
// Handler Registry
// ============================================================================

export const distributionWebhookHandlers = [
  // Inventory signals
  {
    id: 'distribution-inventory-low',
    eventTypes: [
      'inventory.low_stock',
      'demand.inventory.low',
      DISTRIBUTION_EVENTS.DISTRIBUTOR_SIGNAL,
    ],
    handle: handleDistributionInventorySignal,
  },
  {
    id: 'distribution-inventory-out',
    eventTypes: [
      'inventory.out_of_stock',
      'demand.inventory.out',
    ],
    handle: async (event: CloudEvent) => {
      const data = event.data as Record<string, unknown>;
      // Urgent handling for out of stock
      logger.info([DistributionOS] URGENT: Out of stock signal`, {
        source: event.source,
        product: data.productName || data.product_name,
      });
      return handleDistributionInventorySignal(event);
    },
  },
  // Order events
  {
    id: 'distribution-order',
    eventTypes: [
      'order.placed',
      'order.confirmed',
      'order.delivered',
      'supply.po.created',
      'supply.po.confirmed',
      'supply.po.shipped',
      'supply.po.delivered',
    ],
    handle: handleDistributionOrderEvent,
  },
  // Van sale sync
  {
    id: 'distribution-vansale',
    eventTypes: [
      DISTRIBUTION_EVENTS.VAN_SALE_CREATED,
      DISTRIBUTION_EVENTS.DELIVERY_COMPLETED,
      'distribution.route_sale.created',
    ],
    handle: handleVanSaleSync,
  },
  // Collections
  {
    id: 'distribution-collection',
    eventTypes: [
      DISTRIBUTION_EVENTS.COLLECTION_RECORDED,
      'finance.payment.completed',
    ],
    handle: handleCollectionEvent,
  },
];
