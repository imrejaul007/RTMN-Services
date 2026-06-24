/**
 * Procurement OS SDK client (port 5096)
 *
 * Enterprise procurement: suppliers, requisitions, purchase orders,
 * contracts, RFQs, inventory, warehouses, spend analytics. 10 AI
 * procurement agents behind the scenes.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Money } from './types.js';

export type SupplierStatus = 'active' | 'pending' | 'suspended' | 'archived';
export type RequisitionStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
export type PurchaseOrderStatus = 'draft' | 'sent' | 'acknowledged' | 'shipped' | 'received' | 'cancelled';

export interface Supplier {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  country?: string;
  categories: string[];
  status: SupplierStatus;
  /** 0-5 supplier rating */
  rating?: number;
  /** Total spend with this supplier */
  totalSpend?: Money;
  paymentTerms?: string;
  createdAt: string;
}

export interface Requisition {
  id: string;
  requesterId: string;
  departmentId?: string;
  items: Array<{ sku?: string; name: string; quantity: number; unitPrice?: Money }>;
  status: RequisitionStatus;
  totalEstimate: Money;
  neededBy?: string;
  notes?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  requisitionId?: string;
  items: Array<{ sku?: string; name: string; quantity: number; unitPrice: Money }>;
  total: Money;
  status: PurchaseOrderStatus;
  expectedDeliveryAt?: string;
  createdAt: string;
}

export interface Rfq {
  id: string;
  title: string;
  description: string;
  items: Array<{ name: string; quantity: number; specs?: Record<string, unknown> }>;
  deadlineAt: string;
  /** Supplier IDs invited */
  invitedSuppliers: string[];
  /** Received quotes */
  quotes: Array<{ supplierId: string; total: Money; validUntil: string; notes?: string }>;
  status: 'open' | 'closed' | 'awarded' | 'cancelled';
}

export class ProcurementClient {
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: `http://localhost:5096` };
  }

  // ─── Suppliers ───

  async listSuppliers(input: { status?: SupplierStatus; category?: string; country?: string; limit?: number } = {}): Promise<Supplier[]> {
    return request<Supplier[]>(this.config, 'GET', `/api/suppliers${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getSupplier(id: string): Promise<Supplier> {
    return request<Supplier>(this.config, 'GET', `/api/suppliers/${encodeURIComponent(id)}`);
  }

  async createSupplier(input: { name: string; contactEmail?: string; contactPhone?: string; country?: string; categories: string[]; paymentTerms?: string }): Promise<Supplier> {
    return request<Supplier>(this.config, 'POST', '/api/suppliers', input);
  }

  /** Rate a supplier (1-5). */
  async rateSupplier(id: string, input: { rating: number; notes?: string; dimensions?: { quality?: number; delivery?: number; price?: number; support?: number } }): Promise<Supplier> {
    return request<Supplier>(this.config, 'POST', `/api/suppliers/${encodeURIComponent(id)}/rate`, input);
  }

  // ─── Requisitions ───

  async listRequisitions(input: { status?: RequisitionStatus; requesterId?: string; departmentId?: string; limit?: number } = {}): Promise<Requisition[]> {
    return request<Requisition[]>(this.config, 'GET', `/api/requisitions${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async createRequisition(input: { requesterId: string; departmentId?: string; items: Requisition['items']; neededBy?: string; notes?: string }): Promise<Requisition> {
    return request<Requisition>(this.config, 'POST', '/api/requisitions', input);
  }

  async approveRequisition(id: string): Promise<Requisition> {
    return request<Requisition>(this.config, 'POST', `/api/requisitions/${encodeURIComponent(id)}/approve`);
  }

  // ─── Purchase orders ───

  async listPurchaseOrders(input: { supplierId?: string; status?: PurchaseOrderStatus; limit?: number } = {}): Promise<PurchaseOrder[]> {
    return request<PurchaseOrder[]>(this.config, 'GET', `/api/purchase-orders${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async createPurchaseOrder(input: Omit<PurchaseOrder, 'id' | 'status' | 'createdAt'>): Promise<PurchaseOrder> {
    return request<PurchaseOrder>(this.config, 'POST', '/api/purchase-orders', input);
  }

  async receivePurchaseOrder(id: string, input: { receivedItems: Array<{ sku?: string; quantity: number }>; notes?: string }): Promise<PurchaseOrder> {
    return request<PurchaseOrder>(this.config, 'POST', `/api/purchase-orders/${encodeURIComponent(id)}/receive`, input);
  }

  // ─── RFQs ───

  async listRfqs(input: { status?: Rfq['status']; limit?: number } = {}): Promise<Rfq[]> {
    return request<Rfq[]>(this.config, 'GET', `/api/rfqs${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async createRfq(input: { title: string; description: string; items: Rfq['items']; deadlineAt: string; invitedSuppliers: string[] }): Promise<Rfq> {
    return request<Rfq>(this.config, 'POST', '/api/rfqs', input);
  }

  async submitQuote(rfqId: string, input: { supplierId: string; total: Money; validUntil: string; notes?: string }): Promise<Rfq> {
    return request<Rfq>(this.config, 'POST', `/api/rfqs/${encodeURIComponent(rfqId)}/quotes`, input);
  }

  // ─── Spend analytics ───

  async getSpendAnalytics(input: { from: string; to: string; groupBy?: 'supplier' | 'category' | 'department' }): Promise<{ total: Money; breakdown: Array<{ key: string; amount: Money }> }> {
    return request(this.config, 'GET', `/api/analytics/spend${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
}
