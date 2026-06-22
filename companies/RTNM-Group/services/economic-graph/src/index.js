/**
 * RTMN Economic Graph Engine
 *
 * Maps value flows across the RTMN ecosystem.
 * Connects companies, industries, markets, and agents.
 *
 * Port: 3017
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import Graph from 'graphology';

// Routes
import graphRoutes from './routes/graph.js';
import flowRoutes from './routes/flows.js';
import analysisRoutes from './routes/analysis.js';
import visualizationRoutes from './routes/visualization.js';

const app = express();
const PORT = process.env.PORT || 3017;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Economic Graph - Main Graph Structure
export const economicGraph = new Graph();

// Node Types
export const NODE_TYPES = {
  COMPANY: 'company',
  INDUSTRY: 'industry',
  MARKET: 'market',
  AGENT: 'agent',
  PRODUCT: 'product',
  SERVICE: 'service',
  CUSTOMER: 'customer',
  PARTNER: 'partner'
};

// Edge Types (Value Flows)
export const EDGE_TYPES = {
  REVENUE: 'revenue',
  COST: 'cost',
  INVESTMENT: 'investment',
  PARTNERSHIP: 'partnership',
  SUPPLY: 'supply',
  DEMAND: 'demand',
  REFERRAL: 'referral',
  DATA: 'data',
  TALENT: 'talent'
};

// Value Currencies
export const VALUE_CURRENCIES = {
  MONEY: 'money',
  DATA: 'data',
  ATTENTION: 'attention',
  TRUST: 'trust',
  TIME: 'time',
  TALENT: 'talent'
};

// Industry Categories
export const INDUSTRIES = {
  fitness: { name: 'Fitness', color: '#10b981', value: 100 },
  gaming: { name: 'Gaming', color: '#8b5cf6', value: 120 },
  government: { name: 'Government', color: '#6366f1', value: 200 },
  homeServices: { name: 'Home Services', color: '#f59e0b', value: 80 },
  manufacturing: { name: 'Manufacturing', color: '#ef4444', value: 150 },
  nonprofit: { name: 'Nonprofit', color: '#ec4899', value: 60 },
  professional: { name: 'Professional', color: '#06b6d4', value: 90 },
  sports: { name: 'Sports', color: '#84cc16', value: 110 },
  travel: { name: 'Travel', color: '#14b8a6', value: 95 },
  construction: { name: 'Construction', color: '#f97316', value: 130 },
  entertainment: { name: 'Entertainment', color: '#a855f7', value: 115 },
  financial: { name: 'Financial', color: '#22c55e', value: 180 }
};

// Graph State
export const graphState = {
  nodeCount: 0,
  edgeCount: 0,
  lastUpdated: null,
  version: '1.0.0'
};

// Initialize base graph structure
function initializeGraph() {
  // Add industry nodes
  for (const [id, industry] of Object.entries(INDUSTRIES)) {
    economicGraph.addNode(`industry:${id}`, {
      type: NODE_TYPES.INDUSTRY,
      name: industry.name,
      value: industry.value,
      color: industry.color,
      timestamp: new Date().toISOString()
    });
    graphState.nodeCount++;
  }

  logger.info('Economic graph initialized', {
    industries: Object.keys(INDUSTRIES).length,
    nodes: graphState.nodeCount
  });
}

// Initialize on startup
initializeGraph();

export { logger };

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      duration: Date.now() - start,
      status: res.statusCode
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'economic-graph',
    version: '1.0.0',
    port: PORT,
    graph: {
      nodes: graphState.nodeCount,
      edges: graphState.edgeCount,
      lastUpdated: graphState.lastUpdated
    },
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RTMN Economic Graph',
    version: '1.0.0',
    description: 'Maps value flows across RTMN ecosystem',
    port: PORT,
    capabilities: [
      'Graph operations (nodes, edges)',
      'Value flow analysis',
      'Network metrics',
      'Visualization data export'
    ],
    endpoints: [
      'GET /api/graph',
      'POST /api/graph/node',
      'POST /api/graph/edge',
      'GET /api/flows',
      'POST /api/flows/calculate',
      'GET /api/analysis/metrics',
      'GET /api/visualization/d3'
    ]
  });
});

// Routes
app.use('/api/graph', graphRoutes);
app.use('/api/flows', flowRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/visualization', visualizationRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Economic Graph running on port ${PORT}`);
  logger.info(`Graph nodes: ${graphState.nodeCount}, edges: ${graphState.edgeCount}`);
});

export { app };
