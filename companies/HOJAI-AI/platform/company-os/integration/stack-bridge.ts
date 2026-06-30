/**
 * CompanyOS - Unified Civilization Stack Integration
 *
 * Wires CompanyOS to the unified civilization stack:
 * - SADA OS (Trust)
 * - Salar OS (Workforce Registry)
 * - BLR AI Marketplace (BAM)
 * - SUTAR OS (Agent Operation)
 * - AgentOS (Runtime)
 * - CorpID / TwinOS (Identity)
 *
 * This is how CompanyOS uses the underlying infrastructure.
 */

import { Router, Request, Response } from 'express';

const router = Router();

// ============================================================================
// SERVICE URLs
// ============================================================================

const SALAR_URL = process.env.SALAR_URL || 'http://localhost:4710';
const BLR_DISCOVERY_URL = process.env.BLR_DISCOVERY_URL || 'http://localhost:4256';
const BLR_MARKETPLACE_URL = process.env.BLR_MARKETPLACE_URL || 'http://localhost:4255';
const SUTAR_DECISION_URL = process.env.SUTAR_DECISION_URL || 'http://localhost:4240';
const SUTAR_ECONOMY_URL = process.env.SUTAR_ECONOMY_URL || 'http://localhost:4294';
const AGENT_OS_URL = process.env.AGENT_OS_URL || 'http://localhost:4802';
const AGENT_IDENTITY_URL = process.env.AGENT_IDENTITY_URL || 'http://localhost:4810';
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';
const TWINOS_URL = process.env.TWINOS_URL || 'http://localhost:4705';
const SADA_URL = process.env.SADA_URL || 'http://localhost:4190';
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
    console.error(`[CompanyOS Bridge] Failed to call ${url}:`, error.message);
    return { ok: false, status: 0, data: null, error: error.message };
  }
}

// ============================================================================
// WORKFORCE INTEGRATION
// ============================================================================

/**
 * POST /api/workforce/hire
 *
 * Hire workforce for a company.
 * Uses Salar OS for workforce registry.
 */
router.post('/api/workforce/hire', async (req: Request, res: Response) => {
  try {
    const { companyId, department, role, type, capabilities } = req.body;

    console.log(`[CompanyOS Bridge] Hiring ${type} for ${companyId}/${department}`);

    // 1. Create identity in CorpID
    const corpidResult = await callService(
      `${CORPID_URL}/api/identities/company/${companyId}/workers`,
      'POST',
      {
        type: type === 'ai' ? 'AGENT' : 'HUMAN',
        role,
        department,
        capabilities,
      }
    );

    // 2. Register in Salar
    const salarEndpoint = type === 'ai'
      ? `${SALAR_URL}/agent-twin`
      : `${SALAR_URL}/human-twin`;

    const salarResult = await callService(salarEndpoint, 'POST', {
      companyId,
      department,
      role,
      capabilities,
      corpId: corpidResult.data?.identityId,
    });

    // 3. Create digital twin
    const twinResult = await callService(
      `${TWINOS_URL}/api/twins/${type === 'ai' ? 'agent' : 'employee'}`,
      'POST',
      {
        twinType: type === 'ai' ? 'AGENT' : 'EMPLOYEE',
        companyId,
        department,
        name: role,
        capabilities,
        corpId: corpidResult.data?.identityId,
      }
    );

    res.json({
      success: true,
      data: {
        workerId: salarResult.data?.workerId || salarResult.data?.agentId,
        corpId: corpidResult.data?.identityId,
        twinId: twinResult.data?.twinId,
      },
    });
  } catch (error: any) {
    console.error('[CompanyOS Bridge] Hire error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HIRE_ERROR', message: error.message },
    });
  }
});

/**
 * POST /api/workforce/department
 *
 * Create a department with workforce.
 */
