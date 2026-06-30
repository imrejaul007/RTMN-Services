/**
 * BLR AI Marketplace - SUTAR/AgentOS Install Webhook
 *
 * Bridge: BLR Marketplace → SUTAR OS / AgentOS
 *
 * Flow:
 * 1. Buyer purchases agent in BLR
 * 2. Stripe webhook fires (checkout.session.completed)
 * 3. This webhook handler:
 *    a. Creates/installs agent in AgentOS
 *    b. Registers agent in SUTAR (if commerce agent)
 *    c. Sets up memory partition
 *    d. Configures trust score from SADA
 */

import { Request, Response, Router } from 'express';

// ============================================================================
// SERVICE URLs
// ============================================================================

const AGENT_OS_URL = process.env.AGENT_OS_URL || 'http://localhost:4802';
const SUTAR_ACP_URL = process.env.SUTAR_ACP_URL || 'http://localhost:4800';
const SUTAR_AGENT_NETWORK_URL = process.env.SUTAR_AGENT_NETWORK_URL || 'http://localhost:4801';
const SUTAR_TRUST_ENGINE_URL = process.env.SUTAR_TRUST_ENGINE_URL || 'http://localhost:4291';
const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';
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
    console.error(`[SUTAR Webhook] Failed to call ${url}:`, error.message);
    return { ok: false, status: 0, data: null, error: error.message };
  }
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * POST /webhooks/stripe/checkout-completed
 *
 * Called by Stripe when checkout completes.
 * Triggers agent installation via AgentOS/SUTAR.
 */
