/**
 * GENIE Telegram Service - Telegram API Integration
 * Version: 1.0.0 | Date: June 1, 2026
 */

import axios, { AxiosInstance } from 'axios';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('telegram-api');

/**
 * Telegram Bot API Configuration
 */
interface TelegramConfig {
  botToken: string;
  apiUrl: string;
  timeout: number;
}

/**
 * Default Telegram API URL
 */
const DEFAULT_API_URL = 'https://api.telegram.org';

/**
 * Telegram API Response Types
 */
export interface TelegramFileResponse {
  ok: boolean;
  result: {
    file_id: string;
    file_unique_id: string;
    file_size: number;
    file_path: string;
  };
}

export interface TelegramMessageResponse {
  ok: boolean;
  result: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
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
    [key: string]: unknown;
  };
}

export interface TelegramUserResponse {
  ok: boolean;
  result: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    can_join_groups?: boolean;
    can_read_all_group_messages?: boolean;
    supports_inline_queries?: boolean;
    photo?: {
      big_file_id: string;
      small_file_id: string;
    };
  };
}

export interface TelegramChatResponse {
  ok: boolean;
  result: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    description?: string;
    member_count?: number;
    [key: string]: unknown;
  };
}

export interface TelegramSetWebhookResponse {
  ok: boolean;
  result: boolean;
  description?: string;
}

export interface TelegramDeleteWebhookResponse {
  ok: boolean;
  result: boolean;
  description?: string;
}

export interface TelegramGetWebhookInfoResponse {
  ok: boolean;
  result: {
    url?: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    ip_address?: string;
    last_error_date?: number;
    last_error_message?: string;
    last_synchronize_date_error_date?: number;
    max_connections?: number;
    allowed_updates?: string[];
  };
}

/**
 * Telegram API Client
 */
export class TelegramAPI {
  private client: AxiosInstance;
  private config: TelegramConfig;
  private isInitialized: boolean = false;

