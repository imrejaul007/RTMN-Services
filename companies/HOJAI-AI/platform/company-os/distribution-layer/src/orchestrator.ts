/**
 * Distribution Orchestrator
 *
 * Orchestrates syncing products, inventory, and orders
 * between CompanyOS and distribution channels.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ProductSync,
  OrderSync,
  ChannelConfig,
} from './types';
import { channelRegistry } from './channels';

// ============================================
// In-Memory Store
// ============================================

const productSyncs = new Map<string, ProductSync>();
const orderSyncs = new Map<string, OrderSync>();

// ============================================
// Distribution Orchestrator
// ============================================

export class DistributionOrchestrator {
  /**
   * Sync a product to a channel
   */
  async syncProduct(params: {
    companyId: string;
    channelId: string;
    product: {
      productId: string;
      name: string;
      description: string;
      price: number;
      currency: string;
      category: string;
      images?: string[];
      inStock?: boolean;
    };
  }): Promise<ProductSync> {
    const sync: ProductSync = {
      channelId: params.channelId,
      companyId: params.companyId,
      productId: params.product.productId,
      name: params.product.name,
      description: params.product.description,
      price: params.product.price,
      currency: params.product.currency,
      category: params.product.category,
      images: params.product.images || [],
      inStock: params.product.inStock !== false,
      syncedAt: new Date().toISOString(),
      status: 'pending',
    };

    productSyncs.set(`${params.channelId}:${params.product.productId}`, sync);

    try {
      const channel = channelRegistry.get(params.channelId);
      if (!channel) throw new Error(`Channel not found: ${params.channelId}`);

      // Simulate API call to channel
      // In production: const response = await fetch(`${channel.baseUrl}/api/products`, {...});
      sync.channelProductId = `ch_${uuidv4().slice(0, 8)}`;
      sync.status = 'synced';
    } catch (error) {
      sync.status = 'failed';
      sync.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    return sync;
  }

  /**
   * Sync all products to a channel
   */
  async syncAllProducts(params: {
    companyId: string;
    channelId: string;
    products: Array<{
      productId: string;
      name: string;
      description: string;
      price: number;
      currency: string;
      category: string;
      images?: string[];
      inStock?: boolean;
    }>;
  }): Promise<ProductSync[]> {
    const results: ProductSync[] = [];
    for (const product of params.products) {
      const sync = await this.syncProduct({
        companyId: params.companyId,
        channelId: params.channelId,
        product,
      });
      results.push(sync);
    }
    return results;
  }

  /**
   * Receive an order from a channel
   */
  receiveOrder(params: {
    channelId: string;
    companyId: string;
    channelOrderId: string;
    customer: OrderSync['customer'];
    items: OrderSync['items'];
    currency: string;
  }): OrderSync {
    const total = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order: OrderSync = {
      channelId: params.channelId,
      companyId: params.companyId,
      channelOrderId: params.channelOrderId,
      externalOrderId: `ord_${uuidv4().slice(0, 8)}`,
      customer: params.customer,
      items: params.items,
      total,
      currency: params.currency,
      status: 'received',
      receivedAt: new Date().toISOString(),
    };

    orderSyncs.set(order.externalOrderId, order);
    return order;
  }

  /**
   * Update order status
   */
  updateOrderStatus(orderId: string, status: OrderSync['status']): OrderSync | null {
    const order = orderSyncs.get(orderId);
    if (!order) return null;
    order.status = status;
    return order;
  }

  /**
   * Get sync status for a company
   */
  getSyncStatus(companyId: string): {
    channels: string[];
    productsSynced: number;
    productsFailed: number;
    ordersReceived: number;
    ordersProcessing: number;
  } {
    const channels = new Set<string>();
    let productsSynced = 0;
    let productsFailed = 0;

    for (const sync of productSyncs.values()) {
      if (sync.companyId === companyId) {
        channels.add(sync.channelId);
        if (sync.status === 'synced') productsSynced++;
        if (sync.status === 'failed') productsFailed++;
      }
    }

    let ordersReceived = 0;
    let ordersProcessing = 0;
    for (const order of orderSyncs.values()) {
      if (order.companyId === companyId) {
        ordersReceived++;
        if (order.status === 'processing' || order.status === 'received') ordersProcessing++;
      }
    }

    return {
      channels: Array.from(channels),
      productsSynced,
      productsFailed,
      ordersReceived,
      ordersProcessing,
    };
  }

  /**
   * Setup a company on all available channels for its industry
   */
  async setupForIndustry(companyId: string, industry: string): Promise<string[]> {
    const channels = channelRegistry.getChannelsForIndustry(industry);
    const connected: string[] = [];

    for (const channel of channels) {
      try {
        // Simulate channel connection
        // In production: await connectToChannel(channel, companyId);
        connected.push(channel.id);
      } catch (error) {
        console.error(`Failed to connect ${channel.id}:`, error);
      }
    }

    return connected;
  }
}

export const distributionOrchestrator = new DistributionOrchestrator();