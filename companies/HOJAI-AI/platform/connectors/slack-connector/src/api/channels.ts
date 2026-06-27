/**
 * Slack Channels API
 * Channel listing, creation, and management
 */

import { SlackClient } from './client.js';
import type {
  SlackChannel,
  SlackConversation,
  SlackMessage,
  SlackMessageHistory,
  SlackChannelMember,
  SlackCursorPagination,
} from '../types/index.js';

export interface ListChannelsParams extends SlackCursorPagination {
  types?: string[];
  excludeArchived?: boolean;
  excludeMembers?: boolean;
}

export interface GetChannelHistoryParams extends SlackCursorPagination {
  latest?: string;
  oldest?: string;
  inclusive?: boolean;
  count?: number;
}

/**
 * Channel operations using Slack Web API
 */
export class SlackChannelsAPI {
  constructor(private client: SlackClient) {}

  /**
   * List all channels in the workspace
   */
  async listChannels(params?: ListChannelsParams): Promise<{
    channels: SlackChannel[];
    nextCursor?: string;
  }> {
    const result = await this.client.call<{
      ok: boolean;
      channels: SlackChannel[];
      response_metadata?: { next_cursor?: string };
    }>('conversations.list', {
      types: params?.types || ['public_channel', 'private_channel'],
      limit: params?.limit || 200,
      cursor: params?.cursor,
      exclude_archived: params?.excludeArchived ?? true,
      exclude_members: params?.excludeMembers ?? false,
    });

    return {
      channels: result.channels || [],
      nextCursor: result.response_metadata?.next_cursor,
    };
  }

  /**
   * Get channel information by ID
   */
  async getChannel(channelId: string): Promise<SlackChannel> {
    const result = await this.client.call<{
      ok: boolean;
      channel: SlackChannel;
    }>('conversations.info', {
      channel: channelId,
      include_num_members: true,
    });

    return result.channel;
  }

  /**
   * Create a new channel
   */
  async createChannel(
    name: string,
    isPrivate: boolean = false,
    options?: {
      description?: string;
      topic?: string;
      userAuthToken?: string;
    }
  ): Promise<SlackChannel> {
    const createMethod = isPrivate ? 'conversations.create' : 'conversations.create';
    const createParams: Record<string, unknown> = {
      name: name.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
      is_private: isPrivate,
    };

    const result = await this.client.call<{
      ok: boolean;
      channel: SlackChannel;
    }>(createMethod, createParams);

    // Set topic and description if provided
    if (options?.description || options?.topic) {
      const channelId = result.channel.id;

      if (options.topic) {
        await this.setTopic(channelId, options.topic);
      }

      if (options.description) {
        await this.setPurpose(channelId, options.description);
      }
    }

    return result.channel;
  }

  /**
   * Archive a channel
   */
  async archiveChannel(channelId: string): Promise<boolean> {
    const result = await this.client.call<{ ok: boolean }>(
      'conversations.archive',
      { channel: channelId }
    );

    return result.ok;
  }

  /**
   * Unarchive a channel
   */
  async unarchiveChannel(channelId: string): Promise<boolean> {
    const result = await this.client.call<{ ok: boolean }>(
      'conversations.unarchive',
      { channel: channelId }
    );

    return result.ok;
  }

  /**
   * Invite users to a channel
   */
  async inviteToChannel(
    channelId: string,
    users: string[]
  ): Promise<SlackChannel> {
    const result = await this.client.call<{
      ok: boolean;
      channel: SlackChannel;
    }>('conversations.invite', {
      channel: channelId,
      users: users.join(','),
    });

    return result.channel;
  }

  /**
   * Remove a user from a channel
   */
  async kickFromChannel(channelId: string, user: string): Promise<boolean> {
    const result = await this.client.call<{ ok: boolean }>(
      'conversations.kick',
      {
        channel: channelId,
        user,
      }
    );

    return result.ok;
  }

