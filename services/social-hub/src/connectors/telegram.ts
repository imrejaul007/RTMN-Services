import axios from 'axios';
import { IChannel } from '../models/Channel';
import { SocialMessage } from '../models/SocialMessage';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

export interface TelegramMessageContent {
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'sticker';
  text?: string;
  mediaUrl?: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
  firstName?: string;
  stickerId?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: CallbackQuery;
  channel_post?: TelegramMessage;
}

export interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  date: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhoto[];
  video?: TelegramVideo;
  audio?: TelegramAudio;
  document?: TelegramDocument;
  sticker?: TelegramSticker;
  location?: TelegramLocation;
  contact?: TelegramContact;
  reply_to_message?: TelegramMessage;
  entities?: TelegramEntity[];
}

export interface TelegramPhoto {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumb?: TelegramPhoto;
  file_size?: number;
}

export interface TelegramAudio {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  thumb?: TelegramPhoto;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramSticker {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  is_animated: boolean;
  is_video: boolean;
  thumbnail?: TelegramPhoto;
  set_name?: string;
}

export interface TelegramLocation {
  latitude: number;
  longitude: number;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}

export interface TelegramContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
  vcard?: string;
}

export interface CallbackQuery {
  id: string;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  message?: TelegramMessage;
  chat_instance: string;
  data?: string;
}

export interface TelegramEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
}

/**
 * Set webhook for Telegram bot
 */
export async function setWebhook(
  botToken: string,
  webhookUrl: string
): Promise<SendResult> {
  try {
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET || generateSecretToken();

    await axios.post(`${TELEGRAM_API_BASE}/bot${botToken}/setWebhook`, {
      url: webhookUrl,
      secret_token: secretToken,
      allowed_updates: ['message', 'edited_message', 'callback_query']
    });

    return { success: true };
  } catch (error: any) {
    console.error('Telegram set webhook error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.description || error.message
    };
  }
}

/**
 * Delete webhook
 */
export async function deleteWebhook(botToken: string): Promise<SendResult> {
  try {
    await axios.post(`${TELEGRAM_API_BASE}/bot${botToken}/deleteWebhook`);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.description || error.message
    };
  }
}

/**
 * Send message via Telegram
 */
export async function sendMessage(
  channel: IChannel,
  chatId: string,
  content: TelegramMessageContent
): Promise<SendResult> {
  try {
    const botToken = channel.credentials.get('botToken');

    if (!botToken) {
      return { success: false, error: 'Missing bot token' };
    }

    let payload: Record<string, unknown> = {
      chat_id: chatId,
      parse_mode: 'HTML'
    };

    switch (content.type) {
      case 'text':
        payload.text = content.text || '';
        break;

      case 'image':
        payload = {
          chat_id: chatId,
          photo: content.mediaUrl,
          caption: content.caption,
          parse_mode: 'HTML'
        };
        break;

      case 'video':
        payload = {
          chat_id: chatId,
          video: content.mediaUrl,
          caption: content.caption,
          parse_mode: 'HTML'
        };
        break;

      case 'audio':
        payload = {
          chat_id: chatId,
          audio: content.mediaUrl,
          caption: content.caption,
          parse_mode: 'HTML'
        };
        break;

      case 'document':
        payload = {
          chat_id: chatId,
          document: content.mediaUrl,
          caption: content.caption,
          parse_mode: 'HTML'
        };
        break;

      case 'location':
        payload = {
          chat_id: chatId,
          latitude: content.latitude,
          longitude: content.longitude
        };
        break;

      case 'contact':
        payload = {
          chat_id: chatId,
          phone_number: content.phoneNumber,
          first_name: content.firstName
        };
        break;

      case 'sticker':
        payload = {
          chat_id: chatId,
          sticker: content.stickerId
        };
        break;

      default:
        return { success: false, error: `Unsupported message type: ${content.type}` };
    }

    const response = await axios.post(
      `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`,
      payload
    );

    const messageId = response.data.result?.message_id;

    return { success: true, messageId: messageId?.toString() };
  } catch (error: any) {
    console.error('Telegram send message error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.description || error.message
    };
  }
}

/**
 * Handle incoming Telegram webhook
 */
export async function handleWebhook(channel: IChannel, update: TelegramUpdate): Promise<void> {
  try {
    // Handle regular message
    if (update.message) {
      await handleMessage(channel, update.message, update.update_id);
    }

    // Handle edited message
    if (update.edited_message) {
      await handleEditedMessage(channel, update.edited_message);
    }

    // Handle callback query
    if (update.callback_query) {
      await handleCallbackQuery(channel, update.callback_query);
    }
  } catch (error) {
    console.error('Telegram webhook handler error:', error);
  }
}

/**
 * Handle regular message
 */
