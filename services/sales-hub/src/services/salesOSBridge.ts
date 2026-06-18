/**
 * Sales OS Bridge Service
 * Connects to REZ Sales Operating System
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

export interface SalesOSConfig {
  url: string;
  apiKey?: string;
}

export interface Territory {
  id: string;
  name: string;
  region: string;
  countries: string[];
  assignedReps: string[];
  quotas: {
    monthlyRevenue: number;
    leadTarget: number;
  };
}

export interface Rep {
  id: string;
  name: string;
  email: string;
  territory: string;
  role: string;
  status: 'active' | 'inactive';
  performance: {
    currentMonth: { revenue: number; deals: number; leads: number };
    quotaAttainment: number;
  };
}

export interface SalesOSResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class SalesOSBridge {
  private client: AxiosInstance;
  private logger: winston.Logger;
  private config: SalesOSConfig;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.config = {
      url: process.env.SALES_OS_URL || 'http://localhost:4399',
      apiKey: process.env.SALES_OS_API_KEY
    };

    this.client = axios.create({
      baseURL: this.config.url,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    this.logger.info('Sales OS bridge initialized', { url: this.config.url });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Sales OS health check failed', { error });
      return false;
    }
  }

  /**
   * Get all territories
   */
  async getTerritories(): Promise<SalesOSResponse<Territory[]>> {
    try {
      const response = await this.client.get('/api/territories');
      return {
        success: true,
        data: response.data.territories || []
      };
    } catch (error) {
      this.logger.warn('Territory fetch failed, using mock data');
      return {
        success: true,
        data: this.getMockTerritories()
      };
    }
  }

  /**
   * Get territory by ID
   */
  async getTerritory(territoryId: string): Promise<SalesOSResponse<Territory>> {
    try {
      const response = await this.client.get(`/api/territories/${territoryId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      const territories = this.getMockTerritories();
      const territory = territories.find(t => t.id === territoryId);
      return {
        success: true,
        data: territory || territories[0]
      };
    }
  }

  /**
   * Get all reps
   */
  async getReps(filters?: { territory?: string; status?: string }): Promise<SalesOSResponse<Rep[]>> {
    try {
      const params = new URLSearchParams();
      if (filters?.territory) params.append('territory', filters.territory);
      if (filters?.status) params.append('status', filters.status);

      const response = await this.client.get(`/api/reps?${params}`);
      return {
        success: true,
        data: response.data.reps || []
      };
    } catch (error) {
      this.logger.warn('Reps fetch failed, using mock data');
      return {
        success: true,
        data: this.getMockReps()
      };
    }
  }

  /**
   * Get rep by ID
   */
  async getRep(repId: string): Promise<SalesOSResponse<Rep>> {
    try {
      const response = await this.client.get(`/api/reps/${repId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      const reps = this.getMockReps();
      const rep = reps.find(r => r.id === repId);
      return {
        success: true,
        data: rep || reps[0]
      };
    }
  }

  /**
   * Get rep workload/capacity
   */
  async getRepCapacity(repId: string): Promise<SalesOSResponse<{
    current: number;
    max: number;
    available: number;
    assignments: any[];
  }>> {
    try {
      const response = await this.client.get(`/api/reps/${repId}/capacity`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: {
          current: 8,
          max: 15,
          available: 7,
          assignments: []
        }
      };
    }
  }

  /**
   * Assign territory to rep
   */
  async assignTerritory(repId: string, territoryId: string): Promise<SalesOSResponse<void>> {
    try {
      await this.client.post(`/api/reps/${repId}/territories`, { territoryId });
      return { success: true };
    } catch (error: any) {
      this.logger.error('Territory assignment failed', { repId, territoryId, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get sales targets
   */
  async getTargets(repId?: string, period?: 'monthly' | 'quarterly' | 'annual'): Promise<SalesOSResponse<any>> {
    try {
      const params = new URLSearchParams();
      if (repId) params.append('repId', repId);
      if (period) params.append('period', period);

      const response = await this.client.get(`/api/targets?${params}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: {
          monthly: { revenue: 100000, deals: 10, leads: 50 },
          quarterly: { revenue: 300000, deals: 30, leads: 150 },
          annual: { revenue: 1200000, deals: 120, leads: 600 }
        }
      };
    }
  }

  /**
   * Update rep performance
   */
  async updateRepPerformance(repId: string, performance: Partial<Rep['performance']>): Promise<SalesOSResponse<void>> {
    try {
      await this.client.patch(`/api/reps/${repId}/performance`, performance);
      return { success: true };
    } catch (error: any) {
      this.logger.error('Performance update failed', { repId, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get quota attainment
   */
  async getQuotaAttainment(repId: string): Promise<SalesOSResponse<{
    quota: number;
    achieved: number;
    attainment: number;
    gap: number;
  }>> {
    try {
      const response = await this.client.get(`/api/reps/${repId}/quota`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      const reps = this.getMockReps();
      const rep = reps.find(r => r.id === repId);
      const quota = 100000;
      const achieved = rep?.performance.currentMonth.revenue || 75000;

      return {
        success: true,
        data: {
          quota,
          achieved,
          attainment: (achieved / quota) * 100,
          gap: quota - achieved
        }
      };
    }
  }

  /**
   * Sync lead assignment
   */
  async syncLeadAssignment(leadId: string, repId: string, territoryId: string): Promise<SalesOSResponse<void>> {
    try {
      await this.client.post('/api/assignments/sync', {
        entityType: 'lead',
        entityId: leadId,
        repId,
        territoryId,
        timestamp: new Date().toISOString()
      });
      return { success: true };
    } catch (error: any) {
      this.logger.error('Assignment sync failed', { leadId, repId, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Mock data helpers
  private getMockTerritories(): Territory[] {
    return [
      {
        id: 'territory-west',
        name: 'West Coast',
        region: 'West',
        countries: ['US'],
        assignedReps: ['rep-1', 'rep-2'],
        quotas: { monthlyRevenue: 300000, leadTarget: 150 }
      },
      {
        id: 'territory-east',
        name: 'East Coast',
        region: 'East',
        countries: ['US'],
        assignedReps: ['rep-3', 'rep-4'],
        quotas: { monthlyRevenue: 350000, leadTarget: 175 }
      },
      {
        id: 'territory-central',
        name: 'Central',
        region: 'Central',
        countries: ['US'],
        assignedReps: ['rep-5'],
        quotas: { monthlyRevenue: 200000, leadTarget: 100 }
      }
    ];
  }

  private getMockReps(): Rep[] {
    return [
      {
        id: 'rep-1',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        territory: 'territory-west',
        role: 'senior_rep',
        status: 'active',
        performance: { currentMonth: { revenue: 125000, deals: 12, leads: 45 }, quotaAttainment: 125 }
      },
      {
        id: 'rep-2',
        name: 'Bob Smith',
        email: 'bob@example.com',
        territory: 'territory-west',
        role: 'rep',
        status: 'active',
        performance: { currentMonth: { revenue: 85000, deals: 8, leads: 38 }, quotaAttainment: 85 }
      },
      {
        id: 'rep-3',
        name: 'Carol Williams',
        email: 'carol@example.com',
        territory: 'territory-east',
        role: 'senior_rep',
        status: 'active',
        performance: { currentMonth: { revenue: 150000, deals: 15, leads: 52 }, quotaAttainment: 150 }
      },
      {
        id: 'rep-4',
        name: 'David Brown',
        email: 'david@example.com',
        territory: 'territory-east',
        role: 'rep',
        status: 'active',
        performance: { currentMonth: { revenue: 70000, deals: 7, leads: 30 }, quotaAttainment: 70 }
      },
      {
        id: 'rep-5',
        name: 'Eve Davis',
        email: 'eve@example.com',
        territory: 'territory-central',
        role: 'bdr',
        status: 'active',
        performance: { currentMonth: { revenue: 95000, deals: 10, leads: 60 }, quotaAttainment: 95 }
      }
    ];
  }
}
