/**
 * Query Engine API Routes
 *
 * Endpoints:
 * - POST   /api/query              - Execute natural language query
 * - POST   /api/query/batch        - Execute multiple queries
 * - GET    /api/query/parse        - Parse query without executing
 * - GET    /api/query/intents      - List supported intents
 * - GET    /api/query/examples     - Get example queries for each intent
 */

import { Router } from 'express';
import { parseQuery, parseQueries } from '../graph/nl-parser.js';
import { prepareQuery, executeGraphOperation } from '../graph/query-builder.js';
import { formatQueryResponse, formatResult } from '../graph/response-formatter.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Supported intents with descriptions
// ─────────────────────────────────────────────────────────────────────────────

const INTENT_INFO = {
  find_connected: {
    name: 'Find Connected Entities',
    description: 'Find all entities connected to a given entity',
    examples: [
      'who is connected to Acme Corp',
      'what is Acme connected to',
      'find connections for Alice',
    ]
  },
  find_relationship_type: {
    name: 'Find Relationship Type',
    description: 'Find entities with a specific relationship type',
    examples: [
      'who manages Acme Corp',
      'who owns this asset',
      'what is owned by Alice',
    ]
  },
  shortest_path: {
    name: 'Shortest Path',
    description: 'Find the shortest path between two entities',
    examples: [
      'find the shortest path from Alice to Bob',
      'how many hops between Acme and Globex',
      'what is the path from Alice to Charlie',
    ]
  },
  top_influencers: {
    name: 'Top Influencers',
    description: 'Find the most influential nodes in the graph',
    examples: [
      'who are the top influencers',
      'show the most important nodes',
      'what are the top hubs',
    ]
  },
  community: {
    name: 'Community Detection',
    description: 'Find entities in the same community or cluster',
    examples: [
      'which nodes are in the same community as Alice',
      'show the community around Acme',
      'find the cluster for this entity',
    ]
  },
  influence_score: {
    name: 'Influence Score',
    description: 'Get the influence score of a specific entity',
    examples: [
      'what is the influence of Alice',
      'how important is Acme Corp',
      'how influential is Bob',
    ]
  },
  entity_info: {
    name: 'Entity Information',
    description: 'Get information about a specific entity',
    examples: [
      'tell me about Alice',
      'what is Acme Corp',
      'describe Bob',
    ]
  },
  relationship_between: {
    name: 'Relationship Between',
    description: 'Find the relationship between two entities',
    examples: [
      'what is the relationship between Alice and Bob',
      'how is Acme connected to Globex',
      'how are Alice and Charlie related',
    ]
  },
  entity_search: {
    name: 'Entity Search',
    description: 'Search for an entity in the graph',
    examples: [
      'find Acme',
      'search for Alice',
      'show me Bob',
    ]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/query
 * Execute a natural language query against the graph.
 *
 * Body: { query: string, format?: 'text' | 'json' | 'full' }
 */
router.post('/', async (req, res) => {
  try {
    const { query, format = 'full' } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "query" field in request body'
      });
    }

    // Parse and prepare the query
    const { parsed, operation } = prepareQuery(query);

    // Execute the graph operation
    const execResult = await executeGraphOperation(operation);

    // Format the response based on requested format
    if (format === 'text') {
      return res.json({
        text: formatResult(execResult.data ?? execResult.error, {
          operation: operation.operation,
          entities: parsed.entities
        })
      });
    }

    if (format === 'json') {
      return res.json(execResult.data ?? { error: execResult.error });
    }

    // Full format (default)
    const response = {
      query: parsed.original,
      intent: parsed.intent,
      confidence: parsed.confidence,
      operation: {
        type: operation.operation,
        description: operation.description,
        endpoint: operation.endpoint
      },
      result: execResult.data ?? null,
      error: execResult.error ?? null,
      formatted: formatQueryResponse({
        parsed,
        operation,
        result: execResult.data ?? { error: execResult.error }
      })
    };

    return res.json(response);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/query/batch
 * Execute multiple natural language queries in batch.
 *
 * Body: { queries: string[], format?: 'text' | 'json' }
 */
router.post('/batch', async (req, res) => {
  try {
    const { queries, format = 'json' } = req.body;

    if (!Array.isArray(queries)) {
      return res.status(400).json({
        error: 'Missing or invalid "queries" array in request body'
      });
    }

    if (queries.length > 50) {
      return res.status(400).json({
        error: 'Maximum 50 queries per batch request'
      });
    }

    const results = [];

    for (const query of queries) {
      try {
        const { parsed, operation } = prepareQuery(query);
        const execResult = await executeGraphOperation(operation);
        results.push({
          query,
          intent: parsed.intent,
          result: execResult.data ?? null,
          error: execResult.error ?? null,
          ...(format === 'text' ? {
            text: formatResult(execResult.data ?? execResult.error, {
              operation: operation.operation,
              entities: parsed.entities
            })
          } : {})
        });
      } catch (err) {
        results.push({
          query,
          error: err.message
        });
      }
    }

    return res.json({ results, count: results.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/query/parse
 * Parse a query without executing it.
 *
 * Query: ?q=<query>
 */
router.get('/parse', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing "q" query parameter' });
  }

  const parsed = parseQuery(q);
  const { operation } = prepareQuery(q);

  return res.json({
    query: q,
    parsed,
    operation: {
      type: operation.operation,
      description: operation.description,
      endpoint: operation.endpoint,
      params: operation.params
    }
  });
});

/**
 * GET /api/query/intents
 * List all supported intents with descriptions and examples.
 */
router.get('/intents', (req, res) => {
  return res.json({
    intents: INTENT_INFO,
    count: Object.keys(INTENT_INFO).length
  });
});

/**
 * GET /api/query/examples
 * Get example queries for each intent.
 */
router.get('/examples', (req, res) => {
  const { intent } = req.query;

  if (intent) {
    const info = INTENT_INFO[intent];
    if (!info) {
      return res.status(404).json({ error: `Unknown intent: ${intent}` });
    }
    return res.json({ intent, ...info });
  }

  return res.json({
    examples: Object.entries(INTENT_INFO).map(([key, val]) => ({
      intent: key,
      ...val
    }))
  });
});

/**
 * GET /api/query/explain
 * Explain what a query means (parse + describe the intent without executing)
 * Query: ?q=<query>
 */
router.get('/explain', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing "q" query parameter' });
  }

  const parsed = parseQuery(q);
  const { operation } = prepareQuery(q);

  // Generate a human-readable explanation
  const explanations = {
    find_connected: `Find all entities connected to "${parsed.entities.entity}" up to 2 hops away.`,
    find_relationship_type: `Find the specific type of relationship "${parsed.entities.entity}" has with others.`,
    shortest_path: `Find the shortest path connecting "${parsed.entities.from}" to "${parsed.entities.to}".`,
    top_influencers: 'Identify the most influential nodes in the graph based on PageRank and betweenness centrality.',
    community: parsed.entities.entity
      ? `Find other entities in the same community/cluster as "${parsed.entities.entity}".`
      : 'Detect all communities in the graph.',
    influence_score: `Calculate the influence score for "${parsed.entities.entity}" based on graph centrality metrics.`,
    entity_info: `Retrieve information about "${parsed.entities.entity}".`,
    relationship_between: `Find the relationship(s) connecting "${parsed.entities.from}" and "${parsed.entities.to}".`,
    entity_search: `Search the graph for entities matching "${parsed.entities.entity}".`,
    unknown: 'Unable to determine the intent of this query.',
    entity_search: 'Treating this as a general search for matching entities.'
  };

  const explanation = explanations[parsed.intent] || explanations.unknown;

  return res.json({
    query: q,
    explanation,
    intent: parsed.intent,
    confidence: parsed.confidence,
    parsed: parsed.entities,
    operation: {
      type: operation.operation,
      description: operation.description,
      endpoint: operation.endpoint,
      params: operation.params
    },
    suggestions: parsed.intent === 'unknown' ? [
      'Try: "who is connected to X"',
      'Try: "find the shortest path from A to B"',
      'Try: "who are the top influencers"'
    ] : []
  });
});

export default router;
