import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  FraudPattern,
  FraudPatternType,
  FraudStore,
  DEFAULT_PATTERNS,
  PatternCondition
} from '../models/Fraud';

const router = Router();

// In-memory store (in production, use a database)
const patternStore = new FraudStore();

// Initialize with default patterns
function initializePatterns(): void {
  for (const patternDef of DEFAULT_PATTERNS) {
    const pattern = {
      ...patternDef,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    patternStore.addPattern(pattern);
  }
}

initializePatterns();

/**
 * GET /api/patterns
 * List all fraud patterns
 */
router.get('/', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');

  try {
    const { enabled, type } = req.query;

    let patterns = patternStore.getAllPatterns();

    // Apply filters
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      patterns = patterns.filter(p => p.enabled === isEnabled);
    }

    if (type) {
      patterns = patterns.filter(p => p.type === type);
    }

    res.json({
      patterns,
      count: patterns.length
    });
  } catch (error) {
    logger.error('Failed to list patterns', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to list patterns'
    });
  }
});

/**
 * GET /api/patterns/:id
 * Get a specific pattern
 */
router.get('/:id', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');

  try {
    const pattern = patternStore.getPattern(req.params.id);

    if (!pattern) {
      return res.status(404).json({
        error: 'Pattern not found'
      });
    }

    res.json(pattern);
  } catch (error) {
    logger.error('Failed to get pattern', {
      patternId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get pattern'
    });
  }
});

/**
 * POST /api/patterns
 * Create a new fraud pattern
 */
