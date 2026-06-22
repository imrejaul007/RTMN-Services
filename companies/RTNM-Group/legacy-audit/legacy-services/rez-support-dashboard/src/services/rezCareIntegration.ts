/**
 * REZ Support Dashboard - REZ Care Integration
 *
 * This service connects the Agent Dashboard to REZ Care Service.
 * Uses local MongoDB for agent dashboard features,
 * but fetches unified customer view from REZ Care.
 */

import axios, { AxiosInstance } from 'axios';

const REZ_CARE_URL = process.env.REZ_CARE_URL || 'http://localhost:4058';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'rez-internal-token';

export interface UnifiedCustomerView {
  customerId: string;
  history?: {
    totalTickets: number;
    resolvedTickets: number;
    avgResolutionTime: number;
    csatScores: number[];
    lastContact: string;
  };
  sentiment?: {
    sentiment: string;
    sentimentScore: number;
  };
  issues?: Array<{
    category: string;
    count: number;
  }>;
}

export interface AIAnalysis {
  sentiment: string;
  sentimentScore: number;
  suggestions: string[];
  confidence: number;
}

class RezCareIntegration {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: REZ_CARE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_TOKEN
      }
    });
  }

  // ============================================
  // UNIFIED CUSTOMER VIEW
  // ============================================

  /**
   * Get unified customer view from REZ Care
   */
  async getUnifiedCustomerView(customerId: string): Promise<UnifiedCustomerView | null> {
    try {
      const response = await this.client.get(`/api/support/ai/unified/${customerId}`);
      if (response.data?.success) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('[REZ Care Integration] Failed to get unified view:', error);
      return null;
    }
  }

  // ============================================
  // AI FEATURES
  // ============================================

  /**
   * Analyze sentiment of message
   */
  async analyzeSentiment(message: string): Promise<AIAnalysis | null> {
    try {
      const response = await this.client.post('/api/support/ai/sentiment', {
        message
      });

      if (response.data?.analysis) {
        return response.data.analysis;
      }
      return null;
    } catch (error) {
      console.error('[REZ Care Integration] Sentiment analysis failed:', error);
      return null;
    }
  }

  /**
   * Get AI suggestions for ticket
   */
  async getTicketSuggestions(ticketNumber: string, customerId?: string): Promise<string[]> {
    try {
      const response = await this.client.get(`/api/support/ai/suggestions/${ticketNumber}`, {
        params: { customerId }
      });

      if (response.data?.suggestions) {
        return response.data.suggestions;
      }
      return [];
    } catch (error) {
      console.error('[REZ Care Integration] Suggestions failed:', error);
      return [];
    }
  }

  /**
   * Detect intent from message
   */
  async detectIntent(message: string): Promise<{
    intent: string;
    confidence: number;
  } | null> {
    try {
      const response = await this.client.post('/api/support/ai/intent', {
        message
      });

      if (response.data?.intent) {
        return response.data.intent;
      }
      return null;
    } catch (error) {
      console.error('[REZ Care Integration] Intent detection failed:', error);
      return null;
    }
  }

  // ============================================
  // CSAT & METRICS
  // ============================================

  /**
   * Submit CSAT rating to REZ Care
   */
  async submitCSAT(ticketNumber: string, score: number, comment?: string): Promise<boolean> {
    try {
      const response = await this.client.post(`/api/csat/respond`, {
        ticketId: ticketNumber,
        score,
        comment
      });

      return response.data?.success === true;
    } catch (error) {
      console.error('[REZ Care Integration] CSAT submission failed:', error);
      return false;
    }
  }

  /**
   * Get CSAT metrics from REZ Care
   */
  async getCSATMetrics(days: number = 7): Promise<any> {
    try {
      const response = await this.client.get('/api/csat/metrics', {
        params: { days }
      });

      if (response.data?.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('[REZ Care Integration] CSAT metrics failed:', error);
      return null;
    }
  }

  // ============================================
  // ESCALATION
  // ============================================

  /**
   * Check escalation rules for ticket
   */
  async checkEscalation(ticket: {
    ticketId: string;
    customerId: string;
    customerPhone: string;
    assignedAgent?: { agentId: string; agentName: string };
    priority?: string;
    sentiment?: string;
    createdAt: Date;
  }): Promise<{
    escalated: boolean;
    reason?: string;
    action?: string;
  }> {
    try {
      const response = await this.client.post('/api/escalation/check', ticket);

      if (response.data?.data) {
        return response.data.data;
      }
      return { escalated: false };
    } catch (error) {
      console.error('[REZ Care Integration] Escalation check failed:', error);
      return { escalated: false };
    }
  }

  // ============================================
  // PROACTIVE ALERTS
  // ============================================

  /**
   * Get active alerts from REZ Care
   */
  async getActiveAlerts(): Promise<any[]> {
    try {
      const response = await this.client.get('/api/alerts/active');

      if (response.data?.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('[REZ Care Integration] Active alerts failed:', error);
      return [];
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      const response = await this.client.post(`/api/alerts/${alertId}/acknowledge`);
      return response.data?.success === true;
    } catch (error) {
      console.error('[REZ Care Integration] Acknowledge failed:', error);
      return false;
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const response = await this.client.post(`/api/alerts/${alertId}/resolve`);
      return response.data?.success === true;
    } catch (error) {
      console.error('[REZ Care Integration] Resolve failed:', error);
      return false;
    }
  }

  // ============================================
  // REPORTS
  // ============================================

  /**
   * Get dashboard overview from REZ Care
   */
  async getDashboardOverview(): Promise<any> {
    try {
      const response = await this.client.get('/api/reports/overview');

      if (response.data?.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('[REZ Care Integration] Overview failed:', error);
      return null;
    }
  }

  /**
   * Get CSAT trends
   */
  async getCSATTrends(days: number = 30): Promise<any> {
    try {
      const response = await this.client.get('/api/reports/csat-trends', {
        params: { days }
      });

      if (response.data?.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('[REZ Care Integration] CSAT trends failed:', error);
      return null;
    }
  }

  /**
   * Get category breakdown
   */
  async getCategoryBreakdown(days: number = 7): Promise<any> {
    try {
      const response = await this.client.get('/api/reports/categories', {
        params: { days }
      });

      if (response.data?.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('[REZ Care Integration] Category breakdown failed:', error);
      return null;
    }
  }

  /**
   * Get platform comparison
   */
  async getPlatformComparison(days: number = 7): Promise<any> {
    try {
      const response = await this.client.get('/api/reports/platforms', {
        params: { days }
      });

      if (response.data?.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('[REZ Care Integration] Platform comparison failed:', error);
      return null;
    }
  }

  // ============================================
  // AGENT MANAGEMENT
  // ============================================

  /**
   * Get agent performance
   */
  async getAgentPerformance(agentId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/agents/${agentId}/performance`);

      if (response.data?.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('[REZ Care Integration] Agent performance failed:', error);
      return null;
    }
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(agentId: string, status: string): Promise<boolean> {
    try {
      const response = await this.client.post(`/api/agents/${agentId}/status`, {
        status
      });

      return response.data?.success === true;
    } catch (error) {
      console.error('[REZ Care Integration] Agent status update failed:', error);
      return false;
    }
  }

  /**
   * Get agent leaderboard
   */
  async getAgentLeaderboard(days: number = 7): Promise<any> {
    try {
      const response = await this.client.get('/api/reports/leaderboard', {
        params: { days }
      });

      if (response.data?.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('[REZ Care Integration] Leaderboard failed:', error);
      return null;
    }
  }
}

// Singleton
let instance: RezCareIntegration | null = null;

export function getRezCareIntegration(): RezCareIntegration {
  if (!instance) {
    instance = new RezCareIntegration();
  }
  return instance;
}

export { RezCareIntegration };
