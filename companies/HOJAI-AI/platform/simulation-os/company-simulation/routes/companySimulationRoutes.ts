import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  CompanySimulationEngine
} from '../engine/companySimulationEngine.js';
import {
  CompanySimulationRequest,
  CompanySimulationResult,
  SimulationType,
  HiringPlanScenarioSchema,
  OrgRestructureScenarioSchema,
  ProcessChangeScenarioSchema,
  TechAdoptionScenarioSchema
} from '../models/companySimulation.js';

// ============================================================================
// Company Simulation Routes
// ============================================================================

const router = Router();
const engine = new CompanySimulationEngine();

// Validation schemas for each scenario type
const CompanySimulationRequestSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  scenario: z.union([
    HiringPlanScenarioSchema,
    OrgRestructureScenarioSchema,
    ProcessChangeScenarioSchema,
    TechAdoptionScenarioSchema
  ]),
  baseline: z.object({
    employees: z.array(z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      department: z.string(),
      roleLevel: z.number(),
      salary: z.number().positive(),
      skills: z.array(z.string()),
      performance: z.number().min(0).max(100),
      utilization: z.number().min(0).max(100),
      hireDate: z.string(),
      isActive: z.boolean()
    })),
    departments: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      headCount: z.number().int().nonnegative(),
      budget: z.number().nonnegative(),
      actualSpend: z.number().nonnegative(),
      revenue: z.number().nonnegative(),
      costPerEmployee: z.number().nonnegative(),
      revenuePerEmployee: z.number().nonnegative(),
      efficiency: z.number().min(0).max(100)
    })),
    currentRevenue: z.number().nonnegative(),
    currentCosts: z.number().nonnegative()
  }),
  parameters: z.object({
    iterations: z.number().int().min(100).max(10000).optional().default(1000),
    confidenceLevel: z.number().min(0).max(1).optional().default(0.95),
    timeHorizon: z.number().int().min(1).max(120).optional().default(12)
  }).optional()
});

// Error handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: result.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
        return;
      }
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * @route POST /api/simulate/company
 * @desc Run company simulation
 * @access Public
 */
router.post(
  '/company',
  validateRequest(CompanySimulationRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const request = req.body as CompanySimulationRequest;

    // Run the simulation
    const result = await engine.run(request);

    res.status(202).json({
      success: true,
      data: {
        id: result.id,
        status: result.status,
        scenarioType: result.scenarioType,
        summary: {
          financial: {
            profitChange: result.financial.profit.change,
            profitChangePercent: result.financial.profit.changePercent.toFixed(2) + '%',
            breakEvenMonths: result.financial.breakEven === Infinity ? 'Never' : Math.round(result.financial.breakEven)
          },
          operational: {
            employeesAffected: result.operational.employeeImpact.affected,
            employeesDisplaced: result.operational.employeeImpact.displaced,
            newHires: result.operational.employeeImpact.newHires
          },
          risks: {
            overallScore: result.risks.overallRiskScore,
            riskLevel: result.risks.riskLevel,
            riskCount: result.risks.risks.length
          }
        },
        metadata: {
          createdAt: result.metadata.createdAt,
          executionTimeMs: result.metadata.executionTimeMs,
          iterations: result.metadata.iterations
        }
      },
      message: 'Simulation completed successfully. Use GET /api/simulate/:id for full results.'
    });
  })
);

/**
 * @route GET /api/simulate/:id
 * @desc Get simulation results by ID
 * @access Public
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = engine.get(id);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Simulation not found',
        message: `No simulation found with ID: ${id}`
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
 * @route GET /api/simulate/company/:companyId
 * @desc Get all simulations for a company
 * @access Public
 */
router.get(
  '/company/:companyId',
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId } = req.params;

    const simulations = engine.list().filter(s => s.companyId === companyId);

    res.status(200).json({
      success: true,
      data: {
        count: simulations.length,
        simulations: simulations.map(s => ({
          id: s.id,
          scenarioType: s.scenarioType,
          status: s.status,
          createdAt: s.metadata.createdAt,
          profitChange: s.financial.profit.change,
          profitChangePercent: s.financial.profit.changePercent.toFixed(2) + '%',
          riskLevel: s.risks.riskLevel
        }))
      }
    });
  })
);

/**
 * @route GET /api/simulate/:id/scenarios
 * @desc Compare scenarios (for comparing multiple simulation results)
 * @access Public
 */