router.post('/', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');
  const twinSync = req.app.get('twinSync');

  try {
    const patternData = req.body;

    // Validate required fields
    if (!patternData.name || !patternData.type || !patternData.description) {
      return res.status(400).json({
        error: 'Missing required fields: name, type, description'
      });
    }

    // Validate pattern type
    if (!Object.values(FraudPatternType).includes(patternData.type)) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${Object.values(FraudPatternType).join(', ')}`
      });
    }

    // Validate weight
    if (patternData.weight !== undefined && (patternData.weight < 0 || patternData.weight > 100)) {
      return res.status(400).json({
        error: 'Weight must be between 0 and 100'
      });
    }

    // Validate conditions
    if (patternData.conditions && !Array.isArray(patternData.conditions)) {
      return res.status(400).json({
        error: 'Conditions must be an array'
      });
    }

    const pattern: FraudPattern = {
      id: uuidv4(),
      name: patternData.name,
      type: patternData.type,
      description: patternData.description,
      enabled: patternData.enabled !== undefined ? patternData.enabled : true,
      weight: patternData.weight || 20,
      conditions: patternData.conditions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: patternData.metadata
    };

    patternStore.addPattern(pattern);

    // Sync to twin
    twinSync.syncPatterns([pattern]);

    logger.info('Pattern created', {
      patternId: pattern.id,
      name: pattern.name,
      type: pattern.type
    });

    res.status(201).json(pattern);
  } catch (error) {
    logger.error('Failed to create pattern', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to create pattern'
    });
  }
});

/**
 * PUT /api/patterns/:id
 * Update a fraud pattern (full replace)
 */
router.put('/:id', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');
  const twinSync = req.app.get('twinSync');

  try {
    const existingPattern = patternStore.getPattern(req.params.id);

    if (!existingPattern) {
      return res.status(404).json({
        error: 'Pattern not found'
      });
    }

    const patternData = req.body;

    // Validate required fields
    if (!patternData.name || !patternData.type || !patternData.description) {
      return res.status(400).json({
        error: 'Missing required fields: name, type, description'
      });
    }

    const updatedPattern: FraudPattern = {
      ...existingPattern,
      name: patternData.name,
      type: patternData.type,
      description: patternData.description,
      enabled: patternData.enabled !== undefined ? patternData.enabled : existingPattern.enabled,
      weight: patternData.weight !== undefined ? patternData.weight : existingPattern.weight,
      conditions: patternData.conditions || existingPattern.conditions,
      updatedAt: new Date(),
      metadata: patternData.metadata || existingPattern.metadata
    };

    patternStore.updatePattern(req.params.id, updatedPattern);

    // Sync to twin
    twinSync.syncPatterns([updatedPattern]);

    logger.info('Pattern updated', {
      patternId: req.params.id
    });

    res.json(updatedPattern);
  } catch (error) {
    logger.error('Failed to update pattern', {
      patternId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to update pattern'
    });
  }
});

/**
 * PATCH /api/patterns/:id
 * Partial update a fraud pattern
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');
  const twinSync = req.app.get('twinSync');

  try {
    const existingPattern = patternStore.getPattern(req.params.id);

    if (!existingPattern) {
      return res.status(404).json({
        error: 'Pattern not found'
      });
    }

    const updates: Partial<FraudPattern> = {};

    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.type !== undefined) updates.type = req.body.type;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.enabled !== undefined) updates.enabled = req.body.enabled;
    if (req.body.weight !== undefined) updates.weight = req.body.weight;
    if (req.body.conditions !== undefined) updates.conditions = req.body.conditions;
    if (req.body.metadata !== undefined) updates.metadata = req.body.metadata;

    const updatedPattern = patternStore.updatePattern(req.params.id, updates);

    // Sync to twin
    if (updatedPattern) {
      twinSync.syncPatterns([updatedPattern]);
    }

    logger.info('Pattern patched', {
      patternId: req.params.id,
      updates: Object.keys(updates)
    });

    res.json(updatedPattern);
  } catch (error) {
    logger.error('Failed to patch pattern', {
      patternId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to patch pattern'
    });
  }
});

/**
 * DELETE /api/patterns/:id
 * Delete a fraud pattern
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');

  try {
    const existingPattern = patternStore.getPattern(req.params.id);

    if (!existingPattern) {
      return res.status(404).json({
        error: 'Pattern not found'
      });
    }

    patternStore.deletePattern(req.params.id);

    logger.info('Pattern deleted', {
      patternId: req.params.id,
      name: existingPattern.name
    });

    res.json({
      message: 'Pattern deleted successfully',
      patternId: req.params.id
    });
  } catch (error) {
    logger.error('Failed to delete pattern', {
      patternId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to delete pattern'
    });
  }
});

/**
 * POST /api/patterns/:id/enable
 * Enable a pattern
 */
router.post('/:id/enable', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');
  const twinSync = req.app.get('twinSync');

  try {
    const updatedPattern = patternStore.updatePattern(req.params.id, { enabled: true });

    if (!updatedPattern) {
      return res.status(404).json({
        error: 'Pattern not found'
      });
    }

    twinSync.syncPatterns([updatedPattern]);

    logger.info('Pattern enabled', {
      patternId: req.params.id
    });

    res.json(updatedPattern);
  } catch (error) {
    logger.error('Failed to enable pattern', {
      patternId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to enable pattern'
    });
  }
});

/**
 * POST /api/patterns/:id/disable
 * Disable a pattern
 */
router.post('/:id/disable', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');
  const twinSync = req.app.get('twinSync');

  try {
    const updatedPattern = patternStore.updatePattern(req.params.id, { enabled: false });

    if (!updatedPattern) {
      return res.status(404).json({
        error: 'Pattern not found'
      });
    }

    twinSync.syncPatterns([updatedPattern]);

    logger.info('Pattern disabled', {
      patternId: req.params.id
    });

    res.json(updatedPattern);
  } catch (error) {
    logger.error('Failed to disable pattern', {
      patternId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to disable pattern'
    });
  }
});

/**
 * GET /api/patterns/types
 * Get all pattern types
 */
router.get('/meta/types', async (req: Request, res: Response) => {
  res.json({
    types: Object.values(FraudPatternType),
    descriptions: {
      [FraudPatternType.VELOCITY]: 'Detects rapid transaction patterns',
      [FraudPatternType.AMOUNT_ANOMALY]: 'Detects unusual transaction amounts',
      [FraudPatternType.GEO_ANOMALY]: 'Detects unusual geographic locations',
      [FraudPatternType.DEVICE_FINGERPRINT]: 'Detects new/unknown devices',
      [FraudPatternType.BEHAVIORAL]: 'Detects unusual user behavior',
      [FraudPatternType.NETWORK]: 'Detects connections to fraudulent networks',
      [FraudPatternType.TIME_BASED]: 'Detects unusual transaction timing',
      [FraudPatternType.CUSTOM]: 'Custom fraud patterns'
    }
  });
});

/**
 * POST /api/patterns/reset
 * Reset patterns to defaults
 */
router.post('/reset', async (req: Request, res: Response) => {
  const logger = req.app.get('logger');
  const twinSync = req.app.get('twinSync');

  try {
    // Clear existing patterns
    const allPatterns = patternStore.getAllPatterns();
    for (const pattern of allPatterns) {
      patternStore.deletePattern(pattern.id);
    }

    // Re-initialize defaults
    const patterns: FraudPattern[] = [];
    for (const patternDef of DEFAULT_PATTERNS) {
      const pattern = {
        ...patternDef,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      patternStore.addPattern(pattern);
      patterns.push(pattern);
    }

    // Sync to twin
    twinSync.syncPatterns(patterns);

    logger.info('Patterns reset to defaults', {
      count: patterns.length
    });

    res.json({
      message: 'Patterns reset to defaults',
      patterns,
      count: patterns.length
    });
  } catch (error) {
    logger.error('Failed to reset patterns', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to reset patterns'
    });
  }
});

export default router;
