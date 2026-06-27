import { describe, it, expect, beforeEach } from 'vitest';
import {
  WhatIfAnalysisEngine,
  NaturalLanguageParser,
  WhatIfCalculationEngine,
  ScenarioComparisonEngine,
  InsightsGenerator,
  RecommendationGenerator,
  WhatIfTemplateLibrary
} from '../engine/whatifAnalysisEngine.js';
import { QuestionType, VariableType } from '../models/whatifAnalysis.js';

// ============================================================================
// What-If Analysis Tests
// ============================================================================

describe('WhatIfAnalysisEngine', () => {
  let engine: WhatIfAnalysisEngine;

  beforeEach(() => {
    engine = new WhatIfAnalysisEngine();
  });

  describe('run', () => {
    it('should run what-if analysis successfully', async () => {
      const request = {
        question: 'What if we hire 10 engineers?',
        type: QuestionType.HIRING,
        description: 'Analyze hiring impact',
        variables: [
          { id: 'num_hires', currentValue: 10 },
          { id: 'avg_salary', currentValue: 120000 },
          { id: 'productivity_gain', currentValue: 20 }
        ],
        changes: [
          { variableId: 'num_hires', newValue: 10, changeType: 'absolute' as const }
        ],
        parameters: {
          timeHorizon: 12,
          scenarios: 3,
          includeComparison: true,
          baselineMetrics: {
            revenue: 1000000,
            costs: 700000,
            employees: 50
          }
        }
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.question).toBe('What if we hire 10 engineers?');
      expect(result.type).toBe(QuestionType.HIRING);

      // Check projections
      expect(result.projections).toBeDefined();
      expect(result.projections.length).toBeGreaterThan(0);

      // Check impacts
      expect(result.impacts).toBeDefined();
      expect(result.impacts.length).toBeGreaterThan(0);

      // Check baseline and projected metrics
      expect(result.baselineMetrics).toBeDefined();
      expect(result.projectedMetrics).toBeDefined();

      // Check comparisons
      expect(result.comparisons).toBeDefined();
      expect(result.comparisons.length).toBeGreaterThan(0);

      // Check insights
      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);

      // Check recommendations
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Check metadata
      expect(result.metadata.confidenceLevel).toBeDefined();
      expect(result.metadata.assumptionsUsed).toBeGreaterThan(0);
    });

    it('should parse natural language question', async () => {
      const request = {
        question: 'What if we increase prices by 15%?',
        type: QuestionType.PRICING
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.impacts.length).toBeGreaterThan(0);
    });

    it('should handle pricing analysis', async () => {
      const request = {
        question: 'What if we change pricing?',
        type: QuestionType.PRICING,
        variables: [
          { id: 'current_price', currentValue: 100 },
          { id: 'price_change', currentValue: 10 },
          { id: 'elasticity', currentValue: -1.5 }
        ],
        changes: [
          { variableId: 'price_change', newValue: 10, changeType: 'percentage' as const }
        ],
        parameters: {
          baselineMetrics: {
            revenue: 500000,
            costs: 350000
          }
        }
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.type).toBe(QuestionType.PRICING);
      expect(result.projections.length).toBe(12); // Default time horizon
    });

    it('should handle market analysis', async () => {
      const request = {
        question: 'What if we gain 5% market share?',
        type: QuestionType.MARKET,
        parameters: {
          baselineMetrics: {
            revenue: 2000000,
            costs: 1400000
          }
        }
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.type).toBe(QuestionType.MARKET);
    });

    it('should handle operations analysis', async () => {
      const request = {
        question: 'What if we improve efficiency by 25%?',
        type: QuestionType.OPERATIONS,
        parameters: {
          baselineMetrics: {
            revenue: 1000000,
            costs: 800000
          }
        }
      };

      const result = await engine.run(request);

      expect(result).toBeDefined();
      expect(result.type).toBe(QuestionType.OPERATIONS);
    });
  });

  describe('get', () => {
    it('should retrieve existing analysis', async () => {
      const request = {
        question: 'What if we hire 5 people?',
        type: QuestionType.HIRING
      };

      const created = await engine.run(request);
      const retrieved = engine.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent analysis', () => {
      const result = engine.get('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should return all analyses', async () => {
      for (let i = 0; i < 3; i++) {
        await engine.run({
          question: `What if analysis ${i}?`,
          type: QuestionType.CUSTOM
        });
      }

      const analyses = engine.list();
      expect(analyses.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getTemplates', () => {
    it('should return templates', () => {
      const templates = engine.getTemplates();

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);

      for (const template of templates) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.type).toBeDefined();
        expect(template.question).toBeDefined();
      }
    });
  });
});

describe('NaturalLanguageParser', () => {
  describe('parse', () => {
    it('should detect hiring questions', () => {
      const result = NaturalLanguageParser.parse('What if we hire 10 engineers?');

      expect(result.type).toBe(QuestionType.HIRING);
      expect(result.variables.length).toBeGreaterThan(0);
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should detect pricing questions', () => {
      const result = NaturalLanguageParser.parse('What if we increase prices by 20%?');

      expect(result.type).toBe(QuestionType.PRICING);
    });

    it('should detect market questions', () => {
      const result = NaturalLanguageParser.parse('What if a competitor enters our market?');

      expect(result.type).toBe(QuestionType.MARKET);
    });

    it('should detect financial questions', () => {
      const result = NaturalLanguageParser.parse('What if our costs increase by 15%?');

      expect(result.type).toBe(QuestionType.FINANCIAL);
    });

    it('should detect operations questions', () => {
      const result = NaturalLanguageParser.parse('What if we improve process efficiency?');

      expect(result.type).toBe(QuestionType.OPERATIONS);
    });

    it('should detect technology questions', () => {
      const result = NaturalLanguageParser.parse('What if we implement AI automation?');

      expect(result.type).toBe(QuestionType.TECHNOLOGY);
    });

    it('should default to custom for unknown questions', () => {
      const result = NaturalLanguageParser.parse('What if something changes?');

      expect(result.type).toBe(QuestionType.CUSTOM);
    });
  });
});

describe('WhatIfCalculationEngine', () => {
  describe('calculate', () => {
    it('should calculate projections', () => {
      const result = WhatIfCalculationEngine.calculate(
        QuestionType.HIRING,
        [
          { id: 'num_hires', name: 'Hires', type: VariableType.NUMBER, currentValue: 10 },
          { id: 'productivity_gain', name: 'Productivity', type: VariableType.PERCENTAGE, currentValue: 15 }
        ],
        [
          { id: 'change1', variableId: 'num_hires', newValue: 10, changeType: 'absolute' as const }
        ],
        { revenue: 1000000, costs: 700000 },
        12,
        100
      );

      expect(result.projections).toBeDefined();
      expect(result.projections.length).toBe(12);
      expect(result.baselineMetrics).toBeDefined();
      expect(result.projectedMetrics).toBeDefined();
    });

    it('should calculate impacts', () => {
      const result = WhatIfCalculationEngine.calculate(
        QuestionType.PRICING,
        [
          { id: 'current_price', name: 'Price', type: VariableType.CURRENCY, currentValue: 100 },
          { id: 'price_change', name: 'Change', type: VariableType.PERCENTAGE, currentValue: 10 }
        ],
        [
          { id: 'change1', variableId: 'price_change', newValue: 10, changeType: 'percentage' as const }
        ],
        { revenue: 1000000, costs: 700000 },
        12,
        100
      );

      expect(result.impacts).toBeDefined();
      expect(result.impacts.length).toBeGreaterThan(0);
    });

    it('should handle empty variables', () => {
      const result = WhatIfCalculationEngine.calculate(
        QuestionType.CUSTOM,
        [],
        [],
        { revenue: 1000000, costs: 700000 },
        6,
        100
      );

      expect(result.projections).toBeDefined();
      expect(result.baselineMetrics.revenue).toBe(1000000);
    });
  });
});

describe('ScenarioComparisonEngine', () => {
  describe('compare', () => {
    it('should generate scenario comparisons', () => {
      const results = ScenarioComparisonEngine.compare(
        QuestionType.HIRING,
        [
          { id: 'num_hires', name: 'Hires', type: VariableType.NUMBER, currentValue: 10, unit: 'people' }
        ],
        [
          { id: 'change1', variableId: 'num_hires', newValue: 10, changeType: 'absolute' as const }
        ],
        5,
        { revenue: 1000000, costs: 700000, profit: 300000, margin: 30 }
      );

      expect(results).toBeDefined();
      expect(results.length).toBe(5);
      expect(results[0].scenarioName).toBeDefined();
      expect(results[0].totalImpact).toBeDefined();
      expect(results[0].riskAdjustedImpact).toBeDefined();
    });

    it('should sort scenarios by impact', () => {
      const results = ScenarioComparisonEngine.compare(
        QuestionType.PRICING,
        [
          { id: 'price_change', name: 'Change', type: VariableType.PERCENTAGE, currentValue: 10 }
        ],
        [
          { id: 'change1', variableId: 'price_change', newValue: 10, changeType: 'percentage' as const }
        ],
        3,
        { revenue: 1000000, costs: 700000, profit: 300000, margin: 30 }
      );

      // First scenario should have highest impact
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].totalImpact).toBeGreaterThanOrEqual(results[i].totalImpact);
      }
    });

    it('should identify tradeoffs', () => {
      const results = ScenarioComparisonEngine.compare(
        QuestionType.PRICING,
        [
          { id: 'price_change', name: 'Change', type: VariableType.PERCENTAGE, currentValue: 20 }
        ],
        [
          { id: 'change1', variableId: 'price_change', newValue: 20, changeType: 'percentage' as const }
        ],
        3,
        { revenue: 1000000, costs: 700000, profit: 300000, margin: 30 }
      );

      expect(results[0].tradeoffs).toBeDefined();
      expect(results[0].tradeoffs.positive.length).toBeGreaterThan(0);
      expect(results[0].tradeoffs.negative.length).toBeGreaterThan(0);
    });
  });
});

