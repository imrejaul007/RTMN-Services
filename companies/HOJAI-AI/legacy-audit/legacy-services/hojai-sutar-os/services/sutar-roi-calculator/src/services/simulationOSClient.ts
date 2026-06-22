import { SimulationOSConfig, SimulationScenario } from '../types/index.js';

/**
 * SimulationOS Client
 * Integrates with SimulationOS service (port 4241) for running simulations
 */
export class SimulationOSClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config?: Partial<SimulationOSConfig>) {
    this.baseUrl = config?.baseUrl || 'http://localhost:4241';
    this.timeout = config?.timeout || 30000;
  }

  /**
   * Run a simulation scenario
   */
  async runSimulation(scenario: {
    name: string;
    type: string;
    parameters: Record<string, unknown>;
  }): Promise<SimulationScenario> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/simulations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scenario),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`SimulationOS error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('SimulationOS request timeout');
      }
      throw error;
    }
  }

  /**
   * Get simulation status
   */
  async getSimulation(id: string): Promise<SimulationScenario | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/simulations/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`SimulationOS error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('SimulationOS request timeout');
      }
      throw error;
    }
  }

  /**
   * Run ROI simulation with market conditions
   */
  async runROISimulation(params: {
    initialInvestment: number;
    expectedReturn: number;
    volatility: number;
    years: number;
    scenarios?: Array<{
      name: string;
      probability: number;
      returnModifier: number;
    }>;
  }): Promise<{
    baseScenario: { finalValue: number; roi: number };
    scenarios: Array<{ name: string; probability: number; finalValue: number; roi: number }>;
    expectedValue: number;
    riskMetrics: {
      standardDeviation: number;
      sharpeRatio?: number;
      maxDrawdown: number;
    };
  }> {
    const simulationParams = {
      name: 'ROI Projection Simulation',
      type: 'roi_projection',
      parameters: params,
    };

    try {
      const result = await this.runSimulation(simulationParams);
      return result.results as {
        baseScenario: { finalValue: number; roi: number };
        scenarios: Array<{ name: string; probability: number; finalValue: number; roi: number }>;
        expectedValue: number;
        riskMetrics: {
          standardDeviation: number;
          sharpeRatio?: number;
          maxDrawdown: number;
        };
      };
    } catch (error) {
      // Fallback to local calculation if SimulationOS is unavailable
      console.warn('SimulationOS unavailable, using local calculation:', error);
      return this.calculateLocalROISimulation(params);
    }
  }

  /**
   * Calculate ROI simulation locally (fallback)
   */
  private calculateLocalROISimulation(params: {
    initialInvestment: number;
    expectedReturn: number;
    volatility: number;
    years: number;
    scenarios?: Array<{
      name: string;
      probability: number;
      returnModifier: number;
    }>;
  }): {
    baseScenario: { finalValue: number; roi: number };
    scenarios: Array<{ name: string; probability: number; finalValue: number; roi: number }>;
    expectedValue: number;
    riskMetrics: {
      standardDeviation: number;
      maxDrawdown: number;
    };
  } {
    const { initialInvestment, expectedReturn, volatility, years, scenarios = [] } = params;

    // Base scenario calculation
    const baseFinalValue = initialInvestment * Math.pow(1 + expectedReturn / 100, years);
    const baseROI = ((baseFinalValue - initialInvestment) / initialInvestment) * 100;

    // Calculate scenarios
    const scenarioResults = scenarios.map((scenario) => {
      const adjustedReturn = expectedReturn + scenario.returnModifier;
      const finalValue = initialInvestment * Math.pow(1 + adjustedReturn / 100, years);
      const roi = ((finalValue - initialInvestment) / initialInvestment) * 100;
      return {
        name: scenario.name,
        probability: scenario.probability,
        finalValue: Math.round(finalValue * 100) / 100,
        roi: Math.round(roi * 100) / 100,
      };
    });

    // Calculate expected value
    const expectedValue = scenarioResults.reduce((sum, s) => {
      return sum + s.finalValue * (s.probability / 100);
    }, baseFinalValue * 0.5);

    // Risk metrics
    const standardDeviation = Math.sqrt(years) * volatility;
    const maxDrawdown = Math.min(0, expectedReturn - 2 * volatility) * years;

    return {
      baseScenario: {
        finalValue: Math.round(baseFinalValue * 100) / 100,
        roi: Math.round(baseROI * 100) / 100,
      },
      scenarios: scenarioResults,
      expectedValue: Math.round(expectedValue * 100) / 100,
      riskMetrics: {
        standardDeviation: Math.round(standardDeviation * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      },
    };
  }

  /**
   * Health check for SimulationOS
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default SimulationOSClient;
