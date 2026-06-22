import { createLogger } from '@rtmn/shared/lib/logger';
const logger = createLogger('aiEmployeeLLM');
/**
 * Salar OS - AI Employee LLM Connection Service
 *
 * Connects AI employees to the LLM and MemoryOS
 * Enables actual AI functionality for all 232 employees
 */

import { Router, Request, Response } from 'express';
import mongoose, { Schema, model } from 'mongoose';
import { randomBytes } from 'crypto';

// ============================================================================
// CONFIG
// ============================================================================

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai'; // openai or claude
const OPENAI_URL = process.env.OPENAI_URL || 'https://api.openai.com/v1';
const ANTHROPIC_URL = process.env.ANTHROPIC_URL || 'https://api.anthropic.com/v1';
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const router = Router();

// ============================================================================
// MONGODB SCHEMAS
// ============================================================================

// AI Employee LLM Config Schema
const aiEmployeeLLMSchema = new Schema({
  employeeId: { type: String, required: true, index: true },
  employeeName: { type: String, required: true },
  corpId: { type: String, required: true, index: true },

  // LLM Configuration
  llmConfig: {
    provider: { type: String, enum: ['openai', 'claude', 'gemini'], default: 'openai' },
    model: { type: String, default: 'gpt-4o' },
    temperature: { type: Number, default: 0.7 },
    maxTokens: { type: Number, default: 2000 },
  },

  // System prompt for this employee
  systemPrompt: { type: String, required: true },

  // Capabilities
  capabilities: [{
    name: String,
    keywords: [String],
  }],

  // Memory settings
  memory: {
    enabled: { type: Boolean, default: true },
    maxHistory: { type: Number, default: 10 },
    vectorSearch: { type: Boolean, default: true },
  },

  // Tools this employee can use
  tools: [{
    name: String,
    description: String,
    enabled: { type: Boolean, default: true },
  }],

  // Status
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'ERROR'], default: 'ACTIVE' },
  lastInvoked: Date,
  invocationCount: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const AIEmployeeLLM = model('AIEmployeeLLM', aiEmployeeLLMSchema);

// Session Schema (for conversation history)
const sessionSchema = new Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  employeeId: { type: String, required: true, index: true },
  userId: String,

  messages: [{
    role: { type: String, enum: ['system', 'user', 'assistant', 'tool'] },
    content: String,
    timestamp: { type: Date, default: Date.now },
  }],

  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

sessionSchema.index({ employeeId: 1, createdAt: -1 });

const Session = model('Session', sessionSchema);

// ============================================================================
// HELPERS
// ============================================================================

function generateId(prefix: string = 'LLM'): string {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36)}`;
}

async function callOpenAI(messages: any[], config: any): Promise<any> {
  const response = await fetch(`${OPENAI_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o',
      messages,
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  return response.json();
}

