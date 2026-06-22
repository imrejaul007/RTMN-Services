/**
 * GENIE Telegram Service - MongoDB Models
 * Version: 1.0.0 | Date: June 1, 2026
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// Telegram User Model
// ============================================================================

export interface ITelegramUser extends Document {
  telegram_user_id: string;
  telegram_username?: string;
  first_name: string;
  last_name?: string;
  language_code?: string;
  is_bot: boolean;
  photo_url?: string;
  status: 'active' | 'inactive' | 'blocked' | 'pending_verification';
  linked_user_id?: string;
  linked_at?: Date;
  last_interaction?: Date;
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

const TelegramUserSchema = new Schema<ITelegramUser>(
  {
    telegram_user_id: { type: String, required: true, index: true },
    telegram_username: { type: String },
    first_name: { type: String, required: true },
    last_name: { type: String },
    language_code: { type: String },
    is_bot: { type: Boolean, default: false },
    photo_url: { type: String },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blocked', 'pending_verification'],
      default: 'pending_verification',
    },
    linked_user_id: { type: String, index: true },
    linked_at: { type: Date },
    last_interaction: { type: Date },
    tenant_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

// Compound index for queries
TelegramUserSchema.index({ tenant_id: 1, linked_user_id: 1 });
TelegramUserSchema.index({ tenant_id: 1, telegram_user_id: 1 }, { unique: true });

export const TelegramUser = mongoose.model<ITelegramUser>('TelegramUser', TelegramUserSchema);

// ============================================================================
// Telegram Chat Model
// ============================================================================

export interface ITelegramChat extends Document {
  telegram_chat_id: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  description?: string;
  linked_user_id?: string;
  member_count?: number;
  is_active: boolean;
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

const TelegramChatSchema = new Schema<ITelegramChat>(
  {
    telegram_chat_id: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['private', 'group', 'supergroup', 'channel'],
      default: 'private',
    },
    title: { type: String },
    username: { type: String },
    description: { type: String },
    linked_user_id: { type: String, index: true },
    member_count: { type: Number },
    is_active: { type: Boolean, default: true },
    tenant_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

TelegramChatSchema.index({ tenant_id: 1, telegram_chat_id: 1 }, { unique: true });

export const TelegramChat = mongoose.model<ITelegramChat>('TelegramChat', TelegramChatSchema);

// ============================================================================
// Telegram Message Model
// ============================================================================

export interface ITelegramMessage extends Document {
  telegram_message_id: string;
  user_id: string;
  chat_id: string;
  chat_type: 'private' | 'group' | 'supergroup' | 'channel';
  direction: 'incoming' | 'outgoing';
  content: string;
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
    url?: string;
    language?: string;
  }>;
  has_media: boolean;
  media_type?: 'photo' | 'video' | 'audio' | 'document' | 'sticker' | 'voice';
  media_url?: string;
  caption?: string;
  reply_to_message_id?: string;
  forwarded_from_chat_id?: string;
  forwarded_from_message_id?: string;
  timestamp: Date;
  tenant_id: string;
  created_at: Date;
}

const TelegramMessageSchema = new Schema<ITelegramMessage>(
  {
    telegram_message_id: { type: String, required: true },
    user_id: { type: String, required: true, index: true },
    chat_id: { type: String, required: true, index: true },
    chat_type: {
      type: String,
      enum: ['private', 'group', 'supergroup', 'channel'],
      default: 'private',
    },
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      default: 'incoming',
    },
    content: { type: String, default: '' },
    entities: [
      {
        type: { type: String },
        offset: { type: Number },
        length: { type: Number },
        url: { type: String },
        language: { type: String },
      },
    ],
    has_media: { type: Boolean, default: false },
    media_type: {
      type: String,
      enum: ['photo', 'video', 'audio', 'document', 'sticker', 'voice'],
    },
    media_url: { type: String },
    caption: { type: String },
    reply_to_message_id: { type: String },
    forwarded_from_chat_id: { type: String },
    forwarded_from_message_id: { type: String },
    timestamp: { type: Date, required: true, index: true },
    tenant_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

// Compound indexes for common queries
TelegramMessageSchema.index({ tenant_id: 1, user_id: 1, timestamp: -1 });
TelegramMessageSchema.index({ tenant_id: 1, chat_id: 1, timestamp: -1 });
TelegramMessageSchema.index({ tenant_id: 1, user_id: 1, chat_id: 1, timestamp: -1 });

export const TelegramMessage = mongoose.model<ITelegramMessage>('TelegramMessage', TelegramMessageSchema);

// ============================================================================
// Telegram Session Model
// ============================================================================

export interface ITelegramSession extends Document {
  user_id: string;
  telegram_chat_id: string;
  started_at: Date;
  last_activity?: Date;
  message_count: number;
  is_active: boolean;
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

const TelegramSessionSchema = new Schema<ITelegramSession>(
  {
    user_id: { type: String, required: true, index: true },
    telegram_chat_id: { type: String, required: true },
    started_at: { type: Date, default: Date.now },
    last_activity: { type: Date },
    message_count: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    tenant_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

TelegramSessionSchema.index({ tenant_id: 1, user_id: 1, telegram_chat_id: 1 }, { unique: true });
TelegramSessionSchema.index({ tenant_id: 1, is_active: 1, last_activity: -1 });

export const TelegramSession = mongoose.model<ITelegramSession>('TelegramSession', TelegramSessionSchema);

// ============================================================================
// Telegram Conversation Context Model
// ============================================================================

export interface ITelegramConversationContext extends Document {
  user_id: string;
  chat_id: string;
  recent_topics: string[];
  pending_actions: Array<{
    action: string;
    data: Record<string, unknown>;
    created_at: Date;
  }>;
  last_bot_message_id?: string;
  conversation_turns: number;
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

const TelegramConversationContextSchema = new Schema<ITelegramConversationContext>(
  {
    user_id: { type: String, required: true, index: true },
    chat_id: { type: String, required: true, index: true },
    recent_topics: [{ type: String }],
    pending_actions: [
      {
        action: { type: String },
        data: { type: Schema.Types.Mixed },
        created_at: { type: Date, default: Date.now },
      },
    ],
    last_bot_message_id: { type: String },
    conversation_turns: { type: Number, default: 0 },
    tenant_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

TelegramConversationContextSchema.index(
  { tenant_id: 1, user_id: 1, chat_id: 1 },
  { unique: true }
);

export const TelegramConversationContext = mongoose.model<ITelegramConversationContext>(
  'TelegramConversationContext',
  TelegramConversationContextSchema
);

// ============================================================================
// Telegram Linkage Model (for linking REZ user to Telegram)
// ============================================================================

export interface ITelegramLinkage extends Document {
  tenant_id: string;
  user_id: string;
  telegram_user_id: string;
  telegram_chat_id: string;
  verification_code?: string;
  verified_at?: Date;
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

const TelegramLinkageSchema = new Schema<ITelegramLinkage>(
  {
    tenant_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    telegram_user_id: { type: String, required: true, index: true },
    telegram_chat_id: { type: String, required: true },
    verification_code: { type: String },
    verified_at: { type: Date },
    expires_at: { type: Date, required: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TelegramLinkageSchema.index({ tenant_id: 1, user_id: 1 }, { unique: true });
TelegramLinkageSchema.index({ tenant_id: 1, telegram_user_id: 1 }, { unique: true });
TelegramLinkageSchema.index({ verification_code: 1, expires_at: 1 });

export const TelegramLinkage = mongoose.model<ITelegramLinkage>('TelegramLinkage', TelegramLinkageSchema);
