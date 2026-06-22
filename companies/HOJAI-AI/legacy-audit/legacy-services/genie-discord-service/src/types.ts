/**
 * GENIE Discord Service - Type Definitions
 * Version: 1.0.0 | Date: June 1, 2026
 * Purpose: Discord server integration for GENIE Personal Intelligence OS
 */

import { z } from 'zod';

export interface DiscordServer {
  id: string;
  guild_id: string;
  guild_name: string;
  icon_url?: string;
  linked_user_id?: string;
  linked_at?: Date;
  last_sync?: Date;
  settings: DiscordSettings;
  tenant_id: string;
  created_at: Date;
}

export interface DiscordSettings {
  sync_channels: boolean;
  sync_threads: boolean;
  sync_mentions: boolean;
  exclude_channels: string[];
  sync_direction: 'bidirectional' | 'to_genie' | 'from_genie';
}

export interface DiscordUser {
  id: string;
  guild_id: string;
  discord_user_id: string;
  discord_username: string;
  display_name?: string;
  avatar_url?: string;
  roles: string[];
  is_bot: boolean;
  linked_user_id?: string;
  linked_at?: Date;
  last_seen?: Date;
  tenant_id: string;
}

export interface DiscordChannel {
  id: string;
  guild_id: string;
  discord_channel_id: string;
  name: string;
  type: 'text' | 'voice' | 'category' | 'news' | 'thread';
  parent_id?: string;
  topic?: string;
  member_count?: number;
  tenant_id: string;
}

export interface DiscordMessage {
  id: string;
  guild_id: string;
  channel_id: string;
  discord_message_id: string;
  author_id: string;
  content: string;
  embeds?: any[];
  attachments?: any[];
  thread_id?: string;
  is_thread: boolean;
  reply_count: number;
  reactions?: Array<{ emoji: string; count: number }>;
  direction: 'incoming' | 'outgoing';
  timestamp: Date;
  tenant_id: string;
}

export const DiscordSettingsSchema = z.object({
  sync_channels: z.boolean().default(true),
  sync_threads: z.boolean().default(true),
  sync_mentions: z.boolean().default(true),
  exclude_channels: z.array(z.string()).default([]),
  sync_direction: z.enum(['bidirectional', 'to_genie', 'from_genie']).default('to_genie'),
});

export interface APIResponse<T> { success: boolean; data?: T; error?: { code: string; message: string }; meta: { timestamp: string } }
export interface TenantContext { tenant_id: string; user_id?: string }
declare global { namespace Express { interface Request { tenantContext?: TenantContext; userId?: string } } }
