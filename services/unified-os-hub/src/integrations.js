/**
 * RTMN Integration Layer v2.0
 * Connects SUTAR OS, Copilot, Genie AI, and Nexha with ALL RTMN OS
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

const SERVICES = {
  // Department OS
  sales: 'http://localhost:5055',
  marketing: 'http://localhost:5500',
  customerSuccess: 'http://localhost:4050',
  procurement: 'http://localhost:5096',
  workforce: 'http://localhost:5077',
  finance: 'http://localhost:4801',
  operations: 'http://localhost:5250',
  cxo: 'http://localhost:5100',

  // Foundation
  memoryOs: 'http://localhost:4703',
  twinOs: 'http://localhost:4705',
  corpId: 'http://localhost:4702',

  // External
  sutarOs: 'http://localhost:4799',
  commerceIdentity: 'http://localhost:8000',
  agentCopilot: 'http://localhost:4920',
  genieVoice: 'http://localhost:4760',

  // Industry OS
  restaurant: 'http://localhost:5010',
  hotel: 'http://localhost:5025',
  healthcare: 'http://localhost:5020',
  retail: 'http://localhost:5030',
};

// ============================================
// INTEGRATION: GENIE → MEMORY OS
// ============================================

/**
 * Genie Voice captures user interactions and stores in Memory OS
 * POST /api/integrations/genie-memory
 */
