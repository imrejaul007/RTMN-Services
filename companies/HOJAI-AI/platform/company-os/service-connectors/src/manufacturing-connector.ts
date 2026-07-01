/**
 * Manufacturing Service Connector
 *
 * Connects to Manufacturing OS (5150) for production management,
 * inventory, quality control, and supply chain.
 */

import axios, { AxiosInstance } from 'axios';
import { BaseConnector, ConnectorConfig } from './base-connector.js';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unitCost: number;
  unitPrice: number;
  currency: string;
  status: 'active' | 'discontinued' | 'draft';
 Bom?: BillOfMaterials;
  routing?: ProductionRouting;
  createdAt: string;
}

export interface BillOfMaterials {
  id: string;
  productId: string;
  components: {
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
    isPurchased: boolean;
  }[];
  laborHours?: number;
  overheadRate?: number;
}

export interface ProductionRouting {
  id: string;
  productId: string;
  steps: {
    stepNumber: number;
    workCenter: string;
    description: string;
    setupHours: number;
    runHours: number;
    laborRate: number;
  }[];
}

export interface WorkOrder {
  id: string;
  productId: string;
  quantity: number;
  status: 'planned' | 'released' | 'in-progress' | 'completed' | 'cancelled';
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  itemName: string;
  category: 'raw-material' | 'work-in-progress' | 'finished-goods' | 'consumables';
  quantity: number;
  unit: string;
  location: string;
  reorderPoint?: number;
  reorderQuantity?: number;
  unitCost: number;
  lastUpdated: string;
}

export interface QualityCheck {
  id: string;
  workOrderId?: string;
  productId?: string;
  type: 'incoming' | 'in-process' | 'final';
  status: 'passed' | 'failed' | 'pending';
  inspector: string;
  defects?: { description: string; severity: 'minor' | 'major' | 'critical'; quantity: number }[];
  notes?: string;
  checkedAt: string;
}

export class ManufacturingConnector extends BaseConnector {
  private client: AxiosInstance;

  constructor(config: ConnectorConfig) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseUrl || process.env.MANUFACTURING_OS_URL || 'http://localhost:5150',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': config.tenantId,
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    });
  }

  // ============================================
  // PRODUCTS
  // ============================================

  async listProducts(filters?: { status?: Product['status']; category?: string }): Promise<Product[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);

    const response = await this.client.get(`/api/products?${params.toString()}`);
    return response.data.products || [];
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const response = await this.client.get(`/api/products/${id}`);
      return response.data.product || null;
    } catch {
      return null;
    }
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    const response = await this.client.post('/api/products', data);
    return response.data.product;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const response = await this.client.put(`/api/products/${id}`, data);
    return response.data.product;
  }

  async getProductCost(productId: string): Promise<{ materialCost: number; laborCost: number; overheadCost: number; totalCost: number }> {
    const response = await this.client.get(`/api/products/${productId}/cost`);
    return response.data;
  }

  // ============================================
  // WORK ORDERS
  // ============================================

  async listWorkOrders(filters?: { status?: WorkOrder['status']; priority?: WorkOrder['priority'] }): Promise<WorkOrder[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);

    const response = await this.client.get(`/api/work-orders?${params.toString()}`);
    return response.data.workOrders || [];
  }

  async createWorkOrder(data: Partial<WorkOrder>): Promise<WorkOrder> {
    const response = await this.client.post('/api/work-orders', data);
    return response.data.workOrder;
  }

  async updateWorkOrderStatus(id: string, status: WorkOrder['status']): Promise<WorkOrder> {
    const response = await this.client.put(`/api/work-orders/${id}/status`, { status });
    return response.data.workOrder;
  }

  async startWorkOrder(id: string): Promise<WorkOrder> {
    const response = await this.client.post(`/api/work-orders/${id}/start`);
    return response.data.workOrder;
  }

  async completeWorkOrder(id: string): Promise<WorkOrder> {
    const response = await this.client.post(`/api/work-orders/${id}/complete`);
    return response.data.workOrder;
  }

  // ============================================
  // INVENTORY
  // ============================================

  async listInventory(filters?: { category?: InventoryItem['category']; location?: string }): Promise<InventoryItem[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.location) params.append('location', filters.location);

    const response = await this.client.get(`/api/inventory?${params.toString()}`);
    return response.data.items || [];
  }

  async updateInventory(id: string, quantity: number): Promise<InventoryItem> {
    const response = await this.client.put(`/api/inventory/${id}`, { quantity });
    return response.data.item;
  }

  async transferInventory(fromLocation: string, toLocation: string, items: { itemId: string; quantity: number }[]): Promise<any> {
    const response = await this.client.post('/api/inventory/transfer', { fromLocation, toLocation, items });
    return response.data;
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    const response = await this.client.get('/api/inventory/low-stock');
    return response.data.items || [];
  }

  // ============================================
  // QUALITY CONTROL
  // ============================================

  async createQualityCheck(data: Partial<QualityCheck>): Promise<QualityCheck> {
    const response = await this.client.post('/api/quality-checks', data);
    return response.data.qualityCheck;
  }

  async updateQualityCheckStatus(id: string, status: QualityCheck['status']): Promise<QualityCheck> {
    const response = await this.client.put(`/api/quality-checks/${id}/status`, { status });
    return response.data.qualityCheck;
  }

  async getQualityStats(startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await this.client.get(`/api/quality-checks/stats?${params.toString()}`);
    return response.data;
  }

  // ============================================
  // PRODUCTION SCHEDULING
  // ============================================

  async getProductionSchedule(startDate: string, endDate: string): Promise<any[]> {
    const response = await this.client.get(`/api/schedule?start=${startDate}&end=${endDate}`);
    return response.data.schedule || [];
  }

  async calculateLeadTime(productId: string, quantity: number): Promise<{ days: number; breakdown: any }> {
    const response = await this.client.post('/api/production/lead-time', { productId, quantity });
    return response.data;
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getDashboard(): Promise<any> {
    const response = await this.client.get('/api/dashboard');
    return response.data;
  }

  async getProductionMetrics(period: 'daily' | 'weekly' | 'monthly'): Promise<any> {
    const response = await this.client.get(`/api/analytics/production?period=${period}`);
    return response.data;
  }

  async getOEE(): Promise<{ oee: number; availability: number; performance: number; quality: number }> {
    const response = await this.client.get('/api/analytics/oee');
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
export function createManufacturingConnector(tenantId: string): ManufacturingConnector {
  return new ManufacturingConnector({
    tenantId,
    apiKey: process.env.INTERNAL_SERVICE_TOKEN,
    baseUrl: process.env.MANUFACTURING_OS_URL,
  });
}

export default ManufacturingConnector;
