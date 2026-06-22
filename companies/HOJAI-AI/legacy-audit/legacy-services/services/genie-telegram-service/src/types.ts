/**
 * GENIE Telegram Service - Type Definitions
 * Version: 1.0.0 | Date: June 13, 2026
 */

export type TelegramMessageType = 'text' | 'photo' | 'video' | 'audio' | 'document' | 'sticker' | 'location';

export interface TelegramChat {
  id: string;
  user_id: string;
  telegram_id: string;
  name: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  username?: string;
  last_message_at: string;
  created_at: string;
}

export interface TelegramMessage {
  id: string;
  user_id: string;
  chat_id: string;
  message_id: string;
  type: TelegramMessageType;
  text: string;
  from: string;
  date: string;
  media_url?: string;
  caption?: string;
}
