import { z } from 'zod';

export const InstagramMessageTypeEnum = z.enum(['text', 'image', 'video', 'audio', 'story_mention', 'story_reply', 'comment', 'like']);
export type InstagramMessageType = z.infer<typeof InstagramMessageTypeEnum>;

export const InstagramConversationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  igUserId: z.string(),
  igUsername: z.string(),
  igUserProfilePic: z.string().optional(),
  state: z.enum(['active', 'archived', 'blocked']),
  lastMessage: z.string().optional(),
  lastMessageAt: z.date().optional(),
  messageCount: z.number().default(0),
  tags: z.array(z.string()).optional(),
  assignedAgentId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type InstagramConversation = z.infer<typeof InstagramConversationSchema>;

export const InstagramMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  tenantId: z.string(),
  igMessageId: z.string(),
  igUserId: z.string(),
  type: InstagramMessageTypeEnum,
  text: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  mediaType: z.string().optional(),
  mediaId: z.string().optional(),
  storyId: z.string().optional(),
  commentId: z.string().optional(),
  isFromUser: z.boolean(),
  isAutomated: z.boolean().default(false),
  timestamp: z.date(),
  createdAt: z.date()
});
export type InstagramMessage = z.infer<typeof InstagramMessageSchema>;

export const InstagramAutoReplySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  trigger: z.enum(['keyword', 'first_message', 'story_mention', 'comment', 'always']),
  keyword: z.string().optional(),
  igHashtag: z.string().optional(),
  message: z.string(),
  delaySeconds: z.number().min(0).max(86400).default(0),
  active: z.boolean().default(true),
  priority: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type InstagramAutoReply = z.infer<typeof InstagramAutoReplySchema>;

export const InstagramCampaignSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  igHashtag: z.string(),
  autoReplyId: z.string().optional(),
  mentionReply: z.string().optional(),
  storyReply: z.string().optional(),
  dmToFollowers: z.boolean().default(false),
  dmMessage: z.string().optional(),
  stats: z.object({
    mentionsReplied: z.number().default(0),
    commentsReplied: z.number().default(0),
    storyReplies: z.number().default(0),
    dmsSent: z.number().default(0)
  }),
  active: z.boolean().default(true),
  createdAt: z.date()
});
export type InstagramCampaign = z.infer<typeof InstagramCampaignSchema>;
