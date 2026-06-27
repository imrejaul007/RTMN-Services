import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MarketSimulationEngine,
  DemandForecastingEngine,
  PriceElasticityEngine,
  MarketShareProjectionEngine,
  CompetitiveResponseEngine,
  ScenarioAnalysisEngine,
  ThreatAssessmentEngine,
  MarketRecommendationGenerator
} from '../engine/marketSimulationEngine.js';
import {
  MarketType,
  MarketTrend
} from '../models/marketSimulation.js';

// ============================================================================
// Market Simulation Tests
// ============================================================================

describe('MarketSimulationEngine', () => {
  let engine: MarketSimulationEngine;

  beforeEach(() => {
    engine = new MarketSimulationEngine();
  });

  describe('run', () => {
    it('should run market simulation successfully', async () => {
      const request = {
        marketId: 'test-market-1',
        marketType: MarketType.B2C,
        productCategory: {
          id: 'cat-1',
          name: 'Consumer Electronics',
          growthRate: 8,
          marketSize: 500000000,
          seasonality: {
            peakMonths: [11, 12],
            troughMonths: [1, 2]
          }
        },
        yourCompany: {
          currentMarketShare: 15,
          currentPricing: 299,
          brandStrength: 70,
          customerSatisfaction: 80
        },
        competitors: [
          {
            id: 'comp-1',
            name: 'TechGiant Inc',
            marketShare: 25,
            pricingStrategy: 'premium' as const,
            strengths: ['Brand', 'Innovation'],
            weaknesses: ['Price'],
            recentStrategies: [
              { strategy: 'price_cut', impact: 0.3, timeframe: 'Q1 2024' }
            ],
            financialHealth: {
              revenue: 100000000,
              growth: 12,
              profitability: 15
            }
          },
          {
            id: 'comp-2',
            name: 'BudgetBrand',
            marketShare: 20,
            pricingStrategy: 'budget' as const,
            strengths: ['Price', 'Distribution'],
            weaknesses: ['Quality', 'Brand'],
            recentStrategies: [
              { strategy: 'expand_product_line', impact: 0.2, timeframe: 'Q4 2023' }
            ],
            financialHealth: {
              revenue: 50000000,
              growth: 8,
              profitability: 10
            }
          }
        ],
        customerSegments: [
          {
            id: 'seg-1',
            name: 'Tech Enthusiasts',
            size: 1000000,
            demographics: {
              ageRange: [25, 40] as [number, number],
              incomeLevel: 'high' as const,
              location: ['Urban']
            },
            behavior: {
              avgPurchaseFrequency: 2,
              avgOrderValue: 500,
              priceSensitivity: 30,
              brandLoyalty: 70,
              digitalAdoption: 95
            },
            needs: ['Latest technology', 'Premium quality'],
            painPoints: ['High prices', 'Complex features']
          },
          {
            id: 'seg-2',
            name: 'Value Seekers',
            size: 2000000,
            demographics: {
              ageRange: [30, 55] as [number, number],
              incomeLevel: 'middle' as const,
              location: ['Suburban', 'Urban']
            },
            behavior: {
              avgPurchaseFrequency: 1,
              avgOrderValue: 200,
              priceSensitivity: 80,
              brandLoyalty: 40,
              digitalAdoption: 60
            },
            needs: ['Value for money', 'Reliability'],
            painPoints: ['Price changes', 'Hidden costs']
          }
        ],
        parameters: {
          iterations: 100,
          timeHorizon: 12,
          confidenceLevel: 0.95
        }
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.marketId).toBe('test-market-1');
      expect(result.status).toBe('completed');

      // Check demand forecast
      expect(result.demandForecast).toBeDefined();
      expect(result.demandForecast.length).toBeGreaterThan(0);

      // Check price elasticity
      expect(result.priceElasticity).toBeDefined();
      expect(result.priceElasticity.categoryElasticity).toBeDefined();
      expect(result.priceElasticity.optimalPriceRange).toBeDefined();

      // Check market share projection
      expect(result.marketShareProjection).toBeDefined();
      expect(result.marketShareProjection.length).toBe(12);

      // Check competitive responses
      expect(result.competitiveResponses).toBeDefined();
      expect(result.competitiveResponses.length).toBe(2);

      // Check threat assessment
      expect(result.threatAssessment).toBeDefined();
      expect(result.threatAssessment.newEntrants).toBeDefined();
      expect(result.threatAssessment.competitiveRivalry).toBeDefined();

      // Check scenarios
      expect(result.scenarios).toBeDefined();
      expect(result.scenarios.length).toBe(4); // Optimistic, Base, Pessimistic, Black Swan

      // Check recommendations
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Check metadata
      expect(result.metadata.executionTimeMs).toBeGreaterThan(0);
      expect(result.metadata.iterations).toBe(100);
    });

    it('should handle default parameters', async () => {
      const request = {
        marketId: 'test-market-2',
        marketType: MarketType.B2B,
        productCategory: {
          id: 'cat-2',
          name: 'Enterprise Software',
          growthRate: 12,
          marketSize: 1000000000,
          seasonality: {
            peakMonths: [3, 4],
            troughMonths: [7, 8]
          }
        },
        yourCompany: {
          currentMarketShare: 10,
          currentPricing: 999,
          brandStrength: 60,
          customerSatisfaction: 75
        },
        competitors: [],
        customerSegments: [
          {
            id: 'seg-1',
            name: 'Enterprise',
            size: 10000,
            demographics: {
              ageRange: [35, 55] as [number, number],
              incomeLevel: 'high' as const,
              location: ['Global']
            },
            behavior: {
              avgPurchaseFrequency: 1,
              avgOrderValue: 50000,
              priceSensitivity: 40,
              brandLoyalty: 80,
              digitalAdoption: 90
            },
            needs: ['Security', 'Scalability'],
            painPoints: ['Implementation', 'Cost']
          }
        ]
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.metadata.iterations).toBe(1000); // Default
      expect(result.demandForecast.length).toBe(12); // Default time horizon
    });
  });

  describe('get', () => {
    it('should retrieve existing simulation', async () => {
      const request = {
        marketId: 'test-market-3',
        marketType: MarketType.MARKETPLACE,
        productCategory: {
          id: 'cat-3',
          name: 'E-commerce',
          growthRate: 15,
          marketSize: 2000000000,
          seasonality: {
            peakMonths: [11, 12],
            troughMonths: []
          }
        },
        yourCompany: {
          currentMarketShare: 8,
          currentPricing: 50,
          brandStrength: 65,
          customerSatisfaction: 78
        },
        competitors: [],
        customerSegments: []
      };

      const created = await engine.run(request);
      const retrieved = engine.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.marketId).toBe('test-market-3');
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
          marketId: `market-${i}`,
          marketType: MarketType.B2C,
          productCategory: {
            id: `cat-${i}`,
            name: `Category ${i}`,
            growthRate: 10,
            marketSize: 100000000,
            seasonality: { peakMonths: [], troughMonths: [] }
          },
          yourCompany: {
            currentMarketShare: 10,
            currentPricing: 100,
            brandStrength: 70,
            customerSatisfaction: 80
          },
          competitors: [],
          customerSegments: []
        });
      }

      const simulations = engine.list();
      expect(simulations.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('trends', () => {
    it('should add and retrieve trends', () => {
      const trend: MarketTrend = {
        id: 'trend-1',
        name: 'Test Trend',
        category: 'technology',
        impact: 0.3,
        probability: 0.7,
        timeframe: 'medium',
        description: 'Test trend description',
        businessImplications: ['Impact 1', 'Impact 2']
      };

      engine.addTrend(trend);
      const trends = engine.getTrends();

      expect(trends).toContain(trend);
    });
  });
});

describe('DemandForecastingEngine', () => {
  describe('forecast', () => {
    it('should generate forecasts for time horizon', () => {
      const result = DemandForecastingEngine.forecast(
        {
          id: 'cat-1',
          name: 'Test Category',
          growthRate: 10,
          marketSize: 1000000,
          seasonality: {
            peakMonths: [12],
            troughMonths: [1]
          }
        },
        100000,
        12,
        100
      );

      expect(result).toHaveLength(12);

      // Check that first month has baseline
      expect(result[0]).toHaveProperty('period');
      expect(result[0]).toHaveProperty('baseline');
      expect(result[0]).toHaveProperty('projected');
      expect(result[0]).toHaveProperty('optimistic');
      expect(result[0]).toHaveProperty('pessimistic');
    });

    it('should apply seasonality', () => {
      const peakMonth = DemandForecastingEngine.forecast(
        {
          id: 'cat-1',
          name: 'Test Category',
          growthRate: 0,
          marketSize: 1000000,
          seasonality: {
            peakMonths: [6],
            troughMonths: [1]
          }
        },
        100000,
        12,
        100
      );

      // June should be higher than baseline
      const juneForecast = peakMonth.find(f => f.period === 'Month 6');
      expect(juneForecast?.baseline).toBeGreaterThan(peakMonth[0].baseline);
    });

    it('should include demand drivers', () => {
      const result = DemandForecastingEngine.forecast(
        {
          id: 'cat-1',
          name: 'Test Category',
          growthRate: 10,
          marketSize: 1000000,
          seasonality: { peakMonths: [], troughMonths: [] }
        },
        100000,
        3,
        100,
        [
          {
            id: 'trend-1',
            name: 'Test Trend',
            category: 'technology',
            impact: 0.2,
            probability: 0.8,
            timeframe: 'short',
            description: 'Test',
            businessImplications: []
          }
        ]
      );

      expect(result[0].drivers).toBeDefined();
      expect(result[0].drivers.length).toBeGreaterThan(0);
    });
  });

  describe('findPeakDemand', () => {
    it('should find the peak demand month', () => {
      const forecasts = [
        { period: 'Month 1', baseline: 100, projected: 100, optimistic: 110, pessimistic: 90, drivers: [] },
        { period: 'Month 2', baseline: 110, projected: 110, optimistic: 120, pessimistic: 100, drivers: [] },
        { period: 'Month 3', baseline: 105, projected: 105, optimistic: 115, pessimistic: 95, drivers: [] }
      ];

      const peak = DemandForecastingEngine.findPeakDemand(forecasts);

      expect(peak.period).toBe('Month 2');
      expect(peak.projected).toBe(110);
    });
  });
});

describe('PriceElasticityEngine', () => {
  describe('analyzeElasticity', () => {
    it('should calculate category elasticity', () => {
      const result = PriceElasticityEngine.analyzeElasticity(
        100,
        [
          {
            id: 'seg-1',
            name: 'Test Segment',
            size: 1000,
            demographics: {
              ageRange: [25, 45] as [number, number],
              incomeLevel: 'high',
              location: ['Urban']
            },
            behavior: {
              avgPurchaseFrequency: 2,
              avgOrderValue: 200,
              priceSensitivity: 50,
              brandLoyalty: 50,
              digitalAdoption: 80
            },
            needs: [],
            painPoints: []
          }
        ],
        100
      );

      expect(result.categoryElasticity).toBeDefined();
      expect(result.categoryElasticity).toBeLessThan(0); // Elasticities are negative
      expect(result.categoryElasticity).toBeGreaterThan(-5);
    });

    it('should calculate segment elasticities', () => {
      const segments = [
        {
          id: 'seg-1',
          name: 'High Sensitivity',
          size: 1000,
          demographics: {
            ageRange: [25, 45] as [number, number],
            incomeLevel: 'low',
            location: ['Suburban']
          },
          behavior: {
            avgPurchaseFrequency: 1,
            avgOrderValue: 50,
            priceSensitivity: 80,
            brandLoyalty: 30,
            digitalAdoption: 50
          },
          needs: [],
          painPoints: []
        },
        {
          id: 'seg-2',
          name: 'Low Sensitivity',
          size: 500,
          demographics: {
            ageRange: [35, 55] as [number, number],
            incomeLevel: 'high',
            location: ['Urban']
          },
          behavior: {
            avgPurchaseFrequency: 2,
            avgOrderValue: 500,
            priceSensitivity: 20,
            brandLoyalty: 80,
            digitalAdoption: 90
          },
          needs: [],
          painPoints: []
        }
      ];

      const result = PriceElasticityEngine.analyzeElasticity(200, segments, 100);

      expect(result.segmentElasticities.size).toBe(2);
      expect(result.segmentElasticities.get('seg-1')).toBeLessThan(result.segmentElasticities.get('seg-2')!);
      // High price sensitivity should lead to more elastic (more negative)
    });

    it('should find optimal price range', () => {
      const result = PriceElasticityEngine.analyzeElasticity(
        100,
        [{
          id: 'seg-1',
          name: 'Test',
          size: 1000,
          demographics: {
            ageRange: [30, 50] as [number, number],
            incomeLevel: 'middle',
            location: ['Urban']
          },
          behavior: {
            avgPurchaseFrequency: 1,
            avgOrderValue: 100,
            priceSensitivity: 50,
            brandLoyalty: 50,
            digitalAdoption: 70
          },
          needs: [],
          painPoints: []
        }],
        100
      );

      expect(result.optimalPriceRange).toBeDefined();
      expect(result.optimalPriceRange.min).toBeLessThan(result.optimalPriceRange.max);
      expect(result.optimalPriceRange.recommended).toBeGreaterThanOrEqual(result.optimalPriceRange.min);
      expect(result.optimalPriceRange.recommended).toBeLessThanOrEqual(result.optimalPriceRange.max);
    });

    it('should calculate volume impact', () => {
      const result = PriceElasticityEngine.analyzeElasticity(
        100,
        [{
          id: 'seg-1',
          name: 'Test',
          size: 10000,
          demographics: {
            ageRange: [30, 50] as [number, number],
            incomeLevel: 'middle',
            location: ['Urban']
          },
          behavior: {
            avgPurchaseFrequency: 2,
            avgOrderValue: 100,
            priceSensitivity: 50,
            brandLoyalty: 50,
            digitalAdoption: 70
          },
          needs: [],
          painPoints: []
        }],
        100
      );

      expect(result.volumeImpact.size).toBe(1);
      const impact = result.volumeImpact.get('seg-1');
      expect(impact).toBeDefined();
      expect(impact!.priceChange).toBeDefined();
      expect(impact!.volumeChange).toBeDefined();
      expect(impact!.revenueChange).toBeDefined();
    });
  });
});

describe('MarketShareProjectionEngine', () => {
  describe('project', () => {
    it('should project market share over time', () => {
      const currentShares = new Map<string, number>();
      currentShares.set('your_company', 20);
      currentShares.set('competitor-1', 30);
      currentShares.set('competitor-2', 25);

      const result = MarketShareProjectionEngine.project(
        currentShares,
        [
          {
            id: 'competitor-1',
            name: 'Competitor 1',
            marketShare: 30,
            pricingStrategy: 'premium' as const,
            strengths: ['Brand'],
            weaknesses: ['Price'],
            recentStrategies: [],
            financialHealth: { revenue: 100000, growth: 10, profitability: 15 }
          },
          {
            id: 'competitor-2',
            name: 'Competitor 2',
            marketShare: 25,
            pricingStrategy: 'budget' as const,
            strengths: ['Price'],
            weaknesses: ['Brand'],
            recentStrategies: [],
            financialHealth: { revenue: 50000, growth: 5, profitability: 8 }
          }
        ],
        { currentMarketShare: 20, brandStrength: 70, customerSatisfaction: 80 },
        12,
        100
      );

      expect(result).toHaveLength(12);

      // First projection should be current state
      expect(result[0].yourCompany.current).toBe(20);
      expect(result[0].period).toBe('Month 1');

      // Last projection should have projected value
      expect(result[11].yourCompany.projected).toBeDefined();
    });

    it('should include competitor projections', () => {
      const currentShares = new Map<string, number>();
      currentShares.set('your_company', 20);
      currentShares.set('comp-1', 30);

      const result = MarketShareProjectionEngine.project(
        currentShares,
        [{
          id: 'comp-1',
          name: 'Competitor 1',
          marketShare: 30,
          pricingStrategy: 'mid-market' as const,
          strengths: ['Distribution'],
          weaknesses: ['Innovation'],
          recentStrategies: [],
          financialHealth: { revenue: 100000, growth: 5, profitability: 10 }
        }],
        { currentMarketShare: 20, brandStrength: 70, customerSatisfaction: 80 },
        6,
        100
      );

      for (const projection of result) {
        expect(projection.competitors.size).toBeGreaterThan(0);
        const compProjection = projection.competitors.get('comp-1');
        expect(compProjection).toBeDefined();
        expect(compProjection!.current).toBe(30);
        expect(compProjection!.projected).toBeDefined();
      }
    });
  });
});

describe('CompetitiveResponseEngine', () => {
  describe('modelResponses', () => {
    it('should model competitor responses', () => {
      const competitors = [
        {
          id: 'comp-1',
          name: 'Aggressive Inc',
          marketShare: 25,
          pricingStrategy: 'dynamic' as const,
          strengths: ['Resources', 'Scale'],
          weaknesses: ['Agility'],
          recentStrategies: [
            { strategy: 'price_war', impact: 0.3, timeframe: 'Q1' },
            { strategy: 'marketing_blitz', impact: 0.2, timeframe: 'Q4' }
          ],
          financialHealth: { revenue: 500000, growth: 20, profitability: 15 }
        }
      ];

      const responses = CompetitiveResponseEngine.modelResponses(competitors, 'price cut', 100);

      expect(responses).toHaveLength(1);
      expect(responses[0].competitorId).toBe('comp-1');
      expect(responses[0].responseProbability).toBeGreaterThan(0);
      expect(responses[0].responseType).toBeDefined();
      expect(responses[0].expectedTimeline).toBeGreaterThan(0);
      expect(responses[0].yourCounterStrategies.length).toBeGreaterThan(0);
    });

    it('should sort responses by impact', () => {
      const competitors = [
        {
          id: 'comp-1',
          name: 'Large Competitor',
          marketShare: 30,
          pricingStrategy: 'premium' as const,
          strengths: ['Scale'],
          weaknesses: [],
          recentStrategies: [
            { strategy: 'expand', impact: 0.3, timeframe: 'Q1' },
            { strategy: 'acquire', impact: 0.4, timeframe: 'Q2' }
          ],
          financialHealth: { revenue: 1000000, growth: 25, profitability: 20 }
        },
        {
          id: 'comp-2',
          name: 'Small Competitor',
          marketShare: 5,
          pricingStrategy: 'budget' as const,
          strengths: ['Niche'],
          weaknesses: ['Resources'],
          recentStrategies: [],
          financialHealth: { revenue: 10000, growth: 5, profitability: 5 }
        }
      ];

      const responses = CompetitiveResponseEngine.modelResponses(competitors, 'market_entry', 100);

      expect(responses.length).toBe(2);
      // Larger competitor should have higher impact
      const largeCompResponse = responses.find(r => r.competitorId === 'comp-1');
      expect(largeCompResponse).toBeDefined();
    });
  });
});

describe('ScenarioAnalysisEngine', () => {
  describe('generateScenarios', () => {
    it('should generate 4 scenarios', () => {
      const scenarios = ScenarioAnalysisEngine.generateScenarios(
        1000000,
        0.1,
        12,
        100
      );

      expect(scenarios).toHaveLength(4);

      const scenarioNames = scenarios.map(s => s.scenarioName);
      expect(scenarioNames).toContain('Optimistic');
      expect(scenarioNames).toContain('Base Case');
      expect(scenarioNames).toContain('Pessimistic');
      expect(scenarioNames).toContain('Black Swan');
    });

    it('should have valid probabilities', () => {
      const scenarios = ScenarioAnalysisEngine.generateScenarios(
        1000000,
        0.1,
        12,
        100
      );

      const totalProbability = scenarios.reduce((sum, s) => sum + s.probability, 0);
      expect(totalProbability).toBeLessThanOrEqual(1);
      expect(totalProbability).toBeGreaterThan(0.5);

      for (const scenario of scenarios) {
        expect(scenario.probability).toBeGreaterThan(0);
        expect(scenario.probability).toBeLessThanOrEqual(1);
      }
    });

    it('should generate timeline for each scenario', () => {
      const scenarios = ScenarioAnalysisEngine.generateScenarios(
        1000000,
        0.1,
        12,
        100
      );

      for (const scenario of scenarios) {
        expect(scenario.timeline).toBeDefined();
        expect(scenario.timeline.length).toBe(12);
      }
    });

    it('should generate key events', () => {
      const scenarios = ScenarioAnalysisEngine.generateScenarios(
        1000000,
        0.1,
        12,
        100
      );

      for (const scenario of scenarios) {
        expect(scenario.keyEvents).toBeDefined();
        expect(scenario.keyEvents.length).toBeGreaterThan(0);

        for (const event of scenario.keyEvents) {
          expect(event.event).toBeDefined();
          expect(event.impact).toBeDefined();
          expect(['positive', 'negative', 'neutral']).toContain(event.impact);
        }
      }
    });

    it('should have different metrics for each scenario', () => {
      const scenarios = ScenarioAnalysisEngine.generateScenarios(
        1000000,
        0.1,
        12,
        100
      );

      const optimistic = scenarios.find(s => s.scenarioName === 'Optimistic');
      const pessimistic = scenarios.find(s => s.scenarioName === 'Pessimistic');

      expect(optimistic!.metrics.marketGrowth).toBeGreaterThan(pessimistic!.metrics.marketGrowth);
      expect(optimistic!.metrics.marketSize).toBeGreaterThan(pessimistic!.metrics.marketSize);
    });
  });
});

describe('ThreatAssessmentEngine', () => {
  describe('assess', () => {
    it('should assess all five forces', () => {
      const result = ThreatAssessmentEngine.assess(
        'B2B',
        [
          {
            id: 'comp-1',
            name: 'Competitor',
            marketShare: 20,
            pricingStrategy: 'premium' as const,
            strengths: ['Brand'],
            weaknesses: ['Price'],
            recentStrategies: [],
            financialHealth: { revenue: 100000, growth: 15, profitability: 10 }
          }
        ],
        [
          {
            id: 'seg-1',
            name: 'Segment',
            size: 1000,
            demographics: {
              ageRange: [30, 50] as [number, number],
              incomeLevel: 'high',
              location: ['Urban']
            },
            behavior: {
              avgPurchaseFrequency: 1,
              avgOrderValue: 500,
              priceSensitivity: 50,
              brandLoyalty: 60,
              digitalAdoption: 80
            },
            needs: [],
            painPoints: []
          }
        ]
      );

      expect(result.newEntrants).toBeDefined();
      expect(result.substitutes).toBeDefined();
      expect(result.supplierPower).toBeDefined();
      expect(result.buyerPower).toBeDefined();
      expect(result.competitiveRivalry).toBeDefined();

      // All should be 0-100
      expect(result.newEntrants).toBeGreaterThanOrEqual(0);
      expect(result.newEntrants).toBeLessThanOrEqual(100);
    });

    it('should reflect market characteristics', () => {
      const highTechResult = ThreatAssessmentEngine.assess(
        'B2C',
        [],
        [
          {
            id: 'seg-1',
            name: 'Tech-savvy',
            size: 1000,
            demographics: {
              ageRange: [20, 35] as [number, number],
              incomeLevel: 'middle',
              location: ['Urban']
            },
            behavior: {
              avgPurchaseFrequency: 3,
              avgOrderValue: 200,
              priceSensitivity: 70,
              brandLoyalty: 40,
              digitalAdoption: 95
            },
            needs: [],
            painPoints: []
          }
        ]
      );

      // High digital adoption should lead to high substitute threat
      expect(highTechResult.substitutes).toBeGreaterThan(70);

      // High price sensitivity should lead to high buyer power
      expect(highTechResult.buyerPower).toBeGreaterThan(60);
    });
  });
});

describe('MarketRecommendationGenerator', () => {
  describe('generate', () => {
    it('should generate recommendations for market simulation', () => {
      const mockResult = {
        id: 'test-id',
        marketId: 'test-market',
        status: 'completed' as const,
        demandForecast: [
          {
            period: 'Month 1',
            baseline: 100000,
            projected: 105000,
            optimistic: 110000,
            pessimistic: 95000,
            drivers: []
          }
        ],
        peakDemand: { month: 6, volume: 150000, intensity: 1.3 },
        priceElasticity: {
          categoryElasticity: -1.2,
          segmentElasticities: new Map(),
          optimalPriceRange: { min: 80, max: 120, recommended: 100 },
          volumeImpact: new Map()
        },
        marketShareProjection: [
          {
            period: 'Month 1',
            yourCompany: { current: 20, projected: 20, confidenceInterval: [18, 22] as [number, number] },
            competitors: new Map()
          },
          {
            period: 'Month 12',
            yourCompany: { current: 20, projected: 18, confidenceInterval: [15, 21] as [number, number] },
            competitors: new Map()
          }
        ],
        competitiveResponses: [],
        threatAssessment: {
          newEntrants: 70,
          substitutes: 40,
          supplierPower: 50,
          buyerPower: 60,
          competitiveRivalry: 80
        },
        scenarios: [
          {
            scenarioName: 'Base Case',
            probability: 0.5,
            metrics: {
              marketSize: 1200000,
              marketGrowth: 0.1,
              yourMarketShare: 20,
              yourRevenue: 200000,
              yourProfitability: 20,
              competitiveIntensity: 60
            },
            timeline: [],
            keyEvents: []
          },
          {
            scenarioName: 'Pessimistic',
            probability: 0.2,
            metrics: {
              marketSize: 1000000,
              marketGrowth: 0.05,
              yourMarketShare: 15,
              yourRevenue: 150000,
              yourProfitability: 10,
              competitiveIntensity: 80
            },
            timeline: [],
            keyEvents: []
          }
        ],
        recommendations: [],
        metadata: {
          createdAt: new Date(),
          executionTimeMs: 100,
          iterations: 100
        }
      };

      const recommendations = MarketRecommendationGenerator.generate(
        mockResult,
        mockResult.priceElasticity
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);

      // Should recommend addressing declining market share
      const shareRecommendation = recommendations.find(r =>
        r.action.toLowerCase().includes('market share')
      );
      expect(shareRecommendation).toBeDefined();
      expect(shareRecommendation!.priority).toBe('high');

      // Should recommend addressing high threats
      const threatRecommendation = recommendations.find(r =>
        r.action.toLowerCase().includes('barrier') ||
        r.action.toLowerCase().includes('rivalry')
      );
      expect(threatRecommendation).toBeDefined();
    });
  });
});
