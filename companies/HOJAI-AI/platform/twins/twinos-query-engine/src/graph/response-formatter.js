/**
 * Response Formatter — converts graph results into natural language
 */

// ─────────────────────────────────────────────────────────────────────────────
// Format utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Capitalize first letter
 */
const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/**
 * Pluralize a word
 */
const pluralize = (count, singular, plural) => {
  if (count === 1) return `${count} ${singular}`;
  const word = plural ?? (`${singular}s`);
  return `${count} ${word}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format traversal/connection results as natural language.
 */
export function formatConnections(result, { entity = 'entity' } = {}) {
  if (!result || !result.nodes) {
    return `No connections found for "${entity}".`;
  }

  const { nodes, edges } = result;
  const connected = nodes.filter(n => n.id !== entity);

  if (connected.length === 0) {
    return `"${entity}" has no connections.`;
  }

  // Group by depth
  const byDepth = {};
  for (const node of connected) {
    const d = node.depth ?? 1;
    if (!byDepth[d]) byDepth[d] = [];
    byDepth[d].push(node.id);
  }

  const lines = [];
  lines.push(`"${entity}" is connected to ${pluralize(connected.length, 'entity')}:`);

  for (const depth of Object.keys(byDepth).sort((a, b) => a - b)) {
    const level = parseInt(depth) === 1 ? 'directly connected' : `${depth}-hop`;
    lines.push(`  • ${level}: ${byDepth[depth].join(', ')}`);
  }

  if (edges.length > 0) {
    const types = {};
    for (const edge of edges) {
      const t = edge.type ?? 'related';
      types[t] = (types[t] || 0) + 1;
    }
    const typeList = Object.entries(types)
      .map(([t, c]) => `${c} ${t}`)
      .join(', ');
    lines.push(`  Relationship types: ${typeList}`);
  }

  return lines.join('\n');
}

/**
 * Format shortest path results.
 */
export function formatPath(result, { from = 'source', to = 'target' } = {}) {
  if (!result || !result.path) {
    return `No path found between "${from}" and "${to}".`;
  }

  const { path, distance, hops } = result;

  if (path.length === 0) {
    return `"${from}" and "${to}" are not connected.`;
  }

  if (path.length === 1) {
    return `"${from}" is the same as "${to}".`;
  }

  const hops_count = path.length - 1;
  const lines = [
    `Found path from "${from}" to "${to}":`,
    `  ${path.join(' → ')}`,
    `  (${pluralize(hops_count, 'hop')}${distance !== undefined ? `, distance: ${distance.toFixed(2)}` : ''})`
  ];

  if (path.length <= 5) {
    lines.push('\nConnections in path:');
    for (let i = 0; i < path.length - 1; i++) {
      lines.push(`  • ${path[i]} → ${path[i + 1]}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format influence/top influencer results.
 */
export function formatInfluencers(result, { limit = 10 } = {}) {
  if (!result || !result.nodes || result.nodes.length === 0) {
    return 'No influential nodes found.';
  }

  const nodes = result.nodes.slice(0, limit);

  const lines = [
    `Top ${pluralize(nodes.length, 'influential node', 'influential nodes')}:`,
    ''
  ];

  for (const node of nodes) {
    const rank = node.rank ?? '?';
    const score = node.influence ?? node.score ?? '?';
    const scoreStr = typeof score === 'number' ? score.toFixed(3) : score;
    const tier = node.tier ?? '';
    const tierStr = tier ? ` [${tier}]` : '';
    lines.push(`  ${rank}. ${node.id}${tierStr} — influence: ${scoreStr}`);
  }

  return lines.join('\n');
}

/**
 * Format community detection results.
 */
export function formatCommunities(result) {
  if (!result || !result.communities || result.communities.length === 0) {
    return 'No communities found.';
  }

  const lines = [
    `Found ${pluralize(result.communities.length, 'community')}:`,
    ''
  ];

  for (const community of result.communities) {
    const id = community.community ?? community.id ?? '?';
    const members = community.members ?? community.nodes ?? [];
    const size = members.length;
    lines.push(`  Community ${id} (${pluralize(size, 'member')}):`);
    lines.push(`    ${members.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Format graph statistics.
 */
export function formatStats(result) {
  if (!result) {
    return 'No statistics available.';
  }

  const lines = ['Graph Statistics:', ''];

  if (result.nodes !== undefined) {
    lines.push(`  • Nodes: ${result.nodes}`);
  }
  if (result.edges !== undefined) {
    lines.push(`  • Edges: ${result.edges}`);
  }
  if (result.density !== undefined) {
    lines.push(`  • Density: ${result.density}`);
  }
  if (result.connected_components !== undefined) {
    lines.push(`  • Connected components: ${result.connected_components}`);
  }
  if (result.avg_degree !== undefined) {
    lines.push(`  • Average degree: ${result.avg_degree}`);
  }
  if (result.max_degree !== undefined) {
    lines.push(`  • Max degree: ${result.max_degree}`);
  }

  return lines.join('\n');
}

/**
 * Format influence score for a specific entity.
 */
export function formatInfluenceScore(result, { entity = 'entity' } = {}) {
  if (!result) {
    return `No influence data for "${entity}".`;
  }

  const score = result.influence ?? result.score ?? result.pagerank ?? 0;
  const rank = result.rank ?? '?';
  const tier = result.tier ?? '';

  const lines = [
    `Influence analysis for "${entity}":`,
    `  • Rank: ${rank}`,
    `  • Score: ${typeof score === 'number' ? score.toFixed(3) : score}`,
  ];

  if (result.pagerank !== undefined) {
    lines.push(`  • PageRank: ${result.pagerank.toFixed(4)}`);
  }
  if (result.betweenness !== undefined) {
    lines.push(`  • Betweenness centrality: ${result.betweenness.toFixed(4)}`);
  }
  if (tier) {
    lines.push(`  • Tier: ${tier}`);
  }

  return lines.join('\n');
}

/**
 * Format any graph result with a friendly message.
 */
export function formatResult(result, { operation = 'unknown', entities = {} } = {}) {
  switch (operation) {
    case 'traverse':
    case 'search':
      return formatConnections(result, entities);

    case 'path':
      return formatPath(result, entities);

    case 'centrality':
    case 'influence':
      if (entities.entity) {
        return formatInfluenceScore(result, entities);
      }
      return formatInfluencers(result, entities);

    case 'communities':
      return formatCommunities(result);

    case 'stats':
      return formatStats(result);

    default:
      if (result && typeof result === 'object') {
        return `Result: ${JSON.stringify(result, null, 2)}`;
      }
      return `No result for this query.`;
  }
}

/**
 * Format a complete query response with all metadata.
 */
export function formatQueryResponse({ parsed, operation, result }) {
  const lines = [
    `📊 Query: "${parsed.original}"`,
    `🔍 Intent: ${parsed.intent}`,
    `📝 ${operation.description}`,
    '',
    formatResult(result, { operation: operation.operation, entities: parsed.entities })
  ];

  return lines.join('\n');
}
