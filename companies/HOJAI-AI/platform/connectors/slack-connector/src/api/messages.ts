/**
 * Slack Messages API
 * Message posting, editing, deletion, and file uploads
 */

import { SlackClient } from './client.js';
import type {
  SlackMessage,
  SlackBlock,
  SlackAttachment,
  SlackFileUpload,
  SlackScheduledMessage,
  SlackScheduledMessagesList,
  SlackCursorPagination,
} from '../types/index.js';

export interface PostMessageParams {
  channel: string;
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  asUser?: boolean;
  iconEmoji?: string;
  iconUrl?: string;
  linkNames?: boolean;
  mrkdwn?: boolean;
  parse?: 'full' | 'none';
  replyBroadcast?: boolean;
  threadTs?: string;
  unfurlLinks?: boolean;
  unfurlMedia?: boolean;
  username?: string;
}

export interface UpdateMessageParams {
  channel: string;
  ts: string;
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  asUser?: boolean;
  linkNames?: boolean;
  parse?: 'full' | 'none';
}

export interface ScheduleMessageParams {
  channel: string;
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  postAt: string | number; // Unix timestamp
  asUser?: boolean;
  iconEmoji?: string;
  iconUrl?: string;
  linkNames?: boolean;
  parse?: 'full' | 'none';
  replyBroadcast?: boolean;
  threadTs?: string;
  unfurlLinks?: boolean;
  unfurlMedia?: boolean;
  username?: string;
}

export interface UploadFileParams {
  channels?: string[];
  content?: string;
  file?: Buffer | ReadableStream;
  filename: string;
  filetype?: string;
  initialComment?: string;
  title?: string;
  threadTs?: string;
}

/**
 * Message operations using Slack Web API
 */
export class SlackMessagesAPI {
  constructor(private client: SlackClient) {}

  /**
   * Post a message to a channel
   */
  async postMessage(params: PostMessageParams): Promise<SlackMessage> {
    const result = await this.client.call<SlackMessage>('chat.postMessage', {
      channel: params.channel,
      text: params.text,
      blocks: params.blocks,
      attachments: params.attachments,
      as_user: params.asUser,
      icon_emoji: params.iconEmoji,
      icon_url: params.iconUrl,
      link_names: params.linkNames,
      mrkdwn: params.mrkdwn,
      parse: params.parse,
      reply_broadcast: params.replyBroadcast,
      thread_ts: params.threadTs,
      unfurl_links: params.unfurlLinks,
      unfurl_media: params.unfurlMedia,
      username: params.username,
    });

    return result;
  }

  /**
   * Post a simple text message
   */
  async postText(
    channel: string,
    text: string,
    options?: {
      threadTs?: string;
      replyBroadcast?: boolean;
      username?: string;
      iconEmoji?: string;
    }
  ): Promise<SlackMessage> {
    return this.postMessage({
      channel,
      text,
      threadTs: options?.threadTs,
      replyBroadcast: options?.replyBroadcast,
      username: options?.username,
      iconEmoji: options?.iconEmoji,
    });
  }

  /**
   * Post a Block Kit message
   */
  async postBlockMessage(
    channel: string,
    blocks: SlackBlock[],
    text?: string
  ): Promise<SlackMessage> {
    return this.postMessage({
      channel,
      text,
      blocks,
    });
  }

  /**
   * Post an ephemeral message (visible only to one user)
   */
  async postEphemeral(
    channel: string,
    user: string,
    text: string,
    options?: {
      blocks?: SlackBlock[];
      attachments?: SlackAttachment[];
      threadTs?: string;
    }
  ): Promise<{ ok: boolean; messageTs: string }> {
    const result = await this.client.call<{ ok: boolean; message_ts: string }>(
      'chat.postEphemeral',
      {
        channel,
        user,
        text,
        blocks: options?.blocks,
        attachments: options?.attachments,
        thread_ts: options?.threadTs,
      }
    );

    return { ok: result.ok, messageTs: result.message_ts };
  }

  /**
   * Update an existing message
   */
  async updateMessage(params: UpdateMessageParams): Promise<SlackMessage> {
    const result = await this.client.call<SlackMessage>('chat.update', {
      channel: params.channel,
      ts: params.ts,
      text: params.text,
      blocks: params.blocks,
      attachments: params.attachments,
      as_user: params.asUser,
      link_names: params.linkNames,
      parse: params.parse,
    });

    return result;
  }

