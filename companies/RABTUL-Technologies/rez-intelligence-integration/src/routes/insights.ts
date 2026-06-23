import { Router, Request, Response } from 'express';
import axios from 'axios';
import { AgentContextRequest } from '../middleware/agentContext.js';

export const insightsRouter = Router();

const REZ_INTEL_BRIDGE = process.env.REZ_INTEL_BRIDGE_URL || 'http://localhost:5369';

/**
 * Get merchant insights
 * Used by: Sales Agent, Procurement Agent, Finance Agent
 */
insightsRouter.post('/merchant', async (req: AgentContextRequest, res: Response) => {
  try {
    const { merchantId, companyId, timeRange } = req.body;

    const response = await axios.post(
      `${REZ_INTEL_BRIDGE}/api/v1/insights/merchant`,
      { merchantId, companyId, timeRange: timeRange || '30d' },
      { timeout: 10000 }
    );

    res.json({
      success: true,
      data: response.data,
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    req.context?.logger.error('Merchant insights error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get customer insights
 * Used by: Sales Agent, Support Agent, Marketing Agent
 */
insightsRouter.post('/customer', async (req: AgentContextRequest, res: Response) => {
  try {
    const { customerId, companyId, timeRange } = req.body;

    const response = await axios.post(
      `${REZ_INTEL_BRIDGE}/api/v1/insights/customer`,
      { customerId, companyId, timeRange: timeRange || '90d' },
      { timeout: 10000 }
    );

    res.json({
      success: true,
      data: response.data,
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    req.context?.logger.error('Customer insights error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get competitive benchmarks
 * Used by: Sales Agent, Marketing Agent, CEO Agent
 */
insightsRouter.post('/competitive', async (req: AgentContextRequest, res: Response) => {
  try {
    const { companyId, industry, region } = req.body;

    const response = await axios.post(
      `${REZ_INTEL_BRIDGE}/api/v1/insights/competitive`,
      { companyId, industry, region },
      { timeout: 15000 }
    );

    res.json({
      success: true,
      data: response.data,
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    req.context?.logger.error('Competitive insights error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get product insights
 * Used by: Sales Agent, Marketing Agent
 */
insightsRouter.post('/product', async (req: AgentContextRequest, res: Response) => {
  try {
    const { productId, companyId } = req.body;

    const response = await axios.post(
      `${REZ_INTEL_BRIDGE}/api/v1/insights/product`,
      { productId, companyId },
      { timeout: 10000 }
    );

    res.json({
      success: true,
      data: response.data,
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    req.context?.logger.error('Product insights error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
