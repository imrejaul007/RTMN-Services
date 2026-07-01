/**
 * Procurement Department Pack - Runtime Connector
 *
 * Connects Company OS to Procurement OS (:5096) for
 * supplier management, RFQs, purchase orders, and contracts.
 *
 * Department: Procurement
 * Target Service: Procurement OS (:5096)
 */

import axios, { AxiosInstance } from 'axios';
import { BaseConnector, ConnectorConfig } from '../../../../service-connectors/src/base-connector.js';

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  category: string;
  status: 'active' | 'inactive' | 'pending';
  rating: number;
  country: string;
  createdAt: string;
}

export interface RFQ {
  id: string;
  title: string;
  status: 'draft' | 'open' | 'closed' | 'awarded';
  category: string;
  deadline: string;
  invitedSuppliers: string[];
  bidCount: number;
  lowestBid?: number;
  createdAt: string;
}

export interface Bid {
  id: string;
  rfqId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  deliveryDays: number;
  status: 'submitted' | 'shortlisted' | 'won' | 'lost';
  submittedAt: string;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'acknowledged' | 'received' | 'closed';
  deliveryDate?: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  title: string;
  supplierId: string;
  supplierName: string;
  value: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'expiring' | 'expired';
  renewalType: 'auto' | 'manual';
  createdAt: string;
}

export interface SpendAnalytics {
  totalSpend: number;
  topCategories: { category: string; amount: number }[];
  topSuppliers: { supplierId: string; supplierName: string; amount: number }[];
  savings: number;
}

export class ProcurementRuntimeConnector extends BaseConnector {
  private client: AxiosInstance;

