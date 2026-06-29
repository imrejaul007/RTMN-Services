/**
 * Retail Service Connector
 *
 * Connects to REZ-Merchant retail services.
 */

import { BaseConnector, ServiceResponse } from './base-connector';
import { TenantContext } from './shared/types';

// ============================================
// Service URLs
// ============================================

const REZ_RETAIL_SERVICES = {
  retail: process.env.REZ_RETAIL_SERVICE_URL || 'http://localhost:3030',
  pos: process.env.REZ_RETAIL_POS_URL || 'http://localhost:3031',
  inventory: process.env.REZ_RETAIL_INVENTORY_URL || 'http://localhost:3032',
  loyalty: process.env.REZ_RETAIL_LOYALTY_URL || 'http://localhost:3033',
  analytics: process.env.REZ_RETAIL_ANALYTICS_URL || 'http://localhost:3034',
  crm: process.env.REZ_RETAIL_CRM_URL || 'http://localhost:3035',
};

// ============================================
// Types
// ============================================

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  images: string[];
  attributes: Record<string, string>;
  isActive: boolean;
}

export interface Cart {
  id: string;
  customerId?: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'open' | 'checked_out' | 'abandoned';
}

export interface Sale {
  id: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'mixed';
  customerId?: string;
  cashierId: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalPurchases: number;
  createdAt: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  pointsRequired: number;
  description: string;
  isActive: boolean;
}

export interface InventoryAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  type: 'low_stock' | 'out_of_stock' | 'overstock';
  createdAt: string;
}

// ============================================
// Retail Connector
// ============================================

export class RetailConnector {
  private retailService: BaseConnector;
  private posService: BaseConnector;
  private inventoryService: BaseConnector;
  private loyaltyService: BaseConnector;
  private analyticsService: BaseConnector;
  private crmService: BaseConnector;
  private tenant?: TenantContext;

  constructor(tenant?: TenantContext) {
    this.retailService = new BaseConnector({ baseUrl: REZ_RETAIL_SERVICES.retail });
    this.posService = new BaseConnector({ baseUrl: REZ_RETAIL_SERVICES.pos });
    this.inventoryService = new BaseConnector({ baseUrl: REZ_RETAIL_SERVICES.inventory });
    this.loyaltyService = new BaseConnector({ baseUrl: REZ_RETAIL_SERVICES.loyalty });
    this.analyticsService = new BaseConnector({ baseUrl: REZ_RETAIL_SERVICES.analytics });
    this.crmService = new BaseConnector({ baseUrl: REZ_RETAIL_SERVICES.crm });

    if (tenant) {
      this.setTenant(tenant);
    }
  }

  setTenant(tenant: TenantContext): void {
    this.tenant = tenant;
    this.retailService.setTenant(tenant);
    this.posService.setTenant(tenant);
    this.inventoryService.setTenant(tenant);
    this.loyaltyService.setTenant(tenant);
    this.analyticsService.setTenant(tenant);
    this.crmService.setTenant(tenant);
  }

  // ========================================
  // PRODUCT OPERATIONS
  // ========================================

  async getProducts(filters?: { category?: string; isActive?: boolean }): Promise<ServiceResponse<Product[]>> {
    const query = new URLSearchParams(filters as any).toString();
    return this.retailService.get<Product[]>(`/api/products${query ? `?${query}` : ''}`);
  }

  async getProduct(id: string): Promise<ServiceResponse<Product>> {
    return this.retailService.get<Product>(`/api/products/${id}`);
  }

