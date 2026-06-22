/**
 * Hojai Agents Service
 * Version: 1.0 | Port: 4550
 * AI agent orchestration, registry, and execution
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { agentRoutes } from './routes/agents.js';
import { executionRoutes } from './routes/executions.js';
import { registryRoutes } from './routes/registry.js';

const PORT = 4550;

// ============================================
// LOGGING
// ============================================

function createLogger(service: string) {
  return {
    info: (event: string, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({ level: 'info', service, event, timestamp: new Date().toISOString(), ...data }));
    },
    error: (event: string, data?: Record<string, unknown>) => {
      console.error(JSON.stringify({ level: 'error', service, event, timestamp: new Date().toISOString(), ...data }));
    },
    warn: (event: string, data?: Record<string, unknown>) => {
      console.warn(JSON.stringify({ level: 'warn', service, event, timestamp: new Date().toISOString(), ...data }));
    }
  };
}

const logger = createLogger('hojai-agents');

// ============================================
// TYPES
// ============================================

export interface Agent {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: AgentType;
  capabilities: string[];
  config: AgentConfig;
  status: 'active' | 'inactive' | 'training' | 'error';
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

export type AgentType = 'support' | 'sales' | 'orchestrator' | 'data' | 'communication' | 'workflow' | 'custom';

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  prompts?: Record<string, string>;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  tenantId: string;
  userId?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  steps?: ExecutionStep[];
}

export interface ExecutionStep {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface AgentRegistry {
  id: string;
  type: string;
  name: string;
  description: string;
  capabilities: string[];
  category: string;
  config?: Record<string, unknown>;
}

// ============================================
// IN-MEMORY STORES
// ============================================

export const agentStore: Map<string, Agent[]> = new Map();
export const executionStore: Map<string, AgentExecution[]> = new Map();

// Pre-built agent templates
export const AGENT_TEMPLATES: AgentRegistry[] = [
  {
    id: 'support-agent',
    type: 'support',
    name: 'Customer Support Agent',
    description: 'Handles customer inquiries and support tickets',
    capabilities: ['answer_questions', 'create_tickets', 'escalate', 'refund'],
    category: 'support'
  },
  {
    id: 'sales-agent',
    type: 'sales',
    name: 'Sales Agent',
    description: 'Assists with sales and product recommendations',
    capabilities: ['recommend', 'upsell', 'cross_sell', 'discount'],
    category: 'sales'
  },
  {
    id: 'orchestrator-agent',
    type: 'orchestrator',
    name: 'Orchestrator Agent',
    description: 'Coordinates multiple agents for complex tasks',
    capabilities: ['delegate', 'coordinate', 'monitor', 'aggregate'],
    category: 'orchestration'
  },
  {
    id: 'data-agent',
    type: 'data',
    name: 'Data Analysis Agent',
    description: 'Analyzes data and generates insights',
    capabilities: ['analyze', 'report', 'visualize', 'forecast'],
    category: 'data'
  },
  {
    id: 'communication-agent',
    type: 'communication',
    name: 'Communication Agent',
    description: 'Handles multi-channel communications',
    capabilities: ['email', 'sms', 'whatsapp', 'notify'],
    category: 'communication'
  },
  {
    id: 'workflow-agent',
    type: 'workflow',
    name: 'Workflow Agent',
    description: 'Executes and manages automated workflows',
    capabilities: ['trigger', 'execute', 'monitor', 'retry'],
    category: 'workflow'
  }
];

// ============================================
// TENANT CONTEXT
// ============================================

interface TenantContext {
  tenant_id: string;
  user_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

function tenantMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT_ID', message: 'X-Tenant-Id header required' }
      });
    }
    req.tenantContext = { tenant_id: tenantId, user_id: req.headers['x-user-id'] as string };
    next();
  };
}

// ============================================
// AGENT EXECUTION ENGINE
// ============================================

async function executeAgent(
  agent: Agent,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  logger.info('agent_execution_started', { agentId: agent.id, agentName: agent.name });

  // Simulate agent execution
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  // Generate response based on agent type
  let output: Record<string, unknown>;

  switch (agent.type) {
    case 'support':
      output = {
        response: `Hello! I'm ${agent.name}. How can I assist you today?`,
        suggestions: ['Track order', 'Return item', 'Get refund', 'Talk to human'],
        sentiment: 'positive'
      };
      break;

    case 'sales':
      output = {
        recommendations: [
          { item: 'Premium Plan', score: 0.95, reason: 'Based on your usage' },
          { item: 'Add-on Service', score: 0.82, reason: 'Frequently purchased together' }
        ],
        upsell_opportunity: true
      };
      break;

    case 'orchestrator':
      output = {
        delegated_to: ['support-agent', 'data-agent'],
        status: 'coordinating',
        progress: 0.5
      };
      break;

    case 'data':
      output = {
        insights: [
          { metric: 'engagement', value: '+23%', trend: 'up' },
          { metric: 'conversion', value: '+15%', trend: 'up' }
        ],
        summary: 'Key metrics show positive trends'
      };
      break;

    case 'communication':
      output = {
        channels: ['email', 'whatsapp'],
        message: 'Notification sent successfully',
        delivered: true
      };
      break;

    case 'workflow':
      output = {
        workflow_id: uuidv4(),
        status: 'triggered',
        next_step: 'approval'
      };
      break;

    default:
      output = {
        result: `Agent ${agent.name} processed your request`,
        confidence: 0.85
      };
  }

  logger.info('agent_execution_completed', { agentId: agent.id });
  return output;
}

// ============================================
// AGENTS SERVICE CLASS
// ============================================

class HojaiAgents {
  private app: express.Express;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
    this.app.use(express.json({ limit: "10kb" }));

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        logger.info('request', {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: Date.now() - start
        });
      });
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'hojai-agents',
        version: '1.0.0',
        port: PORT,
        timestamp: new Date().toISOString()
      });
    });

    this.app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
    this.app.get('/health/ready', (req, res) => res.json({ status: 'ready' }));

    // Stats
    this.app.get('/stats', tenantMiddleware(), (req, res) => {
      const ctx = req.tenantContext!;
      const agents = agentStore.get(ctx.tenant_id) || [];
      const executions = executionStore.get(ctx.tenant_id) || [];

      res.json({
        success: true,
        data: {
          agents: {
            total: agents.length,
            active: agents.filter(a => a.status === 'active').length
          },
          executions: {
            total: executions.length,
            pending: executions.filter(e => e.status === 'pending').length,
            running: executions.filter(e => e.status === 'running').length,
            completed: executions.filter(e => e.status === 'completed').length,
            failed: executions.filter(e => e.status === 'failed').length
          }
        }
      });
    });

    // Mount routes
    this.app.use('/agents', tenantMiddleware(), agentRoutes);
    this.app.use('/executions', tenantMiddleware(), executionRoutes);
    this.app.use('/registry', tenantMiddleware(), registryRoutes);

    // Error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('error', { error: err.message, path: req.path });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message }
      });
    });

    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Route ${req.path} not found` }
      });
    });
  }

  start() {
    this.app.listen(PORT, () => {
      logger.info('service_started', { port: PORT });
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║           HOJAI AGENTS v1.0.0                          ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                ║
║  Status: Running                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Features:                                                   ║
║  - Agent Registry & Templates                                ║
║  - Agent Creation & Management                               ║
║  - Agent Execution Engine                                   ║
║  - Multi-Agent Orchestration                                ║
║  - Execution History & Monitoring                           ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  }
}

// ============================================
// BOOTSTRAP
// ============================================

const agents = new HojaiAgents();
agents.start();

export { HojaiAgents, executeAgent, AGENT_TEMPLATES };
export default agents;
