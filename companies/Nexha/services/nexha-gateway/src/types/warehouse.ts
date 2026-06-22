/**
 * Warehouse network types — Phase C.5
 *
 * A warehouse is a physical node in the Nexha distribution graph. It owns:
 *   - a geographic location
 *   - inventory slots (categories x SKUs x available units)
 *   - operating hours and capacity
 *   - a trust/rating score
 *
 * Routes connect warehouses via known transit corridors (same corridor = cheap,
 * different corridor = expensive). Slot bookings reserve inventory for a window
 * so the procurement flow can commit before logistics is dispatched.
 */

export type WarehouseKind = "cold_chain" | "dry" | "hazmat" | "bulk" | "general" | "pharma";
export type SlotStatus = "open" | "reserved" | "filled" | "expired" | "cancelled";

export interface WarehouseLocation {
  city: string;
  state: string;
  country: string;
  pincode: string;
  lat: number;
  lng: number;
}

export interface WarehouseSlot {
  id: string;
  category: string;
  item: string;
  availableUnits: number;
  unit: string;
  pricePerUnit: number;
  currency: string;
  /** ISO timestamp; bookings older than this are expired. */
  freshnessUntil: string;
  /** Minimum order quantity for this slot. */
  minOrderUnits: number;
}

export interface Warehouse {
  id: string;
  name: string;
  kind: WarehouseKind;
  location: WarehouseLocation;
  rating: number;       // 0..5
  reliability: number;  // 0..100
  capacityUnitsPerDay: number;
  operatingHours: { open: string; close: string }; // "HH:MM"
  slots: WarehouseSlot[];
  trustScore: number;   // 0..100
  totalOrders: number;
}

export interface WarehouseRoute {
  fromId: string;
  toId: string;
  transitHours: number;
  costMultiplier: number; // 1.0 = base, >1 = surcharge, <1 = discount (e.g. same operator)
  sameCorridor: boolean;
}

export interface SlotBooking {
  id: string;
  warehouseId: string;
  slotId: string;
  units: number;
  status: SlotStatus;
  /** ISO timestamps */
  createdAt: string;
  reservedUntil: string;
  fulfilledAt?: string;
  cancelledAt?: string;
  reference?: string; // e.g. a goal or shipment id
}