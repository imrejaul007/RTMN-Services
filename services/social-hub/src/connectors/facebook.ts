import axios from 'axios';
import { IChannel } from '../models/Channel';
import { SocialMessage } from '../models/SocialMessage';

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

export interface FacebookMessageContent {
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'audio' | 'template';
  text?: string;
  mediaUrl?: string;
  caption?: string;
  templatePayload?: {
    template_type: string;
    text?: string;
    elements?: any[];
    buttons?: any[];
  };
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface FacebookMessagingPayload {
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
        sticker_id?: number;
      };
    }>;
    quick_reply?: {
      payload: string;
    };
    reply_to?: {
      mid: string;
    };
    is_echo?: boolean;
  };
  delivery?: {
    mids: string[];
    watermark: number;
  };
  read?: {
    watermark: number;
  };
  optin?: {
    ref: string;
    user_ref?: string;
  };
  account_linking?: {
    status: string;
    authorization_code?: string;
  };
  referral?: {
    ref: string;
    source: string;
    type: string;
  };
  postback?: {
    payload: string;
    title: string;
    referral?: {
      ref: string;
      source: string;
      type: string;
    };
  };
}

/**
 * Send message via Facebook Messenger
 */
export async function sendMessage(
  channel: IChannel,
  recipientId: string,
  content: FacebookMessageContent
): Promise<SendResult> {
  try {
    const accessToken = channel.credentials.get('pageAccessToken');

    if (!accessToken) {
      return { success: false, error: 'Missing Facebook access token' };
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

      case 'audio':
        messagePayload = {
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'audio',
              payload: {
                url: content.mediaUrl,
                is_reusable: true
              }
            }
          }
        };
        break;

      case 'document':
        messagePayload = {
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'file',
              payload: {
                url: content.mediaUrl,
                is_reusable: true
              }
            }
          }
        };
        break;

      case 'template':
        messagePayload = {
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'template',
              payload: content.templatePayload
            }
          }
        };
        break;

      default:
        return { success: false, error: `Unsupported message type: ${content.type}` };
    }

    const response = await axios.post(
      `${FACEBOOK_API_BASE}/me/messages`,
      messagePayload,
      {
        params: { access_token: accessToken },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const messageId = response.data.messages?.[0]?.message_id;

    return { success: true, messageId };
  } catch (error: any) {
    console.error('Facebook send message error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

/**
 * Send typing indicator
 */
export async function sendTypingIndicator(
  channel: IChannel,
  recipientId: string,
  state: 'on' | 'off'
): Promise<SendResult> {
  try {
    const accessToken = channel.credentials.get('pageAccessToken');

    if (!accessToken) {
      return { success: false, error: 'Missing Facebook access token' };
    }

    await axios.post(
      `${FACEBOOK_API_BASE}/me/messages`,
      {
        recipient: { id: recipientId },
        sender_action: 'typing_' + state
      },
      {
        params: { access_token: accessToken }
      }
    );

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

/**
 * Mark messages as seen
 */
export async function markAsSeen(
  channel: IChannel,
  recipientId: string
): Promise<SendResult> {
  try {
    const accessToken = channel.credentials.get('pageAccessToken');

    if (!accessToken) {
      return { success: false, error: 'Missing Facebook access token' };
    }

    await axios.post(
      `${FACEBOOK_API_BASE}/me/messages`,
      {
        recipient: { id: recipientId },
        sender_action: 'mark_seen'
      },
      {
        params: { access_token: accessToken }
      }
    );

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

/**
 * Handle incoming Facebook webhook
 */
export async function handleWebhook(
  channel: IChannel,
  payload: FacebookMessagingPayload
): Promise<void> {
  try {
    // Skip echo messages
    if (payload.message?.is_echo) {
      console.log('Skipping Facebook echo message');
      return;
    }

    // Handle read receipt
    if (payload.read) {
      await handleReadReceipt(channel, payload);
      return;
    }

    // Handle delivery receipt
    if (payload.delivery) {
      await handleDeliveryReceipt(channel, payload);
      return;
    }

    // Handle optin
    if (payload.optin) {
      await handleOptin(channel, payload);
      return;
    }

    // Handle postback
    if (payload.postback) {
      await handlePostback(channel, payload);
      return;
    }

    // Handle referral
    if (payload.referral) {
      await handleReferral(channel, payload);
      return;
    }

    // Handle regular message
    if (payload.message) {
      await handleMessage(channel, payload);
    }
  } catch (error) {
    console.error('Facebook webhook handler error:', error);
  }
}

/**
 * Handle regular message
 */
async function handleMessage(
  channel: IChannel,
  payload: FacebookMessagingPayload
): Promise<void> {
  const senderId = payload.sender.id;
  const recipientId = payload.recipient.id;
  const messageId = payload.message?.mid;

  if (!messageId) {
    console.log('No message ID in Facebook payload');
    return;
  }

  const threadId = `facebook-${channel._id}-${senderId}`;

  const content = parseFacebookMessage(payload);

  // Check for quick reply
  const quickReply = payload.message?.quick_reply?.payload;

  const socialMessage = new SocialMessage({
    platform: 'facebook',
    platformMessageId: messageId,
    senderId,
    recipientId,
    channelId: channel._id,
    content,
    threadId,
    direction: 'inbound',
    status: 'received',
    processed: false,
    replyToMessageId: payload.message?.reply_to?.mid,
    metadata: {
      platformData: {
        timestamp: payload.timestamp,
        quickReply,
        isEcho: payload.message?.is_echo
      }
    }
  });

  await socialMessage.save();
  console.log(`Facebook message saved: ${messageId}`);

  // Mark as seen
  await markAsSeen(channel, senderId);

  // Handle auto-reply if enabled
  if (channel.settings.autoReply) {
    await handleAutoReply(channel, senderId, messageId);
  }
}

/**
 * Handle read receipt
 */
async function handleReadReceipt(
  channel: IChannel,
  payload: FacebookMessagingPayload
): Promise<void> {
  const watermark = payload.read?.watermark;

  await SocialMessage.updateMany(
    {
      channelId: channel._id,
      senderId: payload.sender.id,
      createdAt: { $lte: new Date(watermark) },
      status: { $ne: 'read' }
    },
    { status: 'read' }
  );

  console.log(`Facebook messages marked as read for ${payload.sender.id}`);
}

/**
 * Handle delivery receipt
 */
async function handleDeliveryReceipt(
  channel: IChannel,
  payload: FacebookMessagingPayload
): Promise<void> {
  const mids = payload.delivery?.mids || [];

  for (const mid of mids) {
    await SocialMessage.findOneAndUpdate(
      { platformMessageId: mid },
      { status: 'delivered' }
    );
  }
}

/**
 * Handle optin
 */
async function handleOptin(
  channel: IChannel,
  payload: FacebookMessagingPayload
): Promise<void> {
  const senderId = payload.sender.id;
  const ref = payload.optin?.ref;

  const socialMessage = new SocialMessage({
    platform: 'facebook',
    platformMessageId: `optin-${Date.now()}`,
    senderId,
    channelId: channel._id,
    content: {
      type: 'text',
      text: `Opt-in received. Ref: ${ref}`
    },
    threadId: `facebook-${channel._id}-${senderId}`,
    direction: 'inbound',
    status: 'received',
    metadata: {
      platformData: {
        isOptin: true,
        ref
      }
    }
  });

  await socialMessage.save();
}

/**
 * Handle postback
 */
async function handlePostback(
  channel: IChannel,
  payload: FacebookMessagingPayload
): Promise<void> {
  const senderId = payload.sender.id;
  const postback = payload.postback;

  const socialMessage = new SocialMessage({
    platform: 'facebook',
    platformMessageId: `postback-${Date.now()}`,
    senderId,
    channelId: channel._id,
    content: {
      type: 'text',
      text: postback?.title || postback?.payload || 'Postback received'
    },
    threadId: `facebook-${channel._id}-${senderId}`,
    direction: 'inbound',
    status: 'received',
    metadata: {
      platformData: {
        isPostback: true,
        payload: postback?.payload,
        referral: postback?.referral
      }
    }
  });

  await socialMessage.save();
  console.log(`Facebook postback saved for ${senderId}`);

  // Send initial message if referral
  if (postback?.referral && channel.settings.autoReply) {
    await sendMessage(channel, senderId, {
      type: 'text',
      text: 'Thanks for connecting with us!'
    });
  }
}

/**
 * Handle referral
 */
async function handleReferral(
  channel: IChannel,
  payload: FacebookMessagingPayload
): Promise<void> {
  const senderId = payload.sender.id;
  const referral = payload.referral;

  const socialMessage = new SocialMessage({
    platform: 'facebook',
    platformMessageId: `referral-${Date.now()}`,
    senderId,
    channelId: channel._id,
    content: {
      type: 'text',
      text: `Referral received. Source: ${referral?.source}`
    },
    threadId: `facebook-${channel._id}-${senderId}`,
    direction: 'inbound',
    status: 'received',
    metadata: {
      platformData: {
        isReferral: true,
        referral
      }
    }
  });

  await socialMessage.save();
}

/**
 * Parse Facebook message to unified format
 */
function parseFacebookMessage(payload: FacebookMessagingPayload) {
  const message = payload.message;

  if (!message) {
    return { type: 'text' as const, text: '' };
  }

  // Text message
  if (message.text) {
    return { type: 'text' as const, text: message.text };
  }

  // Attachments
  if (message.attachments && message.attachments.length > 0) {
    const attachment = message.attachments[0];

    if (attachment.type === 'location') {
      return {
        type: 'location' as const,
        location: {
          latitude: attachment.payload.coordinates?.lat || 0,
          longitude: attachment.payload.coordinates?.long || 0
        }
      };
    }

    if (attachment.type === 'image') {
      return {
        type: 'image' as const,
        mediaUrl: attachment.payload.url
      };
    }

    if (attachment.type === 'video') {
      return {
        type: 'video' as const,
        mediaUrl: attachment.payload.url
      };
    }

    if (attachment.type === 'audio') {
      return {
        type: 'audio' as const,
        mediaUrl: attachment.payload.url
      };
    }

    if (attachment.type === 'file') {
      return {
        type: 'document' as const,
        mediaUrl: attachment.payload.url
      };
    }

    return {
      type: attachment.type as any,
      mediaUrl: attachment.payload.url
    };
  }

  // Quick reply
  if (message.quick_reply) {
    return {
      type: 'text' as const,
      text: message.quick_reply.payload
    };
  }

  return { type: 'text' as const, text: '' };
}

/**
 * Handle auto-reply for Facebook
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
      await SocialMessage.findOneAndUpdate(
        { platformMessageId: replyToMessageId },
        { autoReplied: true }
      );
    }
  }, delay);
}

/**
 * Get page info
 */
export async function getPageInfo(accessToken: string): Promise<any> {
  try {
    const response = await axios.get(`${FACEBOOK_API_BASE}/me`, {
      params: {
        fields: 'id,name,about,category,link,picture',
        access_token: accessToken
      }
    });

    return response.data;
  } catch (error) {
    console.error('Facebook get page info error:', error);
    return null;
  }
}

/**
 * Subscribe app to page
 */
export async function subscribeApp(accessToken: string): Promise<SendResult> {
  try {
    await axios.post(`${FACEBOOK_API_BASE}/me/subscribed_apps`, {
      params: { access_token: accessToken }
    });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

export default {
  sendMessage,
  sendTypingIndicator,
  markAsSeen,
  handleWebhook,
  getPageInfo,
  subscribeApp
};