router.post('/api/workforce/department', async (req: Request, res: Response) => {
  try {
    const { companyId, department, workers } = req.body;

    console.log(`[CompanyOS Bridge] Creating department ${department} for ${companyId}`);

    // 1. Create department twin
    const twinResult = await callService(
      `${TWINOS_URL}/api/twins/department`,
      'POST',
      {
        twinType: 'DEPARTMENT',
        companyId,
        name: department,
        workerCount: workers?.length || 0,
      }
    );

    // 2. Register department in Salar capability registry
    const salarResult = await callService(
      `${SALAR_URL}/capabilities/department`,
      'POST',
      {
        departmentId: `${companyId}-${department}`,
        companyId,
        name: department,
        capabilities: workers?.flatMap((w: any) => w.capabilities || []) || [],
        workerCount: workers?.length || 0,
      }
    );

    // 3. Register each worker
    const workerResults = [];
    for (const worker of workers || []) {
      const workerResult = await callService(
        `${SALAR_URL}/agent-twin`,
        'POST',
        {
          companyId,
          department,
          role: worker.role,
          capabilities: worker.capabilities,
        }
      );
      workerResults.push(workerResult);
    }

    res.json({
      success: true,
      data: {
        departmentId: `${companyId}-${department}`,
        twinId: twinResult.data?.twinId,
        workersCreated: workerResults.filter(r => r.ok).length,
      },
    });
  } catch (error: any) {
    console.error('[CompanyOS Bridge] Department error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DEPARTMENT_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// MARKETPLACE INTEGRATION
// ============================================================================

/**
 * POST /api/marketplace/purchase
 *
 * Purchase workforce from BLR AI Marketplace.
 */
router.post('/api/marketplace/purchase', async (req: Request, res: Response) => {
  try {
    const { companyId, listingId, department } = req.body;

    console.log(`[CompanyOS Bridge] Purchasing from BLR: ${listingId}`);

    // 1. Get listing details
    const listingResult = await callService(
      `${BLR_MARKETPLACE_URL}/api/listings/${listingId}`,
      'GET'
    );

    if (!listingResult.ok) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
    }

    const listing = listingResult.data;

    // 2. Create company identity if needed
    const corpidResult = await callService(
      `${CORPID_URL}/api/identities/company/${companyId}`,
      'POST',
      { name: companyId }
    );

    // 3. Purchase from BLR (triggers Stripe checkout)
    const purchaseResult = await callService(
      `${BLR_MARKETPLACE_URL}/api/purchase`,
      'POST',
      {
        listingId,
        buyerCompanyId: companyId,
        department,
      }
    );

    if (!purchaseResult.ok) {
      return res.status(400).json({
        success: false,
        error: { code: 'PURCHASE_ERROR', message: purchaseResult.data?.error },
      });
    }

    // 4. Register purchased agent in Salar
    const salarResult = await callService(
      `${SALAR_URL}/agent-twin`,
      'POST',
      {
        companyId,
        department,
        name: listing.title,
        capabilities: listing.metadata?.capabilities || [],
        source: 'blr-marketplace',
        listingId,
      }
    );

    res.json({
      success: true,
      data: {
        purchaseId: purchaseResult.data?.purchaseId,
        workerId: salarResult.data?.agentId,
        department,
      },
    });
  } catch (error: any) {
    console.error('[CompanyOS Bridge] Purchase error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'MARKETPLACE_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/marketplace/search
 *
 * Search workforce in BLR AI Marketplace.
 */
router.get('/api/marketplace/search', async (req: Request, res: Response) => {
  try {
    const { q, department, capabilities } = req.query;

    const searchResult = await callService(
      `${BLR_DISCOVERY_URL}/api/search`,
      'POST',
      {
        query: q || '',
        filters: {
          category: 'ai-employee',
          department,
          capabilities: capabilities ? capabilities.toString().split(',') : [],
        },
        limit: 20,
      }
    );

    res.json({
      success: true,
      data: searchResult.data,
    });
  } catch (error: any) {
    console.error('[CompanyOS Bridge] Search error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SEARCH_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// AGENT OPERATIONS (SUTAR)
// ============================================================================

/**
 * POST /api/agents/deploy
 *
 * Deploy an AI agent using SUTAR OS.
 */
router.post('/api/agents/deploy', async (req: Request, res: Response) => {
  try {
    const { companyId, agentId, capabilities, goal } = req.body;

    console.log(`[CompanyOS Bridge] Deploying agent: ${agentId}`);

    // 1. Get agent from Salar
    const salarResult = await callService(
      `${SALAR_URL}/agent-twin/${agentId}`,
      'GET'
    );

    if (!salarResult.ok) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Agent not found in registry' },
      });
    }

    const agent = salarResult.data;

    // 2. Create SUTAR agent in network
    const sutarResult = await callService(
      `${AGENT_OS_URL}/api/agent/registry`,
      'POST',
      {
        name: agent.name,
        type: 'merchant',
        owner: companyId,
        capabilities: capabilities || agent.capabilities,
        metadata: {
          salarAgentId: agentId,
          companyId,
          department: agent.department,
        },
      }
    );

    // 3. Create identity (CorpID + TwinOS)
    const identityResult = await callService(
      `${AGENT_IDENTITY_URL}/identity/sync`,
      'POST',
      {
        agentId: sutarResult.data?.id,
      }
    );

    // 4. If goal provided, create SUTAR mission
    if (goal) {
      const missionResult = await callService(
        `${SUTAR_DECISION_URL}/api/missions`,
        'POST',
        {
          agentId: sutarResult.data?.id,
          goal,
          owner: companyId,
        }
      );

      res.json({
        success: true,
        data: {
          agentId: sutarResult.data?.id,
          twinId: identityResult.data?.twinId,
          missionId: missionResult.data?.missionId,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          agentId: sutarResult.data?.id,
          twinId: identityResult.data?.twinId,
        },
      });
    }
  } catch (error: any) {
    console.error('[CompanyOS Bridge] Deploy error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DEPLOY_ERROR', message: error.message },
    });
  }
});

/**
 * POST /api/agents/task
 *
 * Assign a task to an AI agent.
 */
router.post('/api/agents/task', async (req: Request, res: Response) => {
  try {
    const { companyId, agentId, task, deadline, priority } = req.body;

    console.log(`[CompanyOS Bridge] Assigning task to agent: ${agentId}`);

    // Create task via SUTAR Decision Engine
    const taskResult = await callService(
      `${SUTAR_DECISION_URL}/api/tasks`,
      'POST',
      {
        agentId,
        task,
        deadline,
        priority: priority || 'MEDIUM',
        owner: companyId,
      }
    );

    // Update agent capacity in Salar
    await callService(
      `${SALAR_URL}/agent-twin/${agentId}/capacity`,
      'PATCH',
      {
        currentTasks: 1,
        status: 'BUSY',
      }
    );

    res.json({
      success: true,
      data: {
        taskId: taskResult.data?.taskId,
        agentId,
      },
    });
  } catch (error: any) {
    console.error('[CompanyOS Bridge] Task error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'TASK_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// TRUST & GOVERNANCE
// ============================================================================

/**
 * GET /api/trust/score
 *
 * Get company trust score from SADA OS.
 */
router.get('/api/trust/score/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const trustResult = await callService(
      `${SADA_URL}/api/v1/trust/score/${companyId}`,
      'GET'
    );

    res.json({
      success: true,
      data: {
        companyId,
        trustScore: trustResult.data?.score || 0.5,
        riskLevel: trustResult.data?.riskLevel || 'MEDIUM',
        verificationStatus: trustResult.data?.verificationStatus || 'BASIC',
      },
    });
  } catch (error: any) {
    console.error('[CompanyOS Bridge] Trust error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'TRUST_ERROR', message: error.message },
    });
  }
});

/**
 * POST /api/trust/update
 *
 * Update company trust score (triggers SADA recalculation).
 */
router.post('/api/trust/update', async (req: Request, res: Response) => {
  try {
    const { companyId, events } = req.body;

    console.log(`[CompanyOS Bridge] Trust update for: ${companyId}`);

    // Push events to SADA for recalculation
    const trustResult = await callService(
      `${SADA_URL}/api/v1/trust/events`,
      'POST',
      {
        entityId: companyId,
        entityType: 'COMPANY',
        events: events || [],
      }
    );

    // Query updated trust
    const scoreResult = await callService(
      `${SADA_URL}/api/v1/trust/score/${companyId}`,
      'GET'
    );

    res.json({
      success: true,
      data: {
        companyId,
        trustScore: scoreResult.data?.score,
        riskLevel: scoreResult.data?.riskLevel,
      },
    });
  } catch (error: any) {
    console.error('[CompanyOS Bridge] Trust update error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'TRUST_UPDATE_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// ECONOMY & PAYMENTS
// ============================================================================

/**
 * POST /api/economy/wallet
 *
 * Create company wallet using SUTAR Economy.
 */
router.post('/api/economy/wallet', async (req: Request, res: Response) => {
  try {
    const { companyId, currency, initialBalance } = req.body;

    console.log(`[CompanyOS Bridge] Creating wallet for: ${companyId}`);

    const walletResult = await callService(
      `${SUTAR_ECONOMY_URL}/api/v1/wallets`,
      'POST',
      {
        ownerId: companyId,
        ownerType: 'COMPANY',
        currency: currency || 'INR',
        initialBalance: initialBalance || 0,
      }
    );

    // Link wallet to company in CorpID
    await callService(
      `${CORPID_URL}/api/identities/company/${companyId}`,
      'PATCH',
      {
        walletId: walletResult.data?.walletId,
      }
    );

    res.json({
      success: true,
      data: {
        walletId: walletResult.data?.walletId,
        companyId,
      },
    });
  } catch (error: any) {
    console.error('[CompanyOS Bridge] Wallet error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'WALLET_ERROR', message: error.message },
    });
  }
});

/**
 * POST /api/economy/pay
 *
 * Pay for workforce/services using company wallet.
 */
router.post('/api/economy/pay', async (req: Request, res: Response) => {
  try {
    const { companyId, workerId, amount, currency, description } = req.body;

    console.log(`[CompanyOS Bridge] Payment: ${amount} to ${workerId}`);

    // Get company wallet
    const walletResult = await callService(
      `${CORPID_URL}/api/identities/company/${companyId}`,
      'GET'
    );

    const walletId = walletResult.data?.walletId;
    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_WALLET', message: 'Company has no wallet' },
      });
    }

    // Execute payment via SUTAR Economy
    const paymentResult = await callService(
      `${SUTAR_ECONOMY_URL}/api/v1/transactions`,
      'POST',
      {
        fromWallet: walletId,
        toEntity: workerId,
        amount,
        currency: currency || 'INR',
        description,
      }
    );

    res.json({
      success: true,
      data: {
        transactionId: paymentResult.data?.transactionId,
        amount,
        workerId,
      },
    });
  } catch (error: any) {
    console.error('[CompanyOS Bridge] Payment error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// DIGITAL TWINS
// ============================================================================

/**
 * GET /api/company/twin
 *
 * Get company digital twin (all related twins aggregated).
 */
router.get('/api/company/twin/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    // Get all twins for company
    const [companyTwin, departmentTwins, workerTwins, assetTwins] = await Promise.all([
      callService(`${TWINOS_URL}/api/twins/company/${companyId}`, 'GET'),
      callService(`${TWINOS_URL}/api/twins?ownerId=${companyId}&twinType=DEPARTMENT`, 'GET'),
      callService(`${TWINOS_URL}/api/twins?ownerId=${companyId}&twinType=AGENT`, 'GET'),
      callService(`${TWINOS_URL}/api/twins?ownerId=${companyId}&twinType=ASSET`, 'GET'),
    ]);

    // Get company memory
    const memoryResult = await callService(
      `${SALAR_URL}/network/${companyId}`,
      'GET'
    );

    res.json({
      success: true,
      data: {
        companyId,
        company: companyTwin.data,
        departments: departmentTwins.data?.twins || [],
        workers: workerTwins.data?.twins || [],
        assets: assetTwins.data?.twins || [],
        memory: memoryResult.data,
      },
    });
  } catch (error: any) {
    console.error('[CompanyOS Bridge] Twin error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'TWIN_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/integration/health
 *
 * Check health of all integrated services.
 */
router.get('/api/integration/health', async (req: Request, res: Response) => {
  try {
    const [salar, blrDisc, blrMarket, sutar, agentos, corpid, twinos, sada] = await Promise.all([
      callService(`${SALAR_URL}/health`, 'GET'),
      callService(`${BLR_DISCOVERY_URL}/health`, 'GET'),
      callService(`${BLR_MARKETPLACE_URL}/health`, 'GET'),
      callService(`${SUTAR_DECISION_URL}/health`, 'GET'),
      callService(`${AGENT_OS_URL}/health`, 'GET'),
      callService(`${CORPID_URL}/health`, 'GET'),
      callService(`${TWINOS_URL}/health`, 'GET'),
      callService(`${SADA_URL}/health`, 'GET'),
    ]);

    const services = {
      salar: salar.ok ? 'healthy' : 'unhealthy',
      blrDiscovery: blrDisc.ok ? 'healthy' : 'unhealthy',
      blrMarketplace: blrMarket.ok ? 'healthy' : 'unhealthy',
      sutar: sutar.ok ? 'healthy' : 'unhealthy',
      agentos: agentos.ok ? 'healthy' : 'unhealthy',
      corpid: corpid.ok ? 'healthy' : 'unhealthy',
      twinos: twinos.ok ? 'healthy' : 'unhealthy',
      sada: sada.ok ? 'healthy' : 'unhealthy',
    };

    const healthyCount = Object.values(services).filter(s => s === 'healthy').length;
    const status = healthyCount >= 4 ? 'healthy' : 'degraded';

    res.json({
      success: true,
      data: {
        status,
        services,
        healthyCount,
        totalCount: 8,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'HEALTH_ERROR', message: error.message },
    });
  }
});

export { router as companyOSStackBridgeRouter };
export default router;