  /**
   * Get channel message history
   */
  async getChannelHistory(
    channelId: string,
    params?: GetChannelHistoryParams
  ): Promise<SlackMessageHistory> {
    return this.client.call<SlackMessageHistory>('conversations.history', {
      channel: channelId,
      latest: params?.latest,
      oldest: params?.oldest,
      inclusive: params?.inclusive ?? false,
      limit: params?.count || 200,
      cursor: params?.cursor,
    });
  }

  /**
   * Get replies in a thread
   */
  async getThreadReplies(
    channelId: string,
    threadTs: string,
    params?: SlackCursorPagination
  ): Promise<SlackMessageHistory> {
    return this.client.call<SlackMessageHistory>('conversations.replies', {
      channel: channelId,
      ts: threadTs,
      limit: params?.limit || 200,
      cursor: params?.cursor,
    });
  }

  /**
   * Get channel members
   */
  async getChannelMembers(
    channelId: string,
    params?: SlackCursorPagination
  ): Promise<{
    members: string[];
    nextCursor?: string;
  }> {
    const result = await this.client.call<{
      ok: boolean;
      members: string[];
      response_metadata?: { next_cursor?: string };
    }>('conversations.members', {
      channel: channelId,
      limit: params?.limit || 200,
      cursor: params?.cursor,
    });

    return {
      members: result.members || [],
      nextCursor: result.response_metadata?.next_cursor,
    };
  }

  /**
   * Join a channel
   */
  async joinChannel(channelId: string): Promise<SlackChannel> {
    const result = await this.client.call<{
      ok: boolean;
      channel: SlackChannel;
    }>('conversations.join', {
      channel: channelId,
    });

    return result.channel;
  }

  /**
   * Leave a channel
   */
  async leaveChannel(channelId: string): Promise<boolean> {
    const result = await this.client.call<{ ok: boolean }>(
      'conversations.leave',
      { channel: channelId }
    );

    return result.ok;
  }

  /**
   * Rename a channel
   */
  async renameChannel(channelId: string, name: string): Promise<SlackChannel> {
    const result = await this.client.call<{
      ok: boolean;
      channel: SlackChannel;
    }>('conversations.rename', {
      channel: channelId,
      name: name.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
    });

    return result.channel;
  }

  /**
   * Set channel topic
   */
  async setTopic(channelId: string, topic: string): Promise<boolean> {
    const result = await this.client.call<{ ok: boolean }>(
      'conversations.setTopic',
      {
        channel: channelId,
        topic,
      }
    );

    return result.ok;
  }

  /**
   * Set channel purpose/description
   */
  async setPurpose(channelId: string, purpose: string): Promise<boolean> {
    const result = await this.client.call<{ ok: boolean }>(
      'conversations.setPurpose',
      {
        channel: channelId,
        purpose,
      }
    );

    return result.ok;
  }

  /**
   * Open a direct message conversation
   */
  async openDirectMessage(user: string): Promise<SlackConversation> {
    const result = await this.client.call<{
      ok: boolean;
      channel: SlackConversation;
    }>('conversations.open', {
      users: user,
    });

    return result.channel;
  }

  /**
   * Open a multi-person direct message
   */
  async openMultiPersonDM(users: string[]): Promise<SlackConversation> {
    const result = await this.client.call<{
      ok: boolean;
      channel: SlackConversation;
    }>('conversations.open', {
      users: users.join(','),
    });

    return result.channel;
  }

  /**
   * Get all conversations (channels, DMs, MPDMs)
   */
  async listAllConversations(params?: ListChannelsParams): Promise<{
    channels: SlackConversation[];
    nextCursor?: string;
  }> {
    const result = await this.client.call<{
      ok: boolean;
      channels: SlackConversation[];
      response_metadata?: { next_cursor?: string };
    }>('conversations.list', {
      types: params?.types || [
        'public_channel',
        'private_channel',
        'im',
        'mpim',
      ],
      limit: params?.limit || 200,
      cursor: params?.cursor,
      exclude_archived: params?.excludeArchived ?? true,
    });

    return {
      channels: result.channels || [],
      nextCursor: result.response_metadata?.next_cursor,
    };
  }
}

export default SlackChannelsAPI;