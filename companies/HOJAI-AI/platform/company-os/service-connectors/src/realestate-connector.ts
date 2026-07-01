/**
 * Real Estate Service Connector
 *
 * Connects to Real Estate OS (5230) for property management,
 * listings, leads, and transactions.
 */

import axios, { AxiosInstance } from 'axios';
import { BaseConnector, ConnectorConfig } from './base-connector.js';

export interface Property {
  id: string;
  title: string;
  type: 'residential' | 'commercial' | 'industrial' | 'land';
  status: 'available' | 'sold' | 'under-offer' | 'rented';
  price: number;
  currency: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  features: {
    bedrooms?: number;
    bathrooms?: number;
    area: number;
    areaUnit: 'sqft' | 'sqm' | 'acre';
    parking?: number;
  };
  images: string[];
  agentId?: string;
  ownerId?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: 'website' | 'referral' | 'agent' | 'advertisement';
  status: 'new' | 'contacted' | 'qualified' | 'viewing' | 'negotiating' | 'closed';
  budget?: { min: number; max: number };
  preferredLocation?: string;
  propertyType?: string;
  notes?: string;
  assignedTo?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  propertyId: string;
  type: 'sale' | 'rent' | 'lease';
  status: 'pending' | 'underway' | 'completed' | 'cancelled';
  buyerId?: string;
  sellerId?: string;
  amount: number;
  commission?: number;
  documents: string[];
  createdAt: string;
}

export class RealEstateConnector extends BaseConnector {
  private client: AxiosInstance;

  constructor(config: ConnectorConfig) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseUrl || process.env.REALESTATE_OS_URL || 'http://localhost:5230',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': config.tenantId,
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    });
  }

  // ============================================
  // PROPERTIES
  // ============================================

  async listProperties(filters?: {
    status?: Property['status'];
    type?: Property['type'];
    city?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Property[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.city) params.append('city', filters.city);
    if (filters?.minPrice) params.append('minPrice', String(filters.minPrice));
    if (filters?.maxPrice) params.append('maxPrice', String(filters.maxPrice));

    const response = await this.client.get(`/api/properties?${params.toString()}`);
    return response.data.properties || [];
  }

  async getProperty(id: string): Promise<Property | null> {
    try {
      const response = await this.client.get(`/api/properties/${id}`);
      return response.data.property || null;
    } catch {
      return null;
    }
  }

  async createProperty(data: Partial<Property>): Promise<Property> {
    const response = await this.client.post('/api/properties', data);
    return response.data.property;
  }

  async updateProperty(id: string, data: Partial<Property>): Promise<Property> {
    const response = await this.client.put(`/api/properties/${id}`, data);
    return response.data.property;
  }

  async listPropertiesByOwner(ownerId: string): Promise<Property[]> {
    const response = await this.client.get(`/api/owners/${ownerId}/properties`);
    return response.data.properties || [];
  }

  // ============================================
  // LEADS
  // ============================================

  async listLeads(filters?: { status?: Lead['status']; source?: Lead['source'] }): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.source) params.append('source', filters.source);

    const response = await this.client.get(`/api/leads?${params.toString()}`);
    return response.data.leads || [];
  }

  async createLead(data: Partial<Lead>): Promise<Lead> {
    const response = await this.client.post('/api/leads', data);
    return response.data.lead;
  }

  async updateLeadStatus(id: string, status: Lead['status']): Promise<Lead> {
    const response = await this.client.put(`/api/leads/${id}/status`, { status });
    return response.data.lead;
  }

  async assignLead(id: string, agentId: string): Promise<Lead> {
    const response = await this.client.put(`/api/leads/${id}/assign`, { agentId });
    return response.data.lead;
  }

  // ============================================
  // TRANSACTIONS
  // ============================================

  async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
    const response = await this.client.post('/api/transactions', data);
    return response.data.transaction;
  }

  async updateTransactionStatus(id: string, status: Transaction['status']): Promise<Transaction> {
    const response = await this.client.put(`/api/transactions/${id}/status`, { status });
    return response.data.transaction;
  }

  async calculateCommission(propertyId: string, salePrice: number): Promise<{ commission: number; breakdown: any }> {
    const response = await this.client.post('/api/commissions/calculate', { propertyId, salePrice });
    return response.data;
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getDashboard(): Promise<any> {
    const response = await this.client.get('/api/dashboard');
    return response.data;
  }

  async getMarketAnalytics(city?: string): Promise<any> {
    const params = city ? `?city=${city}` : '';
    const response = await this.client.get(`/api/analytics/market${params}`);
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
export function createRealEstateConnector(tenantId: string): RealEstateConnector {
  return new RealEstateConnector({
    tenantId,
    apiKey: process.env.INTERNAL_SERVICE_TOKEN,
    baseUrl: process.env.REALESTATE_OS_URL,
  });
}

export default RealEstateConnector;
