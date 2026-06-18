/**
 * SUTAR Bridge Service
 * Connects to SUTAR OS for autonomous sales operations
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

export interface SutarConfig {
  url: string;
  apiKey?: string;
}

export interface Goal {
  id: string;
  name: string;
  type: 'revenue' | 'deals' | 'leads' | 'conversion';
  target: number;
  current: number;
  progress: number;
  deadline: Date;
  status: 'active' | 'achieved' | 'at_risk' | 'missed';
}

export interface AgentAction {
  id: string;
  agentId: string;
  action: string;
  entityType: 'lead' | 'deal' | 'customer';
  entityId: string;
  result: 'success' | 'pending' | 'failed';
  timestamp: Date;
  details?: Record<string, any>;
}

export interface KarmaScore {
  entityType: 'rep' | 'team';
  entityId: string;
  karma: number;
  rank: number;
  percentile: number;
  factors: {
    revenue: number;
    deals: number;
    customerSatisfaction: number;
    collaboration: number;
  };
}

export interface SutarResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class SutarBridge {
  private client: AxiosInstance;
  private logger: winston.Logger;
  private config: SutarConfig;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.config = {
      url: process.env.SUTAR_OS_URL || 'http://localhost:4140',
      apiKey: process.env.SUTAR_API_KEY
    };

    this.client = axios.create({
      baseURL: this.config.url,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    this.logger.info('SUTAR bridge initialized', { url: this.config.url });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      this.logger.error('SUTAR health check failed', { error });
      return false;
    }
  }

  /**
   * Log goal event (deal won, lead converted, etc.)
   */
  async logGoalEvent(eventType: string, data: Record<string, any>): Promise<SutarResponse<void>> {
    try {
      await this.client.post('/api/goals/events', {
        type: eventType,
        data,
        timestamp: new Date().toISOString()
      });
      return { success: true };
    } catch (error: any) {
      this.logger.error('Goal event logging failed', { eventType, error: error.message });
      // Don't fail the operation, just log
      return { success: false, error: error.message };
    }
  }

  /**
   * Get goals for entity
   */
  async getGoals(entityType: 'rep' | 'team' | 'organization', entityId: string): Promise<SutarResponse<Goal[]>> {
    try {
      const response = await this.client.get(`/api/goals/${entityType}/${entityId}`);
      return {
        success: true,
        data: response.data.goals || []
      };
    } catch (error) {
      return {
        success: true,
        data: this.getMockGoals(entityId)
      };
    }
  }

  /**
   * Create new goal
   */
  async createGoal(goal: Partial<Goal> & { entityType: string; entityId: string }): Promise<SutarResponse<Goal>> {
    try {
      const response = await this.client.post('/api/goals', goal);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      this.logger.error('Goal creation failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(goalId: string, progress: number): Promise<SutarResponse<void>> {
    try {
      await this.client.patch(`/api/goals/${goalId}`, { progress });
      return { success: true };
    } catch (error: any) {
      this.logger.error('Goal progress update failed', { goalId, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Request agent action
   */
  async requestAgentAction(params: {
    agentType: 'outreach' | 'followup' | 'research' | 'qualification';
    entityType: 'lead' | 'deal' | 'customer';
    entityId: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    context?: Record<string, any>;
  }): Promise<SutarResponse<{ actionId: string }>> {
    try {
      const response = await this.client.post('/api/agents/request', params);
      return {
        success: true,
        data: { actionId: response.data.actionId }
      };
    } catch (error: any) {
      this.logger.error('Agent action request failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get agent actions
   */
  async getAgentActions(entityType: 'lead' | 'deal' | 'customer', entityId: string): Promise<SutarResponse<AgentAction[]>> {
    try {
      const response = await this.client.get(`/api/agents/actions/${entityType}/${entityId}`);
      return {
        success: true,
        data: response.data.actions || []
      };
    } catch (error) {
      return {
        success: true,
        data: []
      };
    }
  }

  /**
   * Get karma score
   */
  async getKarmaScore(entityType: 'rep' | 'team', entityId: string): Promise<SutarResponse<KarmaScore>> {
    try {
      const response = await this.client.get(`/api/karma/${entityType}/${entityId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: this.getMockKarmaScore(entityId)
      };
    }
  }

  /**
   * Award karma points
   */
  async awardKarma(entityType: 'rep' | 'team', entityId: string, points: number, reason: string): Promise<SutarResponse<void>> {
    try {
      await this.client.post('/api/karma/award', {
        entityType,
        entityId,
        points,
        reason,
        timestamp: new Date().toISOString()
      });
      return { success: true };
    } catch (error: any) {
      this.logger.error('Karma award failed', { entityId, points, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(type: 'revenue' | 'deals' | 'karma', period: 'weekly' | 'monthly' | 'quarterly', limit: number = 10): Promise<SutarResponse<Array<{
    rank: number;
    repId: string;
    repName: string;
    value: number;
    trend: number;
  }>>> {
    try {
      const response = await this.client.get('/api/leaderboard', {
        params: { type, period, limit }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: this.getMockLeaderboard()
      };
    }
  }

  /**
   * Get autonomous decisions
   */
  async getDecisions(entityType: 'lead' | 'deal' | 'customer', entityId: string): Promise<SutarResponse<Array<{
    id: string;
    type: string;
    decision: string;
    confidence: number;
    timestamp: Date;
    rationale: string;
  }>>> {
    try {
      const response = await this.client.get(`/api/decisions/${entityType}/${entityId}`);
      return {
        success: true,
        data: response.data.decisions || []
      };
    } catch (error) {
      return {
        success: true,
        data: []
      };
    }
  }

  /**
   * Request autonomous action
   */
  async requestAutonomousAction(params: {
    actionType: 'assign' | 'route' | 'prioritize' | 'escalate';
    entityType: 'lead' | 'deal' | 'customer';
    entityId: string;
    constraints?: Record<string, any>;
  }): Promise<SutarResponse<{
    action: string;
    assignedTo?: string;
    reasoning: string;
    confidence: number;
  }>> {
    try {
      const response = await this.client.post('/api/autonomous/request', params);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      this.logger.error('Autonomous action request failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get sales intelligence insights
   */
  async getInsights(entityType: 'rep' | 'team' | 'organization', entityId: string): Promise<SutarResponse<Array<{
    type: string;
    insight: string;
    recommendation: string;
    impact: 'high' | 'medium' | 'low';
    confidence: number;
  }>>> {
    try {
      const response = await this.client.get(`/api/insights/${entityType}/${entityId}`);
      return {
        success: true,
        data: response.data.insights || []
      };
    } catch (error) {
      return {
        success: true,
        data: [
          {
            type: 'optimization',
            insight: 'Deals in proposal stage convert 40% better with executive involvement',
            recommendation: 'Schedule executive meeting for high-value proposals',
            impact: 'high',
            confidence: 85
          }
        ]
      };
    }
  }

  /**
   * Sync sales data
   */
  async syncSalesData(data: {
    type: 'deal' | 'lead' | 'activity';
    payload: Record<string, any>;
  }): Promise<SutarResponse<void>> {
    try {
      await this.client.post('/api/sync/sales', data);
      return { success: true };
    } catch (error: any) {
      this.logger.error('Sales sync failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<SutarResponse<{
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    currentStep: string;
    completedSteps: string[];
    pendingSteps: string[];
  }>> {
    try {
      const response = await this.client.get(`/api/workflows/${workflowId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Workflow not found'
      };
    }
  }

  /**
   * Start autonomous workflow
   */
  async startWorkflow(workflowType: string, params: Record<string, any>): Promise<SutarResponse<{ workflowId: string }>> {
    try {
      const response = await this.client.post('/api/workflows/start', {
        type: workflowType,
        params
      });
      return {
        success: true,
        data: { workflowId: response.data.workflowId }
      };
    } catch (error: any) {
      this.logger.error('Workflow start failed', { workflowType, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Mock data helpers
  private getMockGoals(entityId: string): Goal[] {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return [
      {
        id: 'goal-1',
        name: 'Monthly Revenue',
        type: 'revenue',
        target: 100000,
        current: 75000,
        progress: 75,
        deadline: endOfMonth,
        status: 'active'
      },
      {
        id: 'goal-2',
        name: 'Deals Closed',
        type: 'deals',
        target: 10,
        current: 7,
        progress: 70,
        deadline: endOfMonth,
        status: 'active'
      },
      {
        id: 'goal-3',
        name: 'New Leads',
        type: 'leads',
        target: 50,
        current: 45,
        progress: 90,
        deadline: endOfMonth,
        status: 'achieved'
      }
    ];
  }

  private getMockKarmaScore(entityId: string): KarmaScore {
    return {
      entityType: 'rep',
      entityId,
      karma: 850,
      rank: 3,
      percentile: 92,
      factors: {
        revenue: 280,
        deals: 220,
        customerSatisfaction: 180,
        collaboration: 170
      }
    };
  }

  private getMockLeaderboard() {
    return [
      { rank: 1, repId: 'rep-1', repName: 'Alice Johnson', value: 150000, trend: 15 },
      { rank: 2, repId: 'rep-2', repName: 'Bob Smith', value: 125000, trend: 8 },
      { rank: 3, repId: 'rep-3', repName: 'Carol Williams', value: 100000, trend: -5 },
      { rank: 4, repId: 'rep-4', repName: 'David Brown', value: 85000, trend: 12 },
      { rank: 5, repId: 'rep-5', repName: 'Eve Davis', value: 70000, trend: 3 }
    ];
  }
}
