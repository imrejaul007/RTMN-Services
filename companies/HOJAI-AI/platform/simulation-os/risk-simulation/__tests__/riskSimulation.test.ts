import { describe, it, expect, beforeEach } from 'vitest';
import {
  RiskSimulationEngine,
  MonteCarloRiskEngine,
  VaREngine,
  SensitivityAnalysisEngine,
  StressTestingEngine,
  RiskMitigationEngine
} from '../engine/riskSimulationEngine.js';
import { DistributionType, RiskCategory } from '../models/riskSimulation.js';

// ============================================================================
// Risk Simulation Tests
// ============================================================================

describe('RiskSimulationEngine', () => {
  let engine: RiskSimulationEngine;

  beforeEach(() => {
    engine = new RiskSimulationEngine();
  });

  describe('run', () => {
    it('should run risk simulation successfully', async () => {
      const request = {
        simulationId: 'risk-test-1',
        name: 'Portfolio Risk Analysis',
        description: 'Monte Carlo risk simulation for investment portfolio',
        positions: [
          {
            id: 'pos-1',
            name: 'Tech Stocks',
            type: 'equity' as const,
            value: 500000,
            exposure: 500000,
            riskFactors: [
              { factorId: 'equity_market', sensitivity: 1.0 },
              { factorId: 'volatility', sensitivity: -0.3 }
            ]
          },
          {
            id: 'pos-2',
            name: 'Government Bonds',
            type: 'bond' as const,
            value: 300000,
            exposure: 300000,
            riskFactors: [
              { factorId: 'interest_rates', sensitivity: -1.0 }
            ]
          }
        ],
        riskFactors: [
          {
            id: 'equity_market',
            name: 'Equity Market',
            category: RiskCategory.MARKET,
            currentValue: 0.10,
            volatility: 0.15,
            distribution: DistributionType.NORMAL
          },
          {
            id: 'volatility',
            name: 'Market Volatility (VIX)',
            category: RiskCategory.MARKET,
            currentValue: 20,
            volatility: 8,
            distribution: DistributionType.LOGNORMAL,
            min: 10,
            max: 80
          },
          {
            id: 'interest_rates',
            name: 'Interest Rates',
            category: RiskCategory.MARKET,
            currentValue: 0.03,
            volatility: 0.005,
            distribution: DistributionType.NORMAL
          }
        ],
        parameters: {
          iterations: 1000,
          confidenceLevel: 0.95,
          timeHorizon: 1,
          includeVaR: true,
          includeSensitivity: true,
          includeStress: true
        }
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.simulationId).toBe('risk-test-1');
      expect(result.status).toBe('completed');

      // Check Monte Carlo results
      expect(result.monteCarlo).toBeDefined();
      expect(result.monteCarlo.length).toBeGreaterThan(0);

      // Check VaR results
      expect(result.varResults).toBeDefined();
      expect(result.varResults.length).toBeGreaterThan(0);

      // Check sensitivity analysis
      expect(result.sensitivityAnalysis).toBeDefined();
      expect(result.sensitivityAnalysis.length).toBeGreaterThan(0);

      // Check stress tests
      expect(result.stressTests).toBeDefined();
      expect(result.stressTests.length).toBeGreaterThan(0);

      // Check mitigations
      expect(result.mitigations).toBeDefined();

      // Check metadata
      expect(result.executionTimeMs).toBeGreaterThan(0);
      expect(result.metadata.iterations).toBe(1000);
    });

    it('should handle default parameters', async () => {
      const request = {
        simulationId: 'risk-test-2',
        name: 'Simple Risk Analysis',
        positions: [
          {
            id: 'pos-1',
            name: 'Cash',
            type: 'cash' as const,
            value: 100000,
            exposure: 100000,
            riskFactors: []
          }
        ],
        riskFactors: []
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.metadata.iterations).toBe(10000); // Default
    });

    it('should use provided scenarios', async () => {
      const request = {
        simulationId: 'risk-test-3',
        name: 'Custom Scenario Analysis',
        positions: [
          {
            id: 'pos-1',
            name: 'Mixed Portfolio',
            type: 'equity' as const,
            value: 1000000,
            exposure: 1000000,
            riskFactors: [{ factorId: 'market', sensitivity: 1.0 }]
          }
        ],
        riskFactors: [
          {
            id: 'market',
            name: 'Market',
            category: RiskCategory.MARKET,
            currentValue: 0.08,
            volatility: 0.20,
            distribution: DistributionType.NORMAL
          }
        ],
        scenarios: [
          {
            id: 'custom-1',
            name: 'Custom Crisis',
            probability: 0.1,
            description: 'Custom crisis scenario',
            factorChanges: new Map([['market', -0.30]]),
            duration: 30,
            recoveryTime: 180
          }
        ],
        parameters: {
          iterations: 500,
          includeStress: true
        }
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.scenarioAnalysis.has('custom-1')).toBe(true);
    });
  });

  describe('get', () => {
    it('should retrieve existing simulation', async () => {
      const request = {
        simulationId: 'risk-test-4',
        name: 'Test Simulation',
        positions: [
          {
            id: 'pos-1',
            name: 'Stocks',
            type: 'equity' as const,
            value: 500000,
            exposure: 500000,
            riskFactors: [{ factorId: 'market', sensitivity: 1.0 }]
          }
        ],
        riskFactors: [
          {
            id: 'market',
            name: 'Market',
            category: RiskCategory.MARKET,
            currentValue: 0.10,
            volatility: 0.15,
            distribution: DistributionType.NORMAL
          }
        ]
      };

      const created = await engine.run(request);
      const retrieved = engine.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent simulation', () => {
      const result = engine.get('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should return all simulations', async () => {
      for (let i = 0; i < 3; i++) {
        await engine.run({
          simulationId: `risk-${i}`,
          name: `Simulation ${i}`,
          positions: [
            {
              id: `pos-${i}`,
              name: `Position ${i}`,
              type: 'cash' as const,
              value: 100000,
              exposure: 100000,
              riskFactors: []
            }
          ],
          riskFactors: []
        });
      }

      const simulations = engine.list();
      expect(simulations.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getVaR', () => {
    it('should return VaR results', async () => {
      const request = {
        simulationId: 'risk-var-test',
        name: 'VaR Test',
        positions: [
          {
            id: 'pos-1',
            name: 'Portfolio',
            type: 'equity' as const,
            value: 1000000,
            exposure: 1000000,
            riskFactors: [{ factorId: 'market', sensitivity: 1.0 }]
          }
        ],
        riskFactors: [
          {
            id: 'market',
            name: 'Market',
            category: RiskCategory.MARKET,
            currentValue: 0.10,
            volatility: 0.15,
            distribution: DistributionType.NORMAL
          }
        ],
        parameters: {
          iterations: 500,
          includeVaR: true
        }
      };

      const created = await engine.run(request);
      const varResults = engine.getVaR(created.id);

      expect(varResults).toBeDefined();
      expect(varResults!.length).toBeGreaterThan(0);
    });
  });
});

describe('MonteCarloRiskEngine', () => {
  describe('runSimulation', () => {
    it('should run Monte Carlo simulation', () => {
      const positions = [
        {
          id: 'pos-1',
          name: 'Stocks',
          type: 'equity' as const,
          value: 100000,
          exposure: 100000,
          riskFactors: [{ factorId: 'market', sensitivity: 1.0 }]
        }
      ];

      const riskFactors = [
        {
          id: 'market',
          name: 'Market Return',
          category: RiskCategory.MARKET,
          currentValue: 0.10,
          volatility: 0.15,
          distribution: DistributionType.NORMAL
        }
      ];

      const results = MonteCarloRiskEngine.runSimulation(positions, riskFactors, 100, 42);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      // Check portfolio result
      const portfolioResult = results.find(r => r.metric === 'Portfolio Value');
      expect(portfolioResult).toBeDefined();
      expect(portfolioResult!.iterations).toBe(100);
      expect(portfolioResult!.mean).toBeDefined();
      expect(portfolioResult!.stdDev).toBeDefined();
      expect(portfolioResult!.percentile5).toBeLessThan(portfolioResult!.percentile95);
    });

    it('should calculate correct statistics', () => {
      const positions = [
        {
          id: 'pos-1',
          name: 'Bond',
          type: 'bond' as const,
          value: 100000,
          exposure: 100000,
          riskFactors: [{ factorId: 'rate', sensitivity: -1.0 }]
        }
      ];

      const riskFactors = [
        {
          id: 'rate',
          name: 'Interest Rate',
          category: RiskCategory.MARKET,
          currentValue: 0.03,
          volatility: 0.01,
          distribution: DistributionType.NORMAL
        }
      ];

      const results = MonteCarloRiskEngine.runSimulation(positions, riskFactors, 1000, 42);
      const result = results[0];

      expect(result.mean).toBeDefined();
      expect(result.median).toBeDefined();
      expect(result.stdDev).toBeDefined();
      expect(result.min).toBeLessThan(result.max);
      expect(result.percentile5).toBeLessThan(result.percentile95);
    });

    it('should generate distribution histogram', () => {
      const positions = [
        {
          id: 'pos-1',
          name: 'Stocks',
          type: 'equity' as const,
          value: 100000,
          exposure: 100000,
          riskFactors: [{ factorId: 'market', sensitivity: 1.0 }]
        }
      ];

      const riskFactors = [
        {
          id: 'market',
          name: 'Market',
          category: RiskCategory.MARKET,
          currentValue: 0.08,
          volatility: 0.20,
          distribution: DistributionType.NORMAL
        }
      ];

      const results = MonteCarloRiskEngine.runSimulation(positions, riskFactors, 500, 42);
      const result = results.find(r => r.metric === 'Portfolio Value')!;

      expect(result.distribution).toBeDefined();
      expect(result.distribution.length).toBe(20);
      expect(result.distribution[0].value).toBeLessThan(result.distribution[result.distribution.length - 1].value);

      const totalFreq = result.distribution.reduce((sum, d) => sum + d.frequency, 0);
      expect(totalFreq).toBeCloseTo(1, 1);
    });
  });
});

describe('VaREngine', () => {
  describe('calculateVaR', () => {
    it('should calculate Value at Risk', () => {
      const positions = [
        {
          id: 'pos-1',
          name: 'Portfolio',
          type: 'equity' as const,
          value: 1000000,
          exposure: 1000000,
          riskFactors: [{ factorId: 'market', sensitivity: 1.0 }]
        }
      ];

      const riskFactors = [
        {
          id: 'market',
          name: 'Market',
          category: RiskCategory.MARKET,
          currentValue: 0.10,
          volatility: 0.15,
          distribution: DistributionType.NORMAL
        }
      ];

      const varResult = VaREngine.calculateVaR({
        confidenceLevel: 0.95,
        timeHorizon: 1,
        method: 'monte_carlo',
        portfolio: positions,
        riskFactors
      });

      expect(varResult).toBeDefined();
      expect(varResult.var).toBeGreaterThan(0);
      expect(varResult.cvar).toBeGreaterThanOrEqual(varResult.var);
      expect(varResult.confidenceLevel).toBe(0.95);
    });

    it('should handle different confidence levels', () => {
      const positions = [
        {
          id: 'pos-1',
          name: 'Portfolio',
          type: 'equity' as const,
          value: 1000000,
          exposure: 1000000,
          riskFactors: [{ factorId: 'market', sensitivity: 1.0 }]
        }
      ];

      const riskFactors = [
        {
          id: 'market',
          name: 'Market',
          category: RiskCategory.MARKET,
          currentValue: 0.10,
          volatility: 0.15,
          distribution: DistributionType.NORMAL
        }
      ];

      const var99 = VaREngine.calculateVaR({
        confidenceLevel: 0.99,
        timeHorizon: 1,
        method: 'monte_carlo',
        portfolio: positions,
        riskFactors
      });

      const var95 = VaREngine.calculateVaR({
        confidenceLevel: 0.95,
        timeHorizon: 1,
        method: 'monte_carlo',
        portfolio: positions,
        riskFactors
      });

      expect(var99.var).toBeGreaterThan(var95.var);
    });
  });

  describe('calculateMultipleVaR', () => {
    it('should calculate VaR for multiple confidence levels', () => {
      const positions = [
        {
          id: 'pos-1',
          name: 'Portfolio',
          type: 'equity' as const,
          value: 1000000,
          exposure: 1000000,
          riskFactors: [{ factorId: 'market', sensitivity: 1.0 }]
        }
      ];

      const riskFactors = [
        {
          id: 'market',
          name: 'Market',
          category: RiskCategory.MARKET,
          currentValue: 0.10,
          volatility: 0.15,
          distribution: DistributionType.NORMAL
        }
      ];

      const results = VaREngine.calculateMultipleVaR(positions, riskFactors, 1);

      expect(results).toBeDefined();
      expect(results.length).toBe(4);
      expect(results.map(r => r.confidenceLevel)).toEqual([0.90, 0.95, 0.99, 0.999]);
    });
  });
});

describe('SensitivityAnalysisEngine', () => {
  describe('analyze', () => {
    it('should perform sensitivity analysis', () => {
      const positions = [
        {
          id: 'pos-1',
          name: 'Tech Stocks',
          type: 'equity' as const,
          value: 500000,
          exposure: 500000,
          riskFactors: [
            { factorId: 'equity_market', sensitivity: 1.0 },
            { factorId: 'volatility', sensitivity: -0.3 }
          ]
        },
        {
          id: 'pos-2',
          name: 'Bonds',
          type: 'bond' as const,
          value: 500000,
          exposure: 500000,
          riskFactors: [
            { factorId: 'interest_rates', sensitivity: -1.0 }
          ]
        }
      ];

      const riskFactors = [
        {
          id: 'equity_market',
          name: 'Equity Market',
          category: RiskCategory.MARKET,
          currentValue: 0.10,
          volatility: 0.15,
          distribution: DistributionType.NORMAL
        },
        {
          id: 'volatility',
          name: 'Volatility',
          category: RiskCategory.MARKET,
          currentValue: 20,
          volatility: 8,
          distribution: DistributionType.LOGNORMAL
        },
        {
          id: 'interest_rates',
          name: 'Interest Rates',
          category: RiskCategory.MARKET,
          currentValue: 0.03,
          volatility: 0.005,
          distribution: DistributionType.NORMAL
        }
      ];

      const results = SensitivityAnalysisEngine.analyze(positions, riskFactors, 100);

      expect(results).toBeDefined();
      expect(results.length).toBe(3);
      expect(results[0].factorName).toBeDefined();
      expect(results[0].contribution).toBeGreaterThan(0);
      expect(results[0].tornado).toBeDefined();
    });

    it('should calculate tornado data points', () => {
      const positions = [
        {
          id: 'pos-1',
          name: 'Portfolio',
          type: 'equity' as const,
          value: 1000000,
          exposure: 1000000,
          riskFactors: [{ factorId: 'market', sensitivity: 1.0 }]
        }
      ];

      const riskFactors = [
        {
          id: 'market',
          name: 'Market',
          category: RiskCategory.MARKET,
          currentValue: 0.10,
          volatility: 0.15,
          distribution: DistributionType.NORMAL
        }
      ];

      const results = SensitivityAnalysisEngine.analyze(positions, riskFactors, 100);

      expect(results[0].tornado.low).toBeLessThan(results[0].tornado.base);
      expect(results[0].tornado.high).toBeGreaterThan(results[0].tornado.base);
    });
  });
});

describe('StressTestingEngine', () => {
  describe('generateStandardScenarios', () => {
    it('should generate standard stress test scenarios', () => {
      const scenarios = StressTestingEngine.generateStandardScenarios();

      expect(scenarios).toBeDefined();
      expect(scenarios.length).toBeGreaterThan(0);

      for (const scenario of scenarios) {
        expect(scenario.id).toBeDefined();
        expect(scenario.name).toBeDefined();
        expect(scenario.probability).toBeGreaterThan(0);
        expect(scenario.probability).toBeLessThan(1);
        expect(scenario.factorChanges.size).toBeGreaterThan(0);
        expect(scenario.duration).toBeGreaterThan(0);
      }
    });
  });

  describe('runStressTests', () => {
    it('should run stress tests on scenarios', () => {
      const positions = [
        {
          id: 'pos-1',
          name: 'Portfolio',
          type: 'equity' as const,
          value: 1000000,
          exposure: 1000000,
          riskFactors: [{ factorId: 'market', sensitivity: 1.0 }]
        }
      ];

      const riskFactors = [
        {
          id: 'market',
          name: 'Market',
          category: RiskCategory.MARKET,
          currentValue: 0.10,
          volatility: 0.15,
          distribution: DistributionType.NORMAL
        }
      ];

      const scenarios = StressTestingEngine.generateStandardScenarios();
      const results = StressTestingEngine.runStressTests(scenarios, positions, riskFactors);

      expect(results).toBeDefined();
      expect(results.length).toBe(scenarios.length);

      for (const result of results) {
        expect(result.scenarioId).toBeDefined();
        expect(result.impact).toBeDefined();
        expect(result.survivability).toBeDefined();
        expect(result.survivability.canRecover).toBeDefined();
      }
    });
  });
});

describe('RiskMitigationEngine', () => {
  describe('generateRecommendations', () => {
    it('should generate risk mitigation recommendations', () => {
      const mockResult = {
        id: 'test-id',
        simulationId: 'test-sim',
        name: 'Test',
        status: 'completed' as const,
        createdAt: new Date(),
        executionTimeMs: 100,
        monteCarlo: [{
          metric: 'Portfolio',
          iterations: 1000,
          mean: 0.08,
          median: 0.07,
          stdDev: 0.15,
          min: -0.3,
          max: 0.5,
          skewness: 0,
          kurtosis: 0,
          percentile5: -0.2,
          percentile10: -0.15,
          percentile25: -0.05,
          percentile50: 0.08,
          percentile75: 0.18,
          percentile90: 0.28,
          percentile95: 0.35,
          percentile99: 0.45,
          confidenceInterval: [-0.2, 0.35] as [number, number],
          distribution: [],
          normalFit: { mu: 0.08, sigma: 0.15, andersonDarling: 1, isNormal: true }
        }],
        aggregateMetrics: {
          var: {
            var: 150000,
            cvar: 180000,
            confidenceLevel: 0.95,
            timeHorizon: 1,
            distribution: [],
            percentile5: 0,
            percentile95: 0,
            worstCase: 0,
            bestCase: 0
          },
          expectedReturn: 0.08,
          volatility: 0.15,
          maxDrawdown: { value: 200000, percentage: 20, duration: 30 }
        },
        varResults: [{
          var: 150000,
          cvar: 180000,
          confidenceLevel: 0.95,
          timeHorizon: 1,
          distribution: [],
          percentile5: 0,
          percentile95: 0,
          worstCase: 0,
          bestCase: 0
        }],
        sensitivityAnalysis: [{
          factorId: 'market',
          factorName: 'Market Risk',
          baseValue: 0.10,
          impact: { valueChange: 100000, percentageChange: 10 },
          tornado: { low: 900000, base: 1000000, high: 1100000 },
          contribution: 25
        }],
        scenarioAnalysis: new Map(),
        stressTests: [{
          scenarioId: 'crisis',
          scenarioName: 'Market Crisis',
          impact: { portfolioValue: 600000, dollarChange: -400000, percentageChange: -40 },
          recoveryTime: 180,
          cascadingRisks: [],
          survivability: { canRecover: true, timeToRecovery: 180, capitalNeeded: 0 }
        }],
        mitigations: [],
        metadata: {
          iterations: 1000,
          confidenceLevel: 0.95,
          timeHorizon: 1,
          positionsAnalyzed: 1,
          riskFactors: 1
        }
      };

      const recommendations = RiskMitigationEngine.generateRecommendations(mockResult);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);

      for (const rec of recommendations) {
        expect(rec.id).toBeDefined();
        expect(rec.category).toBeDefined();
        expect(rec.severity).toBeDefined();
        expect(rec.recommendation).toBeDefined();
        expect(rec.expectedImpact).toBeDefined();
        expect(rec.priority).toBeDefined();
      }
    });
  });
});