async function handleMessage(
  channel: IChannel,
  message: TelegramMessage,
  updateId: number
): Promise<void> {
  const senderId = message.from?.id.toString() || message.chat.id.toString();
  const chatId = message.chat.id.toString();
  const messageId = message.message_id.toString();
  const threadId = `telegram-${channel._id}-${chatId}`;

  const content = parseTelegramMessage(message);

  const socialMessage = new SocialMessage({
    platform: 'telegram',
    platformMessageId: messageId,
    senderId,
    senderName: message.from
      ? `${message.from.first_name}${message.from.last_name ? ' ' + message.from.last_name : ''}`
      : undefined,
    recipientId: chatId,
    channelId: channel._id,
    content,
    threadId,
    direction: message.chat.type === 'private' ? 'inbound' : 'inbound',
    status: 'received',
    processed: false,
    replyToMessageId: message.reply_to_message?.message_id?.toString(),
    metadata: {
      platformData: {
        updateId,
        chatType: message.chat.type,
        entities: message.entities
      }
    }
  });

  await socialMessage.save();
  console.log(`Telegram message saved: ${messageId}`);

  // Handle auto-reply if enabled
  if (channel.settings.autoReply && message.chat.type === 'private') {
    await handleAutoReply(channel, chatId, messageId);
  }
}

/**
 * Handle edited message
 */
async function handleEditedMessage(channel: IChannel, message: TelegramMessage): Promise<void> {
  const messageId = message.message_id.toString();

  await SocialMessage.findOneAndUpdate(
    {
      platform: 'telegram',
      platformMessageId: messageId,
      channelId: channel._id
    },
    {
      content: parseTelegramMessage(message),
      updatedAt: new Date()
    }
  );

  console.log(`Telegram message edited: ${messageId}`);
}

/**
 * Handle callback query (inline keyboard)
 */
async function handleCallbackQuery(
  channel: IChannel,
  callbackQuery: CallbackQuery
): Promise<void> {
  const senderId = callbackQuery.from.id.toString();
  const data = callbackQuery.data || '';
  const queryId = callbackQuery.id;

  const messageId = callbackQuery.message?.message_id.toString();
  const chatId = callbackQuery.message?.chat.id.toString();
  const threadId = `telegram-${channel._id}-${chatId || senderId}`;

  // Create a message for the callback
  const socialMessage = new SocialMessage({
    platform: 'telegram',
    platformMessageId: `callback-${queryId}`,
    senderId,
    senderName: `${callbackQuery.from.first_name}${callbackQuery.from.last_name ? ' ' + callbackQuery.from.last_name : ''}`,
    channelId: channel._id,
    content: {
      type: 'text',
      text: data
    },
    threadId: messageId ? `telegram-${channel._id}-${chatId}` : threadId,
    direction: 'inbound',
    status: 'received',
    processed: false,
    metadata: {
      platformData: {
        isCallback: true,
        callbackData: data,
        queryId
      }
    }
  });

  await socialMessage.save();

  // Answer the callback query
  const botToken = channel.credentials.get('botToken');
  if (botToken) {
    await axios.post(`${TELEGRAM_API_BASE}/bot${botToken}/answerCallbackQuery`, {
      callback_query_id: queryId
    });
  }

  console.log(`Telegram callback query saved: ${queryId}`);
}

/**
 * Parse Telegram message to unified format
 */
function parseTelegramMessage(message: TelegramMessage) {
  // Text message
  if (message.text) {
    return { type: 'text' as const, text: message.text };
  }

  // Photo
  if (message.photo) {
    const largestPhoto = message.photo[message.photo.length - 1];
    return {
      type: 'image' as const,
      mediaId: largestPhoto.file_id,
      caption: message.caption
    };
  }

  // Video
  if (message.video) {
    return {
      type: 'video' as const,
      mediaId: message.video.file_id,
      caption: message.caption
    };
  }

  // Audio
  if (message.audio) {
    return {
      type: 'audio' as const,
      mediaId: message.audio.file_id
    };
  }

  // Document
  if (message.document) {
    return {
      type: 'document' as const,
      mediaId: message.document.file_id,
      caption: message.caption
    };
  }

  // Sticker
  if (message.sticker) {
    return {
      type: 'sticker' as const,
      mediaId: message.sticker.file_id
    };
  }

  // Location
  if (message.location) {
    return {
      type: 'location' as const,
      location: {
        latitude: message.location.latitude,
        longitude: message.location.longitude
      }
    };
  }

  // Contact
  if (message.contact) {
    return {
      type: 'contact' as const,
      phoneNumber: message.contact.phone_number,
      firstName: message.contact.first_name
    };
  }

  return { type: 'text' as const, text: message.caption || '' };
}

/**
 * Handle auto-reply for Telegram
 */
async function handleAutoReply(
  channel: IChannel,
  chatId: string,
  replyToMessageId: string
): Promise<void> {
  const delay = channel.settings.autoReplyDelay || 5000;

  setTimeout(async () => {
    const autoReplyText = 'Thanks for your message! We will get back to you shortly.';

    const result = await sendMessage(channel, chatId, {
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
 * Generate secret token for webhook
 */
function generateSecretToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Get bot info
 */
export async function getMe(botToken: string): Promise<any> {
  try {
    const response = await axios.get(`${TELEGRAM_API_BASE}/bot${botToken}/getMe`);
    return response.data.result;
  } catch (error) {
    console.error('Telegram getMe error:', error);
    return null;
  }
}

export default {
  setWebhook,
  deleteWebhook,
  sendMessage,
  handleWebhook,
  getMe
};