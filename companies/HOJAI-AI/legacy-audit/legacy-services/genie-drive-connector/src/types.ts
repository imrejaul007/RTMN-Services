/**
 * GENIE Drive Connector - Type Definitions
 * Google Docs, Sheets, Drive sync
 */
import { z } from 'zod';

export interface DriveConnection {
  id: string; user_id: string; email: string; access_token: string;
  refresh_token: string; token_expiry: Date; last_sync?: Date;
  settings: DriveSettings; tenant_id: string; created_at: Date;
}

export interface DriveSettings {
  sync_docs: boolean; sync_sheets: boolean; sync_slides: boolean;
  sync_folders: string[]; exclude_folders: string[]; auto_sync: boolean; sync_interval_minutes: number;
}

export interface DriveDocument {
  id: string; connection_id: string; drive_file_id: string; name: string;
  mime_type: 'document' | 'spreadsheet' | 'presentation' | 'folder' | 'other';
  parent_id?: string; path: string; content?: string; size: number;
  created_time: Date; modified_time: Date; last_synced?: Date;
  tenant_id: string; linked_user_id: string;
}

export interface DriveSyncJob {
  id: string; connection_id: string; status: 'pending' | 'running' | 'completed' | 'failed';
  files_synced: number; errors: string[]; started_at: Date; completed_at?: Date;
  tenant_id: string;
}

export const DriveSettingsSchema = z.object({
  sync_docs: z.boolean().default(true), sync_sheets: z.boolean().default(true),
  sync_slides: z.boolean().default(false), sync_folders: z.array(z.string()).default([]),
  exclude_folders: z.array(z.string()).default([]), auto_sync: z.boolean().default(false),
  sync_interval_minutes: z.number().min(15).max(1440).default(60),
});

export interface APIResponse<T> { success: boolean; data?: T; error?: { code: string; message: string }; meta: { timestamp: string } }
export interface TenantContext { tenant_id: string; user_id?: string }
declare global { namespace Express { interface Request { tenantContext?: TenantContext; userId?: string } } }
