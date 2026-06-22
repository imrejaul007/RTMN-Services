/**
 * Nexha ProcurementOS - Commerce Feed / Activity Stream
 *
 * LinkedIn-style activity feed for commerce participants:
 * - Suppliers post new products/pricing/promotions
 * - Manufacturers post capacity/availability
 * - Franchisors post territory expansion
 * - Agents consume feed for opportunities
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';

export type FeedItemType =
  | 'new_product'
  | 'price_update'
  | 'promotion'
  | 'capacity_available'
  | 'territory_available'
  | 'rfq_opportunity'
  | 'deal_closed'
  | 'supplier_joined'
  | 'rating_received'
  | 'certification_earned'
  | 'new_partnership'
  | 'performance_alert';

export type FeedAudience = 'all' | 'industry' | 'network' | 'tier';

export interface FeedItem {
  id: string;
  participantId: string;
  participantName: string;
  participantType: 'supplier' | 'buyer' | 'manufacturer' | 'distributor' | 'franchisor';
  type: FeedItemType;
  headline: string;
  body: string;
  payload: Record<string, unknown>;
  audience: FeedAudience;
  tags: string[];
  metrics?: {
    impressions?: number;
    clicks?: number;
    responses?: number;
  };
  createdAt: Date;
  expiresAt?: Date;
}

export class CommerceFeed {
  private items: FeedItem[] = [];
  private maxItems = 1000;

  /**
   * Post a new feed item
   */
  post(item: Omit<FeedItem, 'id' | 'createdAt'>): FeedItem {
    const feedItem: FeedItem = {
      ...item,
      id: randomUUID(),
      createdAt: new Date(),
    };

    this.items.unshift(feedItem);
    if (this.items.length > this.maxItems) {
      this.items.pop();
    }

    return feedItem;
  }

  /**
   * Supplier posted new product
   */
  supplierNewProduct(supplierId: string, supplierName: string, product: {
    name: string;
    category: string;
    price: number;
    leadTime: number;
  }): FeedItem {
    return this.post({
      participantId: supplierId,
      participantName: supplierName,
      participantType: 'supplier',
      type: 'new_product',
      headline: `${supplierName} added ${product.name}`,
      body: `New product available: ${product.name} @ ₹${product.price}/${product.leadTime} days delivery`,
      payload: product,
      audience: 'industry',
      tags: [product.category],
    });
  }

  /**
   * Supplier posted promotion
   */
  supplierPromotion(supplierId: string, supplierName: string, promo: {
    title: string;
    discount: number;
    validUntil: Date;
  }): FeedItem {
    return this.post({
      participantId: supplierId,
      participantName: supplierName,
      participantType: 'supplier',
      type: 'promotion',
      headline: `${supplierName}: ${promo.title}`,
      body: `${promo.discount}% off. Valid till ${promo.validUntil.toLocaleDateString()}`,
      payload: promo,
      audience: 'industry',
      tags: ['promotion', 'discount'],
      expiresAt: promo.validUntil,
    });
  }

  /**
   * Capacity available (manufacturer/franchisor)
   */
  capacityAvailable(participantId: string, participantName: string, participantType: FeedItem['participantType'], data: {
    capacity: number;
    category: string;
    minOrder: number;
    location?: string;
  }): FeedItem {
    return this.post({
      participantId,
      participantName,
      participantType,
      type: 'capacity_available',
      headline: `Capacity available: ${data.capacity} units`,
      body: data.location ? `${data.location} • Min order: ${data.minOrder}` : `Min order: ${data.minOrder}`,
      payload: data,
      audience: 'industry',
      tags: [data.category, 'capacity'],
    });
  }

  /**
   * Territory available (franchisor)
   */
  territoryAvailable(franchisorId: string, franchisorName: string, territory: {
    name: string;
    investment: number;
    roi: number;
  }): FeedItem {
    return this.post({
      participantId: franchisorId,
      participantName: franchisorName,
      participantType: 'franchisor',
      type: 'territory_available',
      headline: `Territory available: ${territory.name}`,
      body: `Investment: ₹${territory.investment} • ROI: ${territory.roi}%`,
      payload: territory,
      audience: 'all',
      tags: ['franchise', 'expansion', territory.name],
    });
  }

  /**
   * RFQ opportunity (agent notification)
   */
  rfqOpportunity(supplierId: string, supplierName: string, rfq: {
    rfqId: string;
    rfqNumber: string;
    category: string;
    quantity: number;
    targetPrice?: number;
    deadline: Date;
  }): FeedItem {
    return this.post({
      participantId: supplierId,
      participantName: supplierName,
      participantType: 'supplier',
      type: 'rfq_opportunity',
      headline: `New RFQ opportunity: ${rfq.rfqNumber}`,
      body: rfq.targetPrice
        ? `Target: ₹${rfq.targetPrice} • Deadline: ${rfq.deadline.toLocaleDateString()}`
        : `Deadline: ${rfq.deadline.toLocaleDateString()}`,
      payload: rfq,
      audience: 'network',
      tags: [rfq.category],
    });
  }

  /**
   * Supplier joined network
   */
  supplierJoined(supplierId: string, supplierName: string, tags: string[]): FeedItem {
    return this.post({
      participantId: supplierId,
      participantName: supplierName,
      participantType: 'supplier',
      type: 'supplier_joined',
      headline: `${supplierName} joined Nexha`,
      body: 'New verified supplier available',
      payload: { supplierId, supplierName },
      audience: 'industry',
      tags,
    });
  }

  /**
   * Deal closed
   */
  dealClosed(sellerId: string, sellerName: string, deal: {
    buyerName: string;
    amount: number;
    product: string;
    deliveryDays: number;
  }): FeedItem {
    return this.post({
      participantId: sellerId,
      participantName: sellerName,
      participantType: 'supplier',
      type: 'deal_closed',
      headline: `Deal closed with ${deal.buyerName}`,
      body: `₹${deal.amount.toLocaleString()} • ${deal.product}`,
      payload: deal,
      audience: 'network',
      tags: ['deal', deal.product],
    });
  }

  /**
   * Rating received
   */
  ratingReceived(supplierId: string, supplierName: string, rating: {
    score: number;
    review: string;
  }): FeedItem {
    return this.post({
      participantId: supplierId,
      participantName: supplierName,
      participantType: 'supplier',
      type: 'rating_received',
      headline: `${supplierName} rated ${rating.score}/5`,
      body: rating.review.slice(0, 100),
      payload: rating,
      audience: 'network',
      tags: ['rating'],
    });
  }

  /**
   * Get feed items with filters
   */
  getFeed(options: {
    type?: FeedItemType;
    audience?: FeedAudience;
    tags?: string[];
    participantId?: string;
    since?: Date;
    limit?: number;
    offset?: number;
  } = {}): FeedItem[] {
    let items = this.items;

    if (options.type) {
      items = items.filter(i => i.type === options.type);
    }
    if (options.audience) {
      items = items.filter(i =>
        i.audience === options.audience || i.audience === 'all'
      );
    }
    if (options.participantId) {
      items = items.filter(i => i.participantId === options.participantId);
    }
    if (options.since) {
      items = items.filter(i => i.createdAt >= options.since!);
    }
    if (options.tags && options.tags.length > 0) {
      items = items.filter(i =>
        options.tags!.some(t => i.tags.includes(t))
    }

    const offset = options.offset || 0;
    const limit = options.limit || 20;
    return items.slice(offset, offset + limit);
  }

  /**
   * Get RFQ opportunities for a supplier
   */
  getRFQOpportunities(supplierId: string): FeedItem[] {
    return this.items.filter(i =>
      i.type === 'rfq_opportunity' &&
      (i.audience === 'network' || i.participantId === supplierId)
    ).slice(0, 20);
  }
}

export const commerceFeed = new CommerceFeed();
