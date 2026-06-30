/**
 * Salar OS - BLR AI Marketplace Bridge
 *
 * Bridge: Salar OS (Workforce Registry) → BLR AI Marketplace (BAM)
 *
 * Flow:
 * 1. When agent is created/updated in Salar → index in BLR Discovery Engine
 * 2. When agent is published in Salar → create listing in BLR Marketplace
 * 3. When agent is purchased in BLR → trigger SUTAR deployment
 *
 * Canonical: BLR = ONE unified marketplace for all agents
 */

import { Router, Request, Response } from 'express';
import { createLogger } from '@rtmn/shared/lib/logger';

const logger = createLogger('salar-BLR-bridge');

const router = Router();

// ============================================================================
// SERVICE URLs (configurable via env)
// ============================================================================

const BLR_DISCOVERY_URL = process.env.BLR_DISCOVERY_URL || 'http://localhost:4256';
const BLR_MARKETPLACE_URL = process.env.BLR_MARKETPLACE_URL || 'http://localhost:4255';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// ============================================================================
// HELPERS
// ============================================================================

async function callService(url: string, method: string, body?: any): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (INTERNAL_TOKEN) {
    headers['x-internal-token'] = INTERNAL_TOKEN;
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (error: any) {
    logger.error(`[BLR Bridge] Failed to call ${url}:`, error.message);
    return { ok: false, status: 0, data: null, error: error.message };
  }
}

// Map Salar agent type to BLR category
function mapToBLRCategory(agentType: string): string {
  const categoryMap: Record<string, string> = {
    SPECIALIZED: 'ai-employee',
    GENERALIST: 'ai-employee',
    ORCHESTRATOR: 'ai-team',
  };
  return categoryMap[agentType] || 'ai-employee';
}

// Map Salar capabilities to BLR tags
function mapCapabilities(capabilities: any[]): string[] {
  if (!Array.isArray(capabilities)) return [];
  return capabilities.map(c =>
    typeof c === 'string' ? c : c.name || c.capabilityId
  ).filter(Boolean);
}

// ============================================================================
// BRIDGE 1: Salar → BLR Discovery Engine (Indexing)
// ============================================================================

/**
 * POST /salar-bridge/blr/index
 *
 * Index an agent from Salar into BLR Discovery Engine.
 * Called when agent is created/updated.
 */
router.post('/salar-bridge/blr/index', async (req: Request, res: Response) => {
  try {
    const { agentTwin } = req.body;

    if (!agentTwin) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'agentTwin required' },
      });
    }

    logger.info(`[BLR Bridge] Indexing agent: ${agentTwin.agentId}`);

    // Transform Salar agent to BLR Discovery document
    const doc = {
      id: agentTwin.agentId,
      name: agentTwin.name,
      description: agentTwin.identity?.description || `${agentTwin.name} AI agent`,
      tags: [
        agentTwin.identity?.department || 'General',
        ...mapCapabilities(agentTwin.capabilities || []),
      ].slice(0, 20),
      category: mapToBLRCategory(agentTwin.identity?.type || 'SPECIALIZED'),
      publisher: agentTwin.identity?.owner || 'HOJAI-AI',
      // Agent metadata
      capabilities: mapCapabilities(agentTwin.capabilities || []),
      pricing: {
        perTask: agentTwin.cost?.perTask || 0.01,
        perHour: agentTwin.cost?.perHour || 0.05,
        currency: agentTwin.cost?.currency || 'INR',
      },
      trust: {
        score: agentTwin.trust?.overallScore || 0.5,
        level: agentTwin.trust?.riskLevel || 'LOW',
      },
      performance: {
        successRate: agentTwin.performance?.successRate || 0,
        avgResponseTime: agentTwin.performance?.avgResponseTime || 0,
      },
      // Link back to Salar
      salarAgentId: agentTwin.agentId,
      salarTwinId: agentTwin.twinId,
    };

    // Index in BLR Discovery Engine
    const result = await callService(
      `${BLR_DISCOVERY_URL}/api/index`,
      'POST',
      { kind: 'agent', doc }
    );

    if (!result.ok) {
      logger.warn(`[BLR Bridge] Failed to index agent: ${result.status}`);
    }

    res.json({
      success: true,
      data: {
        indexed: result.ok,
        agentId: agentTwin.agentId,
        blrDocId: result.data?.id,
      },
    });
  } catch (error: any) {
    logger.error('[BLR Bridge] Index error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BRIDGE_ERROR', message: error.message },
    });
  }
});

