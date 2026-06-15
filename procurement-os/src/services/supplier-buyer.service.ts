/**
 * Nexha ProcurementOS - Supplier Buyer Agent Service
 *
 * Handles SELLER-SIDE (supplier) automation:
 * - Supplier webhook for inbound RFQ receipt (guest access)
 * - Auto-quote generation from pricing/inventory
 * - Counter-offer handling
 * - Auto-reputation tracking
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
  commerceId: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  gstin?: string;
  verified: boolean;
  tier: SupplierTier;
  status: SupplierStatus;
  webhookUrl?: string;
  slaHours: number;
  rating: number;
  completedOrders: number;
  isGuest: boolean;
  guestToken?: string;
  trustScore: number;
  registeredAt: Date;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  name: string;
  sku?: string;
  category: string;
  unit: string;
  minOrderQty: number;
  price: number;
  stock: number;
  leadTimeDays: number;
  isActive: boolean;
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
  status: QuoteStatus;
  counterOffers: Array<{
    amount: number;
    terms: string;
    from: 'buyer' | 'seller';
    timestamp: Date;
  }>;
  createdAt: Date;
  expiresAt: Date;
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
  webhookUrl: z.string().url().optional(),
});

export const ReceiveRFQSchema = z.object({
  supplierId: z.string(),
  rfqId: z.string(),
  action: z.enum(['receive', 'quote', 'accept', 'reject', 'counter']),
  counterAmount: z.number().positive().optional(),
  counterTerms: z.string().optional(),
});

// ============================================================================
// Supplier Buyer Agent Service
// ============================================================================

export class SupplierBuyerAgentService {
  private suppliers = new Map<string, SupplierProfile>();
  private products = new Map<string, SupplierProduct[]>();
  private quotes = new Map<string, SupplierQuote>();
  private guestTokens = new Map<string, { supplierId: string; expiresAt: Date }>();

  private SUTAR_IDENTITY = process.env.SUTAR_IDENTITY_URL || 'http://localhost:4147';
  private SUTAR_NEGOTIATION = process.env.SUTAR_NEGOTIATION_URL || 'http://localhost:4191';

  /**
   * Register a supplier (guest or verified)
   */
  async registerSupplier(
    input: z.infer<typeof GuestSupplierSchema>
  ): Promise<{ supplier: SupplierProfile; guestToken?: string }> {
    const isGuest = !input.gstin;

    const supplierId = isGuest
      ? `GST-${randomUUID().slice(0, 8).toUpperCase()}`
      : `BIZ-${randomUUID().slice(0, 8).toUpperCase()}`;

    const guestToken = isGuest ? randomUUID() : undefined;

    const supplier: SupplierProfile = {
      id: supplierId,
      commerceId: `AGT-${supplierId}`,
      businessName: input.businessName,
      ownerName: input.ownerName,
      email: input.email,
      phone: input.phone,
      gstin: input.gstin,
      verified: !!input.gstin,
      tier: isGuest ? 'guest' : 'bronze',
      status: 'pending',
      webhookUrl: input.webhookUrl,
      slaHours: 48,
      rating: 0,
      completedOrders: 0,
      isGuest,
      guestToken,
      trustScore: isGuest ? 50 : 70,
      registeredAt: new Date(),
    };

    this.suppliers.set(supplierId, supplier);

    if (guestToken) {
      this.guestTokens.set(guestToken, {
        supplierId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    this.syncToSutarIdentity(supplier).catch(() => {});

    return { supplier, guestToken };
  }

  /**
   * Receive RFQ notification (inbound from buyer)
   */
  async receiveRFQ(
    supplierId: string,
    rfqId: string,
    rfqDetails: {
      buyerName: string;
      items: Array<{ name: string; quantity: number; unit: string; targetPrice?: number }>;
      deadline: Date;
    }
  ): Promise<{ received: boolean; quoteId?: string }> {
    const supplier = this.suppliers.get(supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

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
    const supplierProducts = this.products.get(supplierId) || [];
    const items: SupplierQuote['items'] = [];
    let subtotal = 0;

    for (const rfqItem of rfqItems) {
      const product = supplierProducts.find(p =>
        p.name.toLowerCase().includes(rfqItem.productName.toLowerCase())
      );

      let unitPrice = rfqItem.targetPrice || product?.price || 0;

      if (options.negotiate && rfqItem.targetPrice && product) {
        const discount = ((product.price - rfqItem.targetPrice) / product.price) * 100;
        if (discount <= (options.minMargin || 10)) {
          unitPrice = rfqItem.targetPrice;
        } else {
          unitPrice = product.price * 0.95;
        }
      }

      items.push({
        productId: product?.id,
        productName: rfqItem.productName,
        quantity: rfqItem.quantity,
        unit: rfqItem.unit,
        unitPrice,
        totalPrice: unitPrice * rfqItem.quantity,
      });
      subtotal += unitPrice * rfqItem.quantity;
    }

    const tax = subtotal * 0.18;
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

    return quote;
  }

  /**
   * Accept RFQ terms
   */
  async acceptRFQ(quoteId: string): Promise<SupplierQuote | null> {
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
  async rejectRFQ(quoteId: string, reason?: string): Promise<SupplierQuote | null> {
    const quote = this.quotes.get(quoteId);
    if (!quote) return null;
    quote.status = 'rejected';
    if (reason) quote.notes = reason;
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
    gstin: string
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

    this.guestTokens.delete(guestToken);
    return supplier;
  }

  // Add missing lastActiveAt to SupplierProfile
  private lastActiveAt?: Date;

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
}

export const supplierBuyerAgent = new SupplierBuyerAgentService();
