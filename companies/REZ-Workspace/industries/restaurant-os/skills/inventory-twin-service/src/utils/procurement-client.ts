/**
 * Procurement-OS Client
 *
 * Bridges inventory-twin-service to the NeXha procurement-os.
 * When inventory hits its reorder point, this client creates an
 * RFQ in procurement-os which then negotiates with suppliers and
 * awards a quote, which becomes a PO that updates inventory on delivery.
 *
 * Service-to-service auth: uses the x-internal-token header.
 * See NEXHA-DECISIONS.md D1 (workspace tooling) and the procurement-os
 * README for the internal-token setup.
 *
 * Fail-open: if procurement-os is unreachable, the local PO is still
 * created (queued) and the inventory twin emits a 'restaurant.inventory.
 * purchaseorder.queued_locally' event so a reconciler can retry.
 */

import { logger } from './logger';

const PROCUREMENT_OS_URL = process.env.PROCUREMENT_OS_URL || 'http://localhost:4320';
const INTERNAL_SERVICE_TOKEN = process.env.PROCUREMENT_OS_INTERNAL_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '';
const REQUEST_TIMEOUT_MS = 5000;

export interface ProcurementRfqItem {
  itemId: string;
  name: string;
  quantity: number;
  unit?: string;
  preferredSupplierId?: string;
  category?: string;
}

export interface ProcurementRfqRequest {
  buyerCorpId: string;          // restaurant's CorpID
  restaurantId: string;          // local restaurant identifier
  title: string;                 // human-readable
  description?: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  deliveryLocation?: string;
  requiredBy?: string;           // ISO date
  items: ProcurementRfqItem[];
  source: 'inventory-twin' | 'manual' | 'scheduled';
  twinId?: string;               // optional reference to inventory twin
}

export interface ProcurementRfqResponse {
  rfqId: string;
  rfqNumber: string;
  status: 'created' | 'open' | 'closed' | 'awarded';
  quotesCount: number;
  estimatedTotal?: number;
  invitationsSentTo: number;
}

export interface ProcurementClientResult {
  ok: boolean;
  rfq?: ProcurementRfqResponse;
  error?: string;
  queuedLocally: boolean;
}

export class ProcurementClient {
  /**
   * Create an RFQ on procurement-os for items the inventory twin wants to reorder.
   * Returns ok=true with the RFQ details on success, ok=false on failure (with
   * queuedLocally=true so the caller knows to retry later).
   */
  async createRfqFromReorder(request: ProcurementRfqRequest): Promise<ProcurementClientResult> {
    if (!INTERNAL_SERVICE_TOKEN) {
      logger.warn('PROCUREMENT_OS_INTERNAL_TOKEN not set; will queue locally');
      return { ok: false, error: 'no internal token configured', queuedLocally: true };
    }

    const url = `${PROCUREMENT_OS_URL}/api/rfqs`;

    const body = {
      buyerId: request.buyerCorpId,
      source: request.source,
      twinRef: request.twinId,
      restaurantRef: request.restaurantId,
      title: request.title,
      description: request.description,
      urgency: request.urgency,
      deliveryLocation: request.deliveryLocation,
      requiredBy: request.requiredBy,
      items: request.items.map((item) => ({
        sku: item.itemId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit || 'unit',
        category: item.category,
        preferredSupplierId: item.preferredSupplierId,
      })),
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
        logger.error('procurement-os RFQ create failed', {
          status: res.status,
          body: text.slice(0, 500),
          restaurantId: request.restaurantId,
        });
        return { ok: false, error: `HTTP ${res.status}`, queuedLocally: true };
      }

      const json = (await res.json()) as { success?: boolean; data?: ProcurementRfqResponse; error?: string };
      if (!json.success || !json.data) {
        logger.error('procurement-os RFQ create returned non-success', { json, restaurantId: request.restaurantId });
        return { ok: false, error: json.error || 'unknown error', queuedLocally: true };
      }

      logger.info('Created RFQ in procurement-os', {
        rfqId: json.data.rfqId,
        restaurantId: request.restaurantId,
        buyerCorpId: request.buyerCorpId,
        itemCount: request.items.length,
      });
      return { ok: true, rfq: json.data, queuedLocally: false };
    } catch (err) {
      clearTimeout(timeoutHandle);
      const message = err instanceof Error ? err.message : String(err);
      logger.error('procurement-os RFQ create threw', { error: message, restaurantId: request.restaurantId });
      return { ok: false, error: message, queuedLocally: true };
    }
  }
}

export const procurementClient = new ProcurementClient();
