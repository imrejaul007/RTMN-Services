import { Router, Request, Response } from 'express';
import axios from 'axios';
import { AgentContextRequest } from '../middleware/agentContext.js';

export const intentRouter = Router();

const INTENT_ENGINE = process.env.INTENT_ENGINE_URL || 'http://localhost:4800';

/**
 * Classify user intent
 * Used by: HOJAI Widget, SUTAR agents, HOJAI Studio
 */
intentRouter.post('/classify', async (req: AgentContextRequest, res: Response) => {
  try {
    const { text, context } = req.body;

    const response = await axios.post(
      `${INTENT_ENGINE}/api/v1/classify`,
      { text, context },
      { timeout: 5000 }
    );

    res.json({
      success: true,
      data: response.data,
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    req.context?.logger.error('Intent classification error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Route intent to appropriate agent
 * Used by: HOJAI Widget, FlowOS
 */
intentRouter.post('/route', async (req: AgentContextRequest, res: Response) => {
  try {
    const { text, companyId, availableAgents } = req.body;

    // First classify
    const classifyRes = await axios.post(
      `${INTENT_ENGINE}/api/v1/classify`,
      { text },
      { timeout: 5000 }
    );

    const intent = classifyRes.data;

    // Then route to appropriate agent
    const routingRules: Record<string, string> = {
      buy: 'sales-agent',
      order: 'commerce-agent',
      book: 'booking-agent',
      pay: 'finance-agent',
      support: 'support-agent',
      return: 'support-agent',
      complaint: 'support-agent',
      pricing: 'sales-agent',
      negotiate: 'sales-agent',
      track: 'logistics-agent',
      hire: 'hr-agent',
      report: 'analytics-agent'
    };

    const targetAgent = routingRules[intent.intent] || 'support-agent';

    res.json({
      success: true,
      data: {
        intent,
        targetAgent,
        confidence: intent.confidence,
        routed_at: new Date().toISOString()
      },
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    req.context?.logger.error('Intent routing error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
