import { z } from 'zod';

// Validation schemas
export const PrivacyZoneSchema = z.enum([
  'banking',
  'health',
  'passwords',
  'personal',
  'work',
  'family',
  'social',
  'finance',
  'medical',
  'legal'
]);

export const EventTypeSchema = z.enum([
  'capture',
  'delete',
  'export',
  'incognito',
  'setting_change'
]);

// Request/Response types
export const PrivacySettingsSchema = z.object({
  user_id: z.string().min(1),
  privacy_zones: z.array(PrivacyZoneSchema).default([]),
  incognito_mode: z.boolean().default(false),
  local_processing: z.boolean().default(true),
  end_to_end_encryption: z.boolean().default(true),
  data_retention_days: z.number().min(1).max(365).default(90),
  capture_screenshots: z.boolean().default(false),
  capture_voice: z.boolean().default(true),
  share_analytics: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

export const UpdatePrivacySettingsSchema = z.object({
  privacy_zones: z.array(PrivacyZoneSchema).optional(),
  incognito_mode: z.boolean().optional(),
  local_processing: z.boolean().optional(),
  end_to_end_encryption: z.boolean().optional(),
  data_retention_days: z.number().min(1).max(365).optional(),
  capture_screenshots: z.boolean().optional(),
  capture_voice: z.boolean().optional(),
  share_analytics: z.boolean().optional()
});

export const IncognitoToggleSchema = z.object({
  enabled: z.boolean(),
  duration_minutes: z.number().min(1).max(1440).optional()
});

export const DeleteMemorySchema = z.object({
  reason: z.string().optional()
});

export const ExportDataSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  include_memories: z.boolean().default(true),
  include_settings: z.boolean().default(true),
  include_audit_log: z.boolean().default(false)
});

export const AuditQuerySchema = z.object({
  event_type: EventTypeSchema.optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().min(1).max(100).default(50)
});

// Type exports
export type PrivacyZone = z.infer<typeof PrivacyZoneSchema>;
export type EventType = z.infer<typeof EventTypeSchema>;
export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;
export type UpdatePrivacySettings = z.infer<typeof UpdatePrivacySettingsSchema>;
export type IncognitoToggle = z.infer<typeof IncognitoToggleSchema>;
export type DeleteMemory = z.infer<typeof DeleteMemorySchema>;
export type ExportData = z.infer<typeof ExportDataSchema>;
export type AuditQuery = z.infer<typeof AuditQuerySchema>;

export interface PrivacyAudit {
  id: string;
  user_id: string;
  event_type: EventType;
  details: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  ip_address?: string;
}

export interface ExportedData {
  exported_at: string;
  user_id: string;
  settings?: PrivacySettings;
  memories?: Array<{
    id: string;
    content: string;
    category: string;
    timestamp: string;
  }>;
  audit_log?: PrivacyAudit[];
}

// In-memory storage for demo (replace with database in production)
export interface Storage {
  settings: Map<string, PrivacySettings>;
  auditLog: PrivacyAudit[];
  memories: Map<string, Array<{ id: string; content: string; category: string; timestamp: string }>>;
}

export const createStorage = (): Storage => ({
  settings: new Map(),
  auditLog: [],
  memories: new Map()
});
