/**
 * Distribution service — shipping quotes, booking, tracking.
 *
 * Multi-lane quote engine: takes origin/destination/weight and returns
 * ranked quotes across several carriers, each with its own transit time,
 * rate card, and special-handling rules.
 */

import { randomUUID } from "node:crypto";

export type ServiceLevel = "economy" | "standard" | "express" | "same_day";
export type ShipmentStatus = "created" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "cancelled" | "lost";

export interface Lane {
  id: string;
  carrier: string;
  /** "city-city" style key, e.g. "Mumbai-Delhi". Special "ANY" matches all. */
  fromTo: string;
  serviceLevel: ServiceLevel;
  transitHours: number;
  /** Base rate in INR per kg. */
  ratePerKg: number;
  /** Minimum charge regardless of weight. */
  baseCharge: number;
  /** Surcharge per kg if package requires special handling. */
  surchargePerKg: { cold_chain: number; fragile: number; hazmat: number; oversized: number };
  /** Carrier reliability (0..100) for ranking. */
  reliability: number;
}

export interface Quote {
  laneId: string;
  carrier: string;
  serviceLevel: ServiceLevel;
  transitHours: number;
  baseCharge: number;
  weightCharge: number;
  specialHandlingCharge: number;
  total: number;
  currency: string;
  /** Estimate of latest pickup + delivery timestamps. */
  estimatedDelivery: string;
}

export interface Shipment {
  id: string;
  quoteId: string;
  carrier: string;
  serviceLevel: ServiceLevel;
  origin: { city: string };
  destination: { city: string };
  weightKg: number;
  specialHandling: string[];
  totalCost: number;
  currency: string;
  status: ShipmentStatus;
  createdAt: string;
  deliveredAt?: string;
  cancelledAt?: string;
  tracking: Array<{ at: string; status: ShipmentStatus; note?: string }>;
}

class DistributionService {
  private lanes: Lane[] = [];
  private shipments = new Map<string, Shipment>();

  // ── Seed (idempotent) ──────────────────────────────────────────────
  seedDemoLanes(): number {
    if (this.lanes.length > 0) return 0;
    const cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad"];
    const carriers: Array<{ name: string; reliability: number; rateMult: number }> = [
      { name: "BharatPost Standard", reliability: 82, rateMult: 1.0 },
      { name: "QuickShip Express", reliability: 90, rateMult: 1.35 },
      { name: "Delhivery 3PL", reliability: 88, rateMult: 1.10 },
      { name: "CrowdDash Hyperlocal", reliability: 78, rateMult: 1.55 },
    ];
    const levels: Array<{ level: ServiceLevel; transitMult: number; rateMult: number }> = [
      { level: "economy", transitMult: 2.0, rateMult: 0.85 },
      { level: "standard", transitMult: 1.0, rateMult: 1.0 },
      { level: "express", transitMult: 0.55, rateMult: 1.45 },
      { level: "same_day", transitMult: 0.18, rateMult: 2.30 },
    ];

    // Build lanes between every city pair × carrier × level
    for (const from of cities) {
      for (const to of cities) {
        if (from === to) continue;
        const baseHours = 6 + distanceProxy(from, to) * 1.4;
        for (const c of carriers) {
          for (const lvl of levels) {
            this.lanes.push({
              id: `LN-${from}-${to}-${c.name.replace(/\s+/g, "")}-${lvl.level}`,
              carrier: c.name,
              fromTo: `${from}-${to}`,
              serviceLevel: lvl.level,
              transitHours: Math.max(2, Math.round(baseHours * lvl.transitMult * 10) / 10),
              ratePerKg: Math.round((24 * c.rateMult * lvl.rateMult) * 100) / 100,
              baseCharge: Math.round(60 * lvl.rateMult),
              surchargePerKg: {
                cold_chain: Math.round(15 * lvl.rateMult),
                fragile: Math.round(8 * lvl.rateMult),
                hazmat: Math.round(35 * lvl.rateMult),
                oversized: Math.round(20 * lvl.rateMult),
              },
              reliability: c.reliability - (lvl.level === "same_day" ? 6 : 0),
            });
          }
        }
      }
    }
    return this.lanes.length;
  }

  resetAll(): void {
    this.lanes = [];
    this.shipments.clear();
  }

  // ── Lanes / Quotes ─────────────────────────────────────────────────
  listLanes(): Lane[] {
    return [...this.lanes];
  }

  lanesForRoute(from: string, to: string): Lane[] {
    const f = norm(from), t = norm(to);
    return this.lanes.filter((l) => l.fromTo === `${f}-${t}`);
  }

  /**
   * Get ranked quotes for a given origin/destination/weight/special-handling.
   * Returns up to `limit` quotes sorted by (total asc, transitHours asc).
   */
  quote(req: {
    origin: string;
    destination: string;
    weightKg: number;
    specialHandling?: string[];
    preferredLevel?: ServiceLevel;
    limit?: number;
  }): Quote[] {
    if (req.origin.toLowerCase() === req.destination.toLowerCase()) return [];
    const lanes = this.lanesForRoute(req.origin, req.destination);
    if (lanes.length === 0) return [];

    const handling = req.specialHandling ?? [];
    const quotes: Quote[] = lanes
      .filter((l) => !req.preferredLevel || l.serviceLevel === req.preferredLevel)
      .map((l) => {
        const baseCharge = l.baseCharge;
        const weightCharge = Math.round(l.ratePerKg * req.weightKg * 100) / 100;
        const specialCharge = handling.reduce((sum, h) => {
          const surcharge = (l.surchargePerKg as any)[h];
          return sum + (typeof surcharge === "number" ? surcharge * req.weightKg : 0);
        }, 0);
        const total = Math.round((baseCharge + weightCharge + specialCharge) * 100) / 100;
        const eta = new Date(Date.now() + l.transitHours * 3600_000).toISOString();
        return {
          laneId: l.id,
          carrier: l.carrier,
          serviceLevel: l.serviceLevel,
          transitHours: l.transitHours,
          baseCharge,
          weightCharge,
          specialHandlingCharge: Math.round(specialCharge * 100) / 100,
          total,
          currency: "INR",
          estimatedDelivery: eta,
        };
      });

    quotes.sort((a, b) => a.total - b.total || a.transitHours - b.transitHours);
    return quotes.slice(0, req.limit ?? 8);
  }

