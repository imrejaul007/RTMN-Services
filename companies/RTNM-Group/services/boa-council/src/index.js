/**
 * RTMN BOA Council
 *
 * Multi-BOA coordination and synthesis engine.
 * Coordinates CEO, CFO, COO, CMO, CHRO, CLO for unified decisions.
 *
 * Port: 3016
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import councilRoutes from './routes/council.js';
import synthesisRoutes from './routes/synthesis.js';
import decisionRoutes from './routes/decisions.js';

// BOA Agents
import CEOStrategyAgent from './agents/ceo-agent.js';
import CFOFinanceAgent from './agents/cfo-agent.js';
import COOperationsAgent from './agents/coo-agent.js';
import CMOMarketingAgent from './agents/cmo-agent.js';
import CHROPeopleAgent from './agents/chro-agent.js';
import CLOLegalAgent from './agents/clo-agent.js';

const app = express();
const PORT = process.env.PORT || 3016;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// BOA Council Structure
export const BOA_COUNCIL = {
  ceo: {
    role: 'CEO',
    name: 'Chief Executive Officer',
    focus: ['strategy', 'vision', 'growth', 'stakeholders'],
    inputs: ['cfo', 'coo', 'cmo', 'chro', 'clo'],
    delegate: ['strategy', 'vision']
  },
  cfo: {
    role: 'CFO',
    name: 'Chief Financial Officer',
    focus: ['revenue', 'costs', 'cashflow', 'compliance', 'investments'],
    inputs: ['finance'],
    delegate: ['financial_analysis', 'budgeting']
  },
  coo: {
    role: 'COO',
    name: 'Chief Operating Officer',
    focus: ['operations', 'efficiency', 'supply_chain', 'quality'],
    inputs: ['operations'],
    delegate: ['process_optimization', 'logistics']
  },
  cmo: {
    role: 'CMO',
    name: 'Chief Marketing Officer',
    focus: ['marketing', 'brand', 'customer_acquisition', 'retention'],
    inputs: ['marketing'],
    delegate: ['campaigns', 'content']
  },
  chro: {
    role: 'CHRO',
    name: 'Chief Human Resources Officer',
    focus: ['people', 'culture', 'talent', 'compensation'],
    inputs: ['hr'],
    delegate: ['hiring', 'training', 'development']
  },
  clo: {
    role: 'CLO',
    name: 'Chief Legal Officer',
    focus: ['legal', 'compliance', 'contracts', 'risk'],
    inputs: ['legal'],
    delegate: ['contracts', 'compliance', 'risk_management']
  }
};

// Initialize BOA Agents
export const agents = {
  ceo: new CEOStrategyAgent(),
  cfo: new CFOFinanceAgent(),
  coo: new COOperationsAgent(),
  cmo: new CMOMarketingAgent(),
  chro: new CHROPeopleAgent(),
  clo: new CLOLegalAgent()
};

// Store council sessions
const sessions = new Map();

export { sessions, logger };

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
    service: 'boa-council',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RTMN BOA Council',
    version: '1.0.0',
    description: 'Multi-BOA coordination and synthesis engine',
    port: PORT,
    council: Object.keys(BOA_COUNCIL),
    endpoints: [
      'GET /api/council',
      'POST /api/council/query',
      'POST /api/council/decide',
      'GET /api/council/:role',
      'POST /api/synthesis',
      'GET /api/decisions/:sessionId'
    ]
  });
});

// Routes
app.use('/api/council', councilRoutes);
app.use('/api/synthesis', synthesisRoutes);
app.use('/api/decisions', decisionRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`BOA Council running on port ${PORT}`);
  logger.info(`Council members: ${Object.keys(agents).join(', ')}`);
});

export { app };
