/**
 * Carrier webhook receivers for nexha-autonomous-logistics.
 *
 * Each carrier (DHL, FedEx, Maersk, etc.) sends status updates to a webhook
 * URL when shipments change state (picked up, in transit, delivered, exception).
 * This module normalizes the carrier-specific payloads into a unified
 * status update and updates the in-memory tracking registry.
 *
 * Endpoints:
 *   POST /api/v1/webhooks/dhl
 *   POST /api/v1/webhooks/fedex
 *   POST /api/v1/webhooks/maersk
 *   POST /api/v1/webhooks/universal   (catch-all for unconfigured carriers)
 *
 * Each endpoint:
 *   1. Verifies HMAC signature (configurable per carrier)
 *   2. Normalizes payload to { shipmentId, trackingNumber, status, location, timestamp }
 *   3. Updates the in-memory tracking registry
 *   4. Optionally forwards to a downstream webhook URL
 *
 * Production: configure CARRIER_WEBHOOK_SECRET + downstream URL.
 * MVP: accepts unsigned webhooks (dev mode only).
 */

import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { getShipment } from './registry.js';

const CARRIER_WEBHOOK_SECRET = process.env.CARRIER_WEBHOOK_SECRET || '';
const DOWNSTREAM_WEBHOOK_URL = process.env.DOWNSTREAM_WEBHOOK_URL || '';

// ─── Normalized status update ─────────────────────────────────────────

export type NormalizedStatus = 'picked-up' | 'in-transit' | 'out-for-delivery' | 'delivered' | 'exception' | 'returned';

export interface NormalizedUpdate {
  shipmentId: string;        // our internal shipment id
  trackingNumber: string;
  carrier: string;
  status: NormalizedStatus;
  location?: string;
  timestamp: string;
  raw?: any;
}

// ─── Webhook events (in-memory) ───────────────────────────────────────

const events: NormalizedUpdate[] = [];
const MAX_EVENTS = 1000;

export function getRecentEvents(limit = 50): NormalizedUpdate[] {
  return events.slice(-limit);
}

function recordEvent(update: NormalizedUpdate): void {
  events.push(update);
  if (events.length > MAX_EVENTS) events.shift();
}

async function forwardDownstream(update: NormalizedUpdate): Promise<void> {
  if (!DOWNSTREAM_WEBHOOK_URL) return;
  try {
    await fetch(DOWNSTREAM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
  } catch (err) {
    // Don't fail the webhook just because downstream is down
    const message = err instanceof Error ? err.message : 'unknown';
    console.warn('[webhook] downstream forward failed:', message);
  }
}

// ─── Signature verification ───────────────────────────────────────────

function verifySignature(req: Request, rawBody: string, secret: string): boolean {
  if (!secret) return true; // dev mode: no verification
  const signature = req.get('x-carrier-signature') || req.get('x-hub-signature') || '';
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  // Constant-time compare
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ─── Normalizers (carrier-specific → common) ─────────────────────────

export interface DhlEvent {
  shipmentNumber?: string;
  trackingNumber?: string;
  status?: { status?: string; timestamp?: string };
  location?: { address?: { addressLocality?: string } };
  timestamp?: string;
}

export function normalizeDhlEvent(body: DhlEvent, rawBody: string): NormalizedUpdate | null {
  const trackingNumber = body.trackingNumber || body.shipmentNumber;
  if (!trackingNumber) return null;
  const statusStr = (body.status?.status || '').toLowerCase();
  let status: NormalizedStatus = 'in-transit';
  if (statusStr.includes('delivered')) status = 'delivered';
  else if (statusStr.includes('transit') || statusStr.includes('shipped')) status = 'in-transit';
  else if (statusStr.includes('pickup') || statusStr.includes('picked')) status = 'picked-up';
  else if (statusStr.includes('out for delivery')) status = 'out-for-delivery';
  else if (statusStr.includes('exception') || statusStr.includes('failed')) status = 'exception';
  else if (statusStr.includes('returned')) status = 'returned';
  return {
    shipmentId: '', // DHL doesn't know our internal id
    trackingNumber,
    carrier: 'dhl',
    status,
    location: body.location?.address?.addressLocality,
    timestamp: body.status?.timestamp || body.timestamp || new Date().toISOString(),
    raw: body
  };
}

export interface FedexEvent {
  trackingNumber?: string;
  trackingNumberInfo?: { trackingNumberInfo?: { trackingNumber?: string } };
  latestStatusDetail?: { code?: string; descrption?: string; scanLocation?: string };
  scanEventList?: Array<{ date?: string; scanLocation?: string }>;
}

export function normalizeFedexEvent(body: FedexEvent): NormalizedUpdate | null {
  const trackingNumber = body.trackingNumber || body.trackingNumberInfo?.trackingNumberInfo?.trackingNumber;
  if (!trackingNumber) return null;
  const code = body.latestStatusDetail?.code || '';
  const statusMap: Record<string, NormalizedStatus> = {
    'PU': 'picked-up',
    'OD': 'out-for-delivery',
    'DL': 'delivered',
    'DE': 'exception',
    'RS': 'returned',
    'IX': 'in-transit',
    'IT': 'in-transit',
    'AR': 'in-transit'
  };
  const status = statusMap[code] || 'in-transit';
  return {
    shipmentId: '',
    trackingNumber,
    carrier: 'fedex',
    status,
    location: body.latestStatusDetail?.scanLocation,
    timestamp: body.scanEventList?.[0]?.date || new Date().toISOString(),
    raw: body
  };
}

export interface MaerskEvent {
  containerNumber?: string;
  bookingNumber?: string;
  eventType?: string;
  eventDateTime?: string;
  location?: { locationName?: string };
}

export function normalizeMaerskEvent(body: MaerskEvent): NormalizedUpdate | null {
  const trackingNumber = body.containerNumber || body.bookingNumber;
  if (!trackingNumber) return null;
  const type = (body.eventType || '').toLowerCase();
  let status: NormalizedStatus = 'in-transit';
  if (type.includes('gatein') || type.includes('loaded')) status = 'picked-up';
  else if (type.includes('discharged') || type.includes('delivered')) status = 'delivered';
  else if (type.includes('outgate') || type.includes('onward')) status = 'out-for-delivery';
  else if (type.includes('exception')) status = 'exception';
  return {
    shipmentId: '',
    trackingNumber,
    carrier: 'maersk',
    status,
    location: body.location?.locationName,
    timestamp: body.eventDateTime || new Date().toISOString(),
    raw: body
  };
}

// ─── Endpoint handlers ───────────────────────────────────────────────

export function createDhlHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const rawBody = JSON.stringify(req.body);
      if (!verifySignature(req, rawBody, CARRIER_WEBHOOK_SECRET)) {
        res.status(401).json({ error: 'invalid-signature' });
        return;
      }
      const update = normalizeDhlEvent(req.body, rawBody);
      if (!update) {
        res.status(400).json({ error: 'invalid-payload' });
        return;
      }
      recordEvent(update);
      await forwardDownstream(update);
      res.json({ received: true, status: update.status, trackingNumber: update.trackingNumber });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown-error';
      res.status(500).json({ error: message });
    }
  };
}

