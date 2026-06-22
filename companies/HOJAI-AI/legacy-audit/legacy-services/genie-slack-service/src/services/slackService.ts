/**
 * GENIE Slack Service - Slack API Integration
 * Version: 1.0.0 | Date: June 1, 2026
 */

import axios, { AxiosInstance } from 'axios';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('slack-api');

// ============================================================================
// Types
// ============================================================================

export interface SlackAPIConfig {
  token: string;
  teamId: string;
}

export interface SlackMessageResponse {
  ok: boolean;
  channel?: string;
  ts?: string;
  message?: {
    type: string;
    subtype?: string;
    text: string;
    user: string;
    ts: string;
    team?: string;
    channel?: string;
  };
  error?: string;
}

export interface SlackUserResponse {
  ok: boolean;
  user?: {
    id: string;
    name: string;
    deleted: boolean;
    real_name: string;
    display_name: string;
    email?: string;
    is_bot: boolean;
    is_admin: boolean;
    is_owner: boolean;
    profile: {
      avatar_hash: string;
      status_text: string;
      status_emoji: string;
      image_72: string;
      email?: string;
    };
  };
  error?: string;
}

export interface SlackChannelResponse {
  ok: boolean;
  channel?: {
    id: string;
    name: string;
    is_channel: boolean;
    is_group: boolean;
    is_im: boolean;
    created: number;
    is_archived: boolean;
    is_private: boolean;
    num_members: number;
    topic: { value: string; creator: string; last_set: number };
    purpose: { value: string; creator: string; last_set: number };
  };
  error?: string;
}

export interface SlackConversationsResponse {
  ok: boolean;
  channels?: Array<{
    id: string;
    name: string;
    is_channel: boolean;
    is_group: boolean;
    is_im: boolean;
    created: number;
    is_archived: boolean;
    is_private: boolean;
    num_members: number;
    topic: { value: string };
    purpose: { value: string };
  }>;
  cursor?: string;
  error?: string;
}

export interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  team?: {
    id: string;
    name: string;
    domain: string;
  };
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
  error?: string;
}

// ============================================================================
// Slack API Client
// ============================================================================

export class SlackAPIClient {
  private client: AxiosInstance;
  private teamId: string;

