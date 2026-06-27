import { describe, it, expect, beforeEach } from 'vitest';
import {
  PricingSimulationEngine,
  CompetitivePricingAnalyzer,
  ValueBasedPricingEngine,
  PriceElasticityEngine,
  PromotionalPricingAnalyzer,
  ABTestingSimulator,
  PriceLadderGenerator
} from '../engine/pricingSimulationEngine.js';
import { PricingStrategy } from '../models/pricingSimulation.js';

// ============================================================================
// Pricing Simulation Tests
// ============================================================================

describe('PricingSimulationEngine', () => {
  let engine: PricingSimulationEngine;

  beforeEach(() => {
    engine = new PricingSimulationEngine();
  });

  describe('run', () => {
    it('should run pricing simulation successfully', async () => {
      const request = {
        simulationId: 'test-pricing-1',
        product: {
          id: 'prod-1',
          name: 'Premium Widget',
          sku: 'WGT-001',
          category: 'Electronics',
          currentPrice: 99.99,
          cost: 40,
          margin: 60,
          volume: 1000,
          elasticity: -1.5
        },
        competitors: [
          {
            competitorId: 'comp-1',
            competitorName: 'Competitor A',
            price: 95,
            lastUpdated: new Date(),
            reliability: 0.9
          },
          {
            competitorId: 'comp-2',
            competitorName: 'Competitor B',
            price: 105,
            lastUpdated: new Date(),
            reliability: 0.8
          }
        ],
        segments: [
          {
            id: 'seg-1',
            name: 'Enterprise',
            size: 500,
            willingnessToPay: 150,
            priceSensitivity: 30,
            acquisitionCost: 50,
            lifetimeValue: 500
          },
          {
            id: 'seg-2',
            name: 'SMB',
            size: 1000,
            willingnessToPay: 80,
            priceSensitivity: 60,
            acquisitionCost: 30,
            lifetimeValue: 200
          }
        ],
        valueDrivers: [
          {
            id: 'vd-1',
            name: 'Reliability',
            impact: 0.4,
            yourPerformance: 85,
            competitorPerformance: 70
          },
          {
            id: 'vd-2',
            name: 'Features',
            impact: 0.3,
            yourPerformance: 90,
            competitorPerformance: 80
          }
        ],
        parameters: {
          iterations: 100,
          confidenceLevel: 0.95,
          step: 5
        }
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.productId).toBe('prod-1');
      expect(result.status).toBe('completed');

      // Check competitive analysis
      expect(result.competitiveAnalysis).toBeDefined();
      expect(result.competitiveAnalysis.yourPrice).toBe(99.99);
      expect(result.competitiveAnalysis.pricePosition).toBeDefined();

      // Check value-based analysis
      expect(result.valueBasedAnalysis).toBeDefined();
      expect(result.valueBasedAnalysis.willingnessToPay).toBeDefined();

      // Check elasticity analysis
      expect(result.elasticityAnalysis).toBeDefined();
      expect(result.elasticityAnalysis.baseElasticity).toBe(-1.5);
      expect(result.elasticityAnalysis.optimalPricePoint).toBeDefined();

      // Check promotional analysis
      expect(result.promotionalAnalysis).toBeDefined();

      // Check recommendations
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Check A/B tests
      expect(result.abTests).toBeDefined();
      expect(result.abTests.length).toBeGreaterThan(0);

      // Check price ladder
      expect(result.priceLadder).toBeDefined();
      expect(result.priceLadder.length).toBeGreaterThan(0);

      // Check metadata
      expect(result.metadata.executionTimeMs).toBeGreaterThan(0);
      expect(result.metadata.iterations).toBe(100);
    });

    it('should handle default parameters', async () => {
      const request = {
        simulationId: 'test-pricing-2',
        product: {
          id: 'prod-2',
          name: 'Basic Widget',
          sku: 'WGT-002',
          category: 'Electronics',
          currentPrice: 49.99,
          cost: 20,
          margin: 60,
          volume: 500,
          elasticity: -1.2
        },
        competitors: [],
        segments: [
          {
            id: 'seg-1',
            name: 'Consumers',
            size: 1000,
            willingnessToPay: 60,
            priceSensitivity: 50,
            acquisitionCost: 20,
            lifetimeValue: 100
          }
        ]
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.metadata.iterations).toBe(1000); // Default
    });
  });

  describe('get', () => {
    it('should retrieve existing simulation', async () => {
      const request = {
        simulationId: 'test-pricing-3',
        product: {
          id: 'prod-3',
          name: 'Widget',
          sku: 'WGT-003',
          category: 'Electronics',
          currentPrice: 79.99,
          cost: 30,
          margin: 62,
          volume: 750,
          elasticity: -1.3
        },
        competitors: [],
        segments: []
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
          simulationId: `test-${i}`,
          product: {
            id: `prod-${i}`,
            name: `Widget ${i}`,
            sku: `WGT-${i}`,
            category: 'Electronics',
            currentPrice: 50 + i * 10,
            cost: 20,
            margin: 60,
            volume: 100,
            elasticity: -1.5
          },
          competitors: [],
          segments: []
        });
      }

      const simulations = engine.list();
      expect(simulations.length).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('CompetitivePricingAnalyzer', () => {
  describe('analyze', () => {
    it('should correctly position price vs competitors', () => {
      const yourPrice = 100;
      const competitors = [
        { competitorId: 'c1', competitorName: 'Comp1', price: 90, lastUpdated: new Date(), reliability: 1 },
        { competitorId: 'c2', competitorName: 'Comp2', price: 110, lastUpdated: new Date(), reliability: 1 },
        { competitorId: 'c3', competitorName: 'Comp3', price: 95, lastUpdated: new Date(), reliability: 1 }
      ];

      const result = CompetitivePricingAnalyzer.analyze(yourPrice, competitors);

      expect(result.yourPrice).toBe(100);
      expect(result.pricePosition).toBe('average');
      expect(result.competitorPrices.size).toBe(3);
      expect(result.priceDifference.vsLowest).toBeCloseTo(11.11, 1);
      expect(result.priceDifference.vsAverage).toBeCloseTo(0, 0);
    });

    it('should identify lowest price position', () => {
      const yourPrice = 85;
      const competitors = [
        { competitorId: 'c1', competitorName: 'Comp1', price: 90, lastUpdated: new Date(), reliability: 1 },
        { competitorId: 'c2', competitorName: 'Comp2', price: 110, lastUpdated: new Date(), reliability: 1 }
      ];

      const result = CompetitivePricingAnalyzer.analyze(yourPrice, competitors);

      expect(result.pricePosition).toBe('lowest');
      expect(result.priceDifference.vsLowest).toBe(0);
    });

    it('should handle no competitors', () => {
      const result = CompetitivePricingAnalyzer.analyze(100, []);

      expect(result.yourPrice).toBe(100);
      expect(result.pricePosition).toBe('average');
      expect(result.estimatedShareImpact).toBe(0);
    });

    it('should calculate negative share impact for high price', () => {
      const yourPrice = 150;
      const competitors = [
        { competitorId: 'c1', competitorName: 'Comp1', price: 100, lastUpdated: new Date(), reliability: 1 }
      ];

      const result = CompetitivePricingAnalyzer.analyze(yourPrice, competitors);

      expect(result.estimatedShareImpact).toBeLessThan(0);
    });
  });

  describe('recommend', () => {
    it('should generate competitive recommendations', () => {
      const analysis = {
        yourPrice: 100,
        competitorPrices: new Map(),
        pricePosition: 'average' as const,
        priceDifference: { vsLowest: 10, vsAverage: 0, vsHighest: -20 },
        estimatedShareImpact: 0
      };

      const competitors = [
        { competitorId: 'c1', competitorName: 'Comp1', price: 100, lastUpdated: new Date(), reliability: 1 }
      ];

      const recommendations = CompetitivePricingAnalyzer.recommend(analysis, 'average', competitors);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].strategy).toBe(PricingStrategy.COMPETITIVE);
    });
  });
});

describe('ValueBasedPricingEngine', () => {
  describe('calculatePrice', () => {
    it('should calculate willingness to pay', () => {
      const segments = [
        {
          id: 'seg-1',
          name: 'Enterprise',
          size: 100,
          willingnessToPay: 200,
          priceSensitivity: 20,
          acquisitionCost: 50,
          lifetimeValue: 500
        },
        {
          id: 'seg-2',
          name: 'SMB',
          size: 200,
          willingnessToPay: 100,
          priceSensitivity: 50,
          acquisitionCost: 30,
          lifetimeValue: 200
        }
      ];

      const result = ValueBasedPricingEngine.calculatePrice(segments);

      expect(result.willingnessToPay).toBeDefined();
      expect(result.willingnessToPay.estimated).toBeGreaterThan(0);
      expect(result.willingnessToPay.confidence).toBeGreaterThan(0);
      expect(result.willingnessToPay.range.min).toBeLessThan(result.willingnessToPay.range.max);
    });

    it('should incorporate value drivers', () => {
      const segments = [{
        id: 'seg-1',
        name: 'Enterprise',
        size: 100,
        willingnessToPay: 150,
        priceSensitivity: 30,
        acquisitionCost: 50,
        lifetimeValue: 400
      }];

      const valueDrivers = [
        {
          id: 'vd-1',
          name: 'Quality',
          impact: 0.5,
          yourPerformance: 90,
          competitorPerformance: 70
        }
      ];

      const resultWithoutDrivers = ValueBasedPricingEngine.calculatePrice(segments);
      const resultWithDrivers = ValueBasedPricingEngine.calculatePrice(segments, valueDrivers);

      // With better performance, WTP should be higher
      expect(resultWithDrivers.willingnessToPay.estimated).toBeGreaterThan(
        resultWithoutDrivers.willingnessToPay.estimated
      );
    });

    it('should calculate total value score', () => {
      const segments = [{
        id: 'seg-1',
        name: 'Enterprise',
        size: 100,
        willingnessToPay: 150,
        priceSensitivity: 30,
        acquisitionCost: 50,
        lifetimeValue: 400
      }];

      const result = ValueBasedPricingEngine.calculatePrice(segments);

      expect(result.totalValueScore).toBeGreaterThan(0);
      expect(result.totalValueScore).toBeLessThanOrEqual(100);
    });
  });

  describe('recommend', () => {
    it('should generate value-based recommendations', () => {
      const analysis = {
        totalValueScore: 75,
        willingnessToPay: {
          estimated: 120,
          confidence: 0.8,
          range: { min: 100, max: 140 }
        },
        valueDrivers: [],
        optimalPrice: 120,
        priceValueRatio: 1
      };

      const recommendations = ValueBasedPricingEngine.recommend(analysis, 50);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].strategy).toBe(PricingStrategy.VALUE_BASED);
      expect(recommendations[0].recommendedPrice).toBe(120);
    });
  });
});

