import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WhatIfAnalysisEngine } from '../engine/whatifAnalysisEngine.js';
import { WhatIfAnalysisRequest, QuestionType } from '../models/whatifAnalysis.js';

// ============================================================================
// What-If Analysis Routes
// ============================================================================

const router = Router();
const engine = new WhatIfAnalysisEngine();

// Validation schema
const WhatIfAnalysisRequestSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  type: z.nativeEnum(QuestionType),
  description: z.string().optional(),
  variables: z.array(z.object({
    id: z.string(),
    currentValue: z.union([z.number(), z.boolean(), z.string()])
  })).optional(),
  changes: z.array(z.object({
    variableId: z.string(),
    newValue: z.union([z.number(), z.boolean(), z.string()]),
    changeType: z.enum(['absolute', 'percentage', 'relative']),
    confidence: z.number().min(0).max(1).optional()
  })).optional(),
  parameters: z.object({
    timeHorizon: z.number().int().min(1).max(60).optional(),
    scenarios: z.number().int().min(2).max(10).optional(),
    includeComparison: z.boolean().optional(),
    baselineMetrics: z.object({
      revenue: z.number().optional(),
      costs: z.number().optional(),
      employees: z.number().optional(),
      customers: z.number().optional()
    }).optional()
  }).optional()
});

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * @route POST /api/simulate/whatif
 * @desc Run what-if analysis
 * @access Public
 */
router.post(
  '/whatif',
  asyncHandler(async (req: Request, res: Response) => {
    const validation = WhatIfAnalysisRequestSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
      return;
    }

    const request = validation.data as WhatIfAnalysisRequest;
    const result = await engine.run(request);

    res.status(202).json({
      success: true,
      data: {
        id: result.id,
        question: result.question,
        type: result.type,
        summary: {
          baseline: {
            revenue: result.baselineMetrics.revenue,
            costs: result.baselineMetrics.costs,
            profit: result.baselineMetrics.profit,
            margin: `${result.baselineMetrics.margin.toFixed(1)}%`
          },
          projected: {
            revenue: result.projectedMetrics.revenue,
            costs: result.projectedMetrics.costs,
            profit: result.projectedMetrics.profit,
            margin: `${result.projectedMetrics.margin.toFixed(1)}%`
          },
          change: {
            profit: result.projectedMetrics.profit - result.baselineMetrics.profit,
            profitPercent: ((result.projectedMetrics.profit - result.baselineMetrics.profit) / result.baselineMetrics.profit * 100).toFixed(1) + '%'
          }
        },
        insights: result.insights.map(i => ({
          type: i.type,
          title: i.title,
          priority: i.priority
        })),
        topRecommendations: result.recommendations.slice(0, 3).map(r => ({
          action: r.action,
          effort: r.effort
        })),
        metadata: {
          createdAt: result.metadata.createdAt,
          scenariosCompared: result.metadata.scenariosCompared,
          assumptionsUsed: result.metadata.assumptionsUsed
        }
      },
      message: 'What-if analysis completed. Use GET /api/simulate/whatif/:id for full results.'
    });
  })
);

/**
 * @route GET /api/simulate/whatif/:id
 * @desc Get what-if analysis results by ID
 * @access Public
 */
router.get(
  '/whatif/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = engine.get(id);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Analysis not found',
        message: `No analysis found with ID: ${id}`
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result
    });
  })
);

/**
 * @route POST /api/simulate/whatif/compare
 * @desc Compare multiple what-if analyses
 * @access Public
 */
router.post(
  '/whatif/compare',
  asyncHandler(async (req: Request, res: Response) => {
    const { analysisIds } = req.body;

    if (!analysisIds || !Array.isArray(analysisIds) || analysisIds.length < 2) {
      res.status(400).json({
        success: false,
        error: 'At least 2 analysis IDs required for comparison'
      });
      return;
    }

    const analyses = analysisIds
      .map(id => engine.get(id))
      .filter(a => a !== undefined);

    if (analyses.length < 2) {
      res.status(404).json({
        success: false,
        error: 'Not enough valid analyses found'
      });
      return;
    }

    // Build comparison
    const comparison = {
      analyses: analyses.map(a => ({
        id: a!.id,
        question: a!.question,
        type: a!.type,
        summary: {
          baseline: a!.baselineMetrics.profit,
          projected: a!.projectedMetrics.profit,
          change: a!.projectedMetrics.profit - a!.baselineMetrics.profit,
          changePercent: ((a!.projectedMetrics.profit - a!.baselineMetrics.profit) / a!.baselineMetrics.profit * 100).toFixed(1) + '%'
        }
      })),
      rankings: {
        bestImpact: analyses.sort((a, b) =>
          (b!.projectedMetrics.profit - b!.baselineMetrics.profit) -
          (a!.projectedMetrics.profit - a!.baselineMetrics.profit)
        )[0]?.id,
        lowestRisk: analyses.sort((a, b) =>
          a!.metadata.confidenceLevel - b!.metadata.confidenceLevel
        )[0]?.id
      },
      insights: this.generateComparisonInsights(analyses)
    };

    res.status(200).json({
      success: true,
      data: comparison
    });
  })
);

