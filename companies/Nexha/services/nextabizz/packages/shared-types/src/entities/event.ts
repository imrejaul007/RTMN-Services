import { z } from 'zod';

// Event Entity (immutable audit log)
export interface Event {
  id: string;
  type: string;
  source?: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

// Event Zod Schema
export const EventSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  source: z.string().optional(),
  payload: z.record(z.unknown()),
  createdAt: z.date(),
});

// Event Type Enum (common event types)
export const EventTypeSchema = z.enum([
  'po.created',
  'po.updated',
  'po.cancelled',
  'po.sent',
  'po.confirmed',
  'po.shipped',
  'po.delivered',
  'rfq.created',
  'rfq.awarded',
  'rfq.cancelled',
  'merchant.registered',
  'supplier.registered',
  'inventory.signal.received',
  'reorder.signal.created',
  'credit.line.updated',
]);
export type EventType = z.infer<typeof EventTypeSchema>;

// Event Source Enum
export const EventSourceSchema = z.enum([
  'restopapa',
  'rez-merchant',
  'hotel-pms',
  'webhook-sdk',
  'api',
  'admin',
]);
export type EventSource = z.infer<typeof EventSourceSchema>;

// Create Event Input
export interface CreateEventInput {
  type: string;
  source?: string;
  payload?: Record<string, unknown>;
}

// Create Event Zod Schema
export const CreateEventSchema = z.object({
  type: z.string().min(1),
  source: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});