describe('PriceElasticityEngine', () => {
  describe('analyze', () => {
    it('should calculate optimal price point', () => {
      const result = PriceElasticityEngine.analyze(
        100, // current price
        1000, // volume
        -1.5, // elasticity
        [],
        100
      );

      expect(result.baseElasticity).toBe(-1.5);
      expect(result.optimalPricePoint).toBeDefined();
      expect(result.optimalPricePoint.price).toBeGreaterThan(0);
      expect(result.optimalPricePoint.revenue).toBeGreaterThan(0);
      expect(result.optimalPricePoint.volume).toBeGreaterThan(0);
    });

    it('should calculate segment elasticities', () => {
      const segments = [
        {
          id: 'seg-1',
          name: 'High Sensitivity',
          size: 100,
          willingnessToPay: 100,
          priceSensitivity: 80,
          acquisitionCost: 30,
          lifetimeValue: 200
        },
        {
          id: 'seg-2',
          name: 'Low Sensitivity',
          size: 50,
          willingnessToPay: 150,
          priceSensitivity: 20,
          acquisitionCost: 50,
          lifetimeValue: 400
        }
      ];

      const result = PriceElasticityEngine.analyze(100, 1000, -1.5, segments, 100);

      expect(result.segmentElasticities.size).toBe(2);
      expect(result.segmentElasticities.get('seg-1')).toBeLessThan(
        result.segmentElasticities.get('seg-2')!
      );
    });

    it('should define price range', () => {
      const result = PriceElasticityEngine.analyze(100, 1000, -1.5, [], 100);

      expect(result.priceRange.floor).toBe(70); // 30% below
      expect(result.priceRange.ceiling).toBe(150); // 50% above
    });
  });

  describe('recommend', () => {
    it('should generate elasticity-based recommendations', () => {
      const analysis = {
        baseElasticity: -1.5,
        segmentElasticities: new Map(),
        crossElasticities: new Map(),
        optimalPricePoint: {
          price: 120,
          revenue: 120000,
          volume: 1000
        },
        priceRange: { floor: 70, ceiling: 150 }
      };

      const recommendations = PriceElasticityEngine.recommend(analysis, 100, 50);

      expect(recommendations).toBeDefined();
    });
  });
});

