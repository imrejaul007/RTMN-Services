/**
 * TwinOS Graph Engine v1.0 (port 4883)
 *
 * Dedicated graph service for the RTMN twin relationship graph.
 * Replaces and extends the BFS algorithms embedded in twinos-hub with:
 * - PageRank, betweenness centrality, community detection
 * - Weighted Dijkstra, temporal BFS, influence scoring
 * - Recommendation engine (friends-of-friends)
 *
 * Maintains an in-memory materialized view of the relationship graph
 * by polling twinos-hub (port 4705) or listening for webhooks.
 */

import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import {
  optionalAuth,
  requireAuth,
  preventPrototypePollution,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestId,
  requestLogger,
  logger,
  defaultLimiter,
  strictLimiter,
  installPhase5
} from '@rtmn/twinos-shared';

import { pageRank, betweennessCentrality, communityDetection, dijkstra, buildAdjacency } from './graph/algorithms.js';
import { temporalBFS, nDegreeConnections, recommendConnections } from './graph/traversal.js';
import { graphStats, influenceScoring, topInfluencers } from './graph/analytics.js';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4883;
const SERVICE_NAME = 'twinos-graph-engine';
const TWINOS_HUB_URL = process.env.TWINOS_HUB_URL || 'http://localhost:4705';
const REFRESH_INTERVAL_MS = parseInt(process.env.REFRESH_INTERVAL_MS || '60000'); // 60s default
const GRAPH_CACHE_MAX_AGE_MS = parseInt(process.env.GRAPH_CACHE_MAX_AGE_MS || '300000'); // 5 min

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(requestId);
app.use(requestLogger);
app.use(preventPrototypePollution);

app.use(defaultLimiter);

// ── Graph Cache (materialized view of twinRelationships) ─────────────────────

// We store the graph in a PersistentMap so it survives restarts.
// In production, you'd want a Redis or a shared DB for multi-instance deployments.
const graphCache = new PersistentMap('graph-cache', { serviceName: SERVICE_NAME });

// Cached computations (lazy, recomputed on demand)
const computedCache = new PersistentMap('computed-cache', { serviceName: SERVICE_NAME });

let lastRefresh = null;
let refreshTimer = null;

// ── Refresh helpers ───────────────────────────────────────────────────────────

async function fetchRelationshipsFromHub() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3000);
  try {
    const r = await fetch(`${TWINOS_HUB_URL}/api/relationships`, {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(t);
    if (!r.ok) {
      logger.warn('Hub returned non-OK', { status: r.status });
      return null;
    }
    const data = await r.json();
    return data.relationships || [];
  } catch (e) {
    clearTimeout(t);
    logger.warn('Failed to fetch relationships from hub', { error: e.message });
    return null;
  }
}

async function refreshGraphCache() {
  logger.info('Refreshing graph cache from twinos-hub...');
  const rels = await fetchRelationshipsFromHub();
  if (rels === null) {
    logger.warn('Graph cache refresh failed — continuing with stale data');
    return;
  }
  const now = Date.now();
  graphCache.set('_meta', {
    lastRefresh: new Date(now).toISOString(),
    totalEdges: rels.length
  });
  graphCache.set('_relationships', rels);

  // Build and cache adjacency list
  const adj = buildAdjacency(rels);
  graphCache.set('_adjacency', [...adj.entries()]);

  lastRefresh = now;
  logger.info('Graph cache refreshed', { edges: rels.length, at: new Date(now).toISOString() });
}

function getRelationships() {
  return graphCache.get('_relationships') || [];
}

function getAdjacency() {
  const entries = graphCache.get('_adjacency');
  if (!entries) return new Map();
  return new Map(entries);
}

function isCacheStale() {
  if (!lastRefresh) return true;
  return Date.now() - lastRefresh > GRAPH_CACHE_MAX_AGE_MS;
}

// ── Algorithm execution helpers ──────────────────────────────────────────────

function computeAllGraphMetrics() {
  const adj = getAdjacency();
  const rels = getRelationships();

  if (adj.size === 0) {
    return { error: 'No graph data available. Refresh the cache first.' };
  }

  const prResult = pageRank(adj);
  const bwResult = betweennessCentrality(adj);
  const commResult = communityDetection(adj);

  const influenceResult = influenceScoring(prResult.ranks, bwResult);
  const topInfluencersList = topInfluencers(influenceResult);
  const stats = graphStats(rels);

  return {
    computedAt: new Date().toISOString(),
    pagerank: {
      converged: prResult.converged,
      iterations: prResult.iterations,
      top10: [...prResult.ranks.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, score]) => ({ id, score: Math.round(score * 1000) / 1000 }))
    },
    betweenness: {
      top10: [...bwResult.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, score]) => ({ id, score: Math.round(score * 1000) / 1000 }))
    },
    communities: commResult.slice(0, 10).map(c => ({
      id: c.community,
      size: c.members.length,
      members: c.members.slice(0, 5),
      truncated: c.members.length > 5
    })),
    topInfluencers: topInfluencersList,
    stats
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Health
app.get('/health', (_req, res) => {
  const meta = graphCache.get('_meta') || {};
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    port: PORT,
    cache: {
      loaded: !!graphCache.get('_relationships'),
      lastRefresh: meta.lastRefresh || null,
      totalEdges: meta.totalEdges || 0,
      age_ms: lastRefresh ? Date.now() - lastRefresh : null,
      stale: isCacheStale()
    },
    algorithms: [
      'pageRank', 'betweennessCentrality', 'communityDetection',
      'dijkstra', 'temporalBFS', 'influenceScoring', 'graphStats'
    ]
  });
});

