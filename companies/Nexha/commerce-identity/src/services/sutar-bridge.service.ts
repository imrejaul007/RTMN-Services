/**
 * SUTAR Bridge Service
 *
 * Thin HTTP client that connects commerce-identity to the SUTAR OS trust
 * layer. Used for:
 *  - Linking a new supplier/buyer to a CorpID identity
 *  - Syncing reputation scores after every rating
 *  - Logging identity-level events for the SUTAR event bus
 *  - Evaluating authorization decisions (policy engine)
 *
 * All calls are best-effort: SUTAR outages must not block commerce
 * onboarding, so failures are logged and swallowed.
 *
 * URL resolution (Phase 4.5 of NEXHA-DEEP-AUDIT.md):
 *   If only SUTAR_BASE_URL is set, the per-service URLs are derived from it
 *   (with appropriate paths). This was previously a per-var fallback chain
 *   that pointed each service at a different port (4702, 4251, 4240) — which
 *   was inconsistent with the .env file shipping (all set to sutar-mock:4799).
 */

import { logger } from '../config/logger';

const SUTAR_BASE = (process.env.SUTAR_BASE_URL || 'http://localhost:4799').replace(/\/$/, '');

// Per-service URLs. Each env var overrides the derived base; otherwise we
// hit the same host on paths that the sutar-mock (and real SUTAR) exposes.
const SUTAR_IDENTITY = process.env.SUTAR_IDENTITY_URL || `${SUTAR_BASE}`;
const SUTAR_REPUTATION = process.env.SUTAR_REPUTATION_URL || `${SUTAR_BASE}`;
const SUTAR_DECISION = process.env.SUTAR_DECISION_URL || `${SUTAR_BASE}`;
const SUTAR_EVENT_BUS = process.env.SUTAR_EVENT_BUS_URL || `${SUTAR_BASE}`;

const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';

async function post(url: string, body: unknown, label: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-key': INTERNAL_KEY },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      logger.warn(`SUTAR ${label} non-2xx`, { url, status: res.status });
      return null;
    }
    return res.json();
  } catch (err) {
    logger.warn(`SUTAR ${label} failed`, { url, err: (err as Error).message });
    return null;
  }
}

export class SutarBridgeService {
  /**
   * Request a CorpID for a new identity (supplier or buyer). If SUTAR is
   * unavailable we return a local fallback id so onboarding never blocks.
   */
  static async requestCorpId(payload: {
    type: 'supplier' | 'buyer';
    businessName: string;
    email: string;
    phone: string;
    isGuest?: boolean;
  }): Promise<string> {
    const result = (await post(`${SUTAR_IDENTITY}/corpid/issue`, payload, 'corpid-issue')) as
      | { corpId?: string }
      | null;
    if (result?.corpId) return result.corpId;
    // local fallback: deterministic-ish id derived from phone + type
    const ts = Date.now().toString(36).toUpperCase();
    return `${payload.type === 'supplier' ? 'SUP' : 'BUY'}-${ts}`;
  }

  /**
   * Link an existing commerce-identity record back to a SUTAR trust score.
   * Returns the SUTAR trust score id so the supplier/buyer document can
   * persist it for cross-service lookups.
   */
  static async linkTrustScore(
    corpId: string,
    subject: 'supplier' | 'buyer'
  ): Promise<string | null> {
    const result = (await post(
      `${SUTAR_REPUTATION}/trust/link`,
      { corpId, subject },
      'trust-link'
    )) as { trustScoreId?: string } | null;
    return result?.trustScoreId || null;
  }

  /**
   * Push a reputation change to SUTAR. Idempotent: SUTAR keys on corpId.
   */
  static async pushReputation(
    corpId: string,
    subject: 'supplier' | 'buyer',
    overallScore: number,
    breakdown: Record<string, number>
  ): Promise<void> {
    await post(
      `${SUTAR_REPUTATION}/trust/sync`,
      { corpId, subject, overallScore, breakdown },
      'trust-sync'
    );
  }

  /**
   * Ask the decision engine whether a given action is allowed under the
   * current policy. Used for status transitions and credit-limit changes.
   */
  static async authorize(payload: {
    action: string;
    corpId: string;
    context?: Record<string, unknown>;
  }): Promise<{ allowed: boolean; reason?: string }> {
    const result = (await post(
      `${SUTAR_DECISION}/policy/evaluate`,
      payload,
      'policy-evaluate'
    )) as { allowed?: boolean; reason?: string } | null;
    return { allowed: result?.allowed ?? true, reason: result?.reason };
  }

  /**
   * Emit an event into the SUTAR event bus. Useful for the commerce-feed
   * service to broadcast activity to other RTMN services.
   */
  static async emitEvent(
    topic: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    await post(`${SUTAR_EVENT_BUS}/events/publish`, { topic, payload }, 'event-bus');
  }
}
