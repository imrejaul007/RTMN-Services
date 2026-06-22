/**
 * Taxonomy Routes
 * Unified twin taxonomy management
 */

import { Router } from 'express';
import { redis, TWIN_TYPES, HUMAN_SUBTYPES, BUSINESS_SUBTYPES, ASSET_SUBTYPES, MARKET_SUBTYPES, AGENT_SUBTYPES, RELATIONSHIP_TYPES } from '../index.js';

const router = Router();

/**
 * Get complete taxonomy
 * GET /api/taxonomy
 */
router.get('/', (req, res) => {
  res.json({
    twinTypes: {
      HUMAN: {
        type: TWIN_TYPES.HUMAN,
        description: 'Human entities (Customer, Employee, Patient, Guest)',
        subtypes: Object.values(HUMAN_SUBTYPES),
        examples: ['Customer Twin', 'Employee Twin', 'Patient Twin', 'Guest Twin']
      },
      BUSINESS: {
        type: TWIN_TYPES.BUSINESS,
        description: 'Business entities (Store, Restaurant, Hotel, Clinic)',
        subtypes: Object.values(BUSINESS_SUBTYPES),
        examples: ['Store Twin', 'Restaurant Twin', 'Hotel Twin', 'Clinic Twin']
      },
      ASSET: {
        type: TWIN_TYPES.ASSET,
        description: 'Physical assets (Property, Vehicle, Equipment)',
        subtypes: Object.values(ASSET_SUBTYPES),
        examples: ['Property Twin', 'Vehicle Twin', 'Equipment Twin']
      },
      MARKET: {
        type: TWIN_TYPES.MARKET,
        description: 'Market entities (Competitor, Region, Demand)',
        subtypes: Object.values(MARKET_SUBTYPES),
        examples: ['Competitor Twin', 'Region Twin', 'Demand Twin']
      },
      AGENT: {
        type: TWIN_TYPES.AGENT,
        description: 'AI agents and workers',
        subtypes: Object.values(AGENT_SUBTYPES),
        examples: ['AI Worker Twin', 'AI Manager Twin']
      },
      RELATIONSHIP: {
        type: TWIN_TYPES.RELATIONSHIP,
        description: 'Relationships between twins',
        relationshipTypes: Object.values(RELATIONSHIP_TYPES),
        examples: ['Customer-Store Relationship', 'Employee-Business Relationship']
      }
    },
    version: '1.0.0'
  });
});

/**
 * Get twin types
 * GET /api/taxonomy/types
 */
router.get('/types', (req, res) => {
  res.json({
    types: Object.values(TWIN_TYPES)
  });
});

/**
 * Get subtypes for a type
 * GET /api/taxonomy/types/:type/subtypes
 */
router.get('/types/:type/subtypes', (req, res) => {
  const { type } = req.params;

  const subtypeMap = {
    [TWIN_TYPES.HUMAN]: Object.values(HUMAN_SUBTYPES),
    [TWIN_TYPES.BUSINESS]: Object.values(BUSINESS_SUBTYPES),
    [TWIN_TYPES.ASSET]: Object.values(ASSET_SUBTYPES),
    [TWIN_TYPES.MARKET]: Object.values(MARKET_SUBTYPES),
    [TWIN_TYPES.AGENT]: Object.values(AGENT_SUBTYPES)
  };

  const subtypes = subtypeMap[type];

  if (!subtypes) {
    return res.status(404).json({ error: 'Invalid twin type' });
  }

  res.json({
    type,
    subtypes
  });
});

/**
 * Get relationship types
 * GET /api/taxonomy/relationships
 */
router.get('/relationships', (req, res) => {
  res.json({
    relationshipTypes: Object.values(RELATIONSHIP_TYPES),
    description: 'Types of relationships between twins'
  });
});

/**
 * Get taxonomy statistics
 * GET /api/taxonomy/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {};

    for (const type of Object.values(TWIN_TYPES)) {
      const count = await redis.scard(`twins:type:${type}`);
      stats[type] = count;
    }

    const total = await redis.scard('twins:all');

    res.json({
      totalTwins: total,
      byType: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get inheritance hierarchy
 * GET /api/taxonomy/hierarchy
 */
router.get('/hierarchy', (req, res) => {
  const hierarchy = {
    root: 'RTMN Ecosystem',
    children: [
      {
        type: 'Human',
        twinType: TWIN_TYPES.HUMAN,
        subtypes: Object.values(HUMAN_SUBTYPES),
        inherits: ['Identity', 'Contact', 'Preferences']
      },
      {
        type: 'Business',
        twinType: TWIN_TYPES.BUSINESS,
        subtypes: Object.values(BUSINESS_SUBTYPES),
        inherits: ['Operations', 'Finance', 'Compliance']
      },
      {
        type: 'Asset',
        twinType: TWIN_TYPES.ASSET,
        subtypes: Object.values(ASSET_SUBTYPES),
        inherits: ['Location', 'Condition', 'Value']
      },
      {
        type: 'Market',
        twinType: TWIN_TYPES.MARKET,
        subtypes: Object.values(MARKET_SUBTYPES),
        inherits: ['Demographics', 'Trends', 'Competition']
      },
      {
        type: 'Agent',
        twinType: TWIN_TYPES.AGENT,
        subtypes: Object.values(AGENT_SUBTYPES),
        inherits: ['Capabilities', 'Performance', 'Memory']
      }
    ]
  };

  res.json(hierarchy);
});

export default router;