  constructor(botToken: string, apiUrl: string = DEFAULT_API_URL) {
    this.config = {
      botToken,
      apiUrl,
      timeout: 30000,
    };

    this.client = axios.create({
      baseURL: `${this.config.apiUrl}/bot${this.config.botToken}`,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Initialize the bot and verify the token
   */
  async initialize(): Promise<boolean> {
    try {
      const response = await this.client.get<TelegramUserResponse>('/getMe');
      if (response.data.ok) {
        this.isInitialized = true;
        logger.info('bot_initialized', {
          botId: response.data.result.id,
          username: response.data.result.username,
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('bot_init_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Send a text message
   */
  async sendMessage(
    chatId: number | string,
    text: string,
    options?: {
      parse_mode?: 'Markdown' | 'HTML';
      reply_to_message_id?: number;
      disable_web_page_preview?: boolean;
      disable_notification?: boolean;
    }
  ): Promise<TelegramMessageResponse['result'] | null> {
    try {
      const response = await this.client.post<TelegramMessageResponse>('/sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: options?.parse_mode,
        reply_to_message_id: options?.reply_to_message_id,
        disable_web_page_preview: options?.disable_web_page_preview,
        disable_notification: options?.disable_notification,
      });

      if (response.data.ok) {
        logger.info('message_sent', {
          chatId,
          messageId: response.data.result.message_id,
        });
        return response.data.result;
      }
      return null;
    } catch (error) {
      logger.error('send_message_failed', {
        chatId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Send a message with inline keyboard
   */
  async sendMessageWithKeyboard(
    chatId: number | string,
    text: string,
    keyboard: {
      inline_keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
      keyboard?: Array<Array<{ text: string; request_contact?: boolean; request_location?: boolean }>>;
    },
    options?: {
      parse_mode?: 'Markdown' | 'HTML';
    }
  ): Promise<TelegramMessageResponse['result'] | null> {
    try {
      const response = await this.client.post<TelegramMessageResponse>('/sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: options?.parse_mode,
        reply_markup: keyboard,
      });

      if (response.data.ok) {
        return response.data.result;
      }
      return null;
    } catch (error) {
      logger.error('send_keyboard_failed', {
        chatId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Send a photo
   */
  async sendPhoto(
    chatId: number | string,
    photo: string,
    caption?: string,
    options?: {
      parse_mode?: 'Markdown' | 'HTML';
      reply_to_message_id?: number;
    }
  ): Promise<TelegramMessageResponse['result'] | null> {
    try {
      const response = await this.client.post<TelegramMessageResponse>('/sendPhoto', {
        chat_id: chatId,
        photo,
        caption,
        parse_mode: options?.parse_mode,
        reply_to_message_id: options?.reply_to_message_id,
      });

      if (response.data.ok) {
        return response.data.result;
      }
      return null;
    } catch (error) {
      logger.error('send_photo_failed', {
        chatId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Send a document
   */
  async sendDocument(
    chatId: number | string,
    document: string,
    caption?: string,
    options?: {
      parse_mode?: 'Markdown' | 'HTML';
      reply_to_message_id?: number;
    }
  ): Promise<TelegramMessageResponse['result'] | null> {
    try {
      const response = await this.client.post<TelegramMessageResponse>('/sendDocument', {
        chat_id: chatId,
        document,
        caption,
        parse_mode: options?.parse_mode,
        reply_to_message_id: options?.reply_to_message_id,
      });

      if (response.data.ok) {
        return response.data.result;
      }
      return null;
    } catch (error) {
      logger.error('send_document_failed', {
        chatId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Edit a message
   */
  async editMessageText(
    chatId: number | string,
    messageId: number,
    text: string,
    options?: {
      parse_mode?: 'Markdown' | 'HTML';
    }
  ): Promise<boolean> {
    try {
      const response = await this.client.post('/editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: options?.parse_mode,
      });

      return response.data.ok;
    } catch (error) {
      logger.error('edit_message_failed', {
        chatId,
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(chatId: number | string, messageId: number): Promise<boolean> {
    try {
      const response = await this.client.post('/deleteMessage', {
        chat_id: chatId,
        message_id: messageId,
      });

      return response.data.ok;
    } catch (error) {
      logger.error('delete_message_failed', {
        chatId,
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Answer a callback query
   */
  async answerCallbackQuery(
    callbackQueryId: string,
    options?: {
      text?: string;
      show_alert?: boolean;
      url?: string;
      cache_time?: number;
    }
  ): Promise<boolean> {
    try {
      const response = await this.client.post('/answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        ...options,
      });

      return response.data.ok;
    } catch (error) {
      logger.error('answer_callback_failed', {
        callbackQueryId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get chat information
   */
  async getChat(chatId: number | string): Promise<TelegramChatResponse['result'] | null> {
    try {
      const response = await this.client.get<TelegramChatResponse>('/getChat', {
        params: { chat_id: chatId },
      });

      if (response.data.ok) {
        return response.data.result;
      }
      return null;
    } catch (error) {
      logger.error('get_chat_failed', {
        chatId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get chat member count
   */
  async getChatMemberCount(chatId: number | string): Promise<number> {
    try {
      const response = await this.client.get<{ ok: boolean; result: number }>('/getChatMemberCount', {
        params: { chat_id: chatId },
      });

      if (response.data.ok) {
        return response.data.result;
      }
      return 0;
    } catch (error) {
      logger.error('get_member_count_failed', {
        chatId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Set webhook for receiving updates
   */
  async setWebhook(
    url: string,
    options?: {
      certificate?: string;
      max_connections?: number;
      allowed_updates?: string[];
      drop_pending_updates?: boolean;
    }
  ): Promise<TelegramSetWebhookResponse['result']> {
    try {
      const response = await this.client.post<TelegramSetWebhookResponse>('/setWebhook', {
        url,
        ...options,
      });

      logger.info('webhook_set', { url });
      return response.data.result;
    } catch (error) {
      logger.error('set_webhook_failed', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(dropPendingUpdates?: boolean): Promise<TelegramDeleteWebhookResponse['result']> {
    try {
      const response = await this.client.post<TelegramDeleteWebhookResponse>('/deleteWebhook', {
        drop_pending_updates: dropPendingUpdates,
      });

      return response.data.result;
    } catch (error) {
      logger.error('delete_webhook_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<TelegramGetWebhookInfoResponse['result'] | null> {
    try {
      const response = await this.client.get<TelegramGetWebhookInfoResponse>('/getWebhookInfo');
      return response.data.result;
    } catch (error) {
      logger.error('get_webhook_info_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Download file from Telegram
   */
  async getFile(fileId: string): Promise<string | null> {
    try {
      const response = await this.client.get<TelegramFileResponse>('/getFile', {
        params: { file_id: fileId },
      });

      if (response.data.ok && response.data.result.file_path) {
        return `${this.config.apiUrl}/file/bot${this.config.botToken}/${response.data.result.file_path}`;
      }
      return null;
    } catch (error) {
      logger.error('get_file_failed', {
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Send chat action (typing, sending photo, etc.)
   */
  async sendChatAction(
    chatId: number | string,
    action: 'typing' | 'upload_photo' | 'record_video' | 'upload_video' | 'record_audio' | 'upload_audio' | 'upload_document' | 'find_location' | 'record_video_note' | 'upload_video_note'
  ): Promise<boolean> {
    try {
      const response = await this.client.post('/sendChatAction', {
        chat_id: chatId,
        action,
      });

      return response.data.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create an invite link for a chat
   */
  async createChatInviteLink(
    chatId: number | string,
    options?: {
      expire_date?: number;
      member_limit?: number;
      creates_join_request?: boolean;
    }
  ): Promise<string | null> {
    try {
      const response = await this.client.post<{ ok: boolean; result: { invite_link: string } }>(
        '/createChatInviteLink',
        {
          chat_id: chatId,
          ...options,
        }
      );

      if (response.data.ok) {
        return response.data.result.invite_link;
      }
      return null;
    } catch (error) {
      logger.error('create_invite_link_failed', {
        chatId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Leave a chat
   */
  async leaveChat(chatId: number | string): Promise<boolean> {
    try {
      const response = await this.client.post('/leaveChat', {
        chat_id: chatId,
      });

      return response.data.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get bot commands
   */
  async getMyCommands(): Promise<Array<{ command: string; description: string }> | null> {
    try {
      const response = await this.client.get<{
        ok: boolean;
        result: Array<{ command: string; description: string }>;
      }>('/getMyCommands');

      if (response.data.ok) {
        return response.data.result;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set bot commands
   */
  async setMyCommands(
    commands: Array<{ command: string; description: string }>
  ): Promise<boolean> {
    try {
      const response = await this.client.post('/setMyCommands', {
        commands,
      });

      return response.data.ok;
    } catch (error) {
      logger.error('set_commands_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Close the bot instance
   */
  async close(): Promise<boolean> {
    try {
      const response = await this.client.post('/close');
      return response.data.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if bot is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

/**
 * Create a new Telegram API client
 */
export function createTelegramClient(botToken: string): TelegramAPI {
  return new TelegramAPI(botToken);
}