  /**
   * Delete a message
   */
  async deleteMessage(channel: string, ts: string): Promise<boolean> {
    const result = await this.client.call<{ ok: boolean }>('chat.delete', {
      channel,
      ts,
    });

    return result.ok;
  }

  /**
   * Schedule a message to be posted later
   */
  async scheduleMessage(
    params: ScheduleMessageParams
  ): Promise<SlackScheduledMessage> {
    const postAt =
      typeof params.postAt === 'string'
        ? Math.floor(new Date(params.postAt).getTime() / 1000)
        : params.postAt;

    const result = await this.client.call<{
      ok: boolean;
      scheduled_message_id: string;
      channel_id: string;
      post_at: string;
      date_created: number;
    }>('chat.scheduleMessage', {
      channel: params.channel,
      text: params.text,
      blocks: params.blocks,
      attachments: params.attachments,
      post_at: postAt,
      as_user: params.asUser,
      icon_emoji: params.iconEmoji,
      icon_url: params.iconUrl,
      link_names: params.linkNames,
      parse: params.parse,
      reply_broadcast: params.replyBroadcast,
      thread_ts: params.threadTs,
      unfurl_links: params.unfurlLinks,
      unfurl_media: params.unfurlMedia,
      username: params.username,
    });

    return {
      ok: true,
      scheduled_message_id: result.scheduled_message_id,
      channel_id: result.channel_id,
      post_at: result.post_at,
      date_created: result.date_created,
      text: params.text || '',
      blocks: params.blocks,
      attachments: params.attachments,
      team_id: '',
    };
  }

  /**
   * Get scheduled messages for a channel
   */
  async getScheduledMessages(
    channel: string,
    params?: SlackCursorPagination
  ): Promise<SlackScheduledMessagesList> {
    return this.client.call<SlackScheduledMessagesList>(
      'chat.scheduledMessages.list',
      {
        channel,
        limit: params?.limit || 100,
        cursor: params?.cursor,
      }
    );
  }

  /**
   * Delete a scheduled message
   */
  async deleteScheduledMessage(
    channel: string,
    scheduledMessageId: string
  ): Promise<boolean> {
    const result = await this.client.call<{ ok: boolean }>(
      'chat.deleteScheduledMessage',
      {
        channel,
        scheduled_message_id: scheduledMessageId,
      }
    );

    return result.ok;
  }

  /**
   * Get permalink to a message
   */
  async getPermalink(
    channel: string,
    messageTs: string
  ): Promise<string> {
    const result = await this.client.call<{
      ok: boolean;
      permalink: string;
    }>('chat.getPermalink', {
      channel,
      message_ts: messageTs,
    });

    return result.permalink;
  }

  /**
   * Upload a file
   */
  async uploadFile(params: UploadFileParams): Promise<SlackFileUpload> {
    // If content is provided as a string, convert to buffer
    const contentBuffer = params.content
      ? Buffer.from(params.content)
      : undefined;

    const result = await this.client.call<SlackFileUpload>('files.upload', {
      channels: params.channels,
      content: contentBuffer,
      file: params.file,
      filename: params.filename,
      filetype: params.filetype,
      initial_comment: params.initialComment,
      title: params.title,
      thread_ts: params.threadTs,
    });

    return result;
  }

