import { getAuthToken } from './supabase';
import type {
  InventorySignal,
  PurchaseOrder,
  POItem,
  POItemInput,
  CreatePurchaseOrderInput,
  Supplier,
  SupplierProduct,
  SupplierCategory,
  RFQ,
  CreateRFQInput,
  RFQResponse,
} from '@nextabizz/shared-types';

// CreditLine type (not in shared types yet)
export interface CreditLine {
  creditLimit: number;
  utilized: number;
  available: number;
  tenorDays: number;
  bnplEnabled: boolean;
}

// Base API configuration
const API_BASE = '/api';

// Error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic fetch wrapper with auth
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new ApiError(error.message || 'Request failed', response.status, error.code);
  }

  return response.json();
}

// Types for filter parameters
export interface SignalFilters {
  source?: 'restopapa' | 'rez-merchant' | 'hotel-pms' | 'all';
  severity?: 'critical' | 'low' | 'out_of_stock' | 'all';
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface OrderFilters {
  status?: string;
  paymentStatus?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface CatalogFilters {
  search?: string;
  categoryId?: string;
  supplierId?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'moq' | 'delivery_days';
  page?: number;
  pageSize?: number;
}

// Signals API
export async function fetchSignals(
  merchantId: string,
  filters: SignalFilters = {}
): Promise<{ items: InventorySignal[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
  const params = new URLSearchParams();

  if (filters.source && filters.source !== 'all') params.set('source', filters.source);
  if (filters.severity && filters.severity !== 'all') params.set('severity', filters.severity);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

  return fetchWithAuth(`/merchants/${merchantId}/signals?${params.toString()}`);
}

export async function fetchReorderSignals(
  merchantId: string
): Promise<{ items: Array<{ signal: InventorySignal; reorder: { id: string; suggestedQty: number; urgency: string } }> }> {
  return fetchWithAuth(`/merchants/${merchantId}/reorder-signals`);
}

export async function updateSignalStatus(
  signalId: string,
  status: 'processed' | 'ignored'
): Promise<InventorySignal> {
  return fetchWithAuth(`/signals/${signalId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// Orders API
export async function fetchOrders(
  merchantId: string,
  filters: OrderFilters = {}
): Promise<{ items: PurchaseOrder[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
  const params = new URLSearchParams();

  if (filters.status) params.set('status', filters.status);
  if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
  if (filters.supplierId) params.set('supplierId', filters.supplierId);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

  return fetchWithAuth(`/merchants/${merchantId}/orders?${params.toString()}`);
}

export async function fetchOrderById(
  merchantId: string,
  orderId: string
): Promise<{ order: PurchaseOrder; items: POItem[]; supplier: Supplier }> {
  return fetchWithAuth(`/merchants/${merchantId}/orders/${orderId}`);
}

export async function createOrder(
  merchantId: string,
  data: CreatePurchaseOrderInput
): Promise<PurchaseOrder> {
  return fetchWithAuth(`/merchants/${merchantId}/orders`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOrderStatus(
  merchantId: string,
  orderId: string,
  status: string
): Promise<PurchaseOrder> {
  return fetchWithAuth(`/merchants/${merchantId}/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function cancelOrder(
  merchantId: string,
  orderId: string
): Promise<PurchaseOrder> {
  return fetchWithAuth(`/merchants/${merchantId}/orders/${orderId}/cancel`, {
    method: 'POST',
  });
}

export async function markOrderAsPaid(
  merchantId: string,
  orderId: string
): Promise<PurchaseOrder> {
  return fetchWithAuth(`/merchants/${merchantId}/orders/${orderId}/payment`, {
    method: 'POST',
  });
}

// Catalog API
export async function fetchCatalogProducts(
  params: CatalogFilters = {}
): Promise<{ items: SupplierProduct[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
  const searchParams = new URLSearchParams();

  if (params.search) searchParams.set('search', params.search);
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.supplierId) searchParams.set('supplierId', params.supplierId);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

  return fetchWithAuth(`/catalog/products?${searchParams.toString()}`);
}

export async function fetchCategories(): Promise<SupplierCategory[]> {
  return fetchWithAuth('/catalog/categories');
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  return fetchWithAuth('/suppliers');
}

export async function fetchSupplierById(supplierId: string): Promise<Supplier> {
  return fetchWithAuth(`/suppliers/${supplierId}`);
}

// RFQ API
export async function fetchRFQs(
  merchantId: string,
  params: { status?: string; page?: number; pageSize?: number } = {}
): Promise<{ items: RFQ[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
  const searchParams = new URLSearchParams();

  if (params.status) searchParams.set('status', params.status);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

  return fetchWithAuth(`/merchants/${merchantId}/rfqs?${searchParams.toString()}`);
}

export async function fetchOpenRFQs(): Promise<{ items: RFQ[] }> {
  return fetchWithAuth('/rfqs/open');
}

export async function fetchRFQById(rfqId: string): Promise<{ rfq: RFQ; responses: RFQResponse[] }> {
  return fetchWithAuth(`/rfqs/${rfqId}`);
}

export async function createRFQ(data: CreateRFQInput): Promise<RFQ> {
  return fetchWithAuth('/rfqs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function awardRFQ(
  rfqId: string,
  supplierId: string
): Promise<RFQ> {
  return fetchWithAuth(`/rfqs/${rfqId}/award`, {
    method: 'POST',
    body: JSON.stringify({ awardedTo: supplierId }),
  });
}

// Credit/Finance API
export async function fetchCreditLine(
  merchantId: string
): Promise<CreditLine> {
  return fetchWithAuth(`/merchants/${merchantId}/credit-line`);
}

export async function fetchOutstandingPayments(
  merchantId: string
): Promise<{ items: Array<{ order: PurchaseOrder; items: POItem[]; supplier: Supplier }> }> {
  return fetchWithAuth(`/merchants/${merchantId}/payments/outstanding`);
}

export async function fetchPaymentHistory(
  merchantId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<{ items: Array<{ id: string; orderId: string; amount: number; paidAt: Date; method: string }> }> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

  return fetchWithAuth(`/merchants/${merchantId}/payments/history?${searchParams.toString()}`);
}

// Analytics API
export async function fetchAnalytics(
  merchantId: string,
  params: { startDate?: string; endDate?: string } = {}
): Promise<{
  totalSpend: number;
  ordersThisMonth: number;
  topSupplier: { supplierId: string; supplierName: string; spend: number } | null;
  avgOrderValue: number;
  spendByCategory: Array<{ category: string; spend: number }>;
  spendBySupplier: Array<{ supplierId: string; supplierName: string; spend: number }>;
  orderTrends: Array<{ date: string; count: number; value: number }>;
  topReorderedItems: Array<{ productId: string; productName: string; count: number }>;
}> {
  const searchParams = new URLSearchParams();
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);

  return fetchWithAuth(`/merchants/${merchantId}/analytics?${searchParams.toString()}`);
}

// Auth API
export async function ssoLogin(provider: 'rez' | 'google' = 'rez'): Promise<{ accessToken: string; merchant: { id: string; businessName: string } }> {
  return fetchWithAuth('/auth/sso', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
}
