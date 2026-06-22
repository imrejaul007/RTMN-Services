// ============================================================================
// SUTAR Exploration Engine - SimulationOS Integration
// ============================================================================

import type { SimulationRequest, SimulationResult } from '../types/index.js';

const SIMULATION_OS_URL = process.env.SIMULATION_OS_URL || 'http://localhost:4241';
const SIMULATION_TIMEOUT = 30000; // 30 seconds

export class SimulationIntegration {
  private pendingSimulations: Map<string, { resolve: (result: SimulationResult) => void; reject: (error: Error) => void }> = new Map();

  /**
   * Run a simulation through SimulationOS
   */
  async runSimulation(request: SimulationRequest): Promise<SimulationResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SIMULATION_TIMEOUT);

      const response = await fetch(`${SIMULATION_OS_URL}/api/v1/simulations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': `exploration-${Date.now()}`,
        },
        body: JSON.stringify({
          name: request.name,
          type: request.type,
          parameters: request.parameters,
          iterations: request.iterations || 1000,
          confidenceLevel: request.confidenceLevel || 0.95,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`SimulationOS returned ${response.status}`);
      }

      const data = await response.json() as {
        success: boolean;
        data?: {
          simulationId: string;
          status: string;
          result: Record<string, unknown>;
        };
        error?: string;
      };

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Unknown error from SimulationOS');
      }

      return {
        id: data.data.simulationId,
        status: data.data.status,
        result: data.data.result,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Simulation request timed out');
      }

      console.error('SimulationOS error:', error);
      throw error;
    }
  }

  /**
   * Get simulation by ID
   */
  async getSimulation(id: string): Promise<SimulationResult | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${SIMULATION_OS_URL}/api/v1/simulations/${id}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`SimulationOS returned ${response.status}`);
      }

      const data = await response.json() as {
        success: boolean;
        data?: SimulationResult;
        error?: string;
      };

      return data.data || null;
    } catch (error) {
      console.error('Failed to get simulation:', error);
      return null;
    }
  }

  /**
   * Check if SimulationOS is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${SIMULATION_OS_URL}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get information about SimulationOS
   */
  async getInfo(): Promise<{
    name: string;
    version: string;
    features: string[];
    supportedTypes: string[];
  } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${SIMULATION_OS_URL}/api/v1/info`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as {
        success: boolean;
        data?: {
          name: string;
          version: string;
          features: string[];
          supportedTypes: string[];
        };
      };

      return data.data || null;
    } catch {
      return null;
    }
  }

  /**
   * Simulate market opportunity viability
   */
  async simulateOpportunityViability(params: {
    marketSize: number;
    growthRate: number;
    competition: number;
    barriers: string[];
  }): Promise<{
    successProbability: number;
    estimatedRevenue: number;
    breakEvenMonths: number;
    riskScore: number;
    confidence: number;
  }> {
    try {
      const result = await this.runSimulation({
        name: 'Opportunity Viability Analysis',
        type: 'MARKET',
        parameters: {
          marketSize: params.marketSize,
          growthRate: params.growthRate,
          competition: params.competition,
          barriers: params.barriers.length,
          scenario: 'conservative',
        },
        iterations: 1000,
        confidenceLevel: 0.95,
      });

      // Parse simulation result
      const simResult = result.result as {
        mean?: number;
        success_rate?: number;
        revenue_estimate?: number;
        break_even?: number;
        risk_score?: number;
      };

      return {
        successProbability: simResult.success_rate || simResult.mean || 0.65,
        estimatedRevenue: simResult.revenue_estimate || params.marketSize * 0.02,
        breakEvenMonths: simResult.break_even || 18,
        riskScore: simResult.risk_score || 0.35,
        confidence: 0.85,
      };
    } catch {
      // Return fallback analysis
      const competitionFactor = Math.max(0.3, 1 - (params.competition * 0.1));
      const barrierFactor = Math.max(0.5, 1 - (params.barriers.length * 0.1));

      return {
        successProbability: Math.round(competitionFactor * barrierFactor * 100) / 100,
        estimatedRevenue: Math.round(params.marketSize * 0.02 * competitionFactor),
        breakEvenMonths: Math.round(18 / competitionFactor),
        riskScore: Math.round((1 - competitionFactor) * 100) / 100,
        confidence: 0.5,
      };
    }
  }

  /**
   * Simulate market trend impact
   */
  async simulateTrendImpact(params: {
    trendStrength: number;
    trendVelocity: number;
    marketSize: number;
    timeHorizon: string;
  }): Promise<{
    projectedGrowth: number;
    affectedSegments: string[];
    confidence: number;
    scenario: 'bull' | 'base' | 'bear';
  }> {
    try {
      const result = await this.runSimulation({
        name: 'Trend Impact Analysis',
        type: 'DEMAND',
        parameters: {
          trendStrength: params.trendStrength,
          trendVelocity: params.trendVelocity,
          marketSize: params.marketSize,
          timeHorizon: params.timeHorizon,
        },
        iterations: 500,
        confidenceLevel: 0.9,
      });

      const simResult = result.result as {
        growth_projection?: number;
        affected_segments?: string[];
        scenario?: 'bull' | 'base' | 'bear';
      };

      return {
        projectedGrowth: simResult.growth_projection || params.trendStrength * 0.5,
        affectedSegments: simResult.affected_segments || ['General market'],
        confidence: 0.8,
        scenario: simResult.scenario || 'base',
      };
    } catch {
      // Return fallback analysis
      const projectedGrowth = (params.trendStrength / 100) * (params.trendVelocity / 100) * 100;

      return {
        projectedGrowth: Math.round(projectedGrowth * 100) / 100,
        affectedSegments: ['General market', 'Technology sector'],
        confidence: 0.5,
        scenario: projectedGrowth > 20 ? 'bull' : projectedGrowth < 5 ? 'bear' : 'base',
      };
    }
  }
}