async function callClaude(messages: any[], config: any): Promise<any> {
  const systemMessage = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch(`${ANTHROPIC_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-5-sonnet-20240620',
      max_tokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.7,
      system: systemMessage?.content || '',
      messages: chatMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  return response.json();
}

async function callLLM(employeeId: string, messages: any[]): Promise<any> {
  const config = await AIEmployeeLLM.findOne({ employeeId }).lean();

  if (!config) {
    throw new Error('Employee LLM config not found');
  }

  if (config.llmConfig.provider === 'claude') {
    return callClaude(messages, config.llmConfig);
  } else {
    return callOpenAI(messages, config.llmConfig);
  }
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Register AI employee LLM config
 * POST /ai-employee-llm/config
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const {
      employeeId,
      employeeName,
      corpId,
      systemPrompt,
      provider,
      model,
      capabilities,
      tools,
    } = req.body;

    if (!employeeId || !systemPrompt) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'employeeId and systemPrompt required' },
      });
    }

    const existing = await AIEmployeeLLM.findOne({ employeeId });

    if (existing) {
      // Update
      existing.systemPrompt = systemPrompt;
      existing.llmConfig.provider = provider || existing.llmConfig.provider;
      existing.llmConfig.model = model || existing.llmConfig.model;
      if (capabilities) existing.capabilities = capabilities;
      if (tools) existing.tools = tools;
      existing.updatedAt = new Date();
      await existing.save();

      return res.json({
        success: true,
        data: {
          employeeId: existing.employeeId,
          status: 'updated',
        },
      });
    }

    // Create new
    const config = new AIEmployeeLLM({
      employeeId,
      employeeName: employeeName || employeeId,
      corpId: corpId || `CI-AGT-${generateId(6)}`,
      systemPrompt,
      llmConfig: {
        provider: provider || 'openai',
        model: model || (provider === 'claude' ? 'claude-3-5-sonnet-20240620' : 'gpt-4o'),
        temperature: 0.7,
        maxTokens: 2000,
      },
      capabilities: capabilities || [],
      tools: tools || [],
    });

    await config.save();

    res.status(201).json({
      success: true,
      data: {
        employeeId: config.employeeId,
        corpId: config.corpId,
        status: 'created',
      },
    });
  } catch (error: any) {
    logger.error('Error creating LLM config:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Chat with AI employee
 * POST /ai-employee-llm/chat
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { employeeId, message, sessionId, userId, context } = req.body;

    if (!employeeId || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'employeeId and message required' },
      });
    }

    // Get or create session
    let session;
    if (sessionId) {
      session = await Session.findOne({ sessionId });
    }

    if (!session) {
      session = new Session({
        sessionId: generateId('SES'),
        employeeId,
        userId,
        messages: [],
      });
    }

    // Get employee config
    const config = await AIEmployeeLLM.findOne({ employeeId }).lean();

    if (!config) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'AI employee not configured' },
      });
    }

    // Build messages
    const messages = [
      { role: 'system', content: config.systemPrompt },
    ];

    // Add context if provided
    if (context) {
      messages.push({
        role: 'system',
        content: `Context: ${JSON.stringify(context)}`,
      });
    }

    // Add conversation history (last N messages)
    const history = session.messages.slice(-(config.memory?.maxHistory || 10));
    messages.push(...history.map(m => ({ role: m.role, content: m.content })));

    // Add current message
    messages.push({ role: 'user', content: message });

    // Call LLM
    let response;
    try {
      if (config.llmConfig.provider === 'claude') {
        response = await callClaude(messages, config.llmConfig);
        response.content = response.content?.[0]?.text || '';
      } else {
        response = await callOpenAI(messages, config.llmConfig);
        response.content = response.choices?.[0]?.message?.content || '';
      }
    } catch (llmError: any) {
      logger.error('LLM call failed:', llmError);

      // Fallback response
      response = {
        content: `I'm ${config.employeeName || config.employeeId}. I'm currently experiencing technical difficulties. Please try again or contact support.`,
        error: llmError.message,
      };
    }

    // Save to session
    session.messages.push(
      { role: 'user', content: message },
      { role: 'assistant', content: response.content || '' }
    );

    // Limit history
    if (session.messages.length > 100) {
      session.messages = session.messages.slice(-50);
    }

    await session.save();

    // Update invocation count
    await AIEmployeeLLM.updateOne(
      { employeeId },
      {
        $inc: { invocationCount: 1 },
        $set: { lastInvoked: new Date() },
      }
    );

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        employeeId,
        employeeName: config.employeeName,
        response: response.content || 'I apologize, but I encountered an issue processing your request.',
        usage: response.usage,
        error: response.error,
      },
    });
  } catch (error: any) {
    logger.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CHAT_ERROR', message: error.message },
    });
  }
});

/**
 * Get employee config
 * GET /ai-employee-llm/config/:employeeId
 */
router.get('/config/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    const config = await AIEmployeeLLM.findOne({ employeeId }).lean();

    if (!config) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Employee not found' },
      });
    }

    res.json({
      success: true,
      data: {
        employeeId: config.employeeId,
        employeeName: config.employeeName,
        corpId: config.corpId,
        llmConfig: config.llmConfig,
        capabilities: config.capabilities,
        tools: config.tools,
        status: config.status,
        lastInvoked: config.lastInvoked,
        invocationCount: config.invocationCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get all employees
 * GET /ai-employee-llm/employees
 */
router.get('/employees', async (req: Request, res: Response) => {
  try {
    const { status, provider, limit = 50 } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (provider) filter['llmConfig.provider'] = provider;

    const employees = await AIEmployeeLLM.find(filter)
      .select('employeeId employeeName corpId llmConfig status lastInvoked invocationCount')
      .sort({ invocationCount: -1 })
      .limit(parseInt(limit as string))
      .lean();

    res.json({
      success: true,
      data: {
        items: employees,
        total: employees.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get session history
 * GET /ai-employee-llm/session/:sessionId
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId }).lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        employeeId: session.employeeId,
        messages: session.messages,
        messageCount: session.messages.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Clear session history
 * DELETE /ai-employee-llm/session/:sessionId
 */
router.delete('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    await Session.deleteOne({ sessionId });

    res.json({
      success: true,
      data: { sessionId, cleared: true },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Update employee status
 * PATCH /ai-employee-llm/config/:employeeId/status
 */
router.patch('/config/:employeeId/status', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE', 'ERROR'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid status' },
      });
    }

    await AIEmployeeLLM.updateOne({ employeeId }, { $set: { status } });

    res.json({
      success: true,
      data: { employeeId, status },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Bulk register from Agent Twin
 * POST /ai-employee-llm/bulk-seed
 */
router.post('/bulk-seed', async (req: Request, res: Response) => {
  try {
    const { AgentTwin } = await import('./agentTwin.js');

    // Get all agents from Agent Twin
    const agents = await AgentTwin.find({ 'health.status': 'ACTIVE' }).lean();

    const results = {
      success: 0,
      skipped: 0,
      failed: 0,
    };

    for (const agent of agents) {
      try {
        const existing = await AIEmployeeLLM.findOne({
          $or: [{ employeeId: agent.agentId }, { corpId: agent.agentId }]
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create LLM config from Agent Twin
        const config = new AIEmployeeLLM({
          employeeId: agent.agentId,
          employeeName: agent.name,
          corpId: agent.agentId,
          systemPrompt: generateSystemPrompt(agent),
          llmConfig: {
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.7,
            maxTokens: 2000,
          },
          capabilities: agent.capabilities?.map((c: any) => ({
            name: c.name,
            keywords: [c.name],
          })) || [],
          memory: {
            enabled: true,
            maxHistory: 10,
            vectorSearch: true,
          },
          tools: [],
        });

        await config.save();
        results.success++;
      } catch (error) {
        results.failed++;
      }
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SEED_ERROR', message: error.message },
    });
  }
});

/**
 * Generate system prompt from agent data
 */
function generateSystemPrompt(agent: any): string {
  const type = agent.identity?.type || 'SPECIALIZED';
  const department = agent.identity?.department || 'General';

  return `You are ${agent.name}, an AI employee (${type}) in the ${department} department.

Your role is to assist with tasks related to ${department} operations.

Capabilities:
${agent.capabilities?.map((c: any) => `- ${c.name}`).join('\n') || 'General assistance'}

Guidelines:
- Be professional and helpful
- Follow company policies
- Ask clarifying questions when needed
- Escalate complex issues to human supervisors
- Keep responses concise and actionable

Remember: You are an AI employee representing HOJAI AI. Always maintain professionalism.`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { router as aiEmployeeLLMRouter, AIEmployeeLLM, Session };
export default router;