/**
 * POST /salar-bridge/blr/index/bulk
 *
 * Bulk index multiple agents from Salar into BLR Discovery.
 */
router.post('/salar-bridge/blr/index/bulk', async (req: Request, res: Response) => {
  try {
    const { agents } = req.body;

    if (!Array.isArray(agents)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'agents array required' },
      });
    }

    logger.info(`[BLR Bridge] Bulk indexing ${agents.length} agents`);

    const docs = agents.map((agentTwin: any) => ({
      id: agentTwin.agentId,
      name: agentTwin.name,
      description: agentTwin.identity?.description || `${agentTwin.name} AI agent`,
      tags: [
        agentTwin.identity?.department || 'General',
        ...mapCapabilities(agentTwin.capabilities || []),
      ].slice(0, 20),
      category: mapToBLRCategory(agentTwin.identity?.type || 'SPECIALIZED'),
      publisher: agentTwin.identity?.owner || 'HOJAI-AI',
      capabilities: mapCapabilities(agentTwin.capabilities || []),
      salarAgentId: agentTwin.agentId,
      salarTwinId: agentTwin.twinId,
    }));

    // Bulk index in BLR Discovery Engine
    const result = await callService(
      `${BLR_DISCOVERY_URL}/api/index/bulk`,
      'POST',
      { kind: 'agent', docs }
    );

    res.json({
      success: true,
      data: {
        indexed: result.ok ? result.data?.ids?.length : 0,
        total: agents.length,
        blrResult: result.data,
      },
    });
  } catch (error: any) {
    logger.error('[BLR Bridge] Bulk index error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BRIDGE_ERROR', message: error.message },
    });
  }
});

/**
 * DELETE /salar-bridge/blr/index/:agentId
 *
 * Remove agent from BLR Discovery.
 */
