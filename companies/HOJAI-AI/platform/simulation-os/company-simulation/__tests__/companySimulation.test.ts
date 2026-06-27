import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CompanySimulationEngine,
  MonteCarloRunner,
  SeededRandom,
  HiringPlanCalculator,
  OrgRestructureCalculator,
  ProcessChangeCalculator,
  TechAdoptionCalculator,
  RiskAssessmentEngine,
  RecommendationGenerator,
  TimelineProjectionEngine
} from '../engine/companySimulationEngine.js';
import {
  SimulationType,
  DepartmentType,
  RoleLevel,
  OrgStructureType,
  ImpactLevel
} from '../models/companySimulation.js';

// ============================================================================
// Company Simulation Tests
// ============================================================================

describe('CompanySimulationEngine', () => {
  let engine: CompanySimulationEngine;

  beforeEach(() => {
    engine = new CompanySimulationEngine();
  });

  describe('run', () => {
    it('should run hiring plan simulation successfully', async () => {
      const request = {
        companyId: 'test-company-1',
        scenario: {
          type: SimulationType.HIRING_PLAN,
          hires: [
            {
              department: DepartmentType.ENGINEERING,
              roleLevel: RoleLevel.SENIOR,
              count: 5,
              avgSalary: 150000,
              productivityGain: 20,
              rampUpTime: 3
            },
            {
              department: DepartmentType.SALES,
              roleLevel: RoleLevel.MID,
              count: 3,
              avgSalary: 80000,
              productivityGain: 15,
              rampUpTime: 2
            }
          ],
          timeline: 12,
          benefits: {
            revenueIncrease: 500000,
            costReduction: 100000,
            timeToProductivity: 6
          }
        },
        baseline: {
          employees: [],
          departments: [],
          currentRevenue: 10000000,
          currentCosts: 8000000
        },
        parameters: {
          iterations: 100,
          confidenceLevel: 0.95,
          timeHorizon: 12
        }
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.companyId).toBe('test-company-1');
      expect(result.scenarioType).toBe(SimulationType.HIRING_PLAN);
      expect(result.status).toBe('completed');
      expect(result.financial).toBeDefined();
      expect(result.financial.profit).toBeDefined();
      expect(result.operational).toBeDefined();
      expect(result.risks).toBeDefined();
      expect(result.monteCarlo).toHaveLength(1);
      expect(result.timeline).toHaveLength(12);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.metadata.executionTimeMs).toBeGreaterThan(0);
      expect(result.metadata.iterations).toBe(100);
    });

    it('should run org restructure simulation successfully', async () => {
      const request = {
        companyId: 'test-company-2',
        scenario: {
          type: SimulationType.ORG_RESTUCTURE,
          targetStructure: OrgStructureType.FLAT,
          departmentsAffected: [DepartmentType.ENGINEERING, DepartmentType.SALES],
          layoffs: 10,
          newRoles: [
            {
              department: DepartmentType.ENGINEERING,
              roleLevel: RoleLevel.LEAD,
              count: 2,
              avgSalary: 180000
            }
          ],
          consolidation: [
            {
              from: DepartmentType.MARKETING,
              to: DepartmentType.SALES
            }
          ],
          timeline: 6
        },
        baseline: {
          employees: [],
          departments: [],
          currentRevenue: 5000000,
          currentCosts: 4000000
        },
        parameters: {
          iterations: 100,
          confidenceLevel: 0.95,
          timeHorizon: 12
        }
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.scenarioType).toBe(SimulationType.ORG_RESTUCTURE);
      expect(result.status).toBe('completed');
      expect(result.operational.employeeImpact.displaced).toBe(10);
      expect(result.operational.employeeImpact.newHires).toBe(2);
    });

    it('should run process change simulation successfully', async () => {
      const request = {
        companyId: 'test-company-3',
        scenario: {
          type: SimulationType.PROCESS_CHANGE,
          processName: 'Order Processing',
          department: DepartmentType.OPERATIONS,
          currentEfficiency: 60,
          targetEfficiency: 85,
          implementationCost: 50000,
          trainingCost: 15000,
          affectedEmployees: 20,
          expectedBenefits: {
            timeSavings: 10, // hours per week
            errorReduction: 40, // percentage
            costSavings: 80000 // annual
          },
          timeline: 6
        },
        baseline: {
          employees: [],
          departments: [],
          currentRevenue: 2000000,
          currentCosts: 1500000
        },
        parameters: {
          iterations: 100,
          confidenceLevel: 0.95,
          timeHorizon: 12
        }
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.scenarioType).toBe(SimulationType.PROCESS_CHANGE);
      expect(result.status).toBe('completed');
      expect(result.operational.efficiency.projected).toBeGreaterThan(
        result.operational.efficiency.baseline
      );
    });

    it('should run tech adoption simulation successfully', async () => {
      const request = {
        companyId: 'test-company-4',
        scenario: {
          type: SimulationType.TECH_ADOPTION,
          technology: 'AI-Powered CRM',
          category: 'ai_ml' as const,
          implementationCost: 200000,
          annualMaintenanceCost: 30000,
          productivityGain: 25,
          replacementFactor: 2,
          departments: [DepartmentType.SALES, DepartmentType.CUSTOMER_SUCCESS],
          adoptionRate: 80,
          timeline: 8
        },
        baseline: {
          employees: [],
          departments: [],
          currentRevenue: 8000000,
          currentCosts: 6000000
        },
        parameters: {
          iterations: 100,
          confidenceLevel: 0.95,
          timeHorizon: 12
        }
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.scenarioType).toBe(SimulationType.TECH_ADOPTION);
      expect(result.status).toBe('completed');
      expect(result.monteCarlo).toHaveLength(1);
      expect(result.monteCarlo[0].iterations).toBe(100);
    });

    it('should handle default parameters', async () => {
      const request = {
        companyId: 'test-company-5',
        scenario: {
          type: SimulationType.HIRING_PLAN,
          hires: [
            {
              department: DepartmentType.ENGINEERING,
              roleLevel: RoleLevel.SENIOR,
              count: 2,
              avgSalary: 150000,
              productivityGain: 10,
              rampUpTime: 3
            }
          ],
          timeline: 12
        },
        baseline: {
          employees: [],
          departments: [],
          currentRevenue: 1000000,
          currentCosts: 800000
        }
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.metadata.iterations).toBe(1000); // Default value
      expect(result.timeline).toHaveLength(12); // Default time horizon
    });
  });

  describe('get', () => {
    it('should retrieve existing simulation', async () => {
      const request = {
        companyId: 'test-company-6',
        scenario: {
          type: SimulationType.HIRING_PLAN,
          hires: [
            {
              department: DepartmentType.ENGINEERING,
              roleLevel: RoleLevel.MID,
              count: 1,
              avgSalary: 100000,
              productivityGain: 10,
              rampUpTime: 2
            }
          ],
          timeline: 6
        },
        baseline: {
          employees: [],
          departments: [],
          currentRevenue: 1000000,
          currentCosts: 800000
        }
      };

      const created = await engine.run(request);
      const retrieved = engine.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.companyId).toBe(created.companyId);
    });

    it('should return undefined for non-existent simulation', () => {
      const result = engine.get('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should return all simulations', async () => {
      // Create multiple simulations
      for (let i = 0; i < 3; i++) {
        await engine.run({
          companyId: `company-${i}`,
          scenario: {
            type: SimulationType.HIRING_PLAN,
            hires: [
              {
                department: DepartmentType.ENGINEERING,
                roleLevel: RoleLevel.SENIOR,
                count: 1,
                avgSalary: 100000,
                productivityGain: 10,
                rampUpTime: 2
              }
            ],
            timeline: 6
          },
          baseline: {
            employees: [],
            departments: [],
            currentRevenue: 1000000,
            currentCosts: 800000
          }
        });
      }

      const simulations = engine.list();
      expect(simulations.length).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('SeededRandom', () => {
  describe('next', () => {
    it('should generate random numbers between 0 and 1', () => {
      const rng = new SeededRandom(12345);
      for (let i = 0; i < 100; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should produce consistent results with same seed', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });
  });

  describe('nextInt', () => {
    it('should generate integers within range', () => {
      const rng = new SeededRandom(12345);
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(5, 10);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThanOrEqual(10);
        expect(Number.isInteger(value)).toBe(true);
      }
    });
  });

  describe('nextGaussian', () => {
    it('should approximate normal distribution', () => {
      const rng = new SeededRandom(12345);
      const samples: number[] = [];

      for (let i = 0; i < 10000; i++) {
        samples.push(rng.nextGaussian(0, 1));
      }

      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      const variance = samples.reduce((sum, x) => sum + (x - mean) ** 2, 0) / samples.length;

      expect(Math.abs(mean)).toBeLessThan(0.1);
      expect(Math.abs(variance - 1)).toBeLessThan(0.1);
    });
  });

  describe('nextUniform', () => {
    it('should generate values within range', () => {
      const rng = new SeededRandom(12345);
      for (let i = 0; i < 100; i++) {
        const value = rng.nextUniform(10, 20);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThan(20);
      }
    });
  });

  describe('choice', () => {
    it('should return elements from array', () => {
      const rng = new SeededRandom(12345);
      const array = [1, 2, 3, 4, 5];

      for (let i = 0; i < 100; i++) {
        const value = rng.choice(array);
        expect(array).toContain(value);
      }
    });
  });

  describe('shuffle', () => {
    it('should return array with same elements', () => {
      const rng = new SeededRandom(12345);
      const array = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle(array);

      expect(shuffled).toHaveLength(array.length);
      expect([...shuffled].sort()).toEqual([...array].sort());
    });

    it('should not modify original array', () => {
      const rng = new SeededRandom(12345);
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      rng.shuffle(original);

      expect(original).toEqual(copy);
    });
  });
});

describe('MonteCarloRunner', () => {
  describe('run', () => {
    it('should run simulation with correct iterations', () => {
      const result = MonteCarloRunner.run(1000, (rng) => rng.next());

      expect(result.iterations).toBe(1000);
      expect(result.mean).toBeGreaterThan(0.4);
      expect(result.mean).toBeLessThan(0.6);
    });

    it('should calculate correct statistics', () => {
      const result = MonteCarloRunner.run(1000, (rng) => rng.nextGaussian(100, 10));

      expect(result.mean).toBeGreaterThan(90);
      expect(result.mean).toBeLessThan(110);
      expect(result.stdDev).toBeGreaterThan(5);
      expect(result.stdDev).toBeLessThan(15);
      expect(result.min).toBeLessThan(result.mean);
      expect(result.max).toBeGreaterThan(result.mean);
    });

    it('should calculate percentiles correctly', () => {
      const result = MonteCarloRunner.run(1000, (rng) => rng.next());

      expect(result.percentile5).toBeLessThan(result.percentile25);
      expect(result.percentile25).toBeLessThan(result.median);
      expect(result.median).toBeLessThan(result.percentile75);
      expect(result.percentile75).toBeLessThan(result.percentile95);
    });

    it('should generate distribution histogram', () => {
      const result = MonteCarloRunner.run(1000, (rng) => rng.next());

      expect(result.distribution).toBeDefined();
      expect(result.distribution.length).toBe(10);
      expect(result.distribution[0].value).toBeLessThan(result.distribution[9].value);
      const totalFreq = result.distribution.reduce((sum, d) => sum + d.frequency, 0);
      expect(totalFreq).toBeCloseTo(1, 1);
    });

    it('should calculate confidence interval', () => {
      const result = MonteCarloRunner.run(1000, (rng) => rng.nextGaussian(100, 15));

      expect(result.confidenceInterval).toBeDefined();
      expect(result.confidenceInterval[0]).toBeLessThan(result.mean);
      expect(result.confidenceInterval[1]).toBeGreaterThan(result.mean);
    });

    it('should be reproducible with seed', () => {
      const result1 = MonteCarloRunner.run(100, (rng) => rng.next(), 42);
      const result2 = MonteCarloRunner.run(100, (rng) => rng.next(), 42);

      expect(result1.mean).toBe(result2.mean);
      expect(result1.stdDev).toBe(result2.stdDev);
    });
  });

  describe('sensitivityAnalysis', () => {
    it('should analyze multiple factors', () => {
      const factors = [
        { name: 'growth', impact: 0.1, uncertainty: 0.2 },
        { name: 'cost', impact: -0.05, uncertainty: 0.1 }
      ];

      const results = MonteCarloRunner.sensitivityAnalysis(1000, factors, 100, 42);

      expect(results.size).toBe(2);
      expect(results.has('growth')).toBe(true);
      expect(results.has('cost')).toBe(true);

      const growthResult = results.get('growth')!;
      expect(growthResult.iterations).toBe(100);
      expect(growthResult.mean).toBeGreaterThan(1000);
    });
  });
});

describe('HiringPlanCalculator', () => {
  describe('calculateROI', () => {
    it('should calculate positive ROI for productive hires', () => {
      const scenario = {
        type: SimulationType.HIRING_PLAN,
        hires: [
          {
            department: DepartmentType.ENGINEERING,
            roleLevel: RoleLevel.SENIOR,
            count: 5,
            avgSalary: 150000,
            productivityGain: 30,
            rampUpTime: 3
          }
        ],
        timeline: 12
      };

      const result = HiringPlanCalculator.calculateROI(
        scenario,
        10000000,
        8000000,
        100
      );

      expect(result).toBeDefined();
      expect(result.mean).toBeDefined();
      expect(!isNaN(result.mean)).toBe(true);
    });

    it('should handle empty hires array', () => {
      const scenario = {
        type: SimulationType.HIRING_PLAN,
        hires: [],
        timeline: 12
      };

      const result = HiringPlanCalculator.calculateROI(
        scenario,
        10000000,
        8000000,
        100
      );

      expect(result).toBeDefined();
      expect(result.mean).toBe(0);
    });
  });

  describe('calculateBreakEven', () => {
    it('should calculate break-even time', () => {
      const scenario = {
        type: SimulationType.HIRING_PLAN,
        hires: [
          {
            department: DepartmentType.ENGINEERING,
            roleLevel: RoleLevel.SENIOR,
            count: 5,
            avgSalary: 150000,
            productivityGain: 30,
            rampUpTime: 3
          }
        ],
        timeline: 12
      };

      const breakEven = HiringPlanCalculator.calculateBreakEven(
        scenario,
        10000000,
        8000000
      );

      expect(breakEven).toBeGreaterThan(0);
      expect(breakEven).toBeLessThan(100);
    });

    it('should return infinity for negative net benefit', () => {
      const scenario = {
        type: SimulationType.HIRING_PLAN,
        hires: [
          {
            department: DepartmentType.ENGINEERING,
            roleLevel: RoleLevel.SENIOR,
            count: 10,
            avgSalary: 200000,
            productivityGain: 5,
            rampUpTime: 6
          }
        ],
        timeline: 12
      };

      const breakEven = HiringPlanCalculator.calculateBreakEven(
        scenario,
        1000000,
        900000
      );

      expect(breakEven).toBe(Infinity);
    });
  });
});

describe('OrgRestructureCalculator', () => {
  describe('calculateImpact', () => {
    it('should calculate impact for restructure with layoffs', () => {
      const scenario = {
        type: SimulationType.ORG_RESTUCTURE,
        targetStructure: OrgStructureType.FLAT,
        departmentsAffected: [DepartmentType.ENGINEERING],
        layoffs: 20,
        timeline: 6
      };

      const result = OrgRestructureCalculator.calculateImpact(
        scenario,
        8000000,
        10000000,
        100,
        100
      );

      expect(result).toBeDefined();
      expect(result.mean).toBeDefined();
    });

    it('should include new roles cost impact', () => {
      const scenario = {
        type: SimulationType.ORG_RESTUCTURE,
        targetStructure: OrgStructureType.MATRIX,
        departmentsAffected: [DepartmentType.ENGINEERING, DepartmentType.SALES],
        layoffs: 5,
        newRoles: [
          {
            department: DepartmentType.ENGINEERING,
            roleLevel: RoleLevel.MANAGER,
            count: 2,
            avgSalary: 200000
          }
        ],
        timeline: 8
      };

      const result = OrgRestructureCalculator.calculateImpact(
        scenario,
        8000000,
        10000000,
        50,
        100
      );

      expect(result).toBeDefined();
    });
  });
});

describe('ProcessChangeCalculator', () => {
  describe('calculateImpact', () => {
    it('should calculate ROI for process improvement', () => {
      const scenario = {
        type: SimulationType.PROCESS_CHANGE,
        processName: 'Order Fulfillment',
        department: DepartmentType.OPERATIONS,
        currentEfficiency: 50,
        targetEfficiency: 80,
        implementationCost: 100000,
        trainingCost: 20000,
        affectedEmployees: 30,
        expectedBenefits: {
          timeSavings: 15,
          errorReduction: 30,
          costSavings: 150000
        },
        timeline: 6
      };

      const result = ProcessChangeCalculator.calculateImpact(
        scenario,
        5000000,
        100
      );

      expect(result).toBeDefined();
      expect(result.mean).toBeDefined();
    });
  });
});

describe('TechAdoptionCalculator', () => {
  describe('calculateImpact', () => {
    it('should calculate ROI for AI implementation', () => {
      const scenario = {
        type: SimulationType.TECH_ADOPTION,
        technology: 'AI Automation Platform',
        category: 'ai_ml' as const,
        implementationCost: 500000,
        annualMaintenanceCost: 50000,
        productivityGain: 20,
        replacementFactor: 3,
        departments: [DepartmentType.OPERATIONS],
        adoptionRate: 85,
        timeline: 12
      };

      const result = TechAdoptionCalculator.calculateImpact(
        scenario,
        8000000,
        12000000,
        100
      );

      expect(result).toBeDefined();
      expect(result.mean).toBeDefined();
    });
  });
});

describe('RiskAssessmentEngine', () => {
  describe('assess', () => {
    it('should identify high cost risks', () => {
      const scenario = {
        type: SimulationType.HIRING_PLAN,
        hires: [
          {
            department: DepartmentType.ENGINEERING,
            roleLevel: RoleLevel.SENIOR,
            count: 50,
            avgSalary: 200000,
            productivityGain: 10,
            rampUpTime: 6
          }
        ],
        timeline: 12
      };

      const financialImpact = {
        revenue: {
          baseline: 10000000,
          projected: 11000000,
          change: 1000000,
          changePercent: 10,
          confidenceInterval: [10500000, 11500000] as [number, number]
        },
        costs: {
          baseline: 8000000,
          projected: 12000000,
          change: 4000000,
          changePercent: 50,
          confidenceInterval: [11500000, 12500000] as [number, number]
        },
        profit: {
          baseline: 2000000,
          projected: -1000000,
          change: -3000000,
          changePercent: -150
        },
        breakEven: 24
      };

      const risks = RiskAssessmentEngine.assess(scenario, financialImpact);

      expect(risks).toBeDefined();
      expect(risks.risks.length).toBeGreaterThan(0);
      expect(risks.overallRiskScore).toBeGreaterThan(0);
      expect(risks.riskLevel).not.toBe(ImpactLevel.MINIMAL);
    });

    it('should assess tech adoption risks', () => {
      const scenario = {
        type: SimulationType.TECH_ADOPTION,
        technology: 'ERP System',
        category: 'automation' as const,
        implementationCost: 1000000,
        annualMaintenanceCost: 100000,
        productivityGain: 15,
        replacementFactor: 5,
        departments: [DepartmentType.ENGINEERING, DepartmentType.SALES],
        adoptionRate: 60,
        timeline: 18
      };

      const financialImpact = {
        revenue: {
          baseline: 10000000,
          projected: 11000000,
          change: 1000000,
          changePercent: 10,
          confidenceInterval: [10500000, 11500000] as [number, number]
        },
        costs: {
          baseline: 8000000,
          projected: 9000000,
          change: 1000000,
          changePercent: 12.5,
          confidenceInterval: [8500000, 9500000] as [number, number]
        },
        profit: {
          baseline: 2000000,
          projected: 2000000,
          change: 0,
          changePercent: 0
        },
        breakEven: 18
      };

      const risks = RiskAssessmentEngine.assess(scenario, financialImpact);

      expect(risks).toBeDefined();
      expect(risks.risks.some(r => r.category === 'Technical')).toBe(true);
      expect(risks.risks.some(r => r.category === 'Adoption')).toBe(true);
    });
  });
});

describe('TimelineProjectionEngine', () => {
  describe('project', () => {
    it('should generate monthly projections', () => {
      const scenario = {
        type: SimulationType.HIRING_PLAN,
        hires: [
          {
            department: DepartmentType.ENGINEERING,
            roleLevel: RoleLevel.SENIOR,
            count: 10,
            avgSalary: 150000,
            productivityGain: 20,
            rampUpTime: 3
          }
        ],
        timeline: 12
      };

      const baseline = {
        revenue: 10000000,
        costs: 8000000,
        employees: 100,
        efficiency: 70
      };

      const timeline = TimelineProjectionEngine.project(scenario, baseline, 12, 100);

      expect(timeline).toHaveLength(12);
      timeline.forEach((month, index) => {
        expect(month.month).toBe(index + 1);
        expect(month.revenue).toBeGreaterThan(0);
        expect(month.costs).toBeGreaterThan(0);
        expect(month.profit).toBe(month.revenue - month.costs);
        expect(month.headcount).toBeGreaterThanOrEqual(baseline.employees);
      });
    });

    it('should show progression from baseline to target', () => {
      const scenario = {
        type: SimulationType.PROCESS_CHANGE,
        processName: 'Customer Support',
        department: DepartmentType.CUSTOMER_SUCCESS,
        currentEfficiency: 50,
        targetEfficiency: 80,
        implementationCost: 50000,
        trainingCost: 10000,
        affectedEmployees: 20,
        expectedBenefits: {
          timeSavings: 5,
          errorReduction: 20,
          costSavings: 30000
        },
        timeline: 6
      };

      const baseline = {
        revenue: 5000000,
        costs: 4000000,
        employees: 50,
        efficiency: 50
      };

      const timeline = TimelineProjectionEngine.project(scenario, baseline, 6, 100);

      expect(timeline[0].efficiency).toBeLessThan(timeline[5].efficiency);
    });
  });
});

describe('RecommendationGenerator', () => {
  describe('generate', () => {
    it('should generate recommendations for positive ROI', () => {
      const scenario = {
        type: SimulationType.HIRING_PLAN,
        hires: [
          {
            department: DepartmentType.ENGINEERING,
            roleLevel: RoleLevel.SENIOR,
            count: 5,
            avgSalary: 150000,
            productivityGain: 30,
            rampUpTime: 3
          }
        ],
        timeline: 12
      };

      const financial = {
        revenue: {
          baseline: 10000000,
          projected: 12000000,
          change: 2000000,
          changePercent: 20,
          confidenceInterval: [11500000, 12500000] as [number, number]
        },
        costs: {
          baseline: 8000000,
          projected: 8500000,
          change: 500000,
          changePercent: 6.25,
          confidenceInterval: [8250000, 8750000] as [number, number]
        },
        profit: {
          baseline: 2000000,
          projected: 3500000,
          change: 1500000,
          changePercent: 75
        },
        breakEven: 8
      };

      const operational = {
        productivity: {
          baseline: 70,
          projected: 85,
          change: 15,
          changePercent: 21.4
        },
        efficiency: {
          baseline: 75,
          projected: 80,
          change: 5,
          changePercent: 6.67
        },
        employeeImpact: {
          affected: 5,
          displaced: 0,
          newHires: 5,
          retrained: 0
        },
        timeline: {
          implementation: 12,
          fullAdoption: 18,
          stabilization: 24
        }
      };

      const risks = {
        risks: [],
        overallRiskScore: 25,
        riskLevel: ImpactLevel.LOW
      };

      const recommendations = RecommendationGenerator.generate(
        scenario,
        financial,
        operational,
        risks
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.priority === 'high')).toBe(true);
    });

    it('should warn about negative ROI', () => {
      const scenario = {
        type: SimulationType.ORG_RESTUCTURE,
        targetStructure: OrgStructureType.FLAT,
        departmentsAffected: [DepartmentType.ENGINEERING],
        layoffs: 30,
        timeline: 6
      };

      const financial = {
        revenue: {
          baseline: 10000000,
          projected: 9500000,
          change: -500000,
          changePercent: -5,
          confidenceInterval: [9000000, 10000000] as [number, number]
        },
        costs: {
          baseline: 8000000,
          projected: 9500000,
          change: 1500000,
          changePercent: 18.75,
          confidenceInterval: [9000000, 10000000] as [number, number]
        },
        profit: {
          baseline: 2000000,
          projected: 0,
          change: -2000000,
          changePercent: -100
        },
        breakEven: Infinity
      };

      const operational = {
        productivity: {
          baseline: 70,
          projected: 65,
          change: -5,
          changePercent: -7.14
        },
        efficiency: {
          baseline: 75,
          projected: 70,
          change: -5,
          changePercent: -6.67
        },
        employeeImpact: {
          affected: 30,
          displaced: 30,
          newHires: 0,
          retrained: 0
        },
        timeline: {
          implementation: 6,
          fullAdoption: 9,
          stabilization: 12
        }
      };

      const risks = {
        risks: [
          {
            category: 'Financial',
            impact: ImpactLevel.CRITICAL,
            probability: 0.9,
            description: 'Significant cost increase',
            mitigation: ['Phase implementation', 'Secure funding']
          }
        ],
        overallRiskScore: 75,
        riskLevel: ImpactLevel.HIGH
      };

      const recommendations = RecommendationGenerator.generate(
        scenario,
        financial,
        operational,
        risks
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.some(r => r.priority === 'critical')).toBe(true);
    });
  });
});
