/**
 * GENIE Discord Service - Type Definitions
 */

export interface DiscordServer {
  id: string;
  user_id: string;
  discord_id: string;
  name: string;
  icon?: string;
  member_count: number;
}

export interface DiscordChannel {
  id: string;
  server_id: string;
  name: string;
  type: 'text' | 'voice' | 'category';
}

export interface DiscordMessage {
  id: string;
  user_id: string;
  channel_id: string;
  content: string;
  author: string;
  timestamp: string;
}