/**
 * Generate insights for comparison
 */
private generateComparisonInsights(analyses: any[]): any[] {
  const insights: any[] = [];

  const best = analyses.reduce((best, current) => {
    const currentChange = current.projectedMetrics.profit - current.baselineMetrics.profit;
    const bestChange = best ? best.projectedMetrics.profit - best.baselineMetrics.profit : -Infinity;
    return currentChange > bestChange ? current : best;
  }, null);

  if (best) {
    insights.push({
      type: 'opportunity',
      title: `${best.type} change has the highest impact`,
      description: `${best.question} results in ${((best.projectedMetrics.profit - best.baselineMetrics.profit) / best.baselineMetrics.profit * 100).toFixed(1)}% profit improvement`,
      priority: 'high'
    });
  }

  const risks = analyses.filter(a =>
    a.projectedMetrics.profit < a.baselineMetrics.profit
  );

  if (risks.length > 0) {
    insights.push({
      type: 'risk',
      title: `${risks.length} scenario(s) have negative impact`,
      description: 'Consider avoiding or modifying these changes',
      priority: 'medium'
    });
  }

  return insights;
}

/**
 * @route GET /api/simulate/whatif/templates
 * @desc Get what-if analysis templates
 * @access Public
 */
router.get(
  '/whatif/templates',
  asyncHandler(async (req: Request, res: Response) => {
    const templates = engine.getTemplates();

    res.status(200).json({
      success: true,
      data: {
        templates: templates.map(t => ({
          id: t.id,
          name: t.name,
          type: t.type,
          description: t.description,
          question: t.question,
          variables: t.suggestedVariables.map(v => ({
            id: v.id,
            name: v.name,
            type: v.type,
            currentValue: v.currentValue,
            unit: v.unit
          }))
        }))
      }
    });
  })
);

/**
 * @route GET /api/simulate/whatif/templates/:id
 * @desc Get specific template by ID
 * @access Public
 */
router.get(
  '/whatif/templates/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const templates = engine.getTemplates();
    const template = templates.find(t => t.id === id);

    if (!template) {
      res.status(404).json({
        success: false,
        error: 'Template not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: template
    });
  })
);

/**
 * @route GET /api/simulate/whatif/types
 * @desc Get available question types
 * @access Public
 */
router.get(
  '/whatif/types',
  asyncHandler(async (req: Request, res: Response) => {
    const types = Object.values(QuestionType).map(type => ({
      value: type,
      label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      examples: this.getTypeExamples(type)
    }));

    res.status(200).json({
      success: true,
      data: { types }
    });
  })
);

/**
 * Get examples for a question type
 */
private getTypeExamples(type: QuestionType): string[] {
  switch (type) {
    case QuestionType.HIRING:
      return [
        'What if we hire 10 more engineers?',
        'What if we double our sales team?',
        'What if we add 5 customer support agents?'
      ];
    case QuestionType.PRICING:
      return [
        'What if we increase prices by 10%?',
        'What if we offer a 20% discount?',
        'What if we change our pricing model?'
      ];
    case QuestionType.MARKET:
      return [
        'What if a competitor enters our market?',
        'What if we gain 5% market share?',
        'What if we expand to a new region?'
      ];
    case QuestionType.FINANCIAL:
      return [
        'What if our costs increase by 15%?',
        'What if revenue grows 20%?',
        'What if margins decrease by 5%?'
      ];
    case QuestionType.OPERATIONS:
      return [
        'What if we automate 30% of tasks?',
        'What if we improve efficiency by 20%?',
        'What if we reduce process time by half?'
      ];
    case QuestionType.TECHNOLOGY:
      return [
        'What if we adopt AI for customer service?',
        'What if we migrate to a new ERP?',
        'What if we implement automation?'
      ];
    case QuestionType.ORGANIZATION:
      return [
        'What if we restructure into teams?',
        'What if we eliminate a department?',
        'What if we flatten the hierarchy?'
      ];
    default:
      return ['Custom what-if scenario'];
  }
}

export default router;