app.get('/ready', (_req, res) => {
  const rels = getRelationships();
  res.json({
    ready: true,
    service: SERVICE_NAME,
    edgesLoaded: rels.length,
    timestamp: new Date().toISOString()
  });
});

// ── Cache management ──────────────────────────────────────────────────────────

/**
 * POST /api/graph/refresh
 * Force-refresh the graph cache from twinos-hub.
 */
app.post('/api/graph/refresh', requireAuth, asyncHandler(async (req, res) => {
  await refreshGraphCache();
  const meta = graphCache.get('_meta') || {};
  res.json({
    success: true,
    refreshed: !!meta.lastRefresh,
    totalEdges: meta.totalEdges || 0,
    at: meta.lastRefresh || null
  });
}));

/**
 * GET /api/graph/cache/status
 * Check cache freshness and stats.
 */
app.get('/api/graph/cache/status', optionalAuth, (_req, res) => {
  const meta = graphCache.get('_meta') || {};
  res.json({
    success: true,
    cache: {
      loaded: !!graphCache.get('_relationships'),
      lastRefresh: meta.lastRefresh || null,
      totalEdges: meta.totalEdges || 0,
      age_ms: lastRefresh ? Date.now() - lastRefresh : null,
      stale: isCacheStale()
    },
    settings: {
      refreshIntervalMs: REFRESH_INTERVAL_MS,
      maxAgeMs: GRAPH_CACHE_MAX_AGE_MS
    }
  });
});

// ── Traversal ────────────────────────────────────────────────────────────────

/**
 * GET /api/graph/traverse/:twinId
 * Temporal BFS traversal with enrichment filters.
 * Query: ?depth=2&type=purchased,owns&at=2024-03-15&minStrength=0.5&minTrust=60
 */
app.get('/api/graph/traverse/:twinId', optionalAuth, asyncHandler(async (req, res) => {
  const { twinId } = req.params;
  const {
    depth = '2',
    type,
    at,
    from: fromQuery,
    to: toQuery,
    minStrength,
    minTrust,
    includeExpired = 'false'
  } = req.query;

  let queryAt = null, queryFrom = null, queryTo = null;
  if (at) queryAt = new Date(String(at)).getTime();
  if (fromQuery) queryFrom = new Date(String(fromQuery)).getTime();
  if (toQuery) queryTo = new Date(String(toQuery)).getTime();

  const rels = getRelationships();
  const result = temporalBFS(twinId, rels, {
    maxDepth: Math.min(parseInt(depth) || 2, 10),
    typeFilter: type ? String(type).split(',').map(s => s.trim()) : null,
    queryAt,
    queryFrom,
    queryTo,
    minStrength: minStrength !== undefined ? parseFloat(minStrength) : null,
    minTrust: minTrust !== undefined ? parseFloat(minTrust) : null,
    includeExpired: includeExpired === 'true'
  });

  res.json({ success: true, root: twinId, ...result });
}));

// ── Path finding ──────────────────────────────────────────────────────────────

