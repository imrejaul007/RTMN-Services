/**
 * GENIE Discord Service - Models
 */
import mongoose, { Schema, Document } from 'mongoose';

export interface IDiscordServer extends Document {
  guild_id: string; guild_name: string; icon_url?: string;
  linked_user_id?: string; linked_at?: Date; last_sync?: Date;
  settings: { sync_channels: boolean; sync_threads: boolean; sync_mentions: boolean; exclude_channels: string[]; sync_direction: string };
  tenant_id: string;
}

const DiscordServerSchema = new Schema<IDiscordServer>({
  guild_id: { type: String, required: true, index: true },
  guild_name: { type: String, required: true },
  icon_url: String,
  linked_user_id: { type: String, index: true },
  linked_at: Date,
  last_sync: Date,
  settings: {
    sync_channels: { type: Boolean, default: true },
    sync_threads: { type: Boolean, default: true },
    sync_mentions: { type: Boolean, default: true },
    exclude_channels: [String],
    sync_direction: { type: String, enum: ['bidirectional', 'to_genie', 'from_genie'], default: 'to_genie' },
  },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });

DiscordServerSchema.index({ tenant_id: 1, guild_id: 1 }, { unique: true });
export const DiscordServer = mongoose.model<IDiscordServer>('DiscordServer', DiscordServerSchema);

export interface IDiscordUser extends Document {
  guild_id: string; discord_user_id: string; discord_username: string; display_name?: string;
  avatar_url?: string; roles: string[]; is_bot: boolean;
  linked_user_id?: string; linked_at?: Date; last_seen?: Date; tenant_id: string;
}

const DiscordUserSchema = new Schema<IDiscordUser>({
  guild_id: { type: String, required: true, index: true },
  discord_user_id: { type: String, required: true, index: true },
  discord_username: { type: String, required: true },
  display_name: String,
  avatar_url: String,
  roles: [String],
  is_bot: { type: Boolean, default: false },
  linked_user_id: { type: String, index: true },
  linked_at: Date,
  last_seen: Date,
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });

DiscordUserSchema.index({ tenant_id: 1, guild_id: 1, discord_user_id: 1 }, { unique: true });
export const DiscordUser = mongoose.model<IDiscordUser>('DiscordUser', DiscordUserSchema);

export interface IDiscordMessage extends Document {
  guild_id: string; channel_id: string; discord_message_id: string; author_id: string;
  content: string; embeds?: any[]; attachments?: any[]; thread_id?: string;
  is_thread: boolean; reply_count: number; reactions?: any[]; direction: 'incoming' | 'outgoing';
  timestamp: Date; tenant_id: string;
}

const DiscordMessageSchema = new Schema<IDiscordMessage>({
  guild_id: { type: String, required: true, index: true },
  channel_id: { type: String, required: true, index: true },
  discord_message_id: { type: String, required: true },
  author_id: { type: String, required: true, index: true },
  content: { type: String, default: '' },
  embeds: [Schema.Types.Mixed],
  attachments: [Schema.Types.Mixed],
  thread_id: String,
  is_thread: { type: Boolean, default: false },
  reply_count: { type: Number, default: 0 },
  reactions: [{ emoji: String, count: Number, users: [String] }],
  direction: { type: String, enum: ['incoming', 'outgoing'], default: 'incoming' },
  timestamp: { type: Date, required: true, index: true },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });

DiscordMessageSchema.index({ tenant_id: 1, guild_id: 1, author_id: 1, timestamp: -1 });
DiscordMessageSchema.index({ tenant_id: 1, channel_id: 1, timestamp: -1 });
export const DiscordMessage = mongoose.model<IDiscordMessage>('DiscordMessage', DiscordMessageSchema);