  /**
   * Upload a file from a URL
   */
  async uploadFileFromUrl(
    url: string,
    filename: string,
    channels: string[],
    options?: {
      title?: string;
      initialComment?: string;
      threadTs?: string;
    }
  ): Promise<SlackFileUpload> {
    const result = await this.client.call<SlackFileUpload>('files.upload', {
      url,
      filename,
      channels: channels.join(','),
      title: options?.title,
      initial_comment: options?.initialComment,
      thread_ts: options?.threadTs,
    });

    return result;
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(
    channel: string,
    messageTs: string,
    emoji: string
  ): Promise<boolean> {
    const result = await this.client.call<{ ok: boolean }>(
      'reactions.add',
      {
        channel,
        timestamp: messageTs,
        name: emoji.replace(/:/g, ''),
      }
    );

    return result.ok;
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    channel: string,
    messageTs: string,
    emoji: string
  ): Promise<boolean> {
    const result = await this.client.call<{ ok: boolean }>(
      'reactions.remove',
      {
        channel,
        timestamp: messageTs,
        name: emoji.replace(/:/g, ''),
      }
    );

    return result.ok;
  }

  /**
   * Get reactions to a message
   */
  async getReactions(
    channel: string,
    messageTs: string
  ): Promise<{ reactions: Array<{ name: string; users: string[]; count: number }> }> {
    const result = await this.client.call<{
      ok: boolean;
      reactions: Array<{ name: string; users: string[]; count: number }>;
    }>('reactions.get', {
      channel,
      timestamp: messageTs,
    });

    return { reactions: result.reactions || [] };
  }

  /**
   * Pin a message
   */
  async pinMessage(channel: string, messageTs: string): Promise<boolean> {
    const result = await this.client.call<{ ok: boolean }>('pins.add', {
      channel,
      timestamp: messageTs,
    });

    return result.ok;
  }

  /**
   * Unpin a message
   */
  async unpinMessage(channel: string, messageTs: string): Promise<boolean> {
    const result = await this.client.call<{ ok: boolean }>('pins.remove', {
      channel,
      timestamp: messageTs,
    });

    return result.ok;
  }
}

// ============================================================================
// Block Kit Builder Helpers
// ============================================================================

/**
 * Create a section block
 */
export function sectionBlock(
  text: string,
  options?: {
    fields?: Array<{ type: 'mrkdwn' | 'plain_text'; text: string }>;
    accessory?: SlackBlock['accessory'];
    blockId?: string;
  }
): SlackBlock {
  return {
    type: 'section',
    block_id: options?.blockId,
    text: {
      type: 'mrkdwn',
      text,
    },
    fields: options?.fields,
    accessory: options?.accessory,
  };
}

/**
 * Create a header block
 */
export function headerBlock(
  text: string,
  blockId?: string
): SlackBlock {
  return {
    type: 'header',
    block_id: blockId,
    text: {
      type: 'plain_text',
      text,
      emoji: true,
    },
  };
}

/**
 * Create a divider block
 */
export function dividerBlock(blockId?: string): SlackBlock {
  return {
    type: 'divider',
    block_id: blockId,
  };
}

/**
 * Create an actions block
 */
export function actionsBlock(
  elements: SlackBlock['elements'],
  blockId?: string
): SlackBlock {
  return {
    type: 'actions',
    block_id: blockId,
    elements: elements || [],
  };
}

/**
 * Create a context block
 */
export function contextBlock(
  elements: Array<SlackBlock['text'] | { type: 'image'; image_url: string; alt_text: string }>,
  blockId?: string
): SlackBlock {
  return {
    type: 'context',
    block_id: blockId,
    elements: elements as any,
  };
}

/**
 * Create an input block
 */
export function inputBlock(
  label: string,
  element: SlackBlockElement,
  options?: {
    hint?: string;
    blockId?: string;
    dispatchAction?: boolean;
  }
): SlackBlock {
  return {
    type: 'input',
    block_id: options?.blockId,
    label: {
      type: 'plain_text',
      text: label,
      emoji: true,
    },
    element,
    hint: options?.hint
      ? {
          type: 'plain_text',
          text: options.hint,
        }
      : undefined,
    dispatch_action: options?.dispatchAction,
  };
}

/**
 * Create a button element
 */
export function buttonElement(
  text: string,
  actionId: string,
  options?: {
    url?: string;
    value?: string;
    style?: 'primary' | 'danger';
    confirm?: SlackBlock['accessory'];
  }
): SlackBlockElement {
  return {
    type: 'button',
    action_id: actionId,
    text: {
      type: 'plain_text',
      text,
      emoji: true,
    },
    url: options?.url,
    value: options?.value,
    style: options?.style,
    confirm: options?.confirm as any,
  };
}

/**
 * Create a select menu element
 */
export function selectMenuElement(
  placeholder: string,
  actionId: string,
  options: {
    type: 'static_select' | 'external_select' | 'conversations_select' | 'users_select' | 'channels_select';
    initialOption?: { text: string; value: string };
    minQueryLength?: number;
  }
): SlackBlockElement {
  return {
    type: options.type,
    action_id: actionId,
    placeholder: {
      type: 'plain_text',
      text: placeholder,
    },
    initial_option: options.initialOption
      ? {
          text: { type: 'plain_text', text: options.initialOption.text },
          value: options.initialOption.value,
        }
      : undefined,
    min_query_length: options.minQueryLength,
  };
}

export default SlackMessagesAPI;