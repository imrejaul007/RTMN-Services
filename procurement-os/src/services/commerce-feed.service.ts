/**
 * Nexha ProcurementOS - Commerce Feed Service
 *
 * LinkedIn-style activity feed for commerce participants:
 * - Suppliers post new products/pricing/promotions
 * - Manufacturers post capacity/availability
 * - RFQ opportunities
 */

import { randomUUID } from 'crypto';

export type FeedItemType =
  | 'new_product' | 'price_update' | 'promotion' | 'capacity_available'
  | 'territory_available' | 'rfq_opportunity' | 'deal_closed' | 'supplier_joined'
  | 'rating_received' | 'certification_earned';

export interface FeedItem {
  id: string;
  participantId: string;
  participantName: string;
  participantType: 'supplier' | 'buyer' | 'manufacturer' | 'franchisor';
  type: FeedItemType;
  headline: string;
  body: string;
  payload: Record<string, unknown>;
  audience: 'all' | 'industry' | 'network';
  tags: string[];
  createdAt: Date;
  expiresAt?: Date;
}

export class CommerceFeed {
  private items: FeedItem[] = [];
  private maxItems = 1000;

  post(item: Omit<FeedItem, 'id' | 'createdAt'>): FeedItem {
    const feedItem: FeedItem = {
      ...item,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.items.unshift(feedItem);
    if (this.items.length > this.maxItems) this.items.pop();
    return feedItem;
  }

  supplierNewProduct(supplierId: string, supplierName: string, product: {
    name: string; category: string; price: number; leadTime: number;
  }): FeedItem {
    return this.post({
      participantId: supplierId, participantName: supplierName,
      participantType: 'supplier', type: 'new_product',
      headline: `${supplierName} added ${product.name}`,
      body: `New product: ${product.name} @ ₹${product.price}/${product.leadTime} days`,
      payload: product, audience: 'industry', tags: [product.category],
    });
  }

  supplierPromotion(supplierId: string, supplierName: string, promo: {
    title: string; discount: number; validUntil: Date;
  }): FeedItem {
    return this.post({
      participantId: supplierId, participantName: supplierName,
      participantType: 'supplier', type: 'promotion',
      headline: `${supplierName}: ${promo.title}`,
      body: `${promo.discount}% off. Valid till ${promo.validUntil.toLocaleDateString()}`,
      payload: promo, audience: 'industry', tags: ['promotion', 'discount'],
      expiresAt: promo.validUntil,
    });
  }

  rfqOpportunity(supplierId: string, supplierName: string, rfq: {
    rfqId: string; rfqNumber: string; category: string; quantity: number;
    targetPrice?: number; deadline: Date;
  }): FeedItem {
    return this.post({
      participantId: supplierId, participantName: supplierName,
      participantType: 'supplier', type: 'rfq_opportunity',
      headline: `New RFQ opportunity: ${rfq.rfqNumber}`,
      body: rfq.targetPrice
        ? `Target: ₹${rfq.targetPrice} • Deadline: ${rfq.deadline.toLocaleDateString()}`
        : `Deadline: ${rfq.deadline.toLocaleDateString()}`,
      payload: rfq, audience: 'network', tags: [rfq.category],
    });
  }

  dealClosed(sellerId: string, sellerName: string, deal: {
    buyerName: string; amount: number; product: string;
  }): FeedItem {
    return this.post({
      participantId: sellerId, participantName: sellerName,
      participantType: 'supplier', type: 'deal_closed',
      headline: `Deal closed with ${deal.buyerName}`,
      body: `₹${deal.amount.toLocaleString()} • ${deal.product}`,
      payload: deal, audience: 'network', tags: ['deal', deal.product],
    });
  }

  getFeed(options: {
    type?: FeedItemType;
    audience?: string;
    tags?: string[];
    participantId?: string;
    limit?: number;
    offset?: number;
  } = {}): FeedItem[] {
    let items = this.items;
    if (options.type) items = items.filter(i => i.type === options.type);
    if (options.audience) items = items.filter(i => i.audience === options.audience || i.audience === 'all');
    if (options.participantId) items = items.filter(i => i.participantId === options.participantId);
    if (options.tags?.length) items = items.filter(i => options.tags!.some(t => i.tags.includes(t)));
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    return items.slice(offset, offset + limit);
  }
}

export const commerceFeed = new CommerceFeed();