  constructor(config: ConnectorConfig) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseUrl || process.env.PROCUREMENT_OS_URL || 'http://localhost:5096',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': config.tenantId,
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    });
  }

  // ============================================
  // SUPPLIERS
  // ============================================

  async listSuppliers(filters?: {
    status?: Supplier['status'];
    category?: string;
    ratingMin?: number;
  }): Promise<Supplier[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.ratingMin) params.append('ratingMin', String(filters.ratingMin));

    const response = await this.client.get(`/api/suppliers?${params.toString()}`);
    return response.data.suppliers || [];
  }

  async getSupplier(id: string): Promise<Supplier | null> {
    try {
      const response = await this.client.get(`/api/suppliers/${id}`);
      return response.data.supplier || null;
    } catch {
      return null;
    }
  }

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const response = await this.client.post('/api/suppliers', data);
    return response.data.supplier;
  }

  async updateSupplierRating(id: string, rating: number): Promise<Supplier> {
    const response = await this.client.put(`/api/suppliers/${id}/rating`, { rating });
    return response.data.supplier;
  }

  async deactivateSupplier(id: string): Promise<void> {
    await this.client.put(`/api/suppliers/${id}/status`, { status: 'inactive' });
  }

  // ============================================
  // RFQS
  // ============================================

  async listRFQs(filters?: {
    status?: RFQ['status'];
    category?: string;
  }): Promise<RFQ[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);

    const response = await this.client.get(`/api/rfqs?${params.toString()}`);
    return response.data.rfqs || [];
  }

  async getRFQ(id: string): Promise<RFQ | null> {
    try {
      const response = await this.client.get(`/api/rfqs/${id}`);
      return response.data.rfq || null;
    } catch {
      return null;
    }
  }

  async createRFQ(data: {
    title: string;
    category: string;
    items: { description: string; quantity: number; estimatedPrice?: number }[];
    deadline: string;
    invitedSuppliers?: string[];
  }): Promise<RFQ> {
    const response = await this.client.post('/api/rfqs', data);
    return response.data.rfq;
  }

  async closeRFQ(id: string): Promise<RFQ> {
    const response = await this.client.put(`/api/rfqs/${id}/status`, { status: 'closed' });
    return response.data.rfq;
  }

  async awardRFQ(rfqId: string, bidId: string): Promise<RFQ> {
    const response = await this.client.post(`/api/rfqs/${rfqId}/award`, { bidId });
    return response.data.rfq;
  }

  // ============================================
  // BIDS
  // ============================================

  async getBidsForRFQ(rfqId: string): Promise<Bid[]> {
    const response = await this.client.get(`/api/rfqs/${rfqId}/bids`);
    return response.data.bids || [];
  }

  async submitBid(rfqId: string, data: {
    supplierId: string;
    amount: number;
    deliveryDays: number;
    notes?: string;
  }): Promise<Bid> {
    const response = await this.client.post(`/api/rfqs/${rfqId}/bids`, data);
    return response.data.bid;
  }

  async shortlistBid(rfqId: string, bidId: string): Promise<Bid> {
    const response = await this.client.put(`/api/rfqs/${rfqId}/bids/${bidId}/shortlist`);
    return response.data.bid;
  }

  // ============================================
  // PURCHASE ORDERS
  // ============================================

  async listPurchaseOrders(filters?: {
    status?: PurchaseOrder['status'];
    supplierId?: string;
  }): Promise<PurchaseOrder[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.supplierId) params.append('supplierId', filters.supplierId);

    const response = await this.client.get(`/api/purchase-orders?${params.toString()}`);
    return response.data.orders || [];
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
    try {
      const response = await this.client.get(`/api/purchase-orders/${id}`);
      return response.data.order || null;
    } catch {
      return null;
    }
  }

  async createPurchaseOrder(data: {
    supplierId: string;
    items: { description: string; quantity: number; unitPrice: number }[];
    deliveryDate?: string;
    paymentTerms?: string;
  }): Promise<PurchaseOrder> {
    const response = await this.client.post('/api/purchase-orders', data);
    return response.data.order;
  }

  async sendPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const response = await this.client.post(`/api/purchase-orders/${id}/send`);
    return response.data.order;
  }

  async receivePurchaseOrder(id: string, items?: {
    lineNumber: number;
    receivedQuantity: number;
  }[]): Promise<PurchaseOrder> {
    const response = await this.client.post(`/api/purchase-orders/${id}/receive`, { items });
    return response.data.order;
  }

  async closePurchaseOrder(id: string): Promise<PurchaseOrder> {
    const response = await this.client.put(`/api/purchase-orders/${id}/status`, { status: 'closed' });
    return response.data.order;
  }

  // ============================================
  // CONTRACTS
  // ============================================

  async listContracts(filters?: {
    status?: Contract['status'];
    supplierId?: string;
    expiringBefore?: string;
  }): Promise<Contract[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.supplierId) params.append('supplierId', filters.supplierId);
    if (filters?.expiringBefore) params.append('expiringBefore', filters.expiringBefore);

    const response = await this.client.get(`/api/contracts?${params.toString()}`);
    return response.data.contracts || [];
  }

  async getContract(id: string): Promise<Contract | null> {
    try {
      const response = await this.client.get(`/api/contracts/${id}`);
      return response.data.contract || null;
    } catch {
      return null;
    }
  }

  async createContract(data: {
    title: string;
    supplierId: string;
    value: number;
    startDate: string;
    endDate: string;
    renewalType: 'auto' | 'manual';
    terms?: string;
  }): Promise<Contract> {
    const response = await this.client.post('/api/contracts', data);
    return response.data.contract;
  }

  async renewContract(id: string, newEndDate: string): Promise<Contract> {
    const response = await this.client.post(`/api/contracts/${id}/renew`, { newEndDate });
    return response.data.contract;
  }

  async terminateContract(id: string, reason?: string): Promise<Contract> {
    const response = await this.client.post(`/api/contracts/${id}/terminate`, { reason });
    return response.data.contract;
  }

  // ============================================
  // SPEND ANALYTICS
  // ============================================

  async getSpendAnalytics(period?: {
    start: string;
    end: string;
  }): Promise<SpendAnalytics> {
    const params = period ? `?start=${period.start}&end=${period.end}` : '';
    const response = await this.client.get(`/api/analytics/spend${params}`);
    return response.data;
  }

  async getCategorySpend(): Promise<{ category: string; amount: number; budget?: number }[]> {
    const response = await this.client.get('/api/analytics/category-spend');
    return response.data.categories || [];
  }

  async getSupplierPerformance(): Promise<{
    supplierId: string;
    supplierName: string;
    totalOrders: number;
    totalAmount: number;
    onTimeDeliveryRate: number;
    qualityScore: number;
  }[]> {
    const response = await this.client.get('/api/analytics/supplier-performance');
    return response.data.suppliers || [];
  }

  // ============================================
  // PROCUREMENT AI COPILOT
  // ============================================

  async askCopilot(question: string, context?: {
    supplierId?: string;
    category?: string;
  }): Promise<{
    answer: string;
    suggestions: string[];
    confidence: number;
  }> {
    const response = await this.client.post('/api/copilot/query', {
      question,
      context,
    });
    return response.data;
  }

  async getSupplierRecommendation(category: string, requirements?: {
    minRating?: number;
    budgetMax?: number;
  }): Promise<{
    suppliers: Supplier[];
    recommendation: string;
  }> {
    const response = await this.client.post('/api/copilot/supplier-recommendation', {
      category,
      requirements,
    });
    return response.data;
  }

  async getPricingRecommendation(productId: string): Promise<{
    currentPrice: number;
    marketPrice: number;
    recommendedPrice: number;
    savings: number;
  }> {
    const response = await this.client.get(`/api/copilot/pricing/${productId}`);
    return response.data;
  }

  // ============================================
  // WORKFLOWS
  // ============================================

  async createRequisition(data: {
    title: string;
    category: string;
    items: { description: string; quantity: number; estimatedPrice: number }[];
    requestedBy: string;
    department: string;
  }): Promise<{ requisitionId: string; workflowId: string }> {
    const response = await this.client.post('/api/requisitions', data);
    return response.data;
  }

  async getApprovalStatus(requisitionId: string): Promise<{
    status: 'pending' | 'approved' | 'rejected';
    currentApprover?: string;
    history: { approver: string; status: string; at: string }[];
  }> {
    const response = await this.client.get(`/api/requisitions/${requisitionId}/approval`);
    return response.data;
  }

  // ============================================
  // NEXHA INTEGRATION (Future)
  // ============================================

  async discoverGlobalSuppliers(params: {
    query: string;
    certifications?: string[];
    minCapacity?: number;
  }): Promise<{
    suppliers: Supplier[];
    source: 'internal' | 'nexha';
  }> {
    // Future: Integrate with Global Nexha for supplier discovery
    const response = await this.client.post('/api/discover/global', params);
    return response.data;
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// Factory function
export function createProcurementConnector(tenantId: string): ProcurementRuntimeConnector {
  return new ProcurementRuntimeConnector({
    tenantId,
    apiKey: process.env.INTERNAL_SERVICE_TOKEN,
    baseUrl: process.env.PROCUREMENT_OS_URL,
  });
}

export default ProcurementRuntimeConnector;
