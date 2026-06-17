import { z } from 'zod';

// Shipment Status Enum
export const ShipmentStatusEnum = z.enum([
  'label_created',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'returned',
  'failed',
  'cancelled'
]);

export type ShipmentStatus = z.infer<typeof ShipmentStatusEnum>;

// Location Schema
export const LocationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

export type Location = z.infer<typeof LocationSchema>;

// Carrier Schema
export const CarrierSchema = z.object({
  code: z.string(),
  name: z.string(),
  trackingUrl: z.string().optional()
});

export type Carrier = z.infer<typeof CarrierSchema>;

// Proof of Delivery Schema
export const ProofOfDeliverySchema = z.object({
  signature: z.string().optional(),
  photo: z.string().optional(),
  otp: z.string().optional(),
  recipientName: z.string().optional(),
  deliveredAt: z.date().optional()
});

export type ProofOfDelivery = z.infer<typeof ProofOfDeliverySchema>;

// Create Shipment Request
export const CreateShipmentSchema = z.object({
  tenantId: z.string().min(1),
  orderId: z.string().min(1),
  carrier: CarrierSchema,
  origin: LocationSchema,
  destination: LocationSchema,
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional()
  }).optional(),
  estimatedDelivery: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
});

export type CreateShipmentRequest = z.infer<typeof CreateShipmentSchema>;

// Update Shipment Request
export const UpdateShipmentSchema = z.object({
  status: ShipmentStatusEnum.optional(),
  location: LocationSchema.optional(),
  estimatedDelivery: z.string().datetime().optional(),
  actualDelivery: z.string().datetime().optional(),
  proof: ProofOfDeliverySchema.optional(),
  metadata: z.record(z.any()).optional()
});

export type UpdateShipmentRequest = z.infer<typeof UpdateShipmentSchema>;

// Carrier Create/Update Schema
export const CreateCarrierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  trackingUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  active: z.boolean().default(true)
});

export type CreateCarrierRequest = z.infer<typeof CreateCarrierSchema>;

// Tracking Event Schema
export const TrackingEventSchema = z.object({
  shipmentId: z.string(),
  carrier: z.string(),
  status: ShipmentStatusEnum,
  location: LocationSchema.optional(),
  timestamp: z.date(),
  description: z.string().optional(),
  rawData: z.record(z.any()).optional()
});

export type TrackingEvent = z.infer<typeof TrackingEventSchema>;
