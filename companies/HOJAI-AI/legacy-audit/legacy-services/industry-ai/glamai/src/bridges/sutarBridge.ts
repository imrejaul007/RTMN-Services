/**
 * SUTAR GoalOS Bridge
 *
 * Connects GlamAI to SUTAR for:
 * - Salon expansion goals
 * - Multi-location orchestration
 * - Agent coordination
 */

import axios from 'axios';
import { logger } from '../../../utils/logger.js';

const GOAL_OS_URL = process.env.GOAL_OS_URL || 'http://localhost:4242';
const FLOW_OS_URL = process.env.FLOW_OS_URL || 'http://localhost:4244';
const SIMULATION_URL = process.env.SIMULATION_URL || 'http://localhost:4241';

export class SutarBridge {
  private goalOS: axios.AxiosInstance;
  private flowOS: axios.AxiosInstance;
  private simulation: axios.AxiosInstance;

  constructor() {
    this.goalOS = axios.create({ baseURL: GOAL_OS_URL, timeout: 15000 });
    this.flowOS = axios.create({ baseURL: FLOW_OS_URL, timeout: 15000 });
    this.simulation = axios.create({ baseURL: SIMULATION_URL, timeout: 15000 });
  }

  // ============ EXPANSION GOALS ============

  /**
   * Create salon expansion goal
   */
  async createExpansionGoal(salonId: string, data: {
    targetLocations: number;
    budget: number;
    timeline: string;
    locations?: string[];
  }): Promise<{ goalId: string; subGoals: string[] }> {
    try {
      const response = await this.goalOS.post('/api/goals', {
        type: 'expansion',
        industry: 'beauty',
        ownerId: salonId,
        target: data.targetLocations,
        budget: data.budget,
        timeline: data.timeline,
        metadata: {
          locations: data.locations,
          salonId
        }
      });

      const goalId = response.data.data?.goalId;
      logger.info(`Created expansion goal ${goalId} for salon ${salonId}`);

      return {
        goalId,
        subGoals: response.data.data?.subGoals || []
      };
    } catch (error: any) {
      logger.warn(`Expansion goal creation failed: ${error.message}`);
      return { goalId: '', subGoals: [] };
    }
  }

  /**
   * Create sub-goals for expansion
   */
  async createExpansionSubGoals(goalId: string): Promise<string[]> {
    try {
      const subGoals = [
        'location-scouting',
        'staff-hiring',
        'supplier-setup',
        'marketing-launch',
        'operations-setup',
        'financial-setup'
      ];

      const createdGoals: string[] = [];

      for (const subGoal of subGoals) {
        const response = await this.goalOS.post('/api/goals', {
          parentId: goalId,
          type: subGoal,
          industry: 'beauty',
          status: 'pending'
        });
        createdGoals.push(response.data.data?.goalId);
      }

      logger.info(`Created ${createdGoals.length} sub-goals for ${goalId}`);
      return createdGoals;
    } catch (error: any) {
      logger.warn(`Sub-goal creation failed: ${error.message}`);
      return [];
    }
  }

  // ============ LOCATION ANALYSIS ============

  /**
   * Get expansion location recommendations
   */
  async getExpansionLocations(data: {
    targetCity: string;
    targetCount: number;
    criteria?: {
      population?: number;
      income?: string;
      competition?: string;
    };
  }): Promise<any[]> {
    try {
      const response = await this.goalOS.post('/api/expansion/locations', {
        city: data.targetCity,
        count: data.targetCount,
        criteria: data.criteria
      });

      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Location analysis failed: ${error.message}`);
      return [];
    }
  }

  // ============ FLOW EXECUTION ============

  /**
   * Execute expansion flow
   */
  async executeExpansionFlow(goalId: string, flowId: string): Promise<boolean> {
    try {
      await this.flowOS.post('/api/execute', {
        flowId,
        context: { goalId, industry: 'beauty' }
      });

      logger.info(`Started expansion flow ${flowId} for goal ${goalId}`);
      return true;
    } catch (error: any) {
      logger.warn(`Flow execution failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get expansion progress
   */
  async getExpansionProgress(goalId: string): Promise<any> {
    try {
      const response = await this.goalOS.get(`/api/goals/${goalId}/progress`);
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Progress lookup failed: ${error.message}`);
      return null;
    }
  }

  // ============ SIMULATION ============

  /**
   * Simulate expansion scenarios
   */
  async simulateExpansion(data: {
    locations: string[];
    investment: number;
    timeframe: number;
  }): Promise<any> {
    try {
      const response = await this.simulation.post('/api/beauty/expansion', {
        locations: data.locations,
        investment: data.investment,
        timeframeMonths: data.timeframe
      });

      return response.data.data;
    } catch (error: any) {
      logger.warn(`Expansion simulation failed: ${error.message}`);
      return null;
    }
  }

  // ============ AGENT COORDINATION ============

  /**
   * Create agents for expansion tasks
   */
  async createExpansionAgents(goalId: string): Promise<string[]> {
    try {
      const agents = [
        { type: 'location-scout', role: 'Find best locations' },
        { type: 'recruiter', role: 'Hire stylists' },
        { type: 'procurement', role: 'Setup suppliers' },
        { type: 'marketer', role: 'Launch campaigns' }
      ];

      const agentIds: string[] = [];

      for (const agent of agents) {
        const response = await this.goalOS.post('/api/agents', {
          type: agent.type,
          role: agent.role,
          goalId,
          industry: 'beauty'
        });
        agentIds.push(response.data.data?.agentId);
      }

      logger.info(`Created ${agentIds.length} agents for goal ${goalId}`);
      return agentIds;
    } catch (error: any) {
      logger.warn(`Agent creation failed: ${error.message}`);
      return [];
    }
  }

  // ============ GOAL TRACKING ============

  /**
   * Update goal status
   */
  async updateGoalStatus(goalId: string, status: string): Promise<boolean> {
    try {
      await this.goalOS.put(`/api/goals/${goalId}`, { status });
      return true;
    } catch (error: any) {
      logger.warn(`Goal update failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get goal metrics
   */
  async getGoalMetrics(goalId: string): Promise<any> {
    try {
      const response = await this.goalOS.get(`/api/goals/${goalId}/metrics`);
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Metrics lookup failed: ${error.message}`);
      return null;
    }
  }

  // ============ HEALTH CHECK ============

  async healthCheck(): Promise<boolean> {
    try {
      await this.goalOS.get('/health', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const sutarBridge = new SutarBridge();
