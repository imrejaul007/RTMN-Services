/**
 * AgentOS Identity Bridge
 *
 * Bridge: AgentOS → CorpID (Identity) + TwinOS (Digital Twins)
 *
 * Integration flow:
 * 1. Agent registered in AgentOS → Create CorpID identity
 * 2. Agent activated → Create/update TwinOS digital twin
 * 3. Agent retired → Archive CorpID + TwinOS
 * 4. Trust updates → Sync to TwinOS
 *
 * Canonical: Every agent has CorpID identity + TwinOS digital twin.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// ============================================================================
// CONFIG
// ============================================================================

const PORT = parseInt(process.env.PORT || '4810', 10);
const SERVICE_NAME = 'agent-identity-bridge';
const VERSION = '1.0.0';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// Service URLs
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';
const TWINOS_URL = process.env.TWINOS_URL || 'http://localhost:4705';
const AGENT_REGISTRY_URL = process.env.AGENT_REGISTRY_URL || 'http://localhost:4803';

// ============================================================================
// HELPERS
// ============================================================================

function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

async function callService(url, method, body) {
  const headers = {
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
  } catch (error) {
    console.error(`[Identity Bridge] Failed to call ${url}:`, error.message);
    return { ok: false, status: 0, data: null, error: error.message };
  }
}

// Map AgentOS agent type to CorpID identity type
function mapCorpIdType(agentType) {
  const typeMap = {
    genie: 'GENIE',
    merchant: 'MERCHANT',
    system: 'SYSTEM',
    partner: 'PARTNER',
    custom: 'AGENT',
  };
  return typeMap[agentType] || 'AGENT';
}

// Map agent to CorpID identity payload
function toCorpIdPayload(agent) {
  return {
    type: mapCorpIdType(agent.type),
    name: agent.name,
    owner: agent.owner,
    metadata: {
      agentRegistryId: agent.id,
      version: agent.version,
      capabilities: agent.capabilities || [],
      tools: agent.tools || [],
      skills: agent.skills || [],
      source: 'agent-os',
      ...(agent.metadata || {}),
    },
  };
}

// Map agent to TwinOS twin payload
function toTwinOsPayload(agent) {
  return {
    twinType: 'agent',
    name: agent.name,
    entityId: agent.id,
    capabilities: agent.capabilities || [],
    tools: agent.tools || [],
    skills: agent.skills || [],
    status: agent.status === 'active' ? 'ACTIVE' : 'INACTIVE',
    metadata: {
      agentType: agent.type,
      owner: agent.owner,
      version: agent.version,
      capabilities: agent.capabilities || [],
      tools: agent.tools || [],
      skills: agent.skills || [],
      source: 'agent-os',
      ...(agent.metadata || {}),
    },
  };
}

// ============================================================================
// APP
// ============================================================================

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// Health
app.get('/health', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: VERSION,
    port: PORT,
    status: 'ok',
  });
});

app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============================================================================
// BRIDGE 1: Agent → CorpID Identity
// ============================================================================

/**
 * POST /identity/corpid
 *
 * Create CorpID identity for an agent.
 * Called when agent is created in AgentOS.
 */