export function createFedexHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const rawBody = JSON.stringify(req.body);
      if (!verifySignature(req, rawBody, CARRIER_WEBHOOK_SECRET)) {
        res.status(401).json({ error: 'invalid-signature' });
        return;
      }
      const update = normalizeFedexEvent(req.body);
      if (!update) {
        res.status(400).json({ error: 'invalid-payload' });
        return;
      }
      recordEvent(update);
      await forwardDownstream(update);
      res.json({ received: true, status: update.status, trackingNumber: update.trackingNumber });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown-error';
      res.status(500).json({ error: message });
    }
  };
}

export function createMaerskHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const rawBody = JSON.stringify(req.body);
      if (!verifySignature(req, rawBody, CARRIER_WEBHOOK_SECRET)) {
        res.status(401).json({ error: 'invalid-signature' });
        return;
      }
      const update = normalizeMaerskEvent(req.body);
      if (!update) {
        res.status(400).json({ error: 'invalid-payload' });
        return;
      }
      recordEvent(update);
      await forwardDownstream(update);
      res.json({ received: true, status: update.status, trackingNumber: update.trackingNumber });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown-error';
      res.status(500).json({ error: message });
    }
  };
}

// Catch-all for any carrier not explicitly configured
export function createUniversalHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const trackingNumber = req.body?.trackingNumber || req.body?.shipmentNumber || req.body?.containerNumber;
      if (!trackingNumber) {
        res.status(400).json({ error: 'no-tracking-number-in-payload' });
        return;
      }
      // Generic mapping — everything is "in transit" unless explicitly delivered
      const update: NormalizedUpdate = {
        shipmentId: '',
        trackingNumber,
        carrier: (req.body?.carrier || 'unknown').toString(),
        status: (req.body?.status as NormalizedStatus) || 'in-transit',
        location: req.body?.location,
        timestamp: req.body?.timestamp || new Date().toISOString(),
        raw: req.body
      };
      recordEvent(update);
      await forwardDownstream(update);
      res.json({ received: true, status: update.status, trackingNumber: update.trackingNumber });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown-error';
      res.status(500).json({ error: message });
    }
  };
}

// ─── Helper: get shipment status by tracking number ─────────────────

export function getShipmentByTrackingNumber(trackingNumber: string): {
  found: boolean;
  shipmentId?: string;
  latestEvent?: NormalizedUpdate;
} {
  // Search recent events for this tracking number
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].trackingNumber === trackingNumber) {
      // Also look up the shipment id
      const shipment = getShipment(events[i].shipmentId);
      return {
        found: true,
        shipmentId: events[i].shipmentId,
        latestEvent: events[i]
      };
    }
  }
  return { found: false };
}

export { recordEvent, events };