import mongoose, { Schema, Document } from 'mongoose';

export interface IInstagramConversation extends Document {
  conversationId: string;
  tenantId: string;
  igUserId: string;
  igUsername: string;
  igUserProfilePic?: string;
  state: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  messageCount: number;
  tags?: string[];
  assignedAgentId?: string;
}

const ConversationSchema = new Schema<IInstagramConversation>({
  conversationId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  igUserId: { type: String, required: true, index: true },
  igUsername: { type: String, required: true },
  igUserProfilePic: String,
  state: { type: String, enum: ['active', 'archived', 'blocked'], default: 'active' },
  lastMessage: String,
  lastMessageAt: Date,
  messageCount: { type: Number, default: 0 },
  tags: [String],
  assignedAgentId: String
}, { timestamps: true, collection: 'ig_conversations' });

export const InstagramConversation = mongoose.model<IInstagramConversation>('InstagramConversation', ConversationSchema);

export interface IInstagramMessage extends Document {
  messageId: string;
  conversationId: string;
  tenantId: string;
  igMessageId: string;
  igUserId: string;
  type: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaId?: string;
  storyId?: string;
  commentId?: string;
  isFromUser: boolean;
  isAutomated: boolean;
  timestamp: Date;
}

const MessageSchema = new Schema<IInstagramMessage>({
  messageId: { type: String, required: true, unique: true, index: true },
  conversationId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  igMessageId: { type: String, required: true },
  igUserId: { type: String, required: true },
  type: { type: String, required: true },
  text: String,
  mediaUrl: String,
  mediaType: String,
  mediaId: String,
  storyId: String,
  commentId: String,
  isFromUser: { type: Boolean, required: true },
  isAutomated: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'ig_messages' });

export const InstagramMessage = mongoose.model<IInstagramMessage>('InstagramMessage', MessageSchema);

export interface IInstagramAutoReply extends Document {
  autoReplyId: string;
  tenantId: string;
  name: string;
  trigger: string;
  keyword?: string;
  igHashtag?: string;
  message: string;
  delaySeconds: number;
  active: boolean;
  priority: number;
}

const AutoReplySchema = new Schema<IInstagramAutoReply>({
  autoReplyId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  trigger: { type: String, enum: ['keyword', 'first_message', 'story_mention', 'comment', 'always'], required: true },
  keyword: String,
  igHashtag: String,
  message: { type: String, required: true },
  delaySeconds: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  priority: { type: Number, default: 0 }
}, { timestamps: true, collection: 'ig_auto_replies' });

AutoReplySchema.index({ tenantId: 1, trigger: 1, active: 1 });
export const InstagramAutoReply = mongoose.model<IInstagramAutoReply>('InstagramAutoReply', AutoReplySchema);

export interface IInstagramCampaign extends Document {
  campaignId: string;
  tenantId: string;
  name: string;
  igHashtag: string;
  autoReplyId?: string;
  mentionReply?: string;
  storyReply?: string;
  dmToFollowers: boolean;
  dmMessage?: string;
  stats: { mentionsReplied: number; commentsReplied: number; storyReplies: number; dmsSent: number };
  active: boolean;
}

const CampaignSchema = new Schema<IInstagramCampaign>({
  campaignId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  igHashtag: { type: String, required: true },
  autoReplyId: String,
  mentionReply: String,
  storyReply: String,
  dmToFollowers: { type: Boolean, default: false },
  dmMessage: String,
  stats: {
    mentionsReplied: { type: Number, default: 0 },
    commentsReplied: { type: Number, default: 0 },
    storyReplies: { type: Number, default: 0 },
    dmsSent: { type: Number, default: 0 }
  },
  active: { type: Boolean, default: true }
}, { timestamps: true, collection: 'ig_campaigns' });

export const InstagramCampaign = mongoose.model<IInstagramCampaign>('InstagramCampaign', CampaignSchema);