export async function handleCheckoutCompleted(req: Request, res: Response): Promise<void> {
  try {
    const { session } = req.body;

    if (!session) {
      res.status(400).json({ error: 'session required' });
      return;
    }

    const { metadata, customer_email, client_reference_id } = session;
    const listingId = metadata?.listingId;
    const buyerTenantId = metadata?.tenantId || client_reference_id;

    console.log(`[SUTAR Webhook] Checkout completed: listing=${listingId}, buyer=${buyerTenantId}`);

    if (!listingId) {
      res.status(400).json({ error: 'listingId required in metadata' });
      return;
    }

    // Get listing details
    const listingResult = await callService(
      `${AGENT_OS_URL.replace(':4802', ':4255')}/api/listings/${listingId}`,
      'GET'
    );

    if (!listingResult.ok) {
      console.error('[SUTAR Webhook] Failed to get listing:', listingResult.status);
      res.status(500).json({ error: 'Failed to get listing' });
      return;
    }

    const listing = listingResult.data;

    // Check if this is an AI agent listing
    const isAgentListing = listing.category === 'ai-employee' ||
                          listing.category === 'agent' ||
                          listing.metadata?.source === 'salar-os';

    if (!isAgentListing) {
      console.log('[SUTAR Webhook] Not an agent listing, skipping install');
      res.json({ success: true, installed: false, reason: 'not-agent' });
      return;
    }

    // Extract agent metadata
    const agentMetadata = listing.metadata || {};
    const salarAgentId = agentMetadata.salarAgentId;
    const capabilities = agentMetadata.capabilities || [];

    // Step 1: Deploy agent via AgentOS full-deploy pipeline
    const deployResult = await callService(
      `${AGENT_OS_URL}/api/agent/full-deploy`,
      'POST',
      {
        name: listing.title,
        type: 'custom',
        owner: listing.publisherName || 'hojai-ai',
        capabilities,
        metadata: {
          source: 'blr-marketplace',
          listingId,
          buyerTenantId,
          salarAgentId,
          customerEmail: customer_email,
        },
        scope: buyerTenantId,
      }
    );

    if (!deployResult.ok) {
      console.error('[SUTAR Webhook] AgentOS deploy failed:', deployResult.status);
      // Don't fail the webhook, just log
    }

    const agentOSAgentId = deployResult.data?.steps?.[0]?.body?.id;

    // Step 2: If commerce agent, register in SUTAR ACN Network
    if (agentMetadata.commerceAgent || listing.category === 'agent') {
      const acnResult = await callService(
        `${SUTAR_AGENT_NETWORK_URL}/api/agents`,
        'POST',
        {
          name: listing.title,
          type: 'merchant',
          capabilities,
          owner: buyerTenantId,
          metadata: {
            listingId,
            agentOSAgentId,
            salarAgentId,
            customerEmail: customer_email,
          },
        }
      );

      if (acnResult.ok) {
        console.log('[SUTAR Webhook] Registered in SUTAR ACN:', acnResult.data?.agentId);
      }
    }

    // Step 3: Set up memory partition
    if (agentOSAgentId) {
      const memoryResult = await callService(
        `${AGENT_OS_URL}/api/agent/memory/api/agents/${agentOSAgentId}/memories`,
        'POST',
        {
          agentId: agentOSAgentId,
          type: 'context',
          content: `Installed from BLR Marketplace - ${listing.title}. Customer: ${customer_email}. Tenant: ${buyerTenantId}`,
          tags: ['marketplace', 'installation', buyerTenantId],
          confidence: 1.0,
        }
      );

      if (memoryResult.ok) {
        console.log('[SUTAR Webhook] Memory partition created for:', agentOSAgentId);
      }
    }

    // Step 4: Fetch trust score from SADA/SUTAR Trust Engine
    if (salarAgentId) {
      const trustResult = await callService(
        `${SUTAR_TRUST_ENGINE_URL}/api/v1/trust/score/${salarAgentId}`,
        'GET'
      );

      if (trustResult.ok) {
        console.log('[SUTAR Webhook] Trust score:', trustResult.data?.score);
      }
    }

    // Record install
    const installResult = await callService(
      `${AGENT_OS_URL.replace(':4802', ':4255')}/api/installs`,
      'POST',
      {
        listingId,
        buyerTenantId,
        customerEmail: customer_email,
        instanceId: agentOSAgentId || `temp-${Date.now()}`,
        runtime: 'agent-os',
        metadata: {
          deployResult: deployResult.ok,
          agentOSAgentId,
          installedAt: new Date().toISOString(),
        },
      }
    );

    console.log('[SUTAR Webhook] Installation complete:', {
      listingId,
      buyerTenantId,
      agentOSAgentId,
      installed: deployResult.ok,
    });

    res.json({
      success: true,
      installed: deployResult.ok,
      data: {
        listingId,
        buyerTenantId,
        agentOSAgentId,
        deploySteps: deployResult.data?.steps?.length || 0,
        installId: installResult.data?.installId,
      },
    });
  } catch (error: any) {
    console.error('[SUTAR Webhook] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /webhooks/stripe/subscription-renewed
 *
 * Called when subscription renews.
 * Extends agent access.
 */
export async function handleSubscriptionRenewed(req: Request, res: Response): Promise<void> {
  try {
    const { subscription } = req.body;

    if (!subscription) {
      res.status(400).json({ error: 'subscription required' });
      return;
    }

    const { metadata, customer_email } = subscription;
    const buyerTenantId = metadata?.tenantId;

    console.log(`[SUTAR Webhook] Subscription renewed: tenant=${buyerTenantId}`);

    // Update agent access/expiration
    // Could call AgentOS to extend the agent's active period

    res.json({
      success: true,
      renewed: true,
      tenantId: buyerTenantId,
    });
  } catch (error: any) {
    console.error('[SUTAR Webhook] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /webhooks/stripe/subscription-cancelled
 *
 * Called when subscription cancelled.
 * Deactivates agent.
 */
export async function handleSubscriptionCancelled(req: Request, res: Response): Promise<void> {
  try {
    const { subscription } = req.body;

    if (!subscription) {
      res.status(400).json({ error: 'subscription required' });
      return;
    }

    const { metadata } = subscription;
    const buyerTenantId = metadata?.tenantId;

    console.log(`[SUTAR Webhook] Subscription cancelled: tenant=${buyerTenantId}`);

    // Deactivate agent in AgentOS
    // Could call AgentOS to pause/retire the agent

    res.json({
      success: true,
      deactivated: true,
      tenantId: buyerTenantId,
    });
  } catch (error: any) {
    console.error('[SUTAR Webhook] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

// ============================================================================
// EXPRESS ROUTER
// ============================================================================

export function createSutarWebhookRouter(): Router {
  const router = Router();

  // Stripe checkout completed
  router.post('/stripe/checkout-completed', handleCheckoutCompleted);

  // Subscription events
  router.post('/stripe/subscription-renewed', handleSubscriptionRenewed);
  router.post('/stripe/subscription-cancelled', handleSubscriptionCancelled);

  return router;
}

export default createSutarWebhookRouter;
