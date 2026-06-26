/**
 * Natural Language Parser for TwinOS Query Engine
 *
 * Parses natural language queries into structured query objects.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Intent patterns
// ─────────────────────────────────────────────────────────────────────────────

const INTENT_PATTERNS = [
  // shortest_path must come before entity_info (entity_info matches first word "what")
  {
    intent: 'shortest_path',
    patterns: [
      /^(?:find|show)? ?the (?:shortest )?path(?: way| route|)? from (.+) to (.+)/i,
      /^the (?:shortest )?distance from (.+) to (.+)/i,
      /^how many hops from (.+) to (.+)/i,
      /^how many hops between (.+) and (.+)/i,
    ],
    extract: (match) => ({ from: (match[1] || '').trim(), to: (match[2] || '').trim() })
  },
  // relationship_between must come before entity_info
  {
    intent: 'relationship_between',
    patterns: [
      /^(?:what is|what's|how are|how is) the relationship between (.+) (?:and|to) (.+)/i,
      /^(?:what is|what's) the connection between (.+) (?:and|to) (.+)/i,
      /^how is (.+) connected to (.+)/i,
    ],
    extract: (match) => ({ from: (match[1] || '').trim(), to: (match[2] || '').trim() })
  },
  // influence_score must come before entity_info
  {
    intent: 'influence_score',
    patterns: [
      /^how important is (.+)/i,
      /^what is the influence of (.+)/i,
      /^what is the influence score of (.+)/i,
    ],
    extract: (match) => ({ entity: (match[1] || '').trim() })
  },
  // community must come before find_connected
  {
    intent: 'community',
    patterns: [
      /^which nodes are in the same community as (.+)/i,
      /^what nodes are in the same community as (.+)/i,
      /^show the community around (.+)/i,
    ],
    extract: (match) => ({ entity: (match[1] || '').trim() })
  },
  // top_influencers
  {
    intent: 'top_influencers',
    patterns: [
      /^who are the top influencers/i,
      /^who is the top influencer/i,
      /^what are the top influencers/i,
      /^show top influencers/i,
      /^list top influencers/i,
    ],
    extract: () => ({})
  },
  // find_connected
  {
    intent: 'find_connected',
    patterns: [
      /^who is connected to (.+)/i,
      /^what is connected to (.+)/i,
      /^show connections for (.+)/i,
      /^find connections for (.+)/i,
      /^show all relationships for (.+)/i,
      /^who is (.+) connected to/i,
      /^what is (.+) connected to/i,
    ],
    extract: (match) => ({ entity: (match[1] || '').trim() })
  },
  // entity_info (fallback)
  {
    intent: 'entity_info',
    patterns: [
      /^what is (.+)/i,
      /^tell me about (.+)/i,
      /^describe (.+)/i,
    ],
    extract: (match) => ({ entity: (match[1] || '').trim() })
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Parse a natural language query
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a natural language query into a structured query object.
 *
 * @param {string} query - Natural language query
 * @returns {{ intent: string, entities: object, confidence: number, original: string }}
 */
export function parseQuery(query) {
  if (!query || typeof query !== 'string') {
    return { intent: 'unknown', entities: {}, confidence: 0, original: '' };
  }

  const normalized = query.trim();

  for (const { intent, patterns, extract } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        return {
          intent,
          entities: extract(match),
          confidence: 0.8,
          original: normalized
        };
      }
    }
  }

  // Fallback: treat as entity search
  return {
    intent: 'entity_search',
    entities: { entity: normalized },
    confidence: 0.5,
    original: normalized
  };
}

/**
 * Batch parse multiple queries.
 *
 * @param {string[]} queries
 * @returns {Array}
 */
export function parseQueries(queries) {
  return queries.map(q => parseQuery(q));
}