  async createProduct(product: Omit<Product, 'id'>): Promise<ServiceResponse<Product>> {
    return this.retailService.post<Product>('/api/products', product);
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<ServiceResponse<Product>> {
    return this.retailService.put<Product>(`/api/products/${id}`, updates);
  }

  async updateStock(id: string, quantity: number): Promise<ServiceResponse<Product>> {
    return this.retailService.patch<Product>(`/api/products/${id}/stock`, { stock: quantity });
  }

  // ========================================
  // POS OPERATIONS
  // ========================================

  async createSale(sale: {
    items: { productId: string; quantity: number }[];
    customerId?: string;
    cashierId: string;
    paymentMethod: 'cash' | 'card' | 'upi' | 'mixed';
    discount?: number;
  }): Promise<ServiceResponse<Sale>> {
    return this.posService.post<Sale>('/api/sales', sale);
  }

  async getSale(id: string): Promise<ServiceResponse<Sale>> {
    return this.posService.get<Sale>(`/api/sales/${id}`);
  }

  async listSales(filters?: { date?: string; customerId?: string }): Promise<ServiceResponse<Sale[]>> {
    const query = new URLSearchParams(filters as any).toString();
    return this.posService.get<Sale[]>(`/api/sales${query ? `?${query}` : ''}`);
  }

  async processReturn(saleId: string, items: { productId: string; quantity: number }[]): Promise<ServiceResponse<{ refundId: string; amount: number }>> {
    return this.posService.post<{ refundId: string; amount: number }>(`/api/sales/${saleId}/return`, { items });
  }

  // ========================================
  // INVENTORY OPERATIONS
  // ========================================

  async getInventoryAlerts(): Promise<ServiceResponse<InventoryAlert[]>> {
    return this.inventoryService.get<InventoryAlert[]>('/api/alerts');
  }

  async createInventoryAlert(alert: Omit<InventoryAlert, 'id' | 'createdAt'>): Promise<ServiceResponse<InventoryAlert>> {
    return this.inventoryService.post<InventoryAlert>('/api/alerts', alert);
  }

  async getStockReport(): Promise<ServiceResponse<{
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  }>> {
    return this.inventoryService.get('/api/reports/stock');
  }

  async forecastDemand(productId: string, days: number = 30): Promise<ServiceResponse<{
    predictedDemand: number;
    confidence: number;
    recommendedStock: number;
  }>> {
    return this.inventoryService.get(`/api/demand/forecast/${productId}?days=${days}`);
  }

  // ========================================
  // LOYALTY OPERATIONS
  // ========================================

  async getCustomer(customerId: string): Promise<ServiceResponse<Customer>> {
    return this.crmService.get<Customer>(`/api/customers/${customerId}`);
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'loyaltyPoints' | 'tier' | 'totalPurchases' | 'createdAt'>): Promise<ServiceResponse<Customer>> {
    return this.crmService.post<Customer>('/api/customers', customer);
  }

  async addLoyaltyPoints(customerId: string, points: number): Promise<ServiceResponse<Customer>> {
    return this.crmService.post<Customer>(`/api/customers/${customerId}/points`, { points });
  }

  async redeemPoints(customerId: string, points: number): Promise<ServiceResponse<{ rewardId: string; pointsRemaining: number }>> {
    return this.crmService.post<{ rewardId: string; pointsRemaining: number }>(
      `/api/customers/${customerId}/redeem`,
      { points }
    );
  }

  async getRewards(): Promise<ServiceResponse<LoyaltyReward[]>> {
    return this.loyaltyService.get<LoyaltyReward[]>('/api/rewards');
  }

  // ========================================
  // ANALYTICS
  // ========================================

  async getSalesReport(period: 'day' | 'week' | 'month' | 'year'): Promise<ServiceResponse<{
    totalSales: number;
    totalTransactions: number;
    avgTransactionValue: number;
    topProducts: { productId: string; name: string; quantity: number }[];
  }>> {
    return this.analyticsService.get(`/api/reports/sales?period=${period}`);
  }

  async getCustomerInsights(): Promise<ServiceResponse<{
    totalCustomers: number;
    newCustomersThisMonth: number;
    repeatCustomers: number;
    churnRate: number;
  }>> {
    return this.analyticsService.get('/api/reports/customers');
  }

  // ========================================
  // HEALTH CHECK
  // ========================================

  async healthCheck(): Promise<Record<string, string>> {
    const checks = await Promise.all([
      this.retailService.healthCheck(),
      this.posService.healthCheck(),
      this.inventoryService.healthCheck(),
      this.loyaltyService.healthCheck(),
      this.analyticsService.healthCheck(),
      this.crmService.healthCheck(),
    ]);

    return {
      retail: checks[0].status,
      pos: checks[1].status,
      inventory: checks[2].status,
      loyalty: checks[3].status,
      analytics: checks[4].status,
      crm: checks[5].status,
    };
  }
}

export function createRetailConnector(tenant?: TenantContext): RetailConnector {
  return new RetailConnector(tenant);
}
