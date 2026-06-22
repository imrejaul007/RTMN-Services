/**
 * Warehouse network — Phase C.5.
 *
 * Discovers warehouses by location and capabilities, books inbound/outbound
 * slots, and tracks capacity utilisation.
 */

import { z } from 'zod';

export const AddressSchema = z.object({
  line1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  pincode: z.string().regex(/^\d{6}$/),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});
export type Address = z.infer<typeof AddressSchema>;

export const WarehouseCapabilitiesSchema = z.object({
  temperatureControlled: z.boolean().default(false),
  hazardous: z.boolean().default(false),
  bonded: z.boolean().default(false),
  coldChain: z.boolean().default(false),
  maxWeightKg: z.number().positive(),
  maxVolumeM3: z.number().positive(),
});
export type WarehouseCapabilities = z.infer<typeof WarehouseCapabilitiesSchema>;

export interface Warehouse {
  id: string;
  name: string;
  operatorId: string;
  address: Address;
  capabilities: WarehouseCapabilities;
  hourlyRateInr: number;        // INR per pallet-hour
  rating: number;               // 0..5
  active: boolean;
  createdAt: string;
}

export interface Slot {
  id: string;
  warehouseId: string;
  direction: 'inbound' | 'outbound';
  start: string;                // ISO
  end: string;                  // ISO
  capacity: number;             // pallet count
  booked: number;               // currently booked
}

export interface Booking {
  id: string;
  slotId: string;
  warehouseId: string;
  customerId: string;
  direction: 'inbound' | 'outbound';
  pallets: number;
  weightKg: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  bookedAt: string;
}

export const WarehouseQuerySchema = z.object({
  state: z.string().length(2).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  needsColdChain: z.coerce.boolean().optional(),
  needsHazardous: z.coerce.boolean().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minCapacityKg: z.coerce.number().positive().optional(),
  earliestStart: z.string().optional(),
});
export type WarehouseQuery = z.infer<typeof WarehouseQuerySchema>;

export const SlotQuerySchema = z.object({
  warehouseId: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  fromIso: z.string(),
  toIso: z.string(),
  minPallets: z.coerce.number().int().positive().default(1),
});
export type SlotQuery = z.infer<typeof SlotQuerySchema>;

export const BookingRequestSchema = z.object({
  slotId: z.string(),
  customerId: z.string().min(1),
  pallets: z.number().int().positive(),
  weightKg: z.number().positive(),
});
export type BookingRequest = z.infer<typeof BookingRequestSchema>;