app.post('/identity/corpid', requireInternal, async (req, res) => {
  try {
    const { agentId, agent } = req.body;

    if (!agent && !agentId) {
      return res.status(400).json({ error: 'agentId or agent required' });
    }

    // Get agent from registry if only id provided
    let agentData = agent;
    if (!agentData && agentId) {
      const registryResult = await callService(
        `${AGENT_REGISTRY_URL}/api/agents/${agentId}`,
        'GET'
      );
      if (!registryResult.ok) {
        return res.status(registryResult.status).json({
          error: 'Failed to fetch agent',
          detail: registryResult.data,
        });
      }
      agentData = registryResult.data;
    }

    console.log(`[Identity Bridge] Creating CorpID for agent: ${agentData.id}`);

    // Create identity in CorpID
    const payload = toCorpIdPayload(agentData);
    const corpidResult = await callService(
      `${CORPID_URL}/api/identities/agent`,
      'POST',
      payload
    );

    if (!corpidResult.ok) {
      console.error('[Identity Bridge] CorpID creation failed:', corpidResult.status);
      return res.status(corpidResult.status).json({
        error: 'Failed to create CorpID identity',
        detail: corpidResult.data,
      });
    }

    console.log(`[Identity Bridge] CorpID created: ${corpidResult.data?.identityId}`);

    res.status(201).json({
      success: true,
      data: {
        corpId: corpidResult.data?.identityId,
        agentId: agentData.id,
        status: 'CREATED',
      },
    });
  } catch (error) {
    console.error('[Identity Bridge] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /identity/corpid/:agentId
 *
 * Update CorpID identity for an agent.
 * Called when agent is updated.
 */
app.patch('/identity/corpid/:agentId', requireInternal, async (req, res) => {
  try {
    const { agentId } = req.params;

    // Get current agent from registry
    const registryResult = await callService(
      `${AGENT_REGISTRY_URL}/api/agents/${agentId}`,
      'GET'
    );
    if (!registryResult.ok) {
      return res.status(registryResult.status).json({
        error: 'Failed to fetch agent',
        detail: registryResult.data,
      });
    }

    const agentData = registryResult.data;

    console.log(`[Identity Bridge] Updating CorpID for agent: ${agentId}`);

    // Update identity in CorpID
    const payload = toCorpIdPayload(agentData);
    const corpidResult = await callService(
      `${CORPID_URL}/api/identities/agent/${agentId}`,
      'PATCH',
      payload
    );

    if (!corpidResult.ok) {
      console.error('[Identity Bridge] CorpID update failed:', corpidResult.status);
      return res.status(corpidResult.status).json({
        error: 'Failed to update CorpID identity',
        detail: corpidResult.data,
      });
    }

    res.json({
      success: true,
      data: {
        corpId: corpidResult.data?.identityId,
        agentId,
        status: 'UPDATED',
      },
    });
  } catch (error) {
    console.error('[Identity Bridge] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /identity/corpid/:agentId
 *
 * Archive CorpID identity for an agent.
 * Called when agent is retired.
 */
app.delete('/identity/corpid/:agentId', requireInternal, async (req, res) => {
  try {
    const { agentId } = req.params;

    console.log(`[Identity Bridge] Archiving CorpID for agent: ${agentId}`);

    const corpidResult = await callService(
      `${CORPID_URL}/api/identities/agent/${agentId}`,
      'DELETE'
    );

    res.json({
      success: true,
      data: {
        agentId,
        status: corpidResult.ok ? 'ARCHIVED' : 'NOT_FOUND',
      },
    });
  } catch (error) {
    console.error('[Identity Bridge] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// BRIDGE 2: Agent → TwinOS Digital Twin
// ============================================================================

/**
 * POST /identity/twinos
 *
 * Create TwinOS digital twin for an agent.
 */
app.post('/identity/twinos', requireInternal, async (req, res) => {
  try {
    const { agentId, agent } = req.body;

    if (!agent && !agentId) {
      return res.status(400).json({ error: 'agentId or agent required' });
    }

    // Get agent from registry if only id provided
    let agentData = agent;
    if (!agentData && agentId) {
      const registryResult = await callService(
        `${AGENT_REGISTRY_URL}/api/agents/${agentId}`,
        'GET'
      );
      if (!registryResult.ok) {
        return res.status(registryResult.status).json({
          error: 'Failed to fetch agent',
          detail: registryResult.data,
        });
      }
      agentData = registryResult.data;
    }

    console.log(`[Identity Bridge] Creating TwinOS twin for agent: ${agentData.id}`);

    // Create twin in TwinOS
    const payload = toTwinOsPayload(agentData);
    const twinosResult = await callService(
      `${TWINOS_URL}/api/twins/agent`,
      'POST',
      payload
    );

    if (!twinosResult.ok) {
      console.error('[Identity Bridge] TwinOS creation failed:', twinosResult.status);
      return res.status(twinosResult.status).json({
        error: 'Failed to create TwinOS twin',
        detail: twinosResult.data,
      });
    }

    console.log(`[Identity Bridge] TwinOS twin created: ${twinosResult.data?.twinId}`);

    res.status(201).json({
      success: true,
      data: {
        twinId: twinosResult.data?.twinId,
        agentId: agentData.id,
        status: 'CREATED',
      },
    });
  } catch (error) {
    console.error('[Identity Bridge] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /identity/twinos/:agentId
 *
 * Update TwinOS digital twin for an agent.
 */
app.patch('/identity/twinos/:agentId', requireInternal, async (req, res) => {
  try {
    const { agentId } = req.params;

    // Get current agent from registry
    const registryResult = await callService(
      `${AGENT_REGISTRY_URL}/api/agents/${agentId}`,
      'GET'
    );
    if (!registryResult.ok) {
      return res.status(registryResult.status).json({
        error: 'Failed to fetch agent',
        detail: registryResult.data,
      });
    }

    const agentData = registryResult.data;

    console.log(`[Identity Bridge] Updating TwinOS twin for agent: ${agentId}`);

    // Update twin in TwinOS
    const payload = toTwinOsPayload(agentData);
    const twinosResult = await callService(
      `${TWINOS_URL}/api/twins/agent/${agentId}`,
      'PATCH',
      payload
    );

    if (!twinosResult.ok) {
      console.error('[Identity Bridge] TwinOS update failed:', twinosResult.status);
      return res.status(twinosResult.status).json({
        error: 'Failed to update TwinOS twin',
        detail: twinosResult.data,
      });
    }

    res.json({
      success: true,
      data: {
        twinId: twinosResult.data?.twinId,
        agentId,
        status: 'UPDATED',
      },
    });
  } catch (error) {
    console.error('[Identity Bridge] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /identity/twinos/:agentId
 *
 * Archive TwinOS digital twin for an agent.
 */
app.delete('/identity/twinos/:agentId', requireInternal, async (req, res) => {
  try {
    const { agentId } = req.params;

    console.log(`[Identity Bridge] Archiving TwinOS twin for agent: ${agentId}`);

    const twinosResult = await callService(
      `${TWINOS_URL}/api/twins/agent/${agentId}`,
      'DELETE'
    );

    res.json({
      success: true,
      data: {
        agentId,
        status: twinosResult.ok ? 'ARCHIVED' : 'NOT_FOUND',
      },
    });
  } catch (error) {
    console.error('[Identity Bridge] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// BRIDGE 3: Full Sync (CorpID + TwinOS)
// ============================================================================

/**
 * POST /identity/sync
 *
 * Sync agent to both CorpID and TwinOS.
 */
app.post('/identity/sync', requireInternal, async (req, res) => {
  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId required' });
    }

    console.log(`[Identity Bridge] Full sync for agent: ${agentId}`);

    // Get agent from registry
    const registryResult = await callService(
      `${AGENT_REGISTRY_URL}/api/agents/${agentId}`,
      'GET'
    );
    if (!registryResult.ok) {
      return res.status(registryResult.status).json({
        error: 'Failed to fetch agent',
        detail: registryResult.data,
      });
    }

    const agentData = registryResult.data;

    // Sync to both
    const [corpidResult, twinosResult] = await Promise.all([
      callService(`${CORPID_URL}/api/identities/agent/${agentId}`, 'GET'),
      callService(`${TWINOS_URL}/api/twins/agent/${agentId}`, 'GET'),
    ]);

    const results = {
      corpId: null,
      twinId: null,
    };

    // Create or update CorpID
    if (corpidResult.ok) {
      // Update
      await callService(`${CORPID_URL}/api/identities/agent/${agentId}`, 'PATCH', toCorpIdPayload(agentData));
      results.corpId = agentId;
    } else {
      // Create
      const createResult = await callService(`${CORPID_URL}/api/identities/agent`, 'POST', toCorpIdPayload(agentData));
      results.corpId = createResult.data?.identityId;
    }

    // Create or update TwinOS
    if (twinosResult.ok) {
      // Update
      await callService(`${TWINOS_URL}/api/twins/agent/${agentId}`, 'PATCH', toTwinOsPayload(agentData));
      results.twinId = agentId;
    } else {
      // Create
      const createResult = await callService(`${TWINOS_URL}/api/twins/agent`, 'POST', toTwinOsPayload(agentData));
      results.twinId = createResult.data?.twinId;
    }

    console.log(`[Identity Bridge] Full sync complete:`, results);

    res.json({
      success: true,
      data: {
        agentId,
        corpId: results.corpId,
        twinId: results.twinId,
        status: 'SYNCED',
      },
    });
  } catch (error) {
    console.error('[Identity Bridge] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /identity/sync-all
 *
 * Sync all agents to CorpID and TwinOS.
 */
app.post('/identity/sync-all', requireInternal, async (req, res) => {
  try {
    console.log('[Identity Bridge] Syncing all agents to CorpID + TwinOS');

    // Get all agents from registry
    const registryResult = await callService(
      `${AGENT_REGISTRY_URL}/api/agents`,
      'GET'
    );

    if (!registryResult.ok) {
      return res.status(registryResult.status).json({
        error: 'Failed to fetch agents',
        detail: registryResult.data,
      });
    }

    const agents = registryResult.data.agents || [];
    const results = {
      total: agents.length,
      synced: 0,
      failed: 0,
      errors: [],
    };

    for (const agent of agents) {
      try {
        const syncResult = await callService(
          `${AGENT_REGISTRY_URL.replace(':4803', ':4810')}/identity/sync`,
          'POST',
          { agentId: agent.id }
        );
        if (syncResult.ok) {
          results.synced++;
        } else {
          results.failed++;
          results.errors.push(`${agent.id}: ${syncResult.data?.error || 'sync failed'}`);
        }
      } catch (err) {
        results.failed++;
        results.errors.push(`${agent.id}: ${err.message}`);
      }
    }

    console.log(`[Identity Bridge] Sync complete: ${results.synced}/${results.total} synced`);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('[Identity Bridge] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// BRIDGE 4: Trust Updates
// ============================================================================

/**
 * POST /identity/trust-update
 *
 * Update agent trust score and sync to TwinOS.
 */
app.post('/identity/trust-update', requireInternal, async (req, res) => {
  try {
    const { agentId, trustScore, trustLevel } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId required' });
    }

    console.log(`[Identity Bridge] Trust update for agent: ${agentId}`);

    // Update TwinOS twin with trust info
    const twinosResult = await callService(
      `${TWINOS_URL}/api/twins/agent/${agentId}`,
      'PATCH',
      {
        metadata: {
          trustScore: trustScore || 0.5,
          trustLevel: trustLevel || 'LOW',
          lastTrustUpdate: new Date().toISOString(),
        },
      }
    );

    res.json({
      success: true,
      data: {
        agentId,
        twinUpdated: twinosResult.ok,
        trustScore,
        trustLevel,
      },
    });
  } catch (error) {
    console.error('[Identity Bridge] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /identity/health
 *
 * Check bridge health and connectivity.
 */
app.get('/identity/health', async (req, res) => {
  try {
    const [corpidHealth, twinosHealth, registryHealth] = await Promise.all([
      callService(`${CORPID_URL}/health`, 'GET'),
      callService(`${TWINOS_URL}/health`, 'GET'),
      callService(`${AGENT_REGISTRY_URL}/health`, 'GET'),
    ]);

    res.json({
      success: true,
      data: {
        bridge: SERVICE_NAME,
        connectedTo: {
          corpid: corpidHealth.ok ? 'connected' : 'disconnected',
          twinos: twinosHealth.ok ? 'connected' : 'disconnected',
          agentRegistry: registryHealth.ok ? 'connected' : 'disconnected',
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 404
// ============================================================================

app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

// ============================================================================
// START
// ============================================================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on :${PORT}`);
    console.log(`[${SERVICE_NAME}] CorpID: ${CORPID_URL}`);
    console.log(`[${SERVICE_NAME}] TwinOS: ${TWINOS_URL}`);
    console.log(`[${SERVICE_NAME}] Agent Registry: ${AGENT_REGISTRY_URL}`);
  });
}

module.exports = { app, SERVICE_NAME, VERSION, PORT };
