/**
 * Nexha ProcurementOS - Supplier Buyer Agent Service
 *
 * Handles SELLER-SIDE (supplier) automation:
 * - Supplier webhook for inbound RFQ receipt (guest access)
 * - Auto-quote generation from pricing/inventory
 * - Counter-offer handling
 * - Auto-reputation tracking
 * - Supplier discovery of new buyers
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';
import axios from 'axios';

// ============================================================================
// Types
// ============================================================================

export type SupplierStatus = 'pending' | 'active' | 'suspended' | 'verified' | 'guest';
export type QuoteStatus = 'draft' | 'sent' | 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
export type SupplierTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'guest';

export interface SupplierProfile {
  id: string;
  commerceId: string; // SUTAR commerce ID
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  gstin?: string;
  address?: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
  categories: string[];
  verified: boolean;
  tier: SupplierTier;
  status: SupplierStatus;
  webhookUrl?: string;
  apiKey?: string;
  preferredChannel: 'email' | 'sms' | 'whatsapp' | 'api' | 'portal';
  slaHours: number;
  rating: number;
  completedOrders: number;
  isGuest: boolean;
  guestToken?: string;
  trustScore: number;
  reputationScore: number;
  registeredAt: Date;
  lastActiveAt?: Date;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  name: string;
  sku?: string;
  category: string;
  description?: string;
  unit: string;
  minOrderQty: number;
  price: number;
  stock: number;
  leadTimeDays: number;
  certifications?: string[];
  images?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierQuote {
  id: string;
  quoteNumber: string;
  supplierId: string;
  rfqId: string;
  dealId?: string;
  items: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  totalAmount: number;
  currency: string;
  validUntil: Date;
  deliveryDays: number;
  paymentTerms: string;
  notes?: string;
  status: QuoteStatus;
  counterOffers: Array<{
    amount: number;
    terms: string;
    from: 'buyer' | 'seller';
    timestamp: Date;
  }>;
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
  expiresAt: Date;
}

export interface SupplierInventory {
  supplierId: string;
  products: SupplierProduct[];
  lastSyncedAt?: Date;
}

export interface SupplierMetrics {
  supplierId: string;
  totalOrders: number;
  onTimeDeliveryRate: number;
  qualityPassRate: number;
  avgResponseTimeHours: number;
  negotiationWinRate: number;
  revenue: number;
  avgOrderValue: number;
  repeatCustomerRate: number;
}

// ============================================================================
// Schemas
// ============================================================================

export const GuestSupplierSchema = z.object({
  businessName: z.string().min(1),
  ownerName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  categories: z.array(z.string()).optional(),
});

export const ReceiveRFQSchema = z.object({
  supplierId: z.string(),
  rfqId: z.string(),
  action: z.enum(['receive', 'quote', 'accept', 'reject', 'counter']),
  counterAmount: z.number().positive().optional(),
  counterTerms: z.string().optional(),
  webhookToken: z.string().optional(),
});

export const AutoQuoteSchema = z.object({
  supplierId: z.string(),
  rfqId: z.string().optional(),
  rfqItems: z.array(z.object({
    productName: z.string(),
    quantity: z.number().positive(),
    unit: z.string().optional(),
  })),
  checkInventory: z.boolean().default(true),
  negotiate: z.boolean().default(true),
  minMargin: z.number().min(0).max(50).default(10),
});

// ============================================================================
// Supplier Buyer Agent Service
// ============================================================================

export class SupplierBuyerAgentService {
  private suppliers = new Map<string, SupplierProfile>();
  private products = new Map<string, SupplierProduct[]>();
  private quotes = new Map<string, SupplierQuote>();
  private inventory = new Map<string, SupplierInventory>();

  // In production, these would call SUTAR services
  private SUTAR_IDENTITY = process.env.SUTAR_IDENTITY_URL || 'http://localhost:4147';
  private SUTAR_TRUST = process.env.SUTAR_TRUST_URL || 'http://localhost:4180';
  private SUTAR_REPUTATION = process.env.SUTAR_REPUTATION_URL || 'http://localhost:4185';
  private SUTAR_NEGOTIATION = process.env.SUTAR_NEGOTIATION_URL || 'http://localhost:4191';
  private SUTAR_INTENT = process.env.SUTAR_INTENT_URL || 'http://localhost:4154';

  // Guest token store (in production, use Redis)
  private guestTokens = new Map<string, { supplierId: string; expiresAt: Date }>();

  /**
   * Register a supplier (guest or verified)
   * Guest = temporary ID, no full onboarding required
   */
  async registerSupplier(
    input: z.infer<typeof GuestSupplierSchema> & { webhookUrl?: string; apiKey?: string }
  ): Promise<{ supplier: SupplierProfile; guestToken?: string }> {
    const isGuest = !input.gstin;

    const supplierId = isGuest
      ? `GST-${randomUUID().slice(0, 8).toUpperCase()}`
      : `BIZ-${randomUUID().slice(0, 8).toUpperCase()}`;

    // Generate guest token for unauthenticated access
    const guestToken = isGuest ? randomUUID() : undefined;

    const supplier: SupplierProfile = {
      id: supplierId,
      commerceId: `AGT-${supplierId}`,
      businessName: input.businessName,
      ownerName: input.ownerName,
      email: input.email,
      phone: input.phone,
      gstin: input.gstin,
      categories: input.categories || [],
      verified: !!input.gstin,
      tier: isGuest ? 'guest' : 'bronze',
      status: 'pending',
      webhookUrl: input.webhookUrl,
      apiKey: input.apiKey,
      preferredChannel: input.webhookUrl ? 'api' : 'email',
      slaHours: 48,
      rating: 0,
      completedOrders: 0,
      isGuest,
      guestToken,
      trustScore: isGuest ? 50 : 70,
      reputationScore: 0,
      registeredAt: new Date(),
    };

    this.suppliers.set(supplierId, supplier);

    // Store guest token
    if (guestToken) {
      this.guestTokens.set(guestToken, {
        supplierId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
    }

    // Sync to SUTAR Identity (fire-and-forget)
    this.syncToSutarIdentity(supplier).catch(() => {});

    return { supplier, guestToken };
  }

  /**
   * Receive RFQ notification (inbound from buyer/nexus system)
   * No auth required for guest suppliers
   */
  async receiveRFQ(
    supplierId: string,
    rfqId: string,
    rfqDetails: {
      buyerName: string;
      items: Array<{ name: string; quantity: number; unit: string; targetPrice?: number }>;
      deadline: Date;
      notes?: string;
    }
  ): Promise<{ received: boolean; quoteId?: string }> {
    const supplier = this.suppliers.get(supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // Create inbound notification record
    const quoteId = randomUUID();
    const quote: SupplierQuote = {
      id: quoteId,
      quoteNumber: `QT-${Date.now().toString(36).toUpperCase()}`,
      supplierId,
      rfqId,
      items: rfqDetails.items.map(item => ({
        productName: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: 0,
        totalPrice: 0,
      })),
      subtotal: 0,
      tax: 0,
      totalAmount: 0,
      currency: 'INR',
      validUntil: rfqDetails.deadline,
      deliveryDays: 7,
      paymentTerms: 'Net 30',
      status: 'pending',
      counterOffers: [],
      createdAt: new Date(),
      expiresAt: rfqDetails.deadline,
    };

    this.quotes.set(quoteId, quote);
    supplier.lastActiveAt = new Date();
    this.suppliers.set(supplierId, supplier);

    // Sync to SUTAR Intent Bus
    this.emitIntent('rfq.received', {
      supplierId,
      rfqId,
      buyerName: rfqDetails.buyerName,
      items: rfqDetails.items,
    }).catch(() => {});

    return { received: true, quoteId };
  }

  /**
   * Auto-generate quote from supplier's product catalog
   */
  async autoGenerateQuote(
    supplierId: string,
    rfqId: string,
    rfqItems: Array<{ productName: string; quantity: number; unit: string; targetPrice?: number }>,
    options: { checkInventory?: boolean; negotiate?: boolean; minMargin?: number } = {}
  ): Promise<SupplierQuote | null> {
    const supplier = this.supplierProducts.get(supplierId);
    if (!supplier) return null;

    const supplierProducts = this.products.get(supplierId) || [];
    const items: SupplierQuote['items'] = [];
    let subtotal = 0;
    let allInStock = true;

    for (const rfqItem of rfqItems) {
      // Find matching product
      const product = supplierProducts.find(p =>
        p.name.toLowerCase().includes(rfqItem.productName.toLowerCase()) ||
        rfqItem.productName.toLowerCase().includes(p.name.toLowerCase())
      );

      if (!product) {
        // Try partial match or skip
        items.push({
          productName: rfqItem.productName,
          quantity: rfqItem.quantity,
          unit: rfqItem.unit,
          unitPrice: rfqItem.targetPrice || 0,
          totalPrice: (rfqItem.targetPrice || 0) * rfqItem.quantity,
        });
        subtotal += (rfqItem.targetPrice || 0) * rfqItem.quantity;
        continue;
      }

      if (options.checkInventory && product.stock < rfqItem.quantity) {
        allInStock = false;
      }

      // Auto-price: Use target price with margin, or product price
      let unitPrice = rfqItem.targetPrice || product.price;

      // Auto-negotiate: Give discount if buyer target is lower
      if (options.negotiate && rfqItem.targetPrice && rfqItem.targetPrice < product.price) {
        const discount = ((product.price - rfqItem.targetPrice) / product.price) * 100;
        if (discount <= (options.minMargin || 10)) {
          // Accept buyer's target price
          unitPrice = rfqItem.targetPrice;
        } else {
          // Counter with slight discount from our price
          unitPrice = product.price * 0.95;
        }
      }

      const totalPrice = unitPrice * rfqItem.quantity;
      items.push({
        productId: product.id,
        productName: product.name,
        quantity: rfqItem.quantity,
        unit: rfqItem.unit,
        unitPrice,
        totalPrice,
      });
      subtotal += totalPrice;
    }

    const tax = subtotal * 0.18; // GST
    const totalAmount = subtotal + tax;

    const quoteId = randomUUID();
    const quote: SupplierQuote = {
      id: quoteId,
      quoteNumber: `QT-${Date.now().toString(36).toUpperCase()}`,
      supplierId,
      rfqId,
      items,
      subtotal,
      tax,
      totalAmount,
      currency: 'INR',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deliveryDays: 5,
      paymentTerms: 'Net 30',
      status: 'draft',
      counterOffers: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    this.quotes.set(quoteId, quote);

    return quote;
  }

  /**
   * Send counter-offer to buyer
   */
  async sendCounterOffer(
    quoteId: string,
    counterAmount: number,
    terms: string
  ): Promise<SupplierQuote | null> {
    const quote = this.quotes.get(quoteId);
    if (!quote) return null;

    quote.counterOffers.push({
      amount: counterAmount,
      terms,
      from: 'seller',
      timestamp: new Date(),
    });

    quote.status = 'countered';
    this.quotes.set(quoteId, quote);

    // Sync to SUTAR Negotiation Engine
    this.emitNegotiation('counter_offer', {
      quoteId,
      supplierId: quote.supplierId,
      rfqId: quote.rfqId,
      counterAmount,
      terms,
    }).catch(() => {});

    return quote;
  }

  /**
   * Accept RFQ terms
   */
  async acceptRFQ(
    quoteId: string
  ): Promise<SupplierQuote | null> {
    const quote = this.quotes.get(quoteId);
    if (!quote) return null;

    quote.status = 'accepted';
    quote.sentAt = new Date();
    this.quotes.set(quoteId, quote);

    return quote;
  }

  /**
   * Reject RFQ
   */
  async rejectRFQ(
    quoteId: string,
    reason?: string
  ): Promise<SupplierQuote | null> {
    const quote = this.quotes.get(quoteId);
    if (!quote) return null;

    quote.status = 'rejected';
    if (reason) {
      quote.notes = reason;
    }
    this.quotes.set(quoteId, quote);

    return quote;
  }

  /**
   * Get pending RFQs for supplier
   */
  getPendingRFQs(supplierId: string): SupplierQuote[] {
    return Array.from(this.quotes.values())
      .filter(q => q.supplierId === supplierId && q.status === 'pending')
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  }

  /**
   * Get supplier profile
   */
  getSupplier(supplierId: string): SupplierProfile | null {
    return this.suppliers.get(supplierId) || null;
  }

  /**
   * Verify guest token
   */
  verifyGuestToken(token: string): SupplierProfile | null {
    const entry = this.guestTokens.get(token);
    if (!entry) return null;
    if (entry.expiresAt < new Date()) {
      this.guestTokens.delete(token);
      return null;
    }
    return this.suppliers.get(entry.supplierId) || null;
  }

  /**
   * Upgrade guest to verified supplier
   */
  async upgradeGuestToVerified(
    guestToken: string,
    gstin: string,
    documents: Array<{ type: string; url: string }>
  ): Promise<SupplierProfile | null> {
    const entry = this.guestTokens.get(guestToken);
    if (!entry) return null;

    const supplier = this.suppliers.get(entry.supplierId);
    if (!supplier) return null;

    supplier.gstin = gstin;
    supplier.verified = true;
    supplier.tier = 'silver';
    supplier.status = 'active';
    supplier.isGuest = false;
    delete supplier.guestToken;

    // Remove guest token
    this.guestTokens.delete(guestToken);

    // Sync to SUTAR Trust Engine
    this.emitTrustUpdate(supplier.id, { verified: true, tier: 'silver' }).catch(() => {});

    return supplier;
  }

  // ==========================================================================
  // SUTAR Integration (async, fire-and-forget)
  // ==========================================================================

  private async syncToSutarIdentity(supplier: SupplierProfile): Promise<void> {
    try {
      await axios.post(`${this.SUTAR_IDENTITY}/api/v1/identities`, {
        id: supplier.commerceId,
        type: 'supplier',
        name: supplier.businessName,
        metadata: {
          supplierId: supplier.id,
          tier: supplier.tier,
          verified: supplier.verified,
        },
      }, { timeout: 5000 });
    } catch {
      // Non-blocking
    }
  }

  private async emitIntent(type: string, data: Record<string, unknown>): Promise<void> {
    try {
      await axios.post(`${this.SUTAR_INTENT}/api/events`, {
        type,
        data: {
          ...data,
          source: 'nexha-procurement',
          timestamp: new Date().toISOString(),
        },
      }, { timeout: 5000 });
    } catch {
      // Non-blocking
    }
  }

  private async emitNegotiation(
    type: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      await axios.post(`${this.SUTAR_NEGOTIATION}/api/negotiations`, {
        type,
        data: {
          ...data,
          source: 'nexha-procurement',
        },
      }, { timeout: 5000 });
    } catch {
      // Non-blocking
    }
  }

  private async emitTrustUpdate(
    supplierId: string,
    metrics: Record<string, unknown>
  ): Promise<void> {
    try {
      await axios.post(`${this.SUTAR_TRUST}/api/trust`, {
        entityId: supplierId,
        entityType: 'supplier',
        metrics,
      }, { timeout: 5000 });
    } catch {
      // Non-blocking
    }
  }

  // Placeholder - would be replaced with actual product catalog
  private supplierProducts = new Map<string, SupplierProduct[]>();
}

// ============================================================================
// Exports
// ============================================================================

export const supplierBuyerAgent = new SupplierBuyerAgentService();