  constructor(token: string, teamId: string = '') {
    this.teamId = teamId;
    this.client = axios.create({
      baseURL: 'https://slack.com/api',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  // ============================================================================
  // OAuth
  // ============================================================================

  static async oauthAccess(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri?: string
  ): Promise<SlackOAuthResponse> {
    try {
      const params: Record<string, string> = { client_id: clientId, client_secret: clientSecret, code };
      if (redirectUri) params.redirect_uri = redirectUri;

      const response = await axios.get('https://slack.com/api/oauth.access', { params });
      return response.data;
    } catch (error) {
      logger.error('oauth_access_failed', { error: error instanceof Error ? error.message : 'Unknown' });
      throw error;
    }
  }

  // ============================================================================
  // Auth
  // ============================================================================

  async authTest(): Promise<{ ok: boolean; team_id?: string; user_id?: string; url?: string; team?: string }> {
    try {
      const response = await this.client.get('/auth.test');
      if (response.data.ok) {
        this.teamId = response.data.team_id;
      }
      return response.data;
    } catch (error) {
      logger.error('auth_test_failed', { error: error instanceof Error ? error.message : 'Unknown' });
      throw error;
    }
  }

  // ============================================================================
  // Users
  // ============================================================================

  async getUser(userId: string): Promise<SlackUserResponse['user'] | null> {
    try {
      const response = await this.client.get('/users.info', { params: { user: userId } });
      return response.data.ok ? response.data.user : null;
    } catch (error) {
      logger.error('get_user_failed', { userId, error: error instanceof Error ? error.message : 'Unknown' });
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<SlackUserResponse['user'] | null> {
    try {
      const response = await this.client.get('/users.lookupByEmail', { params: { email } });
      return response.data.ok ? response.data.user : null;
    } catch (error) {
      logger.error('get_user_by_email_failed', { email, error: error instanceof Error ? error.message : 'Unknown' });
      return null;
    }
  }

  async listUsers(): Promise<Array<{ id: string; name: string; real_name: string; is_bot: boolean }>> {
    try {
      const response = await this.client.get('/users.list');
      if (response.data.ok) {
        return response.data.members.map((m: any) => ({
          id: m.id,
          name: m.name,
          real_name: m.real_name,
          is_bot: m.is_bot,
        }));
      }
      return [];
    } catch (error) {
      logger.error('list_users_failed', { error: error instanceof Error ? error.message : 'Unknown' });
      return [];
    }
  }

  // ============================================================================
  // Conversations
  // ============================================================================

  async getConversation(channelId: string): Promise<SlackChannelResponse['channel'] | null> {
    try {
      const response = await this.client.get('/conversations.info', { params: { channel: channelId } });
      return response.data.ok ? response.data.channel : null;
    } catch (error) {
      logger.error('get_conversation_failed', { channelId, error: error instanceof Error ? error.message : 'Unknown' });
      return null;
    }
  }

  async listConversations(types: string[] = ['public_channel', 'private_channel', 'im', 'mpim']): Promise<SlackConversationsResponse['channels']> {
    try {
      const response = await this.client.get('/conversations.list', {
        params: { types: types.join(','), limit: 200 },
      });
      return response.data.ok ? response.data.channels || [] : [];
    } catch (error) {
      logger.error('list_conversations_failed', { error: error instanceof Error ? error.message : 'Unknown' });
      return [];
    }
  }

  async joinConversation(channelId: string): Promise<boolean> {
    try {
      const response = await this.client.post('/conversations.join', { channel: channelId });
      return response.data.ok;
    } catch (error) {
      logger.error('join_conversation_failed', { channelId, error: error instanceof Error ? error.message : 'Unknown' });
      return false;
    }
  }

  async getConversationHistory(
    channelId: string,
    options?: { oldest?: string; latest?: string; limit?: number; cursor?: string }
  ): Promise<{ messages: any[]; has_more: boolean; next_cursor?: string }> {
    try {
      const params: Record<string, string | number> = { channel: channelId };
      if (options?.oldest) params.oldest = options.oldest;
      if (options?.latest) params.latest = options.latest;
      if (options?.limit) params.limit = options.limit;
      if (options?.cursor) params.cursor = options.cursor;

      const response = await this.client.get('/conversations.history', { params });
      if (response.data.ok) {
        return {
          messages: response.data.messages || [],
          has_more: response.data.has_more || false,
          next_cursor: response.data.response_metadata?.next_cursor,
        };
      }
      return { messages: [], has_more: false };
    } catch (error) {
      logger.error('get_history_failed', { channelId, error: error instanceof Error ? error.message : 'Unknown' });
      return { messages: [], has_more: false };
    }
  }

  async getThreadReplies(channelId: string, threadTs: string): Promise<any[]> {
    try {
      const response = await this.client.get('/conversations.replies', {
        params: { channel: channelId, thread_ts: threadTs },
      });
      return response.data.ok ? response.data.messages || [] : [];
    } catch (error) {
      logger.error('get_thread_replies_failed', { channelId, threadTs, error: error instanceof Error ? error.message : 'Unknown' });
      return [];
    }
  }

  // ============================================================================
  // Messages
  // ============================================================================

  async sendMessage(
    channel: string,
    text: string,
    options?: {
      thread_ts?: string;
      attachments?: any[];
      blocks?: any[];
      username?: string;
      icon_emoji?: string;
      unfurl_links?: boolean;
      unfurl_media?: boolean;
    }
  ): Promise<SlackMessageResponse> {
    try {
      const payload: Record<string, unknown> = { channel, text };
      if (options?.thread_ts) payload.thread_ts = options.thread_ts;
      if (options?.attachments) payload.attachments = options.attachments;
      if (options?.blocks) payload.blocks = options.blocks;
      if (options?.username) payload.username = options.username;
      if (options?.icon_emoji) payload.icon_emoji = options.icon_emoji;
      if (options?.unfurl_links !== undefined) payload.unfurl_links = options.unfurl_links;
      if (options?.unfurl_media !== undefined) payload.unfurl_media = options.unfurl_media;

      const response = await this.client.post('/chat.postMessage', payload);
      return response.data;
    } catch (error) {
      logger.error('send_message_failed', { channel, error: error instanceof Error ? error.message : 'Unknown' });
      throw error;
    }
  }

  async updateMessage(channel: string, ts: string, text: string, options?: { attachments?: any[]; blocks?: any[] }): Promise<boolean> {
    try {
      const payload: Record<string, unknown> = { channel, ts, text };
      if (options?.attachments) payload.attachments = options.attachments;
      if (options?.blocks) payload.blocks = options.blocks;

      const response = await this.client.post('/chat.update', payload);
      return response.data.ok;
    } catch (error) {
      logger.error('update_message_failed', { channel, ts, error: error instanceof Error ? error.message : 'Unknown' });
      return false;
    }
  }

  async deleteMessage(channel: string, ts: string): Promise<boolean> {
    try {
      const response = await this.client.post('/chat.delete', { channel, ts });
      return response.data.ok;
    } catch (error) {
      logger.error('delete_message_failed', { channel, ts, error: error instanceof Error ? error.message : 'Unknown' });
      return false;
    }
  }

  async scheduleMessage(
    channel: string,
    text: string,
    postAt: string,
    options?: { thread_ts?: string; attachments?: any[]; blocks?: any[] }
  ): Promise<{ scheduled_message_id?: string; ok: boolean }> {
    try {
      const payload: Record<string, unknown> = { channel, text, post_at: postAt };
      if (options?.thread_ts) payload.thread_ts = options.thread_ts;
      if (options?.attachments) payload.attachments = options.attachments;
      if (options?.blocks) payload.blocks = options.blocks;

      const response = await this.client.post('/chat.scheduleMessage', payload);
      return { scheduled_message_id: response.data.scheduled_message_id, ok: response.data.ok };
    } catch (error) {
      logger.error('schedule_message_failed', { channel, error: error instanceof Error ? error.message : 'Unknown' });
      return { ok: false };
    }
  }

  // ============================================================================
  // Reactions
  // ============================================================================

  async addReaction(channel: string, timestamp: string, reaction: string): Promise<boolean> {
    try {
      const response = await this.client.post('/reactions.add', { channel, timestamp, name: reaction });
      return response.data.ok;
    } catch (error) {
      return false;
    }
  }

  async getReactions(channel: string, timestamp: string): Promise<Array<{ name: string; count: number }>> {
    try {
      const response = await this.client.get('/reactions.get', { params: { channel, timestamp } });
      if (response.data.ok && response.data.message?.reactions) {
        return response.data.message.reactions.map((r: any) => ({ name: r.name, count: r.count }));
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  // ============================================================================
  // Reminders
  // ============================================================================

  async createReminder(channel: string, text: string, time: string | number): Promise<{ ok: boolean; reminder?: { id: string } }> {
    try {
      const response = await this.client.post('/reminders.add', {
        text,
        time: typeof time === 'string' ? time : time.toString(),
        entity: channel,
      });
      return { ok: response.data.ok, reminder: response.data.reminder };
    } catch (error) {
      logger.error('create_reminder_failed', { channel, error: error instanceof Error ? error.message : 'Unknown' });
      return { ok: false };
    }
  }

  async listReminders(): Promise<{ ok: boolean; reminders?: any[] }> {
    try {
      const response = await this.client.get('/reminders.list');
      return response.data;
    } catch (error) {
      return { ok: false };
    }
  }

  // ============================================================================
  // User Status
  // ============================================================================

  async setStatus(statusText: string, statusEmoji: string, expiration?: number): Promise<boolean> {
    try {
      const profile: Record<string, unknown> = { status_text: statusText, status_emoji: statusEmoji };
      if (expiration) profile.status_expiration = expiration;

      const response = await this.client.post('/users.profile.set', { profile });
      return response.data.ok;
    } catch (error) {
      logger.error('set_status_failed', { error: error instanceof Error ? error.message : 'Unknown' });
      return false;
    }
  }

  // ============================================================================
  // Files
  // ============================================================================

  async uploadFile(channel: string, content: string | Buffer, filename: string, title?: string, initialComment?: string): Promise<{ ok: boolean; file?: any }> {
    try {
      const formData = new URLSearchParams();
      formData.append('channels', channel);
      formData.append('content', content.toString());
      formData.append('filename', filename);
      if (title) formData.append('title', title);
      if (initialComment) formData.append('initial_comment', initialComment);

      const response = await axios.post('https://slack.com/api/files.upload', formData.toString(), {
        headers: {
          'Authorization': `Bearer ${this.client.defaults.headers['Authorization']}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return { ok: response.data.ok, file: response.data.file };
    } catch (error) {
      logger.error('upload_file_failed', { channel, filename, error: error instanceof Error ? error.message : 'Unknown' });
      return { ok: false };
    }
  }

  // ============================================================================
  // Search
  // ============================================================================

  async searchMessages(query: string, options?: { count?: number; page?: number }): Promise<any> {
    try {
      const response = await this.client.get('/search.messages', {
        params: { query, count: options?.count || 20, page: options?.page || 1 },
      });
      return response.data.ok ? response.data : { ok: false, messages: { matches: [] } };
    } catch (error) {
      logger.error('search_messages_failed', { query, error: error instanceof Error ? error.message : 'Unknown' });
      return { ok: false, messages: { matches: [] } };
    }
  }

  // ============================================================================
  // Webhooks
  // ============================================================================

  async openView(triggerId: string, view: any): Promise<boolean> {
    try {
      const response = await this.client.post('/views.open', { trigger_id: triggerId, view });
      return response.data.ok;
    } catch (error) {
      logger.error('open_view_failed', { triggerId, error: error instanceof Error ? error.message : 'Unknown' });
      return false;
    }
  }

  async publishView(userId: string, view: any, hash?: string): Promise<boolean> {
    try {
      const payload: Record<string, unknown> = { user_id: userId, view };
      if (hash) payload.hash = hash;

      const response = await this.client.post('/views.publish', payload);
      return response.data.ok;
    } catch (error) {
      logger.error('publish_view_failed', { userId, error: error instanceof Error ? error.message : 'Unknown' });
      return false;
    }
  }
}

// Factory function
export function createSlackClient(token: string, teamId?: string): SlackAPIClient {
  return new SlackAPIClient(token, teamId);
}
