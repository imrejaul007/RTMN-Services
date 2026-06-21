/**
 * SUTAR Agent-ID Client
 *
 * Bridges inventory-twin-service to SUTAR OS (the multi-agent runtime).
 * When inventory hits reorder point, this client registers a SUTAR agent
 * that handles the reorder intent. That agent then dispatches the RFQ
 * to procurement-os and tracks the outcome.
 *
 * This is the implementation of the vision's "Restaurant AI needs 500kg rice":
 * the AI is not the inventory twin itself — the AI is a SUTAR agent that
 * the inventory twin creates/registers on demand.
 *
 * Service-to-service auth: uses the x-internal-token header.
 *
 * Fail-open: if SUTAR is unreachable, the reorder proceeds locally (via
 * procurementClient) and the agent registration is logged for retry.
 */

import { logger } from './logger';

const SUTAR_AGENT_ID_URL = process.env.SUTAR_AGENT_ID_URL || 'http://localhost:4145';
const INTERNAL_SERVICE_TOKEN = process.env.SUTAR_AGENT_ID_INTERNAL_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '';
const REQUEST_TIMEOUT_MS = 3000;

export interface SutartAgentManifest {
  agentId: string;
  name: string;
  capabilities: string[];
  intents: string[];
  restaurantId: string;
  metadata: Record<string, unknown>;
  registeredAt: string;
}

export interface SutartClientResult {
  ok: boolean;
  manifest?: SutartAgentManifest;
  error?: string;
  queuedLocally: boolean;
}

export class SutartAgentIdClient {
  /**
   * Register a SUTAR agent that will handle reorder intents for a specific restaurant.
   * If the agent already exists (idempotent on agentId), it returns the existing manifest.
   */
  async registerReorderAgent(opts: {
    restaurantId: string;
    agentId?: string;
    name?: string;
  }): Promise<SutartClientResult> {
    if (!INTERNAL_SERVICE_TOKEN) {
      logger.warn('SUTAR_AGENT_ID_INTERNAL_TOKEN not set; agent registration will be local-only');
      return { ok: false, error: 'no internal token configured', queuedLocally: true };
    }

    const agentId = opts.agentId || `agent-restaurant-${opts.restaurantId}-reorder`;
    const url = `${SUTAR_AGENT_ID_URL}/api/agents`;

    const body = {
      agentId,
      name: opts.name || `${opts.restaurantId} Reorder Agent`,
      capabilities: ['transact', 'negotiate', 'recommend'],
      intents: ['order_product', 'request_quote', 'negotiate_price', 'escalate'],
      metadata: {
        restaurantId: opts.restaurantId,
        source: 'inventory-twin-service',
        registeredBy: 'inventory-twin.createPurchaseOrder',
        registeredAt: new Date().toISOString(),
      },
    };

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': INTERNAL_SERVICE_TOKEN,
          'x-source-service': 'restaurant-os',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutHandle);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        logger.error('sutar-agent-id register failed', {
          status: res.status,
          body: text.slice(0, 500),
          agentId,
        });
        return { ok: false, error: `HTTP ${res.status}`, queuedLocally: true };
      }

      const json = (await res.json()) as { success?: boolean; data?: SutartAgentManifest; error?: string };
      if (!json.success || !json.data) {
        logger.error('sutar-agent-id register returned non-success', { json, agentId });
        return { ok: false, error: json.error || 'unknown error', queuedLocally: true };
      }

      logger.info('Registered SUTAR reorder agent', {
        agentId: json.data.agentId,
        restaurantId: opts.restaurantId,
      });
      return { ok: true, manifest: json.data, queuedLocally: false };
    } catch (err) {
      clearTimeout(timeoutHandle);
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('sutar-agent-id register threw (continuing without agent)', {
        error: message,
        agentId,
        restaurantId: opts.restaurantId,
      });
      return { ok: false, error: message, queuedLocally: true };
    }
  }

  /**
   * Find agents that can handle a given intent. Used by other services
   * that need to dispatch a task to a capable agent.
   */
  async findAgentsForIntent(intent: string): Promise<SutartAgentManifest[]> {
    if (!INTERNAL_SERVICE_TOKEN) return [];

    const url = `${SUTAR_AGENT_ID_URL}/api/manifest/agents-for-intent?intent=${encodeURIComponent(intent)}`;

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        headers: {
          'x-internal-token': INTERNAL_SERVICE_TOKEN,
          'x-source-service': 'restaurant-os',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutHandle);

      if (!res.ok) return [];
      const json = (await res.json()) as { success?: boolean; data?: SutartAgentManifest[] };
      return json.data || [];
    } catch (err) {
      clearTimeout(timeoutHandle);
      return [];
    }
  }
}

export const sutartAgentIdClient = new SutartAgentIdClient();