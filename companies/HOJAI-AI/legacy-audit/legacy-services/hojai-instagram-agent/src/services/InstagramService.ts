import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { InstagramConversation, InstagramMessage, InstagramAutoReply, InstagramCampaign } from '../models';

export class InstagramService {
  private accessToken: string;
  private igUserId: string;

  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
    this.igUserId = process.env.INSTAGRAM_IG_USER_ID || '';
  }

  /**
   * Handle incoming webhook from Instagram
   */
  async handleWebhook(payload: any): Promise<void> {
    const entry = payload.entry?.[0];
    if (!entry) return;

    const changes = entry.changes || [];

    for (const change of changes) {
      const { field, value } = change;

      switch (field) {
        case 'messages':
          await this.handleIncomingMessages(entry.id, value.messages || []);
          break;
        case 'story_mentions':
          await this.handleStoryMentions(entry.id, value || []);
          break;
        case 'comments':
          await this.handleComments(entry.id, value || []);
          break;
      }
    }
  }

  /**
   * Handle incoming direct messages
   */
  private async handleIncomingMessages(igUserId: string, messages: any[]): Promise<void> {
    for (const msg of messages) {
      const tenantId = 'default'; // Would come from multi-tenant mapping

      // Get or create conversation
      let conversation = await InstagramConversation.findOne({ igUserId: msg.from.id });
      if (!conversation) {
        conversation = new InstagramConversation({
          conversationId: uuidv4(),
          tenantId,
          igUserId: msg.from.id,
          igUsername: msg.from.username,
          state: 'active'
        });
        await conversation.save();
      }

      // Store message
      const message = new InstagramMessage({
        messageId: uuidv4(),
        conversationId: conversation.conversationId,
        tenantId,
        igMessageId: msg.id,
        igUserId: msg.from.id,
        type: this.mapMessageType(msg),
        text: msg.text,
        mediaUrl: msg.media?.url,
        mediaType: msg.media?.mime_type,
        mediaId: msg.media?.id,
        isFromUser: true,
        timestamp: new Date(msg.timestamp)
      });
      await message.save();

      // Update conversation
      conversation.lastMessage = msg.text || `[${message.type}]`;
      conversation.lastMessageAt = new Date();
      conversation.messageCount++;
      await conversation.save();

      // Check for auto-reply
      await this.processAutoReply(conversation, msg);
    }
  }

  /**
   * Handle story mentions
   */
  private async handleStoryMentions(igUserId: string, mentions: any[]): Promise<void> {
    for (const mention of mentions) {
      // Process story mention auto-reply
      console.log(`[Instagram] Story mention from ${mention.user.username}`);
    }
  }

  /**
   * Handle comments
   */
  private async handleComments(igUserId: string, comments: any[]): Promise<void> {
    for (const comment of comments) {
      console.log(`[Instagram] Comment from ${comment.from.username}: ${comment.text}`);
    }
  }

  /**
   * Process auto-reply
   */
  private async processAutoReply(conversation: any, message: any): Promise<void> {
    const autoReplies = await InstagramAutoReply.find({
      tenantId: conversation.tenantId,
      active: true
    }).sort({ priority: -1 });

    for (const autoReply of autoReplies) {
      let shouldReply = false;

      switch (autoReply.trigger) {
        case 'first_message':
          shouldReply = conversation.messageCount === 1;
          break;
        case 'keyword':
          shouldReply = message.text?.toLowerCase().includes(autoReply.keyword.toLowerCase());
          break;
        case 'always':
          shouldReply = true;
          break;
      }

      if (shouldReply) {
        // Wait for delay
        if (autoReply.delaySeconds > 0) {
          await new Promise(resolve => setTimeout(resolve, autoReply.delaySeconds * 1000));
        }

        // Send auto-reply (simulated)
        console.log(`[Instagram] Auto-reply: ${autoReply.message}`);
        break;
      }
    }
  }

  /**
   * Send direct message
   */
  async sendDM(igUserId: string, message: string): Promise<{ messageId: string }> {
    // In production, this would call Instagram Graph API
    console.log(`[Instagram] Sending DM to ${igUserId}: ${message}`);
    return { messageId: uuidv4() };
  }

  /**
   * Reply to story mention
   */
  async replyToStory(storyId: string, message: string): Promise<void> {
    console.log(`[Instagram] Replying to story ${storyId}: ${message}`);
  }

  /**
   * Reply to comment
   */
  async replyToComment(commentId: string, message: string): Promise<void> {
    console.log(`[Instagram] Replying to comment ${commentId}: ${message}`);
  }

  /**
   * Get conversations
   */
  async getConversations(tenantId: string): Promise<any[]> {
    return InstagramConversation.find({ tenantId, state: 'active' })
      .sort({ lastMessageAt: -1 })
      .limit(100);
  }

  /**
   * Get messages for conversation
   */
  async getMessages(conversationId: string): Promise<any[]> {
    return InstagramMessage.find({ conversationId })
      .sort({ timestamp: -1 })
      .limit(100);
  }

  /**
   * Create auto-reply
   */
  async createAutoReply(data: {
    tenantId: string;
    name: string;
    trigger: string;
    keyword?: string;
    message: string;
    delaySeconds?: number;
  }): Promise<any> {
    const autoReply = new InstagramAutoReply({
      autoReplyId: `ar_${uuidv4()}`,
      ...data,
      active: true
    });
    await autoReply.save();
    return autoReply;
  }

  /**
   * Get auto-replies
   */
  async getAutoReplies(tenantId: string): Promise<any[]> {
    return InstagramAutoReply.find({ tenantId, active: true }).sort({ priority: -1 });
  }

  /**
   * Create campaign
   */
  async createCampaign(data: {
    tenantId: string;
    name: string;
    igHashtag: string;
    mentionReply?: string;
    storyReply?: string;
  }): Promise<any> {
    const campaign = new InstagramCampaign({
      campaignId: `igcamp_${uuidv4()}`,
      ...data,
      stats: { mentionsReplied: 0, commentsReplied: 0, storyReplies: 0, dmsSent: 0 },
      active: true
    });
    await campaign.save();
    return campaign;
  }

  /**
   * Get campaigns
   */
  async getCampaigns(tenantId: string): Promise<any[]> {
    return InstagramCampaign.find({ tenantId });
  }

  /**
   * Map Instagram message type
   */
  private mapMessageType(msg: any): string {
    if (msg.text) return 'text';
    if (msg.image) return 'image';
    if (msg.video) return 'video';
    if (msg.audio) return 'audio';
    if (msg.sticker) return 'text';
    return 'text';
  }
}

export const instagramService = new InstagramService();