  // ── Shipments ──────────────────────────────────────────────────────
  book(req: {
    quoteId: string;
    origin: string;
    destination: string;
    weightKg: number;
    specialHandling?: string[];
  }): Shipment | { error: string } {
    const lane = this.lanes.find((l) => l.id === req.quoteId);
    if (!lane) return { error: `lane ${req.quoteId} not found` };
    if (lane.fromTo !== `${norm(req.origin)}-${norm(req.destination)}`) {
      return { error: `lane ${req.quoteId} does not match ${req.origin}→${req.destination}` };
    }
    const handling = req.specialHandling ?? [];
    const specialCharge = handling.reduce((s, h) => {
      const sc = (lane.surchargePerKg as any)[h];
      return s + (typeof sc === "number" ? sc * req.weightKg : 0);
    }, 0);
    const total = Math.round((lane.baseCharge + lane.ratePerKg * req.weightKg + specialCharge) * 100) / 100;
    const id = `SHP-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const shipment: Shipment = {
      id,
      quoteId: req.quoteId,
      carrier: lane.carrier,
      serviceLevel: lane.serviceLevel,
      origin: { city: req.origin },
      destination: { city: req.destination },
      weightKg: req.weightKg,
      specialHandling: handling,
      totalCost: total,
      currency: "INR",
      status: "created",
      createdAt: now,
      tracking: [{ at: now, status: "created", note: "Booking confirmed" }],
    };
    this.shipments.set(id, shipment);
    return shipment;
  }

  advance(id: string): Shipment | { error: string } {
    const s = this.shipments.get(id);
    if (!s) return { error: `shipment ${id} not found` };
    const nextStatus: Record<ShipmentStatus, ShipmentStatus | null> = {
      created: "picked_up",
      picked_up: "in_transit",
      in_transit: "out_for_delivery",
      out_for_delivery: "delivered",
      delivered: null,
      cancelled: null,
      lost: null,
    };
    const nxt = nextStatus[s.status];
    if (!nxt) return { error: `shipment is ${s.status}; no further transitions` };
    s.status = nxt;
    const note =
      nxt === "picked_up" ? "Picked up from origin"
      : nxt === "in_transit" ? "In transit to destination hub"
      : nxt === "out_for_delivery" ? "Out for delivery"
      : nxt === "delivered" ? "Delivered to recipient" : undefined;
    if (nxt === "delivered") s.deliveredAt = new Date().toISOString();
    s.tracking.push({ at: new Date().toISOString(), status: nxt, note });
    return s;
  }

  cancel(id: string, reason: string): Shipment | { error: string } {
    const s = this.shipments.get(id);
    if (!s) return { error: `shipment ${id} not found` };
    if (s.status === "delivered" || s.status === "cancelled") {
      return { error: `shipment is ${s.status}; cannot cancel` };
    }
    s.status = "cancelled";
    s.cancelledAt = new Date().toISOString();
    s.tracking.push({ at: s.cancelledAt, status: "cancelled", note: reason });
    return s;
  }

  get(id: string): Shipment | undefined {
    return this.shipments.get(id);
  }

  list(filter?: { status?: ShipmentStatus; carrier?: string }): Shipment[] {
    return Array.from(this.shipments.values()).filter((s) => {
      if (filter?.status && s.status !== filter.status) return false;
      if (filter?.carrier && s.carrier !== filter.carrier) return false;
      return true;
    });
  }

  networkStats() {
    return {
      lanes: this.lanes.length,
      shipments: this.shipments.size,
      inTransit: this.list({ status: "in_transit" }).length,
      delivered: this.list({ status: "delivered" }).length,
    };
  }
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

// Synthetic distance proxy so quotes vary by city pair without a real geo lookup.
function distanceProxy(a: string, b: string): number {
  const adj = ["Mumbai", "Pune", "Ahmedabad"];
  const south = ["Bangalore", "Chennai", "Hyderabad"];
  const east = ["Kolkata"];
  const north = ["Delhi"];
  const region = (c: string) =>
    adj.includes(c) ? "west"
    : south.includes(c) ? "south"
    : east.includes(c) ? "east"
    : north.includes(c) ? "north"
    : "other";
  const ra = region(a), rb = region(b);
  if (ra === rb) return 8;
  if ((ra === "west" && rb === "north") || (ra === "north" && rb === "west")) return 18;
  if ((ra === "south" && rb === "north") || (ra === "north" && rb === "south")) return 22;
  if ((ra === "south" && rb === "east") || (ra === "east" && rb === "south")) return 20;
  return 14;
}

const distributionService = new DistributionService();
export default distributionService;