/**
 * SDR Agent - AI-Powered Chat Endpoint
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: Real LLM-powered SDR assistant for lead qualification and outreach
 */

import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { BaseAgent } from './core/src/BaseAgent.js';
import { crmTools } from './tools/crm.js';
import { researchTools } from './tools/research.js';

// ============================================================================
// Agent Instance
// ============================================================================

const SDR_PROMPT = `You are Alex, an expert Sales Development Representative (SDR) powered by advanced AI.

Your mission is to help sales teams find, qualify, and engage with prospects.

## Your Tools

You have CRM and Research tools to help you:
- Create and manage contacts and leads
- Research companies and people
- Score and qualify prospects
- Track pipeline and activity

## Your Approach

### Lead Qualification (BANT)
- Budget: Assess financial capacity
- Authority: Identify decision-makers
- Need: Understand pain points
- Timeline: Determine buying readiness

### Research Before Outreach
- Always research the company and contact first
- Look for intent signals (funding, hiring, expansion, tech changes)
- Find personalization points

### Best Practices
1. Personalize every outreach based on research
2. Lead with value, not pitch
3. Qualify rigorously - don't waste time on bad fits
4. Track all activity in CRM
5. Follow up strategically (5-7 touchpoints over 30 days)
6. Your primary goal: Book meetings

### Qualification Questions
- "What challenges are you facing?"
- "What's your timeline for evaluating solutions?"
- "Who else is involved in this decision?"
- "What does success look like for your team?"

Be professional, curious, and consultative. Help reps close more deals.`;

// Create agent instance with all tools
const sdrAgent = new BaseAgent({
  name: 'SDR Agent - Alex',
  description: 'AI-powered sales development representative',
  systemPrompt: SDR_PROMPT,
  llmProvider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  maxTokens: 4096,
  tools: [
    ...crmTools,
    ...researchTools,
  ],
  memoryEnabled: true,
});

// ============================================================================
// Types
// ============================================================================

interface ChatRequest {
  message: string;
  tenantId: string;
  userId?: string;
  sessionId?: string;
  context?: Record<string, unknown>;
}

interface ChatResponse {
  success: boolean;
  data?: {
    content: string;
    toolCalls?: {
      name: string;
      arguments: Record<string, unknown>;
      result: unknown;
    }[];
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
  meta: {
    requestId: string;
    timestamp: string;
    agent: string;
  };
}

// ============================================================================
// Router
// ============================================================================

const router = express.Router();

// ============================================================================
// Endpoints
// ============================================================================

/**
 * POST /api/ai/chat
 * Main chat endpoint for conversational SDR
 */
router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuid();
  const startTime = Date.now();

  try {
    const { message, tenantId, userId = 'anonymous', sessionId, context }: ChatRequest = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Message is required and must be a string',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          agent: 'sdr-agent',
        },
      } as ChatResponse);
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'tenantId is required',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          agent: 'sdr-agent',
        },
      } as ChatResponse);
    }

    // Add context
    const enrichedContext = {
      ...context,
      tenantId,
      userId,
      sessionId,
    };

    // Send message to agent
    const response = await sdrAgent.chat(message, enrichedContext);

    const responseTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      data: {
        content: response.content,
        toolCalls: response.toolCalls?.map(tc => ({
          name: tc.name,
          arguments: tc.arguments,
          result: tc.result,
        })),
        usage: response.usage,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'sdr-agent',
        sessionId,
        tenantId,
        responseTimeMs: responseTime,
      },
    } as ChatResponse);
  } catch (error) {
    console.error(`[SDR Agent] Error:`, error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process message',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'sdr-agent',
      },
    } as ChatResponse);
  }
});

/**
 * POST /api/ai/qualify
 * Qualify a lead using AI
 */
router.post('/qualify', async (req: Request, res: Response) => {
  const requestId = uuid();

  try {
    const { contactId, companyId, tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'tenantId is required' },
        meta: { requestId, timestamp: new Date().toISOString(), agent: 'sdr-agent' },
      });
    }

    // Build qualification prompt
    const prompt = `Qualify this lead for our sales team.

${contactId ? `Contact ID: ${contactId}` : ''}
${companyId ? `Company ID: ${companyId}` : ''}
Tenant: ${tenantId}

Assess using BANT criteria:
- Budget: What's their likely budget?
- Authority: Are they a decision-maker?
- Need: What pain points do they have?
- Timeline: When are they likely to buy?

Also consider:
- Company size and industry fit
- Current solution and pain points
- Buying committee size

Provide a qualification score (1-10) and summary.`;

    const response = await sdrAgent.chat(prompt, { tenantId });

    return res.status(200).json({
      success: true,
      data: {
        content: response.content,
        contactId,
        companyId,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'sdr-agent',
        tenantId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'QUALIFICATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to qualify lead',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'sdr-agent',
      },
    });
  }
});

/**
 * POST /api/ai/outreach
 * Generate personalized outreach
 */
router.post('/outreach', async (req: Request, res: Response) => {
  const requestId = uuid();

  try {
    const { prospectName, company, title, intentSignals, channel = 'email', tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'tenantId is required' },
        meta: { requestId, timestamp: new Date().toISOString(), agent: 'sdr-agent' },
      });
    }

    const prompt = `Generate personalized outreach for this prospect.

Prospect: ${prospectName}
Company: ${company}
Title: ${title}
${intentSignals ? `Intent Signals: ${intentSignals}` : ''}
Channel: ${channel}

Create a compelling outreach that:
1. Opens with personalization hook
2. Provides relevant value proposition
3. Includes clear CTA (meeting request)
4. Is under 100 words for email, 50 for LinkedIn

Make it sound natural, not salesy.`;

    const response = await sdrAgent.chat(prompt, { tenantId, channel });

    return res.status(200).json({
      success: true,
      data: {
        content: response.content,
        prospectName,
        company,
        channel,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'sdr-agent',
        tenantId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'OUTREACH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate outreach',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'sdr-agent',
      },
    });
  }
});

/**
 * POST /api/ai/clear
 * Clear conversation history
 */
router.post('/clear', async (req: Request, res: Response) => {
  const requestId = uuid();

  try {
    sdrAgent.clearHistory();

    return res.status(200).json({
      success: true,
      data: { message: 'Conversation history cleared' },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'sdr-agent',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'CLEAR_ERROR',
        message: error instanceof Error ? error.message : 'Failed to clear history',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'sdr-agent',
      },
    });
  }
});

/**
 * GET /api/ai/tools
 * List available tools
 */
router.get('/tools', async (_req: Request, res: Response) => {
  const requestId = uuid();

  return res.status(200).json({
    success: true,
    data: {
      tools: sdrAgent.getToolNames(),
      count: sdrAgent.hasTools() ? sdrAgent.getToolNames().length : 0,
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      agent: 'sdr-agent',
    },
  });
});

export default router;
export { sdrAgent };