router.post('/genie-memory', async (req, res) => {
  const { userId, sessionId, transcript, intent, entities, sentiment } = req.body;

  try {
    // Store interaction in Memory OS
    const memoryPayload = {
      type: 'genie_interaction',
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
      data: { transcript, intent, entities, sentiment },
      source: 'genie_voice',
      ttl: 86400 * 30, // 30 days
    };

    const [memoryRes] = await Promise.all([
      axios.post(`${SERVICES.memoryOs}/api/memories`, memoryPayload).catch(() => null),
    ]);

    // Also update TwinOS with interaction
    if (userId) {
      axios.post(`${SERVICES.twinOs}/api/twins/${userId}/interactions`, {
        type: 'voice_interaction',
        source: 'genie',
        timestamp: memoryPayload.timestamp,
        summary: transcript?.substring(0, 200),
      }).catch(() => {});
    }

    res.json({
      success: true,
      integration: 'genie-memory',
      memoryStored: !!memoryRes,
      twinUpdated: true,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// INTEGRATION: AGENT COPILOT → DEPARTMENT OS
// ============================================

/**
 * Agent Copilot provides AI assistance to all Department OS
 * POST /api/integrations/copilot-assist
 */
router.post('/copilot-assist', async (req, res) => {
  const { targetOS, action, context } = req.body;

  const osTargets = {
    sales: `${SERVICES.sales}/api/ai/assist`,
    marketing: `${SERVICES.marketing}/api/ai/assist`,
    customerSuccess: `${SERVICES.customerSuccess}/api/ai/assist`,
    procurement: `${SERVICES.procurement}/api/ai/assist`,
    workforce: `${SERVICES.workforce}/api/ai/assist`,
    finance: `${SERVICES.finance}/api/ai/assist`,
    operations: `${SERVICES.operations}/api/ai/assist`,
    cxo: `${SERVICES.cxo}/api/ai/assist`,
  };

  try {
    if (targetOS === 'all') {
      // Broadcast to all Department OS
      const results = await Promise.allSettled(
        Object.entries(osTargets).map(([os, url]) =>
          axios.post(url, { action, context }).catch(e => ({ os, error: e.message }))
        )
      );
      res.json({
        success: true,
        integration: 'copilot-department',
        broadcast: true,
        results: results.map((r, i) => ({
          os: Object.keys(osTargets)[i],
          status: r.status === 'fulfilled' ? 'success' : 'failed',
        })),
      });
    } else {
      const url = osTargets[targetOS];
      if (!url) return res.status(400).json({ success: false, error: 'Invalid target OS' });

      const response = await axios.post(url, { action, context });
      res.json({
        success: true,
        integration: 'copilot-department',
        target: targetOS,
        response: response.data,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Execute task with Agent Copilot directly
 * POST /api/integrations/copilot-execute
 */
router.post('/copilot-execute', async (req, res) => {
  const { agentId, task, params } = req.body;

  try {
    const response = await axios.post(`${SERVICES.agentCopilot}/api/execute`, {
      agentId: agentId || undefined,
      task,
      params,
    });

    res.json({
      success: true,
      integration: 'copilot-execute',
      result: response.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      integration: 'copilot-execute',
      error: error.response?.data?.error || error.message,
    });
  }
});

/**
 * Get available agents from Agent Copilot
 * GET /api/integrations/copilot-agents
 */
router.get('/copilot-agents', async (req, res) => {
  try {
    const response = await axios.get(`${SERVICES.agentCopilot}/api/agents`);
    res.json({
      success: true,
      integration: 'copilot-agents',
      agents: response.data.agents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      integration: 'copilot-agents',
      error: error.message,
    });
  }
});

// ============================================
// INTEGRATION: SUTAR ↔ COMMERCE IDENTITY
// ============================================

/**
 * SUTAR OS provides identity verification, Commerce Identity manages users
 * POST /api/integrations/sutar-identity
 */
router.post('/sutar-identity', async (req, res) => {
  const { userId, action, sutarData } = req.body;

  try {
    const results = {};

    if (action === 'verify') {
      // Verify user with SUTAR
      const sutarRes = await axios.post(`${SERVICES.sutarOs}/api/identity/verify`, {
        userId,
        ...sutarData,
      }).catch(() => ({ data: { verified: false, reason: 'SUTAR unavailable' } }));

      results.sutar = sutarRes.data;

      // Update Commerce Identity with verification
      if (userId && sutarRes.data.verified) {
        await axios.patch(`${SERVICES.commerceIdentity}/api/users/${userId}/verification`, {
          sutarVerified: true,
          verifiedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    } else if (action === 'sync') {
      // Sync identity data between SUTAR and Commerce Identity
      const identityRes = await axios.get(`${SERVICES.commerceIdentity}/api/users/${userId}`).catch(() => null);
      if (identityRes?.data?.user) {
        await axios.post(`${SERVICES.sutarOs}/api/identity/sync`, {
          userId,
          profile: identityRes.data.user,
        }).catch(() => {});
        results.synced = true;
      }
    }

    res.json({
      success: true,
      integration: 'sutar-identity',
      ...results,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// INTEGRATION: TWINOS SYNC ACROSS ALL OS
// ============================================

/**
 * Sync digital twins across all services
 * POST /api/integrations/twin-sync
 */
router.post('/twin-sync', async (req, res) => {
  const { entityType, entityId, changes } = req.body;

  try {
    // Get current twin state
    const twinRes = await axios.get(`${SERVICES.twinOs}/api/twins/${entityType}/${entityId}`)
      .catch(() => ({ data: null }));

    // Update twin with new changes
    const updateRes = twinRes.data
      ? await axios.patch(`${SERVICES.twinOs}/api/twins/${entityType}/${entityId}`, changes)
      : await axios.post(`${SERVICES.twinOs}/api/twins`, { entityType, entityId, ...changes });

    // Broadcast update to all Department OS
    const broadcastTargets = Object.values(SERVICES).filter((_, i) => i < 8); // Department OS only

    await Promise.allSettled(
      broadcastTargets.map(url =>
        axios.post(`${url}/api/twins/webhook`, {
          entityType,
          entityId,
          changes,
          timestamp: new Date().toISOString(),
        }).catch(() => {})
      )
    );

    res.json({
      success: true,
      integration: 'twin-sync',
      twinUpdated: true,
      broadcastSent: broadcastTargets.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// INTEGRATION: CUSTOMER 360 VIEW
// ============================================

/**
 * Get unified customer view across all systems
 * GET /api/integrations/customer360/:customerId
 */
router.get('/customer360/:customerId', async (req, res) => {
  const { customerId } = req.params;

  try {
    const [salesRes, marketingRes, csRes, walletRes, twinRes] = await Promise.allSettled([
      axios.get(`${SERVICES.sales}/api/customers/${customerId}`),
      axios.get(`${SERVICES.marketing}/api/contacts/${customerId}`),
      axios.get(`${SERVICES.customerSuccess}/api/customers/${customerId}`),
      axios.get(`${SERVICES.commerceIdentity}/api/users/${customerId}`),
      axios.get(`${SERVICES.twinOs}/api/twins/customer/${customerId}`),
    ]);

    const customer360 = {
      customerId,
      sales: salesRes.status === 'fulfilled' ? salesRes.value.data : null,
      marketing: marketingRes.status === 'fulfilled' ? marketingRes.value.data : null,
      customerSuccess: csRes.status === 'fulfilled' ? csRes.value.data : null,
      identity: walletRes.status === 'fulfilled' ? walletRes.value.data : null,
      digitalTwin: twinRes.status === 'fulfilled' ? twinRes.value.data : null,
      lastUpdated: new Date().toISOString(),
    };

    res.json({
      success: true,
      integration: 'customer360',
      data: customer360,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// INTEGRATION: WORKFLOW ORCHESTRATION
// ============================================

/**
 * Orchestrate cross-OS workflows
 * POST /api/integrations/orchestrate
 */
router.post('/orchestrate', async (req, res) => {
  const { workflow, params } = req.body;

  const workflows = {
    'lead-to-customer': async () => {
      // 1. Create lead in Sales
      const salesRes = await axios.post(`${SERVICES.sales}/api/leads`, params);
      // 2. Create contact in Marketing
      await axios.post(`${SERVICES.marketing}/api/contacts`, params);
      // 3. Create customer in CS
      await axios.post(`${SERVICES.customerSuccess}/api/customers`, params);
      // 4. Create user in Commerce Identity
      await axios.post(`${SERVICES.commerceIdentity}/api/users`, params);
      // 5. Create digital twin
      await axios.post(`${SERVICES.twinOs}/api/twins`, { type: 'customer', ...params });

      return { leadCreated: salesRes.data };
    },

    'new-hire-onboarding': async () => {
      // 1. Create employee in Workforce
      const workforceRes = await axios.post(`${SERVICES.workforce}/api/employees`, params);
      // 2. Create user in CorpID
      await axios.post(`${SERVICES.corpId}/api/users`, params);
      // 3. Create digital twin for employee
      await axios.post(`${SERVICES.twinOs}/api/twins`, { type: 'employee', ...params });

      return { employeeCreated: workforceRes.data };
    },

    'new-customer-journey': async () => {
      // 1. Verify with SUTAR
      await axios.post(`${SERVICES.sutarOs}/api/identity/verify`, params);
      // 2. Create in Commerce Identity
      const identityRes = await axios.post(`${SERVICES.commerceIdentity}/api/users`, params);
      // 3. Create in Customer Success
      await axios.post(`${SERVICES.customerSuccess}/api/customers`, params);
      // 4. Start onboarding journey
      await axios.post(`${SERVICES.marketing}/api/journeys/onboarding/start`, { customerId: identityRes.data.id });

      return { customerOnboarded: identityRes.data };
    },
  };

  try {
    const handler = workflows[workflow];
    if (!handler) return res.status(400).json({ success: false, error: 'Unknown workflow' });

    const result = await handler();
    res.json({
      success: true,
      integration: 'orchestration',
      workflow,
      result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

router.get('/health', async (req, res) => {
  const integrations = ['genie-memory', 'copilot-department', 'sutar-identity', 'twin-sync'];

  res.json({
    status: 'healthy',
    service: 'RTMN Integration Layer',
    version: '2.0.0',
    integrations,
  });
});

module.exports = router;