router.get(
  '/:id/scenarios',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { compareIds } = req.query;

    const primary = engine.get(id);

    if (!primary) {
      res.status(404).json({
        success: false,
        error: 'Primary simulation not found',
        message: `No simulation found with ID: ${id}`
      });
      return;
    }

    // Get comparison simulations
    const comparisonIds = compareIds
      ? (compareIds as string).split(',')
      : [];

    const comparisons = comparisonIds
      .map(cid => engine.get(cid))
      .filter((s): s is CompanySimulationResult => s !== undefined);

    // Build comparison result
    const allSimulations = [primary, ...comparisons];

    // Compare key metrics
    const metrics = [
      {
        name: 'Profit Change %',
        values: new Map(allSimulations.map(s => [s.id, s.financial.profit.changePercent])),
        higherIsBetter: true
      },
      {
        name: 'Risk Score',
        values: new Map(allSimulations.map(s => [s.id, s.risks.overallRiskScore])),
        higherIsBetter: false
      },
      {
        name: 'Break-Even (months)',
        values: new Map(allSimulations.map(s => [
          s.id,
          s.financial.breakEven === Infinity ? 999 : s.financial.breakEven
        ])),
        higherIsBetter: false
      },
      {
        name: 'Employees Affected',
        values: new Map(allSimulations.map(s => [s.id, s.operational.employeeImpact.affected])),
        higherIsBetter: false
      },
      {
        name: 'Implementation Time (months)',
        values: new Map(allSimulations.map(s => [s.id, s.operational.timeline.implementation])),
        higherIsBetter: false
      }
    ];

    // Determine winners for each metric
    const comparison = metrics.map(metric => {
      const entries = Array.from(metric.values.entries());
      const sorted = entries.sort((a, b) =>
        metric.higherIsBetter ? b[1] - a[1] : a[1] - b[1]
      );

      return {
        metric: metric.name,
        values: Object.fromEntries(entries.map(([id, value]) => [id, value])),
        bestValue: metric.higherIsBetter
          ? Math.max(...entries.map(e => e[1]))
          : Math.min(...entries.map(e => e[1])),
        bestScenarioId: sorted[0][0],
        higherIsBetter: metric.higherIsBetter
      };
    });

    // Overall winner (based on weighted scoring)
    const scores = new Map<string, number>();
    allSimulations.forEach(s => scores.set(s.id, 0));

    comparison.forEach((c, index) => {
      const weight = 1 / (index + 1); // Higher weight for more important metrics
      const entries = Array.from(c.values.entries());
      const maxVal = Math.max(...entries.map(e => e[1]));
      const minVal = Math.min(...entries.map(e => e[1]));
      const range = maxVal - minVal || 1;

      entries.forEach(([id, value]) => {
        const normalized = c.higherIsBetter
          ? (value - minVal) / range
          : (maxVal - value) / range;
        const current = scores.get(id) || 0;
        scores.set(id, current + normalized * weight * 100);
      });
    });

    const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    const winnerId = sortedScores[0][0];

    res.status(200).json({
      success: true,
      data: {
        primary: {
          id: primary.id,
          scenarioType: primary.scenarioType,
          status: primary.status
        },
        comparisons: comparison,
        scores: Object.fromEntries(sortedScores),
        winner: winnerId,
        winnerAnalysis: allSimulations.find(s => s.id === winnerId)!.scenarioType ===
          primary.scenarioType
          ? 'Primary scenario is the best option based on weighted metrics.'
          : 'Alternative scenario performs better. Review recommendations for the winning scenario.'
      }
    });
  })
);

/**
 * @route POST /api/simulate/:id/commit
 * @desc Commit winning scenario (generates implementation plan)
 * @access Public
 */
router.post(
  '/:id/commit',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { implementationNotes, priority } = req.body;

    const simulation = engine.get(id);

    if (!simulation) {
      res.status(404).json({
        success: false,
        error: 'Simulation not found',
        message: `No simulation found with ID: ${id}`
      });
      return;
    }

    if (simulation.status !== 'completed') {
      res.status(400).json({
        success: false,
        error: 'Simulation not completed',
        message: 'Only completed simulations can be committed'
      });
      return;
    }

    // Generate implementation plan
    const implementationPlan = {
      planId: uuidv4(),
      simulationId: id,
      status: 'draft',
      priority: priority || 'medium',
      phases: generateImplementationPhases(simulation),
      timeline: {
        totalMonths: Math.round(simulation.operational.timeline.stabilization),
        phases: simulation.operational.timeline.stabilization / 3
      },
      resources: {
        budget: Math.abs(simulation.financial.costs.change),
        headcount: simulation.operational.employeeImpact.newHires +
          simulation.operational.employeeImpact.retrained
      },
      risks: simulation.risks.risks.map(r => ({
        ...r,
        status: 'identified',
        mitigationOwner: 'TBD'
      })),
      successCriteria: [
        {
          metric: 'Profit Improvement',
          target: `${simulation.financial.profit.changePercent.toFixed(1)}%`,
          measurement: 'Quarterly financial review'
        },
        {
          metric: 'Efficiency Gain',
          target: `${simulation.operational.efficiency.change.toFixed(0)}%`,
          measurement: 'Monthly operational metrics'
        }
      ],
      notes: implementationNotes || '',
      createdAt: new Date(),
      createdBy: 'simulation-os'
    };

    res.status(201).json({
      success: true,
      data: implementationPlan,
      message: 'Implementation plan generated successfully'
    });
  })
);