describe('InsightsGenerator', () => {
  describe('generate', () => {
    it('should generate opportunity insight for positive impact', () => {
      const insights = InsightsGenerator.generate(
        QuestionType.HIRING,
        [],
        [
          { period: 'End', baseline: 100, projected: 120, change: 20, changePercent: 20, confidenceInterval: [110, 130] as [number, number] }
        ],
        []
      );

      expect(insights).toBeDefined();
      expect(insights.some(i => i.type === 'opportunity' && i.priority === 'high')).toBe(true);
    });

    it('should generate risk insight for negative impact', () => {
      const insights = InsightsGenerator.generate(
        QuestionType.PRICING,
        [],
        [
          { period: 'End', baseline: 100, projected: 80, change: -20, changePercent: -20, confidenceInterval: [70, 90] as [number, number] }
        ],
        []
      );

      expect(insights).toBeDefined();
      expect(insights.some(i => i.type === 'risk')).toBe(true);
    });

    it('should generate comparison insight when scenarios provided', () => {
      const insights = InsightsGenerator.generate(
        QuestionType.CUSTOM,
        [],
        [],
        [
          {
            scenarioId: '1',
            scenarioName: 'Scenario 1',
            projections: [],
            impact: [],
            totalImpact: 50,
            riskAdjustedImpact: 40,
            confidence: 0.8,
            tradeoffs: { positive: [], negative: [] }
          },
          {
            scenarioId: '2',
            scenarioName: 'Scenario 2',
            projections: [],
            impact: [],
            totalImpact: 20,
            riskAdjustedImpact: 15,
            confidence: 0.7,
            tradeoffs: { positive: [], negative: [] }
          }
        ]
      );

      expect(insights).toBeDefined();
      expect(insights.some(i => i.title.includes('Scenario Analysis'))).toBe(true);
    });
  });
});