/**
 * GET /api/graph/path
 * Shortest weighted path between two twins (Dijkstra).
 * Query: ?from=X&to=Y&maxHops=5&minStrength=0.3
 */
app.get('/api/graph/path', optionalAuth, asyncHandler(async (req, res) => {
  const { from, to, maxHops = '5', minStrength } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'from and to are required' }
    });
  }

  const adj = getAdjacency();
  if (adj.size === 0) {
    return res.status(503).json({ success: false, error: { code: 'CACHE_EMPTY', message: 'Graph cache is empty. POST /api/graph/refresh first.' } });
  }

  // Dijkstra with optional strength filter
  const edgeFilter = minStrength
    ? (edge) => (edge.strength ?? 0.5) >= parseFloat(minStrength)
    : null;

  const { distances, paths } = dijkstra(adj, from, to,
    edgeFilter ? (e) => edgeFilter(e) ? 1 : Infinity : null
  );

  const path = paths.get(to);
  if (!path || distances.get(to) === Infinity) {
    return res.json({ success: true, path: null, hops: -1, message: 'No path found' });
  }

  // Get relationship details along the path
  const rels = getRelationships();
  const pathEdges = [];
  for (let i = 0; i < path.length - 1; i++) {
    const src = path[i], tgt = path[i + 1];
    const rel = rels.find(r =>
      (r.sourceId === src && r.targetId === tgt) ||
      (r.sourceId === tgt && r.targetId === src)
    );
    pathEdges.push({ from: src, to: tgt, relationship: rel || null });
  }

  res.json({
    success: true,
    path,
    hops: path.length - 1,
    distance: distances.get(to),
    edges: pathEdges
  });
}));

// ── N-degree connections ────────────────────────────────────────────────────

/**
 * GET /api/graph/connected/:twinId
 * Find all twins reachable within N hops (with stats per hop).
 * Query: ?hops=3
 */
app.get('/api/graph/connected/:twinId', optionalAuth, asyncHandler(async (req, res) => {
  const { twinId } = req.params;
  const hops = Math.min(parseInt(req.query.hops) || 3, 10);

  const rels = getRelationships();
  const result = nDegreeConnections(twinId, rels, hops);

  res.json({ success: true, ...result });
}));

// ── Recommendations ─────────────────────────────────────────────────────────

/**
 * POST /api/graph/recommend
 * Friends-of-friends connection recommendations.
 * Body: { twinId, maxSuggestions?: 10, minConfidence?: 0.3 }
 */
app.post('/api/graph/recommend', requireAuth, asyncHandler(async (req, res) => {
  const { twinId, maxSuggestions = 10, minConfidence = 0.3 } = preventPrototypePollution(req.body);

  if (!twinId) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'twinId is required' } });
  }

  const rels = getRelationships();

  // Fetch twin registry from hub for enriched results
  let twinRegistry = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const r = await fetch(`${TWINOS_HUB_URL}/api/twins`, {
      signal: ctrl.signal, headers: { 'Accept': 'application/json' }
    });
    clearTimeout(t);
    if (r.ok) {
      const data = await r.json();
      twinRegistry = new Map((data.twins || []).map(t => [t.id, t]));
    }
  } catch { /* ignore — recommendations work without registry */ }

  const result = recommendConnections(twinId, rels, twinRegistry, {
    maxSuggestions: parseInt(maxSuggestions),
    minConfidence: parseFloat(minConfidence)
  });

  res.json({ success: true, ...result });
}));

// ── Community detection ─────────────────────────────────────────────────────

/**
 * GET /api/graph/communities
 * Louvain-inspired community detection.
 * Query: ?limit=20
 */
app.get('/api/graph/communities', optionalAuth, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const adj = getAdjacency();

  if (adj.size === 0) {
    return res.status(503).json({ success: false, error: { code: 'CACHE_EMPTY', message: 'Graph cache is empty.' } });
  }

  const communities = communityDetection(adj);

  res.json({
    success: true,
    total_communities: communities.length,
    communities: communities.slice(0, limit).map(c => ({
      id: c.community,
      size: c.members.length,
      members: c.members,
      percentage: Math.round((c.members.length / adj.size) * 100)
    }))
  });
}));

// ── Centrality ─────────────────────────────────────────────────────────────

/**
 * GET /api/graph/centrality
 * PageRank + betweenness centrality for all nodes.
 * Query: ?algorithm=pagerank|betweenness|influence&limit=20
 */
