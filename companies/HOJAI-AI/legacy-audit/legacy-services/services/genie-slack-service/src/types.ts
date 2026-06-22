/**
 * GENIE Slack Service - Type Definitions
 * Version: 1.0.0 | Date: June 13, 2026
 */

export type SlackChannelType = 'public' | 'private' | 'direct' | 'mpdm';

export interface SlackWorkspace {
  id: string;
  user_id: string;
  team_id: string;
  team_name: string;
  access_token: string;
  connected_at: string;
}

export interface SlackChannel {
  id: string;
  workspace_id: string;
  name: string;
  type: SlackChannelType;
  topic?: string;
  purpose?: string;
  member_count: number;
  is_archived: boolean;
  created_at: string;
}

export interface SlackMessage {
  id: string;
  user_id: string;
  channel_id: string;
  ts: string;
  text: string;
  user: string;
  thread_ts?: string;
  reply_count?: number;
  reactions?: { name: string; count: number }[];
  files?: { id: string; name: string; url: string }[];
  created_at: string;
}