router.delete('/salar-bridge/blr/index/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    logger.info(`[BLR Bridge] Removing agent from index: ${agentId}`);

    const result = await callService(
      `${BLR_DISCOVERY_URL}/api/index/${agentId}`,
      'DELETE'
    );

    res.json({
      success: true,
      data: {
        removed: result.ok,
        agentId,
      },
    });
  } catch (error: any) {
    logger.error('[BLR Bridge] Remove index error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BRIDGE_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 2: Salar → BLR Marketplace (Listings)
// ============================================================================

/**
 * POST /salar-bridge/blr/listings
 *
 * Create a marketplace listing for an agent from Salar.
 * Called when agent is published/made available in marketplace.
 */
router.post('/salar-bridge/blr/listings', async (req: Request, res: Response) => {
  try {
    const { agentTwin, pricing, visibility = 'PUBLIC', status = 'PUBLISHED' } = req.body;

    if (!agentTwin) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'agentTwin required' },
      });
    }

    logger.info(`[BLR Bridge] Creating listing for agent: ${agentTwin.agentId}`);

    // Transform to BLR Marketplace listing format
    const listing = {
      title: agentTwin.name,
      shortDescription: agentTwin.identity?.description || `${agentTwin.name} AI professional agent`,
      description: `
# ${agentTwin.name}

## About this Agent

${agentTwin.identity?.description || `${agentTwin.name} is an AI professional agent.`}

## Capabilities

${(agentTwin.capabilities || []).map((c: any) => `- ${c.name || c}`).join('\n')}

## Performance

- Success Rate: ${((agentTwin.performance?.successRate || 0) * 100).toFixed(1)}%
- Avg Response Time: ${((agentTwin.performance?.avgResponseTime || 0) / 1000).toFixed(1)}s

## Trust & Safety

- Trust Score: ${((agentTwin.trust?.overallScore || 0.5) * 100).toFixed(0)}%
- Risk Level: ${agentTwin.trust?.riskLevel || 'LOW'}
      `.trim(),
      category: mapToBLRCategory(agentTwin.identity?.type || 'SPECIALIZED'),
      tags: [
        agentTwin.identity?.department || 'General',
        ...mapCapabilities(agentTwin.capabilities || []),
      ].slice(0, 15),
      pricingModel: pricing?.model || 'subscription',
      price: pricing?.amount || (agentTwin.cost?.perHour || 0.05) * 160, // Monthly = hourly * 160hrs
      currency: pricing?.currency || agentTwin.cost?.currency || 'INR',
      visibility,
      status,
      // Marketplace metadata
      metadata: {
        salarAgentId: agentTwin.agentId,
        salarTwinId: agentTwin.twinId,
        capabilities: mapCapabilities(agentTwin.capabilities || []),
        trustScore: agentTwin.trust?.overallScore || 0.5,
        performance: agentTwin.performance || {},
        source: 'salar-os',
      },
      publisherName: agentTwin.identity?.owner || 'HOJAI-AI',
      publisherUrl: 'https://hojai.ai',
    };

    // Create listing in BLR Marketplace
    const result = await callService(
      `${BLR_MARKETPLACE_URL}/api/listings`,
      'POST',
      listing
    );

    if (!result.ok) {
      logger.warn(`[BLR Bridge] Failed to create listing: ${result.status}`);
      return res.status(result.status).json({
        success: false,
        error: { code: 'MARKETPLACE_ERROR', message: result.data?.error || 'Failed to create listing' },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        listingId: result.data?.listingId,
        agentId: agentTwin.agentId,
        status: 'PUBLISHED',
      },
    });
  } catch (error: any) {
    logger.error('[BLR Bridge] Listing error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BRIDGE_ERROR', message: error.message },
    });
  }
});

/**
 * POST /salar-bridge/blr/listings/sync-all
 *
 * Sync all active agents from Salar to BLR Marketplace listings.
 */
