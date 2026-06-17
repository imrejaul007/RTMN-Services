import axios from 'axios';
import { IChannel } from '../models/Channel';
import { SocialMessage } from '../models/SocialMessage';

const INSTAGRAM_API_BASE = 'https://graph.facebook.com/v18.0';

export interface InstagramMessageContent {
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  text?: string;
  mediaUrl?: string;
  caption?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WebhookPayload {
  sender: {
    id: string;
  };
  recipient: {
    id: string;
  };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: string;
      payload: {
        url?: string;
        coordinates?: {
          lat: number;
          long: number;
        };
      };
    }>;
  };
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: string;
      payload: {
        url?: string;
      };
    }>;
  };
  callback_query?: {
    id: string;
    data: string;
    from: {
      id: string;
      username?: string;
      name?: string;
    };
  };
}

/**
 * Send message via Instagram API
 */
export async function sendMessage(
  channel: IChannel,
  recipientId: string,
  content: InstagramMessageContent
): Promise<SendResult> {
  try {
    const accessToken = channel.credentials.get('accessToken');
    const pageId = channel.metadata.get('pageId');

    if (!accessToken || !pageId) {
      return { success: false, error: 'Missing Instagram credentials' };
    }

    let messagePayload: Record<string, unknown> = {};

    switch (content.type) {
      case 'text':
        messagePayload = {
          recipient: { id: recipientId },
          message: { text: content.text }
        };
        break;

      case 'image':
        messagePayload = {
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'image',
              payload: {
                url: content.mediaUrl,
                is_reusable: true
              }
            }
          }
        };
        break;

      case 'video':
        messagePayload = {
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'video',
              payload: {
                url: content.mediaUrl,
                is_reusable: true
              }
            }
          }
        };
        break;

      default:
        return { success: false, error: `Unsupported message type: ${content.type}` };
    }

    const response = await axios.post(
      `${INSTAGRAM_API_BASE}/me/messages`,
      messagePayload,
      {
        params: { access_token: accessToken },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const messageId = response.data.messages?.[0]?.message_id;

    return { success: true, messageId };
  } catch (error: any) {
    console.error('Instagram send message error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

/**
 * Handle incoming Instagram webhook
 */
export async function handleWebhook(channel: IChannel, payload: WebhookPayload): Promise<void> {
  try {
    const senderId = payload.sender?.id;
    const recipientId = payload.recipient?.id;
    const messageId = payload.message?.mid;

    if (!senderId || !messageId) {
      console.log('Invalid Instagram webhook payload');
      return;
    }

    const threadId = `instagram-${channel._id}-${senderId}`;

    // Parse message content
    const content = parseMessageContent(payload);

    // Create social message
    const message = new SocialMessage({
      platform: 'instagram',
      platformMessageId: messageId,
      senderId,
      recipientId,
      channelId: channel._id,
      content,
      threadId,
      direction: 'inbound',
      status: 'received',
      processed: false,
      metadata: {
        platformData: {
          timestamp: payload.timestamp,
          recipientId
        }
      }
    });

    await message.save();
    console.log(`Instagram message saved: ${messageId}`);

    // Handle auto-reply if enabled
    if (channel.settings.autoReply) {
      await handleAutoReply(channel, senderId, messageId);
    }
  } catch (error) {
    console.error('Instagram webhook handler error:', error);
  }
}

/**
 * Handle Instagram changes (comments, mentions, etc.)
 */
export async function handleChange(channel: IChannel, change: any): Promise<void> {
  try {
    const { field, value } = change;

    if (field === 'comments') {
      const commentId = value.id;
      const text = value.text;
      const mediaId = value.media?.id;
      const userId = value.from?.id;

      const threadId = `instagram-comment-${channel._id}-${userId || mediaId}`;

      const message = new SocialMessage({
        platform: 'instagram',
        platformMessageId: commentId,
        senderId: userId || 'unknown',
        channelId: channel._id,
        content: {
          type: 'text',
          text,
          mediaId
        },
        threadId,
        direction: 'inbound',
        status: 'received',
        metadata: {
          platformData: {
            isComment: true,
            mediaId
          }
        }
      });

      await message.save();
      console.log(`Instagram comment saved: ${commentId}`);
    }
  } catch (error) {
    console.error('Instagram change handler error:', error);
  }
}

/**
 * Register webhook with Instagram API
 */
export async function registerWebhook(
  accessToken: string,
  webhookUrl: string
): Promise<SendResult> {
  try {
    // Register for messages
    await axios.post(
      `${INSTAGRAM_API_BASE}/me/subscriptions`,
      {
        object: 'instagram',
        callback_url: webhookUrl,
        fields: 'messages,comments,mentions',
        verify_token: process.env.INSTAGRAM_VERIFY_TOKEN || 'default_verify_token'
      },
      {
        params: { access_token: accessToken }
      }
    );

    return { success: true };
  } catch (error: any) {
    console.error('Instagram webhook registration error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

/**
 * Get user profile from Instagram
 */
export async function getUserProfile(accessToken: string, userId: string): Promise<any> {
  try {
    const response = await axios.get(
      `${INSTAGRAM_API_BASE}/${userId}`,
      {
        params: {
          fields: 'id,username,name,profile_picture_url,account_type,media_count',
          access_token: accessToken
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Instagram get user profile error:', error);
    return null;
  }
}

/**
 * Parse message content from webhook payload
 */
function parseMessageContent(payload: WebhookPayload) {
  const message = payload.message;

  if (!message) {
    return { type: 'text', text: '' };
  }

  // Text message
  if (message.text) {
    return { type: 'text', text: message.text };
  }

  // Attachment message
  if (message.attachments && message.attachments.length > 0) {
    const attachment = message.attachments[0];

    if (attachment.type === 'location') {
      return {
        type: 'location',
        location: {
          latitude: attachment.payload.coordinates?.lat || 0,
          longitude: attachment.payload.coordinates?.long || 0
        }
      };
    }

    if (attachment.type === 'image') {
      return {
        type: 'image',
        mediaUrl: attachment.payload.url
      };
    }

    return {
      type: attachment.type as any,
      mediaUrl: attachment.payload.url
    };
  }

  return { type: 'text', text: '' };
}

/**
 * Handle auto-reply for Instagram
 */
async function handleAutoReply(
  channel: IChannel,
  senderId: string,
  replyToMessageId: string
): Promise<void> {
  const delay = channel.settings.autoReplyDelay || 5000;

  setTimeout(async () => {
    const autoReplyText = 'Thanks for your message! We will get back to you shortly.';

    const result = await sendMessage(channel, senderId, {
      type: 'text',
      text: autoReplyText
    });

    if (result.success) {
      // Mark original message as auto-replied
      await SocialMessage.findOneAndUpdate(
        { platformMessageId: replyToMessageId },
        { autoReplied: true }
      );
    }
  }, delay);
}

export default {
  sendMessage,
  handleWebhook,
  handleChange,
  registerWebhook,
  getUserProfile
};