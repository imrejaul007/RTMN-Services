/**
 * ReZ Mind Intent Capture Service
 *
 * Captures buyer intent signals across the NextaBiZ marketplace to feed
 * the ReZ Mind recommendation engine. Events are fire-and-forget -- never
 * throw or break UX on network failure.
 *
 * Intent confidence levels:
 *   product_search  -> search     (0.15)  - discovery intent
 *   product_view    -> view       (0.25)  - consideration intent
 *   inquiry_sent    -> wishlist   (0.30)  - strong interest / save intent
 *   checkout_start  -> checkout_start (0.60) - purchase commitment intent
 *   order_placed    -> fulfilled  (1.0)  - highest-confidence purchase signal
 */

const INTENT_CAPTURE_URL =
  process.env.NEXT_PUBLIC_INTENT_CAPTURE_URL || 'https://rez-intent-graph.onrender.com';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

const EVENT_TO_INTENT_MAP: Record<
  string,
  { eventType: string; category: string; confidence: number }
> = {
  product_search: { eventType: 'search', category: 'RETAIL', confidence: 0.15 },
  product_view: { eventType: 'view', category: 'RETAIL', confidence: 0.25 },
  inquiry_sent: { eventType: 'wishlist', category: 'RETAIL', confidence: 0.3 },
  checkout_start: { eventType: 'checkout_start', category: 'RETAIL', confidence: 0.6 },
  order_placed: { eventType: 'fulfilled', category: 'RETAIL', confidence: 1.0 },
  inventory_signal_received: { eventType: 'view', category: 'RETAIL', confidence: 0.25 },
};

/** Core capture function -- called by track(). */
export async function captureIntent(params: {
  userId: string;
  eventType: string;
  category: string;
  intentKey: string;
  metadata?: Record<string, unknown>;
  appType: string;
}): Promise<void> {
  if (!INTENT_CAPTURE_URL) return;

  try {
    await fetch(`${INTENT_CAPTURE_URL}/api/intent/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': INTERNAL_SERVICE_TOKEN,
      },
      body: JSON.stringify({
        userId: params.userId,
        appType: params.appType,
        eventType: params.eventType,
        category: params.category,
        intentKey: params.intentKey,
        metadata: params.metadata,
      }),
    });
  } catch {
    // Never throw -- intent capture must never break UX
  }
}

/**
 * High-level tracker invoked by page/component code.
 *
 * @param params.userId     - merchant or user identifier
 * @param params.event      - one of the keys in EVENT_TO_INTENT_MAP
 * @param params.appType    - 'nextabizz-web' | 'nextabizz-supplier'
 * @param params.intentKey  - the product/category/entity key to associate
 * @param params.properties - additional context (price, supplier, source, etc.)
 */
export function track(params: {
  userId: string;
  event: string;
  appType: string;
  intentKey: string;
  properties?: Record<string, unknown>;
}): void {
  const config = EVENT_TO_INTENT_MAP[params.event];
  if (!config || !params.userId) return;

  captureIntent({
    userId: params.userId,
    appType: params.appType,
    eventType: config.eventType,
    category: config.category,
    intentKey: params.intentKey,
    metadata: params.properties,
  }).catch(() => {});
}