app.get('/api/graph/centrality', optionalAuth, asyncHandler(async (req, res) => {
  const { algorithm = 'influence', limit = '20' } = req.query;
  const limitN = Math.min(parseInt(limit) || 20, 200);
  const adj = getAdjacency();

  if (adj.size === 0) {
    return res.status(503).json({ success: false, error: { code: 'CACHE_EMPTY', message: 'Graph cache is empty.' } });
  }

  if (algorithm === 'pagerank') {
    const { ranks } = pageRank(adj);
    const sorted = [...ranks.entries()].sort((a, b) => b[1] - a[1]).slice(0, limitN);
    return res.json({
      success: true, algorithm: 'pagerank',
      nodes: sorted.map(([id, score], i) => ({ rank: i + 1, id, score: Math.round(score * 1000) / 1000 }))
    });
  }

  if (algorithm === 'betweenness') {
    const bw = betweennessCentrality(adj);
    const sorted = [...bw.entries()].sort((a, b) => b[1] - a[1]).slice(0, limitN);
    return res.json({
      success: true, algorithm: 'betweenness',
      nodes: sorted.map(([id, score], i) => ({ rank: i + 1, id, score: Math.round(score * 1000) / 1000 }))
    });
  }

  // Influence = pagerank + betweenness combined
  const pr = pageRank(adj);
  const bw = betweennessCentrality(adj);
  const influence = influenceScoring(pr.ranks, bw);

  return res.json({
    success: true,
    algorithm: 'influence',
    nodes: topInfluencers(influence, limitN),
    computedAt: new Date().toISOString()
  });
}));

// ── Graph stats ─────────────────────────────────────────────────────────────

/**
 * GET /api/graph/stats
 * Global graph statistics.
 */
app.get('/api/graph/stats', optionalAuth, asyncHandler(async (req, res) => {
  const rels = getRelationships();
  const stats = graphStats(rels);
  res.json({ success: true, ...stats });
}));

// ── Compute all (bulk) ──────────────────────────────────────────────────────

/**
 * POST /api/graph/compute
 * Run all graph algorithms in one call (lazy — results cached until next refresh).
 * Body: { algorithms?: ['pagerank', 'communities', 'centrality', 'stats'] }
 */
app.post('/api/graph/compute', requireAuth, asyncHandler(async (req, res) => {
  const { algorithms } = preventPrototypePollution(req.body) || {};
  const all = !algorithms || algorithms.length === 0;

  const result = {};

  if (all || algorithms.includes('pagerank') || algorithms.includes('influence')) {
    const adj = getAdjacency();
    if (adj.size > 0) {
      const pr = pageRank(adj);
      const bw = betweennessCentrality(adj);
      result.pagerank = pr;
      result.betweenness = bw;
    }
  }

  if (all || algorithms.includes('communities')) {
    const adj = getAdjacency();
    if (adj.size > 0) {
      result.communities = communityDetection(adj);
    }
  }

  if (all || algorithms.includes('stats')) {
    result.stats = graphStats(getRelationships());
  }

  res.json({
    success: true,
    computedAt: new Date().toISOString(),
    ...result
  });
}));

// ── Error handling ───────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

const phase5Cleanup = installPhase5(app, {
  serviceName: SERVICE_NAME,
  twinType: 'graph-engine',
  store: graphCache,
  version: '1.0.0',
  stats: () => ({ edges: (graphCache.get('_relationships') || []).length })
});

// ── Startup ─────────────────────────────────────────────────────────────────

// Initial cache load
refreshGraphCache().then(() => {
  logger.info('Graph cache loaded on startup', { edges: getRelationships().length });
}).catch(e => {
  logger.warn('Startup cache load failed — will retry', { error: e.message });
});

// Periodic refresh
refreshTimer = setInterval(async () => {
  if (isCacheStale()) {
    await refreshGraphCache();
  }
}, REFRESH_INTERVAL_MS);

const server = app.listen(PORT, () => {
  logger.info(`Graph Engine v1.0 running on port ${PORT}`);
  logger.info(`Connected to twinos-hub at ${TWINOS_HUB_URL}`);
  logger.info(`Refresh interval: ${REFRESH_INTERVAL_MS}ms, max age: ${GRAPH_CACHE_MAX_AGE_MS}ms`);
});
installGracefulShutdown(server, phase5Cleanup);

export default app;