describe('PromotionalPricingAnalyzer', () => {
  describe('analyze', () => {
    it('should calculate break-even discount', () => {
      const result = PromotionalPricingAnalyzer.analyze(
        100, // base price
        1000, // volume
        -1.5, // elasticity
        50 // margin
      );

      expect(result.breakEvenDiscount).toBeDefined();
      expect(result.breakEvenDiscount).toBeGreaterThan(0);
      expect(result.breakEvenDiscount).toBeLessThan(100);
    });

    it('should estimate expected lift', () => {
      const result = PromotionalPricingAnalyzer.analyze(
        100, 1000, -1.5, 50
      );

      expect(result.expectedLift).toBeDefined();
      expect(result.expectedLift).toBeGreaterThan(0);
    });

    it('should assess cannibalization risk', () => {
      const lowDiscountResult = PromotionalPricingAnalyzer.analyze(100, 1000, -1.5, 50);
      const highDiscountResult = PromotionalPricingAnalyzer.analyze(100, 1000, -1.5, 30);

      expect(highDiscountResult.cannibalizationRisk).toBeGreaterThan(
        lowDiscountResult.cannibalizationRisk
      );
    });

    it('should assess brand damage risk', () => {
      const result = PromotionalPricingAnalyzer.analyze(100, 1000, -1.5, 50);

      expect(result.brandDamageRisk).toBeDefined();
      expect(result.brandDamageRisk).toBeGreaterThanOrEqual(0);
      expect(result.brandDamageRisk).toBeLessThanOrEqual(1);
    });

    it('should find optimal strategy', () => {
      const result = PromotionalPricingAnalyzer.analyze(100, 1000, -1.5, 50);

      expect(result.optimalStrategy).toBeDefined();
      expect(result.optimalStrategy.discount).toBeGreaterThan(0);
      expect(result.optimalStrategy.duration).toBeGreaterThan(0);
      expect(result.optimalStrategy.frequency).toBeGreaterThan(0);
    });
  });

  describe('recommend', () => {
    it('should generate promotional recommendations', () => {
      const analysis = {
        discountDepth: 20,
        expectedLift: 40,
        breakEvenDiscount: 50,
        cannibalizationRisk: 0.3,
        brandDamageRisk: 0.2,
        optimalStrategy: {
          discount: 15,
          duration: 7,
          frequency: 4
        }
      };

      const recommendations = PromotionalPricingAnalyzer.recommend(analysis, 100);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });
});

describe('ABTestingSimulator', () => {
  describe('simulate', () => {
    it('should simulate A/B test results', () => {
      const variants = [
        { price: 100, trafficPercentage: 50 },
        { price: 90, trafficPercentage: 50 }
      ];

      const result = ABTestingSimulator.simulate(
        100, // control
        variants,
        1000, // base volume
        -1.5, // elasticity
        100 // iterations
      );

      expect(result).toBeDefined();
      expect(result.variants).toHaveLength(2);
      expect(result.variants[0].price).toBe(100);
      expect(result.variants[1].price).toBe(90);
      expect(result.statisticalSignificance).toBeDefined();
    });

    it('should calculate impressions based on traffic split', () => {
      const variants = [
        { price: 100, trafficPercentage: 33.33 },
        { price: 90, trafficPercentage: 33.33 },
        { price: 110, trafficPercentage: 33.34 }
      ];

      const result = ABTestingSimulator.simulate(100, variants, 1000, -1.5, 100);

      const totalImpressions = result.variants.reduce((sum, v) => sum + v.impressions, 0);
      expect(totalImpressions).toBeLessThanOrEqual(1000);
    });

    it('should determine winner with sufficient confidence', () => {
      const variants = [
        { price: 100, trafficPercentage: 50 },
        { price: 80, trafficPercentage: 50 }
      ];

      const result = ABTestingSimulator.simulate(100, variants, 10000, -1.5, 1000);

      if (result.winner) {
        expect(result.winner.variantId).toBeDefined();
        expect(result.winner.confidence).toBeGreaterThan(0);
        expect(result.winner.lift).toBeDefined();
      }
    });
  });

  describe('recommendTest', () => {
    it('should recommend test configuration', () => {
      const result = ABTestingSimulator.recommendTest(
        100, // current price
        -1.5, // elasticity
        1000 // volume
      );

      expect(result).toBeDefined();
      expect(result.length).toBe(3); // Control + 2 variants
      expect(result[0].price).toBe(100); // Control at current price
      expect(result[0].trafficPercentage).toBeCloseTo(33.33, 0);
    });
  });
});

describe('PriceLadderGenerator', () => {
  describe('generate', () => {
    it('should generate price ladder', () => {
      const ladder = PriceLadderGenerator.generate(
        80, // start price
        120, // end price
        5, // steps
        40, // cost
        1000, // volume
        -1.5, // elasticity
        [{ competitorId: 'c1', competitorName: 'Comp1', price: 100, lastUpdated: new Date(), reliability: 1 }]
      );

      expect(ladder).toBeDefined();
      expect(ladder.length).toBe(5);
      expect(ladder[0].price).toBe(80);
      expect(ladder[4].price).toBe(120);
    });

    it('should calculate expected volume based on elasticity', () => {
      const ladder = PriceLadderGenerator.generate(
        80, 120, 5, 40, 1000, -1.5, []
      );

      // Lower price should have higher volume
      expect(ladder[0].expectedVolume).toBeGreaterThan(ladder[4].expectedVolume);
    });

    it('should calculate margin correctly', () => {
      const ladder = PriceLadderGenerator.generate(
        80, 120, 3, 40, 1000, -1.5, []
      );

      for (const step of ladder) {
        const expectedMargin = ((step.price - 40) / step.price) * 100;
        expect(step.expectedMargin).toBeCloseTo(expectedMargin, 1);
      }
    });

    it('should calculate competitive index', () => {
      const competitors = [
        { competitorId: 'c1', competitorName: 'Comp1', price: 100, lastUpdated: new Date(), reliability: 1 }
      ];

      const ladder = PriceLadderGenerator.generate(80, 120, 3, 40, 1000, -1.5, competitors);

      for (const step of ladder) {
        expect(step.competitiveIndex).toBeDefined();
        expect(step.competitiveIndex).toBeGreaterThan(0);
      }
    });

    it('should handle empty competitors', () => {
      const ladder = PriceLadderGenerator.generate(
        80, 120, 3, 40, 1000, -1.5, []
      );

      for (const step of ladder) {
        expect(step.competitiveIndex).toBe(100); // Default when no competitors
      }
    });
  });
});