/**
 * @route GET /api/simulate/types
 * @desc Get available simulation types
 * @access Public
 */
router.get(
  '/types/company',
  asyncHandler(async (req: Request, res: Response) => {
    const types = [
      {
        type: SimulationType.ORG_RESTUCTURE,
        name: 'Organization Restructure',
        description: 'Simulate organizational restructuring impact including layoffs, role changes, and structure changes',
        useCases: [
          'Mergers and acquisitions',
          'Department consolidation',
          'Leadership changes',
          'Flattening hierarchies'
        ],
        parameters: [
          { name: 'targetStructure', type: 'enum', required: true },
          { name: 'departmentsAffected', type: 'array', required: true },
          { name: 'layoffs', type: 'number', required: false },
          { name: 'newRoles', type: 'array', required: false },
          { name: 'timeline', type: 'number', required: true }
        ]
      },
      {
        type: SimulationType.HIRING_PLAN,
        name: 'Hiring Plan ROI',
        description: 'Calculate ROI and impact of planned hiring across departments',
        useCases: [
          'Headcount expansion',
          'Team scaling',
          'New role creation',
          'Talent acquisition strategy'
        ],
        parameters: [
          { name: 'hires', type: 'array', required: true },
          { name: 'timeline', type: 'number', required: true },
          { name: 'benefits', type: 'object', required: false }
        ]
      },
      {
        type: SimulationType.PROCESS_CHANGE,
        name: 'Process Change Impact',
        description: 'Analyze impact of business process improvements',
        useCases: [
          'Automation initiatives',
          'Workflow optimization',
          'Quality improvements',
          'Cost reduction programs'
        ],
        parameters: [
          { name: 'processName', type: 'string', required: true },
          { name: 'department', type: 'enum', required: true },
          { name: 'currentEfficiency', type: 'number', required: true },
          { name: 'targetEfficiency', type: 'number', required: true },
          { name: 'implementationCost', type: 'number', required: true },
          { name: 'timeline', type: 'number', required: true }
        ]
      },
      {
        type: SimulationType.TECH_ADOPTION,
        name: 'Technology Adoption',
        description: 'Evaluate ROI of technology investments and automation',
        useCases: [
          'AI/ML implementation',
          'Software deployment',
          'Infrastructure upgrades',
          'Automation projects'
        ],
        parameters: [
          { name: 'technology', type: 'string', required: true },
          { name: 'category', type: 'enum', required: true },
          { name: 'implementationCost', type: 'number', required: true },
          { name: 'productivityGain', type: 'number', required: true },
          { name: 'adoptionRate', type: 'number', required: true },
          { name: 'timeline', type: 'number', required: true }
        ]
      }
    ];

    res.status(200).json({
      success: true,
      data: types
    });
  })
);

/**
 * Generate implementation phases from simulation results
 */
function generateImplementationPhases(simulation: CompanySimulationResult) {
  const phases = [];
  const totalMonths = simulation.operational.timeline.stabilization;
  const phaseLength = Math.round(totalMonths / 3);

  // Phase 1: Planning & Preparation
  phases.push({
    phase: 1,
    name: 'Planning & Preparation',
    duration: `${phaseLength} weeks`,
    tasks: [
      'Finalize implementation strategy',
      'Allocate resources and budget',
      'Identify key stakeholders',
      'Develop communication plan'
    ],
    deliverables: [
      'Implementation roadmap',
      'Resource allocation plan',
      'Risk mitigation plan'
    ],
    startMonth: 1,
    endMonth: phaseLength
  });

  // Phase 2: Implementation
  phases.push({
    phase: 2,
    name: 'Implementation',
    duration: `${phaseLength * 2} weeks`,
    tasks: [
      'Execute changes per simulation plan',
      'Monitor progress against projections',
      'Adjust based on early feedback',
      'Train affected employees'
    ],
    deliverables: [
      'Completed organizational changes',
      'Trained workforce',
      'Updated processes/systems'
    ],
    startMonth: phaseLength + 1,
    endMonth: phaseLength * 2
  });

  // Phase 3: Stabilization & Optimization
  phases.push({
    phase: 3,
    name: 'Stabilization & Optimization',
    duration: `${phaseLength} weeks`,
    tasks: [
      'Monitor KPIs against targets',
      'Address issues and gaps',
      'Optimize processes',
      'Document lessons learned'
    ],
    deliverables: [
      'Performance report',
      'Optimization recommendations',
      'Final implementation report'
    ],
    startMonth: phaseLength * 2 + 1,
    endMonth: totalMonths
  });

  return phases;
}

export default router;
