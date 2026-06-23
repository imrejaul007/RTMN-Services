import { Router, Request, Response } from 'express';
import axios from 'axios';
import { AgentContextRequest } from '../middleware/agentContext.js';

export const predictionsRouter = Router();

const REZ_INTEL_BRIDGE = process.env.REZ_INTEL_BRIDGE_URL || 'http://localhost:5369';

/**
 * Revenue prediction
 * Used by: Sales Agent, Finance Agent, CEO Agent
 */
predictionsRouter.post('/revenue', async (req: AgentContextRequest, res: Response) => {
  try {
    const { companyId, timeRange, segment } = req.body;

    const response = await axios.post(
      `${REZ_INTEL_BRIDGE}/api/v1/predictions/revenue`,
      { companyId, timeRange: timeRange || '30d', segment },
      { timeout: 15000 }
    );

    res.json({
      success: true,
      data: response.data,
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    req.context?.logger.error('Revenue prediction error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Churn prediction
 * Used by: Sales Agent, Support Agent, Customer Success Agent
 */
predictionsRouter.post('/churn', async (req: AgentContextRequest, res: Response) => {
  try {
    const { companyId, customerId } = req.body;

    const response = await axios.post(
      `${REZ_INTEL_BRIDGE}/api/v1/predictions/churn`,
      { companyId, customerId },
      { timeout: 15000 }
    );

    res.json({
      success: true,
      data: response.data,
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    req.context?.logger.error('Churn prediction error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * LTV prediction
 * Used by: Sales Agent, Marketing Agent
 */
predictionsRouter.post('/ltv', async (req: AgentContextRequest, res: Response) => {
  try {
    const { companyId, customerId } = req.body;

    const response = await axios.post(
      `${REZ_INTEL_BRIDGE}/api/v1/predictions/ltv`,
      { companyId, customerId },
      { timeout: 15000 }
    );

    res.json({
      success: true,
      data: response.data,
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    req.context?.logger.error('LTV prediction error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Demand forecasting
 * Used by: Inventory Agent, Procurement Agent
 */
predictionsRouter.post('/demand', async (req: AgentContextRequest, res: Response) => {
  try {
    const { companyId, productId, timeRange } = req.body;

    const response = await axios.post(
      `${REZ_INTEL_BRIDGE}/api/v1/predictions/demand`,
      { companyId, productId, timeRange: timeRange || '30d' },
      { timeout: 15000 }
    );

    res.json({
      success: true,
      data: response.data,
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    req.context?.logger.error('Demand forecast error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
