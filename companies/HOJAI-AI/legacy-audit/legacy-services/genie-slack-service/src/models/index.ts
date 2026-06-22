/**
 * GENIE Slack Service - MongoDB Models
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// Slack Workspace
// ============================================================================

export interface ISlackWorkspace extends Document {
  workspace_id: string;
  workspace_name: string;
  workspace_domain: string;
  bot_user_id?: string;
  bot_access_token?: string;
  user_access_token?: string;
  status: 'active' | 'inactive' | 'error';
  linked_user_id?: string;
  linked_at?: Date;
  last_sync?: Date;
  tenant_id: string;
}

const SlackWorkspaceSchema = new Schema<ISlackWorkspace>({
  workspace_id: { type: String, required: true, index: true },
  workspace_name: { type: String, required: true },
  workspace_domain: { type: String, required: true },
  bot_user_id: { type: String },
  bot_access_token: { type: String },
  user_access_token: { type: String },
  status: { type: String, enum: ['active', 'inactive', 'error'], default: 'inactive' },
  linked_user_id: { type: String, index: true },
  linked_at: { type: Date },
  last_sync: { type: Date },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });

SlackWorkspaceSchema.index({ tenant_id: 1, workspace_id: 1 }, { unique: true });
SlackWorkspaceSchema.index({ tenant_id: 1, linked_user_id: 1 });

export const SlackWorkspace = mongoose.model<ISlackWorkspace>('SlackWorkspace', SlackWorkspaceSchema);

// ============================================================================
// Slack User
// ============================================================================

export interface ISlackUser extends Document {
  workspace_id: string;
  slack_user_id: string;
  slack_username?: string;
  display_name?: string;
  real_name?: string;
  email?: string;
  avatar_url?: string;
  status?: string;
  status_emoji?: string;
  is_bot: boolean;
  is_admin: boolean;
  is_owner: boolean;
  linked_user_id?: string;
  linked_at?: Date;
  last_interaction?: Date;
  tenant_id: string;
}

const SlackUserSchema = new Schema<ISlackUser>({
  workspace_id: { type: String, required: true, index: true },
  slack_user_id: { type: String, required: true, index: true },
  slack_username: { type: String },
  display_name: { type: String },
  real_name: { type: String },
  email: { type: String },
  avatar_url: { type: String },
  status: { type: String },
  status_emoji: { type: String },
  is_bot: { type: Boolean, default: false },
  is_admin: { type: Boolean, default: false },
  is_owner: { type: Boolean, default: false },
  linked_user_id: { type: String, index: true },
  linked_at: { type: Date },
  last_interaction: { type: Date },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });

SlackUserSchema.index({ tenant_id: 1, workspace_id: 1, slack_user_id: 1 }, { unique: true });
SlackUserSchema.index({ tenant_id: 1, linked_user_id: 1 });

export const SlackUser = mongoose.model<ISlackUser>('SlackUser', SlackUserSchema);

// ============================================================================
// Slack Channel
// ============================================================================

export interface ISlackChannel extends Document {
  workspace_id: string;
  slack_channel_id: string;
  name: string;
  type: 'public' | 'private' | 'im' | 'mpim';
  is_private: boolean;
  topic?: string;
  purpose?: string;
  member_count: number;
  is_archived: boolean;
  linked_user_id?: string;
  tenant_id: string;
}

const SlackChannelSchema = new Schema<ISlackChannel>({
  workspace_id: { type: String, required: true, index: true },
  slack_channel_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['public', 'private', 'im', 'mpim'], default: 'public' },
  is_private: { type: Boolean, default: false },
  topic: { type: String },
  purpose: { type: String },
  member_count: { type: Number, default: 0 },
  is_archived: { type: Boolean, default: false },
  linked_user_id: { type: String },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });

SlackChannelSchema.index({ tenant_id: 1, workspace_id: 1, slack_channel_id: 1 }, { unique: true });

export const SlackChannel = mongoose.model<ISlackChannel>('SlackChannel', SlackChannelSchema);

// ============================================================================
// Slack Message
// ============================================================================

export interface ISlackMessage extends Document {
  workspace_id: string;
  channel_id: string;
  slack_message_id: string;
  user_id: string;
  thread_ts?: string;
  parent_ts?: string;
  content: string;
  attachments?: Array<{
    fallback?: string;
    text?: string;
    pretext?: string;
    title?: string;
    title_link?: string;
    color?: string;
  }>;
  has_files: boolean;
  file_count: number;
  reactions?: Array<{ name: string; count: number; users: string[] }>;
  reply_count: number;
  direction: 'incoming' | 'outgoing';
  timestamp: Date;
  tenant_id: string;
}

const SlackMessageSchema = new Schema<ISlackMessage>({
  workspace_id: { type: String, required: true, index: true },
  channel_id: { type: String, required: true, index: true },
  slack_message_id: { type: String, required: true },
  user_id: { type: String, required: true, index: true },
  thread_ts: { type: String, index: true },
  parent_ts: { type: String },
  content: { type: String, default: '' },
  attachments: [{
    fallback: String,
    text: String,
    pretext: String,
    title: String,
    title_link: String,
    color: String,
  }],
  has_files: { type: Boolean, default: false },
  file_count: { type: Number, default: 0 },
  reactions: [{
    name: String,
    count: Number,
    users: [String],
  }],
  reply_count: { type: Number, default: 0 },
  direction: { type: String, enum: ['incoming', 'outgoing'], default: 'incoming' },
  timestamp: { type: Date, required: true, index: true },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });

SlackMessageSchema.index({ tenant_id: 1, workspace_id: 1, user_id: 1, timestamp: -1 });
SlackMessageSchema.index({ tenant_id: 1, workspace_id: 1, channel_id: 1, timestamp: -1 });
SlackMessageSchema.index({ tenant_id: 1, thread_ts: 1, timestamp: 1 });

export const SlackMessage = mongoose.model<ISlackMessage>('SlackMessage', SlackMessageSchema);

// ============================================================================
// Slack Thread Context
// ============================================================================

export interface ISlackThreadContext extends Document {
  workspace_id: string;
  channel_id: string;
  thread_ts: string;
  parent_message_id: string;
  topic?: string;
  participant_ids: string[];
  message_count: number;
  last_activity?: Date;
  tenant_id: string;
}

const SlackThreadContextSchema = new Schema<ISlackThreadContext>({
  workspace_id: { type: String, required: true, index: true },
  channel_id: { type: String, required: true, index: true },
  thread_ts: { type: String, required: true, unique: true },
  parent_message_id: { type: String, required: true },
  topic: { type: String },
  participant_ids: [{ type: String }],
  message_count: { type: Number, default: 0 },
  last_activity: { type: Date },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });

export const SlackThreadContext = mongoose.model<ISlackThreadContext>('SlackThreadContext', SlackThreadContextSchema);

// ============================================================================
// Slack Session
// ============================================================================

export interface ISlackSession extends Document {
  workspace_id: string;
  user_id: string;
  slack_user_id: string;
  started_at: Date;
  last_activity?: Date;
  message_count: number;
  is_active: boolean;
  tenant_id: string;
}

const SlackSessionSchema = new Schema<ISlackSession>({
  workspace_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  slack_user_id: { type: String, required: true },
  started_at: { type: Date, default: Date.now },
  last_activity: { type: Date },
  message_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });

SlackSessionSchema.index({ tenant_id: 1, user_id: 1, slack_user_id: 1 }, { unique: true });

export const SlackSession = mongoose.model<ISlackSession>('SlackSession', SlackSessionSchema);

// ============================================================================
// Slack Linkage
// ============================================================================

export interface ISlackLinkage extends Document {
  tenant_id: string;
  user_id: string;
  workspace_id: string;
  slack_team_id: string;
  slack_user_id: string;
  verification_code?: string;
  verified_at?: Date;
  expires_at: Date;
  is_active: boolean;
}

const SlackLinkageSchema = new Schema<ISlackLinkage>({
  tenant_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  workspace_id: { type: String, required: true, index: true },
  slack_team_id: { type: String, required: true },
  slack_user_id: { type: String, required: true },
  verification_code: { type: String },
  verified_at: { type: Date },
  expires_at: { type: Date, required: true },
  is_active: { type: Boolean, default: false },
}, { timestamps: true });

SlackLinkageSchema.index({ tenant_id: 1, user_id: 1 }, { unique: true });
SlackLinkageSchema.index({ tenant_id: 1, slack_user_id: 1 });

export const SlackLinkage = mongoose.model<ISlackLinkage>('SlackLinkage', SlackLinkageSchema);
