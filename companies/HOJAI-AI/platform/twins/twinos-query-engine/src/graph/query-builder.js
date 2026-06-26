/**
 * Query Builder — translates parsed NL queries into TwinOS Graph Engine operations
 *
 * Maps intents to the appropriate TwinOS Graph Engine endpoint + parameters.
 */

import { parseQuery } from './nl-parser.js';

// ─────────────────────────────────────────────────────────────────────────────
// Graph Engine endpoints
// ─────────────────────────────────────────────────────────────────────────────

const GRAPH_ENGINE_BASE = process.env.GRAPH_ENGINE_URL || 'http://localhost:4715';

// ─────────────────────────────────────────────────────────────────────────────
// Intent → Graph Operation mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the graph operation from a parsed query.
 *
 * @param {object} parsed - result of parseQuery()
 * @param {object} context - { twinRegistry, relationships }
 * @returns {{ operation: string, endpoint: string, params: object, description: string }}
 */
export function buildGraphOperation(parsed, context = {}) {
  const { intent, entities, original } = parsed;

  switch (intent) {
    case 'find_connected': {
      const { entity } = entities;
      return {
        operation: 'traverse',
        endpoint: `${GRAPH_ENGINE_BASE}/api/graph/traverse/${encodeURIComponent(entity)}`,
        params: { maxDepth: 2 },
        description: `Find all entities connected to "${entity}"`
      };
    }

    case 'find_relationship_type': {
      const { entity } = entities;
      return {
        operation: 'traverse',
        endpoint: `${GRAPH_ENGINE_BASE}/api/graph/traverse/${encodeURIComponent(entity)}`,
        params: { maxDepth: 1 },
        description: `Find direct relationships of "${entity}"`
      };
    }

    case 'shortest_path': {
      const { from, to } = entities;
      return {
        operation: 'path',
        endpoint: `${GRAPH_ENGINE_BASE}/api/graph/path`,
        params: { from, to },
        description: `Find shortest path from "${from}" to "${to}"`
      };
    }

    case 'top_influencers': {
      return {
        operation: 'centrality',
        endpoint: `${GRAPH_ENGINE_BASE}/api/graph/centrality`,
        params: { limit: 10 },
        description: 'Find top 10 most influential nodes'
      };
    }

    case 'community': {
      const { entity } = entities;
      if (entity) {
        return {
          operation: 'traverse',
          endpoint: `${GRAPH_ENGINE_BASE}/api/graph/traverse/${encodeURIComponent(entity)}`,
          params: { maxDepth: 3 },
          description: `Find community around "${entity}"`
        };
      }
      return {
        operation: 'communities',
        endpoint: `${GRAPH_ENGINE_BASE}/api/graph/communities`,
        params: {},
        description: 'Detect all communities in the graph'
      };
    }

    case 'influence_score': {
      const { entity } = entities;
      return {
        operation: 'influence',
        endpoint: `${GRAPH_ENGINE_BASE}/api/graph/compute`,
        params: { entity },
        description: `Compute influence score for "${entity}"`
      };
    }

    case 'entity_info': {
      const { entity } = entities;
      return {
        operation: 'entity_info',
        endpoint: `${GRAPH_ENGINE_BASE}/api/graph/stats`,
        params: {},
        description: `Get information about "${entity}"`
      };
    }

    case 'relationship_between': {
      const { from, to } = entities;
      return {
        operation: 'path',
        endpoint: `${GRAPH_ENGINE_BASE}/api/graph/path`,
        params: { from, to },
        description: `Find relationship between "${from}" and "${to}"`
      };
    }

    case 'entity_search': {
      const { entity } = entities;
      return {
        operation: 'search',
        endpoint: `${GRAPH_ENGINE_BASE}/api/graph/traverse/${encodeURIComponent(entity)}`,
        params: { maxDepth: 2 },
        description: `Search for "${entity}" in the graph`
      };
    }

    default:
      return {
        operation: 'unknown',
        endpoint: null,
        params: {},
        description: `Could not understand query: "${original}"`
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// High-level execute function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse and build the operation for a natural language query.
 *
 * @param {string} query
 * @param {object} context
 * @returns {{ parsed: object, operation: object }}
 */
export function prepareQuery(query, context = {}) {
  const parsed = parseQuery(query);
  const operation = buildGraphOperation(parsed, context);
  return { parsed, operation };
}

/**
 * Execute a prepared query against the Graph Engine.
 * This is a convenience wrapper that calls the built endpoint.
 *
 * @param {object} operation - from buildGraphOperation()
 * @returns {Promise<object>}
 */
export async function executeGraphOperation(operation) {
  const { endpoint, params, operation: opType } = operation;

  if (!endpoint) {
    return { error: 'No endpoint available for this query type' };
  }

  try {
    let url = endpoint;
    const queryParams = new URLSearchParams();

    // Add query params
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    }

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      return { error: `Graph Engine returned ${response.status}`, status: response.status };
    }

    const data = await response.json();
    return { data, operation: opType };
  } catch (err) {
    return { error: `Failed to reach Graph Engine: ${err.message}` };
  }
}
