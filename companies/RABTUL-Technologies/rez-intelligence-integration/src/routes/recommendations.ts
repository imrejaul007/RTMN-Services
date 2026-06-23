import { Router, Request, Response } from 'express';
import axios from 'axios';
import { AgentContextRequest } from '../middleware/agentContext.js';

export const recommendationsRouter = Router();

const REZ_INTEL_BRIDGE = process.env.REZ_INTEL_BRIDGE_URL || 'http://localhost:5369';

/**
 * Get product recommendations
 * Used by: Sales Agent, Marketing Agent
 */
recommendationsRouter.post('/products', async (req: AgentContextRequest, res: Response) => {
  try {
    const { companyId, customerId, context } = req.body;

    const response = await axios.post(
      `${REZ_INTEL_BRIDGE}/api/v1/recommendations/products`,
      { companyId, customerId, context },
      { timeout: 10000 }
    );

    res.json({
      success: true,
      data: response.data,
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    req.context?.logger.error('Product recommendations error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get next-best-action recommendations
 * Used by: Sales Agent, Support Agent, Marketing Agent
 */
recommendationsRouter.post('/next-best-action', async (req: AgentContextRequest, res: Response) => {
  try {
    const { companyId, customerId, agentRole } = req.body;

    const response = await axios.post(
      `${REZ_INTEL_BRIDGE}/api/v1/recommendations/next-best-action`,
      { companyId, customerId, agentRole },
      { timeout: 10000 }
    );

    res.json({
      success: true,
      data: response.data,
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    req.context?.logger.error('Next best action error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get pricing recommendations
 * Used by: Sales Agent, Finance Agent
 */
recommendationsRouter.post('/pricing', async (req: AgentContextRequest, res: Response) => {
  try {
    const { companyId, productId, customerSegment } = req.body;

    const response = await axios.post(
      `${REZ_INTEL_BRIDGE}/api/v1/recommendations/pricing`,
      { companyId, productId, customerSegment },
      { timeout: 10000 }
    );

    res.json({
      success: true,
      data: response.data,
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    req.context?.logger.error('Pricing recommendations error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
