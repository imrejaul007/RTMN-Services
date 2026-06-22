import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BUILTIN_SCENARIOS, SCENARIO_CATEGORIES, logger } from '../index.js';

const router = express.Router();

// Scenario Registry
const scenarioRegistry = new Map(Object.entries(BUILTIN_SCENARIOS));

/**
 * GET /api/scenarios
 * List all scenarios
 */
router.get('/', async (req, res) => {
  try {
    const { category, type } = req.query;

    let scenarios = Array.from(scenarioRegistry.values());

    if (category) {
      scenarios = scenarios.filter(s => s.category === category);
    }

    res.json({
      success: true,
      count: scenarios.length,
      categories: Object.values(SCENARIO_CATEGORIES),
      scenarios
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/scenarios/builtin
 * List built-in scenarios
 */
router.get('/builtin', async (req, res) => {
  res.json({
    success: true,
    count: Object.keys(BUILTIN_SCENARIOS).length,
    scenarios: Object.values(BUILTIN_SCENARIOS)
  });
});

/**
 * GET /api/scenarios/:id
 * Get specific scenario
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const scenario = scenarioRegistry.get(id);

    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: 'Scenario not found'
      });
    }

    res.json({
      success: true,
      scenario
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scenarios
 * Create a custom scenario
 */
router.post('/', async (req, res) => {
  try {
    const {
      id,
      name,
      description,
      category,
      parameters = {}
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        error: 'Name and category are required'
      });
    }

    const scenarioId = id || `custom_${uuidv4()}`;

    if (scenarioRegistry.has(scenarioId)) {
      return res.status(409).json({
        success: false,
        error: 'Scenario ID already exists'
      });
    }

    const scenario = {
      id: scenarioId,
      name,
      description: description || '',
      category,
      parameters,
      isBuiltIn: false,
      createdAt: new Date().toISOString()
    };

    scenarioRegistry.set(scenarioId, scenario);

    res.status(201).json({
      success: true,
      scenario
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/scenarios/run
 * Run a scenario
 */
router.post('/run', async (req, res) => {
  try {
    const {
      scenarioId,
      parameters = {},
      twinId
    } = req.body;

    if (!scenarioId) {
      return res.status(400).json({
        success: false,
        error: 'Scenario ID is required'
      });
    }

    const scenario = scenarioRegistry.get(scenarioId);

    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: 'Scenario not found'
      });
    }

    // Merge parameters
    const mergedParams = { ...scenario.parameters, ...parameters };

    // Create run
    const runId = `run_${uuidv4()}`;
    const run = {
      id: runId,
      scenarioId,
      scenarioName: scenario.name,
      parameters: mergedParams,
      twinId,
      status: 'running',
      startedAt: new Date().toISOString(),
      results: null
    };

    // Run simulation (simplified)
    setTimeout(() => {
      run.status = 'completed';
      run.completedAt = new Date().toISOString();
      run.results = generateScenarioResults(scenario, mergedParams);
    }, 50);

    res.status(202).json({
      success: true,
      runId,
      scenario: scenario.name,
      status: 'started'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function generateScenarioResults(scenario, params) {
  const baseResults = {
    outcomes: [],
    metrics: {},
    recommendations: []
  };

  switch (scenario.category) {
    case SCENARIO_CATEGORIES.GROWTH:
      baseResults.metrics = {
        projectedGrowth: (params.growthRate || 0.1) * 100,
        roi: 150 + Math.random() * 50,
        paybackPeriod: 18 + Math.random() * 12
      };
      baseResults.outcomes.push('Strong market opportunity identified');
      baseResults.recommendations.push('Proceed with expansion plan');
      break;

    case SCENARIO_CATEGORIES.OPTIMIZATION:
      baseResults.metrics = {
        costSavings: params.targetReduction * 100,
        efficiencyGain: 15 + Math.random() * 20,
        implementationCost: 50000 + Math.random() * 100000
      };
      baseResults.outcomes.push('Cost optimization viable');
      baseResults.recommendations.push('Implement in phases');
      break;

    case SCENARIO_CATEGORIES.RISK:
      baseResults.metrics = {
        riskScore: params.severityWeight * params.likelihoodWeight,
        riskLevel: params.severityWeight > 0.7 ? 'HIGH' : 'MODERATE',
        mitigationCost: 10000 + Math.random() * 50000
      };
      baseResults.outcomes.push('Risk factors identified');
      baseResults.recommendations.push('Develop mitigation strategy');
      break;

    default:
      baseResults.metrics = {
        successProbability: 0.5 + Math.random() * 0.4
      };
  }

  return baseResults;
}

/**
 * GET /api/scenarios/run/:runId
 * Get run results
 */
router.get('/run/:runId', async (req, res) => {
  try {
    const { runId } = req.params;

    // In a real system, this would look up the run
    // For now, return a placeholder
    res.json({
      success: true,
      runId,
      status: 'completed',
      results: {
        metrics: { success: true },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/scenarios/:id
 * Delete custom scenario
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const scenario = scenarioRegistry.get(id);

    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: 'Scenario not found'
      });
    }

    if (scenario.isBuiltIn) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete built-in scenarios'
      });
    }

    scenarioRegistry.delete(id);

    res.json({
      success: true,
      message: 'Scenario deleted',
      scenarioId: id
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/scenarios/compare
 * Compare multiple scenarios
 */
router.get('/compare', async (req, res) => {
  try {
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: 'Scenario IDs required'
      });
    }

    const scenarioIds = ids.split(',');
    const scenarios = [];

    for (const id of scenarioIds) {
      const scenario = scenarioRegistry.get(id);
      if (scenario) {
        scenarios.push({
          ...scenario,
          comparisonMetrics: generateComparisonMetrics(scenario)
        });
      }
    }

    res.json({
      success: true,
      count: scenarios.length,
      scenarios
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function generateComparisonMetrics(scenario) {
  return {
    complexity: Object.keys(scenario.parameters).length,
    timeToValue: '3-6 months',
    risk: scenario.category === 'risk' ? 'High' : 'Medium',
    roi: 100 + Math.random() * 100
  };
}

export default router;