router.post('/salar-bridge/blr/listings/sync-all', async (req: Request, res: Response) => {
  try {
    const { AgentTwin } = await import('./agentTwin.js');

    // Get all active agents from Salar
    const agents = await AgentTwin.find({ 'health.status': 'ACTIVE' }).lean();

    logger.info(`[BLR Bridge] Syncing ${agents.length} agents to BLR Marketplace`);

    const results = {
      success: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const agent of agents) {
      try {
        // Check if listing already exists
        const existingResult = await callService(
          `${BLR_MARKETPLACE_URL}/api/listings?metadata.salarAgentId=${agent.agentId}`,
          'GET'
        );

        if (existingResult.ok && existingResult.data?.items?.length > 0) {
          results.skipped++;
          continue;
        }

        // Create listing
        const createResult = await callService(
          `${BLR_MARKETPLACE_URL}/api/listings`,
          'POST',
          {
            title: agent.name,
            shortDescription: agent.identity?.description || `${agent.name} AI agent`,
            description: `${agent.name} - AI professional agent`,
            category: mapToBLRCategory(agent.identity?.type || 'SPECIALIZED'),
            tags: [...(agent.capabilities || []).map((c: any) => c.name || c)].slice(0, 10),
            pricingModel: 'subscription',
            price: (agent.cost?.perHour || 0.05) * 160,
            currency: agent.cost?.currency || 'INR',
            visibility: 'PUBLIC',
            status: 'PUBLISHED',
            metadata: {
              salarAgentId: agent.agentId,
              salarTwinId: agent.twinId,
              source: 'salar-os',
            },
            publisherName: agent.identity?.owner || 'HOJAI-AI',
          }
        );

        if (createResult.ok) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`${agent.agentId}: ${createResult.data?.error}`);
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${agent.agentId}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    logger.error('[BLR Bridge] Sync all error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BRIDGE_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 3: BLR → SUTAR/AgentOS (Install Pipeline)
// ============================================================================

/**
 * POST /salar-bridge/blr/purchase-webhook
 *
 * Called by BLR when an agent is purchased.
 * Triggers deployment via AgentOS full-deploy pipeline.
 */
router.post('/salar-bridge/blr/purchase-webhook', async (req: Request, res: Response) => {
  try {
    const { listingId, buyerTenantId, agentId, salarAgentId } = req.body;

    logger.info(`[BLR Bridge] Purchase webhook: listing=${listingId}, agent=${salarAgentId}`);

    // Get agent details from Salar
    let agentTwin = null;
    if (salarAgentId) {
      const { AgentTwin } = await import('./agentTwin.js');
      agentTwin = await AgentTwin.findOne({ agentId: salarAgentId }).lean();
    }

    if (!agentTwin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Agent not found in Salar' },
      });
    }

    // Trigger deployment via AgentOS
    const AGENT_OS_URL = process.env.AGENT_OS_URL || 'http://localhost:4802';

    const deployResult = await callService(
      `${AGENT_OS_URL}/api/agent/full-deploy`,
      'POST',
      {
        name: agentTwin.name,
        type: 'custom', // AgentOS type
        owner: agentTwin.identity?.owner || 'hojai-ai',
        capabilities: mapCapabilities(agentTwin.capabilities || []),
        metadata: {
          salarAgentId: agentTwin.agentId,
          salarTwinId: agentTwin.twinId,
          buyerTenantId,
          listingId,
          source: 'blr-marketplace',
        },
        scope: buyerTenantId,
      }
    );

    if (!deployResult.ok) {
      logger.warn(`[BLR Bridge] Deploy failed: ${deployResult.status}`);
    }

    res.json({
      success: true,
      data: {
        deployed: deployResult.ok,
        agentId: agentTwin.agentId,
        deploySteps: deployResult.data?.steps || [],
      },
    });
  } catch (error: any) {
    logger.error('[BLR Bridge] Purchase webhook error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BRIDGE_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// HEALTH & STATUS
// ============================================================================

/**
 * GET /salar-bridge/blr/health
 *
 * Check bridge health and connectivity to BLR services.
 */
router.get('/salar-bridge/blr/health', async (req: Request, res: Response) => {
  try {
    const [discoveryHealth, marketplaceHealth] = await Promise.all([
      callService(`${BLR_DISCOVERY_URL}/health`, 'GET'),
      callService(`${BLR_MARKETPLACE_URL}/health`, 'GET'),
    ]);

    res.json({
      success: true,
      data: {
        bridge: {
          status: 'ok',
          connectedTo: {
            blrDiscovery: discoveryHealth.ok ? 'connected' : 'disconnected',
            blrMarketplace: marketplaceHealth.ok ? 'connected' : 'disconnected',
          },
        },
        services: {
          discovery: discoveryHealth.data,
          marketplace: marketplaceHealth.data,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'HEALTH_ERROR', message: error.message },
    });
  }
});

/**
 * GET /salar-bridge/blr/stats
 *
 * Get bridge statistics - how many agents synced.
 */
router.get('/salar-bridge/blr/stats', async (req: Request, res: Response) => {
  try {
    const [indexes, listings] = await Promise.all([
      callService(`${BLR_DISCOVERY_URL}/api/indexes/agent`, 'GET'),
      callService(`${BLR_MARKETPLACE_URL}/api/listings?category=ai-employee`, 'GET'),
    ]);

    res.json({
      success: true,
      data: {
        discoveryEngine: {
          agentCount: indexes.data?.count || indexes.data?.total || 0,
        },
        marketplace: {
          aiEmployeeCount: listings.data?.count || listings.data?.items?.length || 0,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'STATS_ERROR', message: error.message },
    });
  }
});

export { router as salarBLRBridgeRouter };
export default router;
