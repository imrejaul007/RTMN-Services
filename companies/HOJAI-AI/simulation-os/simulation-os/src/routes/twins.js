import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { twinRegistry, TWIN_STATES, logger } from '../index.js';

const router = express.Router();

// Twin Types
const TWIN_TYPES = {
  BUSINESS: 'business',
  PERSONAL: 'personal',
  ASSET: 'asset',
  MARKET: 'market'
};

/**
 * GET /api/twins
 * List all digital twins
 */
router.get('/', async (req, res) => {
  try {
    const { type, state, search } = req.query;

    let twins = Array.from(twinRegistry.values());

    // Filter by type
    if (type) {
      twins = twins.filter(t => t.type === type);
    }

    // Filter by state
    if (state) {
      twins = twins.filter(t => t.state === state);
    }

    // Search by name
    if (search) {
      const searchLower = search.toLowerCase();
      twins = twins.filter(t =>
        t.name?.toLowerCase().includes(searchLower) ||
        t.id?.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      count: twins.length,
      twins
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/twins/create
 * Create a new digital twin
 */
router.post('/create', async (req, res) => {
  try {
    const {
      id,
      type,
      name,
      metadata = {},
      twinData = {}
    } = req.body;

    if (!type || !name) {
      return res.status(400).json({
        success: false,
        error: 'Type and name are required'
      });
    }

    // Generate ID if not provided
    const twinId = id || `twin:${type}:${uuidv4()}`;

    // Check if twin already exists
    if (twinRegistry.has(twinId)) {
      return res.status(409).json({
        success: false,
        error: 'Twin already exists'
      });
    }

    const twin = {
      id: twinId,
      type,
      name,
      state: TWIN_STATES.ACTIVE,
      metadata: {
        createdAt: new Date().toISOString(),
        ...metadata
      },
      data: twinData,
      history: [],
      simulations: [],
      lastUpdated: new Date().toISOString()
    };

    twinRegistry.set(twinId, twin);

    logger.info(`Digital twin created: ${twinId}`);

    res.status(201).json({
      success: true,
      twin
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/twins/:id
 * Get twin details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const twin = twinRegistry.get(id);

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: 'Twin not found'
      });
    }

    res.json({
      success: true,
      twin
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/twins/:id
 * Update twin data
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const twin = twinRegistry.get(id);

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: 'Twin not found'
      });
    }

    // Add to history
    twin.history.push({
      timestamp: new Date().toISOString(),
      previousData: { ...twin.data }
    });

    // Update twin
    twin.data = { ...twin.data, ...updates.data };
    twin.lastUpdated = new Date().toISOString();

    if (updates.metadata) {
      twin.metadata = { ...twin.metadata, ...updates.metadata };
    }

    twinRegistry.set(id, twin);

    res.json({
      success: true,
      twin
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/twins/:id/pause
 * Pause twin
 */
router.post('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;

    const twin = twinRegistry.get(id);

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: 'Twin not found'
      });
    }

    twin.state = TWIN_STATES.PAUSED;
    twin.lastUpdated = new Date().toISOString();
    twinRegistry.set(id, twin);

    res.json({
      success: true,
      twin
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/twins/:id/resume
 * Resume twin
 */
router.post('/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;

    const twin = twinRegistry.get(id);

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: 'Twin not found'
      });
    }

    twin.state = TWIN_STATES.ACTIVE;
    twin.lastUpdated = new Date().toISOString();
    twinRegistry.set(id, twin);

    res.json({
      success: true,
      twin
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/twins/:id
 * Archive/delete twin
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const twin = twinRegistry.get(id);

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: 'Twin not found'
      });
    }

    twin.state = TWIN_STATES.ARCHIVED;
    twin.lastUpdated = new Date().toISOString();
    twinRegistry.set(id, twin);

    res.json({
      success: true,
      message: 'Twin archived',
      twinId: id
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/twins/:id/history
 * Get twin history
 */
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const twin = twinRegistry.get(id);

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: 'Twin not found'
      });
    }

    const history = twin.history.slice(-parseInt(limit));

    res.json({
      success: true,
      twinId: id,
      count: history.length,
      history
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/twins/:id/simulate
 * Run simulation on twin
 */
router.post('/:id/simulate', async (req, res) => {
  try {
    const { id } = req.params;
    const { scenarioType, parameters = {} } = req.body;

    const twin = twinRegistry.get(id);

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: 'Twin not found'
      });
    }

    // Create simulation
    const simulationId = `sim_${Date.now()}`;
    const simulation = {
      id: simulationId,
      twinId: id,
      type: scenarioType,
      parameters,
      status: 'running',
      startedAt: new Date().toISOString()
    };

    twin.simulations.push(simulation);
    twinRegistry.set(id, twin);

    // Run simulation asynchronously
    setTimeout(() => {
      simulation.status = 'completed';
      simulation.completedAt = new Date().toISOString();
      simulation.results = generateSimulationResults(twin, scenarioType, parameters);
    }, 100);

    res.status(202).json({
      success: true,
      simulation
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function generateSimulationResults(twin, type, params) {
  // Generate realistic simulation results
  const baseValue = twin.data?.value || 100;

  return {
    type,
    parameters: params,
    projected: {
      value: baseValue * (1 + (params.growthRate || 0.1)),
      timeline: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        value: baseValue * (1 + (params.growthRate || 0.1) * (i + 1) / 12)
      }))
    },
    confidence: 0.85,
    generatedAt: new Date().toISOString()
  };
}

/**
 * GET /api/twins/:id/simulations
 * Get twin simulations
 */
router.get('/:id/simulations', async (req, res) => {
  try {
    const { id } = req.params;

    const twin = twinRegistry.get(id);

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: 'Twin not found'
      });
    }

    res.json({
      success: true,
      twinId: id,
      count: twin.simulations.length,
      simulations: twin.simulations
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/twins/link
 * Link twins together
 */
router.post('/link', async (req, res) => {
  try {
    const { source, target, relationship } = req.body;

    if (!source || !target || !relationship) {
      return res.status(400).json({
        success: false,
        error: 'Source, target, and relationship are required'
      });
    }

    const sourceTwin = twinRegistry.get(source);
    const targetTwin = twinRegistry.get(target);

    if (!sourceTwin || !targetTwin) {
      return res.status(404).json({
        success: false,
        error: 'One or both twins not found'
      });
    }

    // Create link
    const link = {
      id: `link_${Date.now()}`,
      source,
      target,
      relationship,
      createdAt: new Date().toISOString()
    };

    // Store link (could be in a separate map)
    if (!sourceTwin.links) sourceTwin.links = [];
    if (!targetTwin.links) targetTwin.links = [];

    sourceTwin.links.push(link);
    targetTwin.links.push({ ...link, source: target, target: source });

    twinRegistry.set(source, sourceTwin);
    twinRegistry.set(target, targetTwin);

    res.json({
      success: true,
      link
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/twins/federation
 * Get federated twin data
 */
router.get('/federation', async (req, res) => {
  try {
    const { type } = req.query;

    let twins = Array.from(twinRegistry.values());

    if (type) {
      twins = twins.filter(t => t.type === type);
    }

    // Aggregate federated data
    const federation = {
      totalTwins: twins.length,
      byType: {},
      totalValue: 0,
      activeCount: 0
    };

    for (const twin of twins) {
      if (!federation.byType[twin.type]) {
        federation.byType[twin.type] = { count: 0, totalValue: 0 };
      }

      federation.byType[twin.type].count++;
      federation.totalValue += twin.data?.value || 0;

      if (twin.state === TWIN_STATES.ACTIVE) {
        federation.activeCount++;
      }
    }

    res.json({
      success: true,
      federation
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
