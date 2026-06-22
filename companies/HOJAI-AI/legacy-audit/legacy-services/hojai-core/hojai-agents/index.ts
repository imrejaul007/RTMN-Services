/**
 * Hojai Agent Platform
 *
 * Migration Strategy: Fork & Sync
 *
 * SOURCE: REZ-Intelligence/REZ-autonomous-agents
 * PORT: 4550
 */

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { AIEmployee } from '../../shared/types';
import { tenantMiddleware } from '../../shared/middleware/tenant';
import { createLogger } from '../../shared/utils/logger';
import { createResponse, createErrorResponse } from '../../shared/types';

const logger = createLogger('hojai-agents');

// ============================================
// AGENT STORAGE
// ============================================

const agentStore = new Map<string, AIEmployee>();
const tenantAgents = new Map<string, Set<string>>();

// ============================================
// AGENT PLATFORM
// ============================================

/**
 * Hojai Agent Platform
 */
export class HojaiAgentPlatform {

  // ============================================
  // AGENT CRUD
  // ============================================

  /**
   * Create AI employee
   */
  async createAgent(
    tenantId: string,
    data: Omit<AIEmployee, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'version' | 'stats'>
  ): Promise<AIEmployee> {
    const agent: AIEmployee = {
      ...data,
      id: this.generateId('agent'),
      tenant_id: tenantId,
      version: 1,
      stats: {
        total_conversations: 0,
        resolved_conversations: 0,
        escalated_conversations: 0,
        avg_resolution_time_minutes: 0,
        avg_csat_score: 0
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    agentStore.set(agent.id, agent);

    // Index by tenant
    const tenantSet = tenantAgents.get(tenantId) || new Set();
    tenantSet.add(agent.id);
    tenantAgents.set(tenantId, tenantSet);

    logger.info('agent_created', { tenantId, agentId: agent.id, type: agent.type });

    return agent;
  }

  /**
   * Get agent by ID
   */
  async getAgent(tenantId: string, agentId: string): Promise<AIEmployee | null> {
    const agent = agentStore.get(agentId);
    if (!agent || agent.tenant_id !== tenantId) {
      return null;
    }
    return agent;
  }

  /**
   * List agents for tenant
   */
  async listAgents(
    tenantId: string,
    options: { status?: AIEmployee['status']; type?: AIEmployee['type'] } = {}
  ): Promise<AIEmployee[]> {
    const tenantSet = tenantAgents.get(tenantId) || new Set();
    const agents: AIEmployee[] = [];

    for (const agentId of tenantSet) {
      const agent = agentStore.get(agentId);
      if (agent) {
        if (options.status && agent.status !== options.status) continue;
        if (options.type && agent.type !== options.type) continue;
        agents.push(agent);
      }
    }

    return agents.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Update agent
   */
  async updateAgent(
    tenantId: string,
    agentId: string,
    updates: Partial<AIEmployee>
  ): Promise<AIEmployee | null> {
    const agent = await this.getAgent(tenantId, agentId);
    if (!agent) return null;

    const updated: AIEmployee = {
      ...agent,
      ...updates,
      id: agent.id,
      tenant_id: tenantId,
      version: agent.version + 1,
      updated_at: new Date().toISOString()
    };

    agentStore.set(agentId, updated);

    logger.info('agent_updated', { tenantId, agentId, version: updated.version });

    return updated;
  }

  /**
   * Delete agent
   */
  async deleteAgent(tenantId: string, agentId: string): Promise<boolean> {
    const agent = await this.getAgent(tenantId, agentId);
    if (!agent) return false;

    agentStore.delete(agentId);

    const tenantSet = tenantAgents.get(tenantId);
    if (tenantSet) {
      tenantSet.delete(agentId);
    }

    logger.info('agent_deleted', { tenantId, agentId });

    return true;
  }

  // ============================================
  // AGENT ACTIONS
  // ============================================

  /**
   * Invoke agent (send message and get response)
   */
  async invokeAgent(
    tenantId: string,
    agentId: string,
    input: {
      customerId: string;
      message: string;
      context?: Record<string, any>;
    }
  ): Promise<{
    response: string;
    conversationId: string;
    escalated: boolean;
  }> {
    const agent = await this.getAgent(tenantId, agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    if (agent.status !== 'active') {
      throw new Error('Agent is not active');
    }

    // Check if escalation needed
    const shouldEscalate = await this.checkEscalation(agent, input.message);

    if (shouldEscalate) {
      await this.updateStats(tenantId, agentId, { escalated_conversations: 1 });
      return {
        response: agent.config.handoff?.message || 'Let me connect you with a human agent.',
        conversationId: this.generateId('conv'),
        escalated: true
      };
    }

    // Generate AI response (placeholder)
    const response = await this.generateResponse(agent, input.message);

    await this.updateStats(tenantId, agentId, {
      total_conversations: 1,
      resolved_conversations: 1
    });

    logger.info('agent_invoked', {
      tenantId,
      agentId,
      escalated: shouldEscalate
    });

    return {
      response,
      conversationId: this.generateId('conv'),
      escalated: false
    };
  }

  /**
   * Check if conversation should be escalated
   */
  private async checkEscalation(agent: AIEmployee, message: string): Promise<boolean> {
    const lowerMessage = message.toLowerCase();

    // Check escalation keywords
    if (agent.behavior.disallowed_topics.some(topic =>
      lowerMessage.includes(topic.toLowerCase())
    )) {
      return true;
    }

    // Check handoff conditions
    if (agent.config.handoff?.enabled && agent.config.handoff.conditions) {
      for (const condition of agent.config.handoff.conditions) {
        if (condition.type === 'keyword' &&
            condition.operator === 'contains' &&
            lowerMessage.includes((condition.value as string).toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generate AI response (placeholder - would integrate with LLM)
   */
  private async generateResponse(agent: AIEmployee, message: string): Promise<string> {
    // Placeholder - would call LLM here
    return `This is an automated response from ${agent.name}. Your message: "${message}"`;
  }

  /**
   * Update agent statistics
   */
  async updateStats(
    tenantId: string,
    agentId: string,
    increments: Partial<AIEmployee['stats']>
  ): Promise<void> {
    const agent = await this.getAgent(tenantId, agentId);
    if (!agent) return;

    agent.stats = {
      ...agent.stats,
      total_conversations: agent.stats.total_conversations + (increments.total_conversations || 0),
      resolved_conversations: agent.stats.resolved_conversations + (increments.resolved_conversations || 0),
      escalated_conversations: agent.stats.escalated_conversations + (increments.escalated_conversations || 0),
      avg_resolution_time_minutes: agent.stats.avg_resolution_time_minutes,
      avg_csat_score: agent.stats.avg_csat_score
    };

    agentStore.set(agentId, agent);
  }

  /**
   * Train agent (placeholder)
   */
  async trainAgent(
    tenantId: string,
    agentId: string
  ): Promise<{ status: 'started' | 'completed'; jobId: string }> {
    const agent = await this.getAgent(tenantId, agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const jobId = this.generateId('train');

    logger.info('agent_training_started', { tenantId, agentId, jobId });

    // Placeholder - would start actual training job
    return { status: 'started', jobId };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// EXPRESS INTEGRATION
// ============================================

/**
 * Create Express routes for Agent Platform
 */
export function createAgentRoutes(agentPlatform: HojaiAgentPlatform) {
  const router = express.Router();

  // Agent CRUD
  router.post('/', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const agent = await agentPlatform.createAgent(tenantId, req.body);
      res.json(createResponse(agent, { tenantId }));
    } catch (error) {
      logger.error('create_agent_error', { error });
      res.status(500).json(
        createErrorResponse('CREATE_ERROR', 'Failed to create agent')
      );
    }
  });

  router.get('/', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { status, type } = req.query;
      const agents = await agentPlatform.listAgents(tenantId, {
        status: status as any,
        type: type as any
      });
      res.json(createResponse(agents, { tenantId }));
    } catch (error) {
      logger.error('list_agents_error', { error });
      res.status(500).json(
        createErrorResponse('LIST_ERROR', 'Failed to list agents')
      );
    }
  });

  router.get('/:id', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const agent = await agentPlatform.getAgent(tenantId, req.params.id);
      if (!agent) {
        return res.status(404).json(
          createErrorResponse('NOT_FOUND', 'Agent not found')
        );
      }
      res.json(createResponse(agent, { tenantId }));
    } catch (error) {
      logger.error('get_agent_error', { error });
      res.status(500).json(
        createErrorResponse('GET_ERROR', 'Failed to get agent')
      );
    }
  });

  router.put('/:id', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const agent = await agentPlatform.updateAgent(tenantId, req.params.id, req.body);
      if (!agent) {
        return res.status(404).json(
          createErrorResponse('NOT_FOUND', 'Agent not found')
        );
      }
      res.json(createResponse(agent, { tenantId }));
    } catch (error) {
      logger.error('update_agent_error', { error });
      res.status(500).json(
        createErrorResponse('UPDATE_ERROR', 'Failed to update agent')
      );
    }
  });

  router.delete('/:id', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const deleted = await agentPlatform.deleteAgent(tenantId, req.params.id);
      if (!deleted) {
        return res.status(404).json(
          createErrorResponse('NOT_FOUND', 'Agent not found')
        );
      }
      res.json(createResponse({ deleted: true }, { tenantId }));
    } catch (error) {
      logger.error('delete_agent_error', { error });
      res.status(500).json(
        createErrorResponse('DELETE_ERROR', 'Failed to delete agent')
      );
    }
  });

  // Agent Invocation
  router.post('/:id/invoke', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { customerId, message, context } = req.body;

      if (!customerId || !message) {
        return res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'customerId and message are required')
        );
      }

      const result = await agentPlatform.invokeAgent(tenantId, req.params.id, {
        customerId,
        message,
        context
      });

      res.json(createResponse(result, { tenantId }));
    } catch (error: any) {
      logger.error('invoke_agent_error', { error });
      res.status(400).json(
        createErrorResponse('INVOKE_ERROR', error.message || 'Failed to invoke agent')
      );
    }
  });

  // Agent Training
  router.post('/:id/train', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const result = await agentPlatform.trainAgent(tenantId, req.params.id);
      res.json(createResponse(result, { tenantId }));
    } catch (error: any) {
      logger.error('train_agent_error', { error });
      res.status(400).json(
        createErrorResponse('TRAIN_ERROR', error.message || 'Failed to start training')
      );
    }
  });

  // Agent Stats
  router.get('/:id/stats', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const agent = await agentPlatform.getAgent(tenantId, req.params.id);
      if (!agent) {
        return res.status(404).json(
          createErrorResponse('NOT_FOUND', 'Agent not found')
        );
      }
      res.json(createResponse(agent.stats, { tenantId }));
    } catch (error) {
      logger.error('get_stats_error', { error });
      res.status(500).json(
        createErrorResponse('GET_ERROR', 'Failed to get stats')
      );
    }
  });

  return router;
}

// ============================================
// SERVICE BOOTSTRAP
// ============================================

/**
 * Bootstrap the Agent Platform service
 */
export async function bootstrap(port = 4550) {
  const agentPlatform = new HojaiAgentPlatform();
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
  app.use(express.json({ limit: "10kb" }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'hojai-agents',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Routes
  app.use('/api/agents', createAgentRoutes(agentPlatform));

  // Start server
  app.listen(port, () => {
    logger.info('hojai_agents_platform_started', { port });
  });

  return { agentPlatform, app };
}

// ============================================
// EXPORTS
// ============================================

export default {
  HojaiAgentPlatform,
  createAgentRoutes,
  bootstrap
};
