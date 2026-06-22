import { z } from 'zod';

// ============================================
// Service Order Status Enum
// ============================================
export const ServiceOrderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
]);
export type ServiceOrderStatus = z.infer<typeof ServiceOrderStatusSchema>;

// Valid status transitions
export const SERVICE_ORDER_STATUS_TRANSITIONS: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// Status display labels
export const SERVICE_ORDER_STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Status colors for UI
export const SERVICE_ORDER_STATUS_COLORS: Record<ServiceOrderStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  in_progress: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

// ============================================
// Service Order Priority Enum
// ============================================
export const ServiceOrderPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type ServiceOrderPriority = z.infer<typeof ServiceOrderPrioritySchema>;

export const SERVICE_ORDER_PRIORITY_LABELS: Record<ServiceOrderPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const SERVICE_ORDER_PRIORITY_COLORS: Record<ServiceOrderPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700' },
  urgent: { bg: 'bg-red-50', text: 'text-red-700' },
};

// ============================================
// Service Schedule
// ============================================
export interface ServiceSchedule {
  scheduledDate: Date;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number; // every N days/weeks/months
    endDate?: Date;
    daysOfWeek?: number[]; // 0-6 for weekly (Sunday = 0)
    dayOfMonth?: number; // 1-31 for monthly
  };
}

export const ServiceScheduleSchema = z.object({
  scheduledDate: z.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
  recurring: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().int().positive(),
    endDate: z.date().optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
  }).optional(),
});

// ============================================
// Service Order Item
// ============================================
export interface ServiceOrderItem {
  id: string;
  serviceOrderId: string;
  serviceName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  createdAt: Date;
}

export const ServiceOrderItemSchema = z.object({
  id: z.string().uuid(),
  serviceOrderId: z.string().uuid(),
  serviceName: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
  createdAt: z.date(),
});

// ============================================
// Service Order Note/Comment
// ============================================
export interface ServiceOrderNote {
  id: string;
  serviceOrderId: string;
  authorId: string;
  authorName: string;
  authorType: 'merchant' | 'service_provider' | 'system';
  content: string;
  isInternal: boolean; // Internal notes are only visible to staff
  createdAt: Date;
  updatedAt: Date;
}

export const ServiceOrderNoteSchema = z.object({
  id: z.string().uuid(),
  serviceOrderId: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string().min(1),
  authorType: z.enum(['merchant', 'service_provider', 'system']),
  content: z.string().min(1, 'Note content is required'),
  isInternal: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// Service Order History Entry
// ============================================
export interface ServiceOrderHistoryEntry {
  id: string;
  serviceOrderId: string;
  action: 'created' | 'status_changed' | 'assigned' | 'updated' | 'scheduled' | 'note_added' | 'cancelled';
  description: string;
  performedBy: string;
  performedByName: string;
  performedByType: 'merchant' | 'service_provider' | 'system' | 'admin';
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export const ServiceOrderHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  serviceOrderId: z.string().uuid(),
  action: z.enum(['created', 'status_changed', 'assigned', 'updated', 'scheduled', 'note_added', 'cancelled']),
  description: z.string().min(1),
  performedBy: z.string().uuid(),
  performedByName: z.string().min(1),
  performedByType: z.enum(['merchant', 'service_provider', 'system', 'admin']),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
});

// ============================================
// Service Order Entity
// ============================================
export interface ServiceOrder {
  id: string;
  orderNumber: string;
  merchantId: string;
  merchantName: string;
  serviceProviderId?: string;
  serviceProviderName?: string;
  status: ServiceOrderStatus;
  priority: ServiceOrderPriority;
  title: string;
  description?: string;
  schedule?: ServiceSchedule;
  items: ServiceOrderItem[];
  notes: ServiceOrderNote[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  paymentMethod?: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit';
  scheduledStart?: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  cancellationReason?: string;
  completionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const ServiceOrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string().min(1),
  merchantId: z.string().uuid(),
  merchantName: z.string().min(1),
  serviceProviderId: z.string().uuid().optional(),
  serviceProviderName: z.string().optional(),
  status: ServiceOrderStatusSchema,
  priority: ServiceOrderPrioritySchema,
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  schedule: ServiceScheduleSchema.optional(),
  items: z.array(ServiceOrderItemSchema),
  notes: z.array(ServiceOrderNoteSchema),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  discount: z.number().min(0),
  total: z.number().min(0),
  paymentStatus: z.enum(['pending', 'partial', 'paid']),
  paymentMethod: z.enum(['cash', 'card', 'upi', 'bank_transfer', 'credit']).optional(),
  scheduledStart: z.date().optional(),
  scheduledEnd: z.date().optional(),
  actualStart: z.date().optional(),
  actualEnd: z.date().optional(),
  cancellationReason: z.string().optional(),
  completionNotes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// Service Order Input Types (for API requests)
// ============================================

// Service Order Item Input
export interface ServiceOrderItemInput {
  serviceName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export const ServiceOrderItemInputSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number().min(0),
});

// Service Schedule Input
export interface ServiceScheduleInput {
  scheduledDate: string; // ISO date string
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  recurring: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string; // ISO date string
    daysOfWeek?: number[];
    dayOfMonth?: number;
  };
}

export const ServiceScheduleInputSchema = z.object({
  scheduledDate: z.string().datetime({ message: 'Invalid date format' }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
  recurring: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().int().positive(),
    endDate: z.string().datetime().optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
  }).optional(),
});

// Service Order Note Input
export interface ServiceOrderNoteInput {
  content: string;
  isInternal?: boolean;
}

export const ServiceOrderNoteInputSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  isInternal: z.boolean().default(false),
});

// Create Service Order Input
export interface CreateServiceOrderInput {
  merchantId: string;
  serviceProviderId?: string;
  title: string;
  description?: string;
  priority?: ServiceOrderPriority;
  schedule?: ServiceScheduleInput;
  items: ServiceOrderItemInput[];
  paymentMethod?: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit';
  notes?: ServiceOrderNoteInput[];
}

export const CreateServiceOrderInputSchema = z.object({
  merchantId: z.string().uuid({ message: 'Valid merchant ID is required' }),
  serviceProviderId: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  priority: ServiceOrderPrioritySchema.optional().default('medium'),
  schedule: ServiceScheduleInputSchema.optional(),
  items: z.array(ServiceOrderItemInputSchema).min(1, 'At least one service item is required'),
  paymentMethod: z.enum(['cash', 'card', 'upi', 'bank_transfer', 'credit']).optional(),
  notes: z.array(ServiceOrderNoteInputSchema).optional(),
});

// Update Service Order Input
export interface UpdateServiceOrderInput {
  title?: string;
  description?: string;
  priority?: ServiceOrderPriority;
  schedule?: ServiceScheduleInput;
  items?: ServiceOrderItemInput[];
  serviceProviderId?: string;
  paymentMethod?: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit';
}

export const UpdateServiceOrderInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: ServiceOrderPrioritySchema.optional(),
  schedule: ServiceScheduleInputSchema.optional(),
  items: z.array(ServiceOrderItemInputSchema).min(1).optional(),
  serviceProviderId: z.string().uuid().optional(),
  paymentMethod: z.enum(['cash', 'card', 'upi', 'bank_transfer', 'credit']).optional(),
});

// Update Service Order Status Input
export interface UpdateServiceOrderStatusInput {
  status: ServiceOrderStatus;
  notes?: string; // For cancellation reason or completion notes
}

export const UpdateServiceOrderStatusSchema = z.object({
  status: ServiceOrderStatusSchema,
  notes: z.string().max(500).optional(),
});