describe('RecommendationGenerator', () => {
  describe('generate', () => {
    it('should generate hiring recommendations', () => {
      const recommendations = RecommendationGenerator.generate(
        QuestionType.HIRING,
        [
          { metric: 'Hires', baseline: 0, projected: 10, impact: { absolute: 0, percentage: 0, confidence: 0.8 }, drivers: [] }
        ],
        [],
        []
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].action).toContain('hire');
    });

    it('should generate pricing recommendations', () => {
      const recommendations = RecommendationGenerator.generate(
        QuestionType.PRICING,
        [
          { metric: 'Price', baseline: 100, projected: 110, impact: { absolute: 10, percentage: 10, confidence: 0.8 }, drivers: [] }
        ],
        [],
        []
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.some(r => r.action.toLowerCase().includes('test'))).toBe(true);
    });

    it('should generate market recommendations', () => {
      const recommendations = RecommendationGenerator.generate(
        QuestionType.MARKET,
        [],
        [],
        []
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should generate operations recommendations', () => {
      const recommendations = RecommendationGenerator.generate(
        QuestionType.OPERATIONS,
        [],
        [],
        []
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.some(r => r.action.toLowerCase().includes('pilot'))).toBe(true);
    });
  });
});

describe('WhatIfTemplateLibrary', () => {
  describe('getTemplates', () => {
    it('should return all templates', () => {
      const templates = WhatIfTemplateLibrary.getTemplates();

      expect(templates).toBeDefined();
      expect(templates.length).toBe(5);

      const templateIds = templates.map(t => t.id);
      expect(templateIds).toContain('hiring-roi');
      expect(templateIds).toContain('pricing-change');
      expect(templateIds).toContain('market-expansion');
      expect(templateIds).toContain('cost-reduction');
      expect(templateIds).toContain('efficiency-improvement');
    });

    it('should have required fields for each template', () => {
      const templates = WhatIfTemplateLibrary.getTemplates();

      for (const template of templates) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.type).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.question).toBeDefined();
        expect(template.suggestedVariables).toBeDefined();
        expect(template.suggestedVariables.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getTemplate', () => {
    it('should return specific template', () => {
      const template = WhatIfTemplateLibrary.getTemplate('hiring-roi');

      expect(template).toBeDefined();
      expect(template?.id).toBe('hiring-roi');
      expect(template?.name).toBe('Hiring ROI Analysis');
    });

    it('should return undefined for non-existent template', () => {
      const template = WhatIfTemplateLibrary.getTemplate('non-existent');

      expect(template).toBeUndefined();
    });
  });
});
