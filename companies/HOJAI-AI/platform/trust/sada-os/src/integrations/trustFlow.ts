/**
 * SADA Trust Integration - Flow Trust to All Systems
 *
 * SADA OS is the TRUST SOURCE for the entire civilization stack.
 * This module wires trust scores to all dependent systems:
 *
 * Flow:
 * 1. SADA calculates trust score
 * 2. SADA pushes trust to all systems:
 *    - Salar OS (agent/human trust)
 *    - BLR Marketplace (listing trust scores)
 *    - SUTAR OS (agent trust in commerce)
 *    - AgentOS (runtime trust)
 *    - CompanyOS (company trust)
 */

import { Router, Request, Response } from 'express';

const router = Router();

// ============================================================================
// SERVICE URLs
// ============================================================================

const SALAR_URL = process.env.SALAR_URL || 'http://localhost:4710';
const BLR_MARKETPLACE_URL = process.env.BLR_MARKETPLACE_URL || 'http://localhost:4255';
const SUTAR_TRUST_URL = process.env.SUTAR_TRUST_URL || 'http://localhost:4291';
const AGENT_OS_URL = process.env.AGENT_OS_URL || 'http://localhost:4802';
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';
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
    console.error(`[SADA Trust] Failed to call ${url}:`, error.message);
    return { ok: false, status: 0, data: null, error: error.message };
  }
}

// ============================================================================
// BRIDGE 1: Push Trust to Salar OS
// ============================================================================

/**
 * POST /trust/push/salar
 *
 * Push trust score update to Salar OS workforce registry.
 */
router.post('/trust/push/salar', async (req: Request, res: Response) => {
  try {
    const { entityId, entityType, trustScore, riskLevel, auditData } = req.body;

    console.log(`[SADA Trust] Pushing trust to Salar: ${entityType}/${entityId}`);

    // Push to Salar's SADA trust integration endpoint
    const result = await callService(
      `${SALAR_URL}/sada-trust/trust-update`,
      'POST',
      {
        entityId,
        entityType, // 'AGENT' | 'HUMAN' | 'TEAM' | 'ORGANIZATION'
        trustScore,
        riskLevel,
        auditData,
      }
    );

    res.json({
      success: true,
      data: {
        target: 'salar-os',
        entityId,
        updated: result.ok,
      },
    });
  } catch (error: any) {
    console.error('[SADA Trust] Salar push error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PUSH_ERROR', message: error.message },
    });
  }
});

/**
 * POST /trust/push/salar/bulk
 *
 * Bulk push trust updates to Salar OS.
 */
