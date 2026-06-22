/**
 * NeXha ProcurementOS - Core Service
 *
 * Handles:
 * - Supplier discovery
 * - RFQ creation and management
 * - Quote comparison
 * - Order placement
 * - Marketplace browsing
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  categories: string[];
  certifications: string[];
  rating: number;
  completedOrders: number;
  responseTime: string;
  verified: boolean;
  documents: Array<{ type: string; url: string }>;
  metadata?: Record<string, unknown>;
}

export interface ProductListing {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  unit: string;
  minOrderQuantity: number;
  price: number;
  moq: number;
  stock: number;
  leadTime: string;
  images: string[];
  verified: boolean;
}

export interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  description: string;
  items: RFQItem[];
  deadline: Date;
  status: 'draft' | 'open' | 'quoted' | 'awarded' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  buyerId: string;
  buyerName: string;
  invitedSuppliers: string[];
  quotes: Quote[];
  awardedQuoteId?: string;
  createdAt: Date;
}

export interface RFQItem {
  id: string;
  productName: string;
  description?: string;
  quantity: number;
  unit: string;
  specifications?: string;
}

export interface Quote {
  id: string;
  rfqId: string;
  supplierId: string;
  supplierName: string;
  items: Array<{ rfqItemId: string; unitPrice: number; totalPrice: number; notes?: string }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  validUntil?: Date;
  deliveryTime: string;
  paymentTerms: string;
  notes?: string;
  status: 'submitted' | 'accepted' | 'rejected' | 'withdrawn';
  submittedAt: Date;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  rfqId?: string;
  quoteId?: string;
  buyerId: string;
  buyerName: string;
  supplierId: string;
  supplierName: string;
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  expectedDelivery?: Date;
  actualDelivery?: Date;
  createdAt: Date;
}

// ============================================================================
// Schemas
// ============================================================================

export const CreateRFQSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  items: z.array(z.object({
    productName: z.string().min(1),
    description: z.string().optional(),
    quantity: z.number().positive(),
    unit: z.string().min(1),
  })),
  deadline: z.string().datetime(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  invitedSuppliers: z.array(z.string()).optional(),
});

export const SubmitQuoteSchema = z.object({
  items: z.array(z.object({
    rfqItemId: z.string(),
    unitPrice: z.number().positive(),
    notes: z.string().optional(),
  })),
  discount: z.number().default(0),
  validUntil: z.string().datetime().optional(),
  deliveryTime: z.string(),
  paymentTerms: z.string().default('Net 30'),
  notes: z.string().optional(),
});

export type CreateRFQInput = z.infer<typeof CreateRFQSchema>;
export type SubmitQuoteInput = z.infer<typeof SubmitQuoteSchema>;

// ============================================================================
// Store
// ============================================================================

const store = {
  suppliers: new Map<string, Supplier>(),
  products: new Map<string, ProductListing>(),
  rfqs: new Map<string, RFQ>(),
  quotes: new Map<string, Quote>(),
  orders: new Map<string, PurchaseOrder>(),
};

// ============================================================================
// Supplier Service
// ============================================================================

export class SupplierService {
  async registerSupplier(input: {
    name: string;
    email: string;
    phone: string;
    categories: string[];
  }): Promise<Supplier> {
    const supplier: Supplier = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      phone: input.phone,
      categories: input.categories,
      certifications: [],
      rating: 0,
      completedOrders: 0,
      responseTime: '< 24 hours',
      verified: false,
      documents: [],
    };
    store.suppliers.set(supplier.id, supplier);
    return supplier;
  }

  async getSupplier(id: string): Promise<Supplier | null> {
    return store.suppliers.get(id) || null;
  }

  async searchSuppliers(filters: {
    category?: string;
    verified?: boolean;
    minRating?: number;
  }): Promise<Supplier[]> {
    let results = Array.from(store.suppliers.values());
    if (filters.category) {
      results = results.filter(s => s.categories.includes(filters.category!));
    }
    if (filters.verified !== undefined) {
      results = results.filter(s => s.verified === filters.verified);
    }
    if (filters.minRating) {
      results = results.filter(s => s.rating >= filters.minRating!);
    }
    return results;
  }

  async updateRating(id: string, rating: number): Promise<void> {
    const supplier = store.suppliers.get(id);
    if (supplier) {
      supplier.rating = rating;
    }
  }
}

// ============================================================================
// Marketplace Service
// ============================================================================

export class MarketplaceService {
  async listProducts(filters: {
    category?: string;
    supplierId?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }): Promise<ProductListing[]> {
    let results = Array.from(store.products.values());
    if (filters.category) {
      results = results.filter(p => p.category === filters.category);
    }
    if (filters.supplierId) {
      results = results.filter(p => p.supplierId === filters.supplierId);
    }
    if (filters.minPrice) {
      results = results.filter(p => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice) {
      results = results.filter(p => p.price <= filters.maxPrice!);
    }
    if (filters.inStock) {
      results = results.filter(p => p.stock > 0);
    }
    return results;
  }

  async getProduct(id: string): Promise<ProductListing | null> {
    return store.products.get(id) || null;
  }
}

// ============================================================================
// RFQ Service
// ============================================================================

export class RFQService {
  async createRFQ(buyerId: string, buyerName: string, input: CreateRFQInput): Promise<RFQ> {
    const rfq: RFQ = {
      id: randomUUID(),
      rfqNumber: `RFQ-${Date.now().toString(36).toUpperCase()}`,
      title: input.title,
      description: input.description || '',
      items: input.items.map(item => ({
        id: randomUUID(),
        ...item,
      })),
      deadline: new Date(input.deadline),
      status: 'draft',
      priority: input.priority,
      buyerId,
      buyerName,
      invitedSuppliers: input.invitedSuppliers || [],
      quotes: [],
      createdAt: new Date(),
    };
    store.rfqs.set(rfq.id, rfq);
    return rfq;
  }

  async getRFQ(id: string): Promise<RFQ | null> {
    return store.rfqs.get(id) || null;
  }

  async openRFQ(id: string): Promise<RFQ | null> {
    const rfq = store.rfqs.get(id);
    if (!rfq) return null;
    rfq.status = 'open';
    store.rfqs.set(id, rfq);
    return rfq;
  }

  async submitQuote(rfqId: string, supplierId: string, supplierName: string, input: SubmitQuoteInput): Promise<Quote | null> {
    const rfq = store.rfqs.get(rfqId);
    if (!rfq) return null;

    const items = input.items.map(item => ({
      rfqItemId: item.rfqItemId,
      unitPrice: item.unitPrice,
      totalPrice: item.unitPrice * (rfq.items.find(i => i.id === item.rfqItemId)?.quantity || 1),
      notes: item.notes,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const total = subtotal - input.discount + (subtotal - input.discount) * 0.18; // 18% GST

    const quote: Quote = {
      id: randomUUID(),
      rfqId,
      supplierId,
      supplierName,
      items,
      subtotal,
      tax: (subtotal - input.discount) * 0.18,
      discount: input.discount,
      total,
      validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
      deliveryTime: input.deliveryTime,
      paymentTerms: input.paymentTerms,
      notes: input.notes,
      status: 'submitted',
      submittedAt: new Date(),
    };

    store.quotes.set(quote.id, quote);
    rfq.quotes.push(quote);
    store.rfqs.set(rfqId, rfq);

    return quote;
  }

  async awardQuote(rfqId: string, quoteId: string): Promise<RFQ | null> {
    const rfq = store.rfqs.get(rfqId);
    if (!rfq) return null;

    rfq.quotes.forEach(q => {
      q.status = q.id === quoteId ? 'accepted' : 'rejected';
    });
    rfq.status = 'awarded';
    rfq.awardedQuoteId = quoteId;

    store.rfqs.set(rfqId, rfq);
    return rfq;
  }

  async closeRFQ(id: string): Promise<RFQ | null> {
    const rfq = store.rfqs.get(id);
    if (!rfq) return null;
    rfq.status = 'closed';
    store.rfqs.set(id, rfq);
    return rfq;
  }
}

// ============================================================================
// Order Service
// ============================================================================

export class OrderService {
  async createFromQuote(quoteId: string): Promise<PurchaseOrder | null> {
    const quote = store.quotes.get(quoteId);
    if (!quote) return null;

    const rfq = store.rfqs.get(quote.rfqId);
    if (!rfq) return null;

    const order: PurchaseOrder = {
      id: randomUUID(),
      poNumber: `PO-${Date.now().toString(36).toUpperCase()}`,
      rfqId: quote.rfqId,
      quoteId,
      buyerId: rfq.buyerId,
      buyerName: rfq.buyerName,
      supplierId: quote.supplierId,
      supplierName: quote.supplierName,
      items: quote.items.map(item => {
        const rfqItem = rfq.items.find(i => i.id === item.rfqItemId);
        return {
          productId: item.rfqItemId,
          name: rfqItem?.productName || '',
          quantity: rfqItem?.quantity || 1,
          unitPrice: item.unitPrice,
          total: item.totalPrice,
        };
      }),
      subtotal: quote.subtotal,
      tax: quote.tax,
      discount: quote.discount,
      total: quote.total,
      status: 'draft',
      createdAt: new Date(),
    };

    store.orders.set(order.id, order);
    return order;
  }

  async confirmOrder(id: string): Promise<PurchaseOrder | null> {
    const order = store.orders.get(id);
    if (!order) return null;
    order.status = 'confirmed';
    store.orders.set(id, order);
    return order;
  }

  async updateStatus(id: string, status: PurchaseOrder['status']): Promise<PurchaseOrder | null> {
    const order = store.orders.get(id);
    if (!order) return null;
    order.status = status;
    if (status === 'delivered') {
      order.actualDelivery = new Date();
    }
    store.orders.set(id, order);
    return order;
  }
}

// ============================================================================
// Exports
// ============================================================================

export const supplierService = new SupplierService();
export const marketplaceService = new MarketplaceService();
export const rfqService = new RFQService();
export const orderService = new OrderService();