router.post('/trust/push/salar/bulk', async (req: Request, res: Response) => {
  try {
    const { entities } = req.body;

    console.log(`[SADA Trust] Bulk pushing ${entities.length} trust updates to Salar`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const entity of entities) {
      const result = await callService(
        `${SALAR_URL}/sada-trust/trust-update`,
        'POST',
        entity
      );
      if (result.ok) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(`${entity.entityId}: ${result.error}`);
      }
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('[SADA Trust] Salar bulk push error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BULK_PUSH_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 2: Push Trust to BLR Marketplace
// ============================================================================

/**
 * POST /trust/push/blr
 *
 * Push trust score to BLR Marketplace for listings.
 */
router.post('/trust/push/blr', async (req: Request, res: Response) => {
  try {
    const { listingId, agentId, trustScore, verificationStatus, lastVerified } = req.body;

    console.log(`[SADA Trust] Pushing trust to BLR: listing=${listingId}`);

    // Push to BLR's trust/reputation aggregator
    const result = await callService(
      `${BLR_MARKETPLACE_URL}/api/trust/update`,
      'POST',
      {
        listingId,
        agentId,
        trustScore,
        verificationStatus,
        lastVerified: lastVerified || new Date().toISOString(),
        source: 'sada-os',
      }
    );

    res.json({
      success: true,
      data: {
        target: 'blr-marketplace',
        listingId,
        updated: result.ok,
      },
    });
  } catch (error: any) {
    console.error('[SADA Trust] BLR push error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PUSH_ERROR', message: error.message },
    });
  }
});

/**
 * POST /trust/push/blr/bulk
 *
 * Bulk push trust updates to BLR Marketplace.
 */
router.post('/trust/push/blr/bulk', async (req: Request, res: Response) => {
  try {
    const { listings } = req.body;

    console.log(`[SADA Trust] Bulk pushing ${listings.length} trust updates to BLR`);

    const results = {
      success: 0,
      failed: 0,
    };

    for (const listing of listings) {
      const result = await callService(
        `${BLR_MARKETPLACE_URL}/api/trust/update`,
        'POST',
        { ...listing, source: 'sada-os' }
      );
      if (result.ok) results.success++;
      else results.failed++;
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('[SADA Trust] BLR bulk push error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BULK_PUSH_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 3: Push Trust to SUTAR OS
// ============================================================================

/**
 * POST /trust/push/sutar
 *
 * Push trust score to SUTAR Trust Engine for commerce decisions.
 */
router.post('/trust/push/sutar', async (req: Request, res: Response) => {
  try {
    const { entityId, entityType, trustScore, riskLevel, complianceStatus } = req.body;

    console.log(`[SADA Trust] Pushing trust to SUTAR: ${entityId}`);

    // Push to SUTAR Trust Engine
    const result = await callService(
      `${SUTAR_TRUST_URL}/api/v1/trust/update`,
      'POST',
      {
        entityId,
        entityType, // 'AGENT' | 'COMPANY' | 'SUPPLIER' | 'CONSUMER'
        trustScore,
        riskLevel,
        complianceStatus,
        source: 'sada-os',
        timestamp: new Date().toISOString(),
      }
    );

    res.json({
      success: true,
      data: {
        target: 'sutar-os',
        entityId,
        updated: result.ok,
      },
    });
  } catch (error: any) {
    console.error('[SADA Trust] SUTAR push error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PUSH_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 4: Push Trust to AgentOS
// ============================================================================

/**
 * POST /trust/push/agentos
 *
 * Push trust score to AgentOS identity bridge for runtime trust.
 */
router.post('/trust/push/agentos', async (req: Request, res: Response) => {
  try {
    const { agentId, trustScore, trustLevel } = req.body;

    console.log(`[SADA Trust] Pushing trust to AgentOS: ${agentId}`);

    // Push to AgentOS Identity Bridge
    const result = await callService(
      `${AGENT_OS_URL.replace(':4802', ':4810')}/identity/trust-update`,
      'POST',
      {
        agentId,
        trustScore,
        trustLevel,
        source: 'sada-os',
      }
    );

    res.json({
      success: true,
      data: {
        target: 'agent-os',
        agentId,
        updated: result.ok,
      },
    });
  } catch (error: any) {
    console.error('[SADA Trust] AgentOS push error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PUSH_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 5: Push Trust to CorpID
// ============================================================================

/**
 * POST /trust/push/corpid
 *
 * Push trust score to CorpID for universal identity.
 */
router.post('/trust/push/corpid', async (req: Request, res: Response) => {
  try {
    const { corpId, trustScore, riskLevel, verificationLevel } = req.body;

    console.log(`[SADA Trust] Pushing trust to CorpID: ${corpId}`);

    // Push to CorpID
    const result = await callService(
      `${CORPID_URL}/api/identities/${corpId}/trust`,
      'PATCH',
      {
        trustScore,
        riskLevel,
        verificationLevel,
        source: 'sada-os',
        lastUpdated: new Date().toISOString(),
      }
    );

    res.json({
      success: true,
      data: {
        target: 'corp-id',
        corpId,
        updated: result.ok,
      },
    });
  } catch (error: any) {
    console.error('[SADA Trust] CorpID push error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PUSH_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// TRUST QUERY - Get unified trust from all sources
// ============================================================================

/**
 * POST /trust/query
 *
 * Query unified trust score for an entity across all systems.
 */
router.post('/trust/query', async (req: Request, res: Response) => {
  try {
    const { entityId, entityType } = req.body;

    // Get trust from all sources in parallel
    const [sadaResult, salarResult, sutarResult] = await Promise.all([
      callService(`${process.env.SADA_URL || 'http://localhost:4190'}/api/v1/trust/score/${entityId}`, 'GET'),
      callService(`${SALAR_URL}/sada-trust/trust/${entityId}`, 'GET'),
      callService(`${SUTAR_TRUST_URL}/api/v1/trust/score/${entityId}`, 'GET'),
    ]);

    // Aggregate trust scores
    const scores = [];
    if (sadaResult.ok && sadaResult.data?.score) scores.push(sadaResult.data.score);
    if (salarResult.ok && salarResult.data?.trustScore) scores.push(salarResult.data.trustScore);
    if (sutarResult.ok && sutarResult.data?.score) scores.push(sutarResult.data.score);

    const unifiedTrustScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0.5;

    res.json({
      success: true,
      data: {
        entityId,
        entityType,
        unifiedTrustScore,
        sources: {
          sada: sadaResult.data,
          salar: salarResult.data,
          sutar: sutarResult.data,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[SADA Trust] Query error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// TRUST SYNC - Full sync from SADA to all systems
// ============================================================================

/**
 * POST /trust/sync-all
 *
 * Sync trust scores from SADA to all dependent systems.
 * Used for periodic trust refresh or after batch trust recalculation.
 */
router.post('/trust/sync-all', async (req: Request, res: Response) => {
  try {
    const { entityIds, entityType } = req.body;

    console.log(`[SADA Trust] Syncing trust to all systems for ${entityIds?.length || 'all'} entities`);

    // Get all entities from SADA that need syncing
    let entities;
    if (entityIds && entityIds.length > 0) {
      entities = entityIds;
    } else {
      // Get all entities from SADA
      const allResult = await callService(
        `${process.env.SADA_URL || 'http://localhost:4190'}/api/v1/trust/entities`,
        'GET'
      );
      entities = allResult.data?.entities || [];
    }

    const results = {
      total: entities.length,
      salar: { success: 0, failed: 0 },
      blr: { success: 0, failed: 0 },
      sutar: { success: 0, failed: 0 },
      agentos: { success: 0, failed: 0 },
      corpid: { success: 0, failed: 0 },
    };

    // Sync each entity to all systems
    for (const entityId of entities) {
      // Get trust score from SADA
      const trustResult = await callService(
        `${process.env.SADA_URL || 'http://localhost:4190'}/api/v1/trust/score/${entityId}`,
        'GET'
      );

      if (!trustResult.ok) continue;

      const trustData = trustResult.data;

      // Push to all systems
      const [salar, blr, sutar, agentos, corpid] = await Promise.all([
        callService(`${SALAR_URL}/sada-trust/trust-update`, 'POST', {
          entityId,
          entityType,
          trustScore: trustData.score,
          riskLevel: trustData.riskLevel,
        }),
        callService(`${BLR_MARKETPLACE_URL}/api/trust/update`, 'POST', {
          agentId: entityId,
          trustScore: trustData.score,
          source: 'sada-os',
        }),
        callService(`${SUTAR_TRUST_URL}/api/v1/trust/update`, 'POST', {
          entityId,
          trustScore: trustData.score,
          source: 'sada-os',
        }),
        callService(`${AGENT_OS_URL.replace(':4802', ':4810')}/identity/trust-update`, 'POST', {
          agentId: entityId,
          trustScore: trustData.score,
          trustLevel: trustData.riskLevel,
        }),
        callService(`${CORPID_URL}/api/identities/${entityId}/trust`, 'PATCH', {
          trustScore: trustData.score,
          riskLevel: trustData.riskLevel,
        }),
      ]);

      if (salar.ok) results.salar.success++; else results.salar.failed++;
      if (blr.ok) results.blr.success++; else results.blr.failed++;
      if (sutar.ok) results.sutar.success++; else results.sutar.failed++;
      if (agentos.ok) results.agentos.success++; else results.agentos.failed++;
      if (corpid.ok) results.corpid.success++; else results.corpid.failed++;
    }

    console.log(`[SADA Trust] Sync complete:`, results);

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('[SADA Trust] Sync error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYNC_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /trust/push/health
 *
 * Check connectivity to all trust-dependent systems.
 */
router.get('/trust/push/health', async (req: Request, res: Response) => {
  try {
    const [sadaHealth, salarHealth, blrHealth, sutarHealth, agentosHealth, corpidHealth] = await Promise.all([
      callService(`${process.env.SADA_URL || 'http://localhost:4190'}/health`, 'GET'),
      callService(`${SALAR_URL}/health`, 'GET'),
      callService(`${BLR_MARKETPLACE_URL}/health`, 'GET'),
      callService(`${SUTAR_TRUST_URL}/health`, 'GET'),
      callService(`${AGENT_OS_URL.replace(':4802', ':4810')}/health`, 'GET'),
      callService(`${CORPID_URL}/health`, 'GET'),
    ]);

    res.json({
      success: true,
      data: {
        sada: sadaHealth.ok ? 'connected' : 'disconnected',
        salar: salarHealth.ok ? 'connected' : 'disconnected',
        blr: blrHealth.ok ? 'connected' : 'disconnected',
        sutar: sutarHealth.ok ? 'connected' : 'disconnected',
        agentos: agentosHealth.ok ? 'connected' : 'disconnected',
        corpid: corpidHealth.ok ? 'connected' : 'disconnected',
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

export { router as trustFlowRouter };
export default router;
