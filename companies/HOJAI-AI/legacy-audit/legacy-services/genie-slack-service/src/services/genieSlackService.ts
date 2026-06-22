/**
 * GENIE Slack Service - Genie Integration Service
 * Version: 1.0.0 | Date: June 1, 2026
 * Purpose: Connects Slack to GENIE Personal Intelligence OS
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SlackWorkspace,
  SlackUser,
  SlackChannel,
  SlackMessage,
  SlackThreadContext,
  SlackSession,
  SlackLinkage,
  ISlackWorkspace,
  ISlackUser,
  ISlackChannel,
  ISlackMessage,
  ISlackLinkage,
} from '../models/index.js';
import { SlackAPIClient, createSlackClient } from './slackService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('genie-slack-service');

// ============================================================================
// Configuration
// ============================================================================

interface GenieSlackConfig {
  memoryServiceUrl: string;
  relationshipServiceUrl: string;
}

const DEFAULT_CONFIG: GenieSlackConfig = {
  memoryServiceUrl: process.env.GENIE_MEMORY_SERVICE_URL || 'http://localhost:4703',
  relationshipServiceUrl: process.env.GENIE_RELATIONSHIP_SERVICE_URL || 'http://localhost:4702',
};

// ============================================================================
// Genie Slack Service
// ============================================================================

export class GenieSlackService {
  private config: GenieSlackConfig;
  private clients: Map<string, SlackAPIClient> = new Map();

  constructor(config?: Partial<GenieSlackConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Workspace Management
  // ============================================================================

  async createWorkspace(
    tenantId: string,
    workspaceId: string,
    workspaceName: string,
    workspaceDomain: string,
    botAccessToken?: string,
    userAccessToken?: string
  ): Promise<ISlackWorkspace> {
    const workspace = await SlackWorkspace.findOneAndUpdate(
      { tenant_id: tenantId, workspace_id: workspaceId },
      {
        tenant_id: tenantId,
        workspace_id: workspaceId,
        workspace_name: workspaceName,
        workspace_domain: workspaceDomain,
        bot_access_token: botAccessToken,
        user_access_token: userAccessToken,
        status: 'active',
      },
      { upsert: true, new: true }
    );

    // Initialize Slack client if we have a token
    if (botAccessToken) {
      const client = createSlackClient(botAccessToken, workspaceId);
      const authTest = await client.authTest();
      if (authTest.ok && authTest.bot_user_id) {
        workspace.bot_user_id = authTest.bot_user_id;
        workspace.status = 'active';
        await workspace.save();
      }
      this.clients.set(`${tenantId}:${workspaceId}`, client);
    }

    logger.info('workspace_created', { tenantId, workspaceId, workspaceName });
    return workspace;
  }

  async getWorkspace(tenantId: string, workspaceId: string): Promise<ISlackWorkspace | null> {
    return SlackWorkspace.findOne({ tenant_id: tenantId, workspace_id: workspaceId });
  }

  async getUserWorkspaces(tenantId: string, userId: string): Promise<ISlackWorkspace[]> {
    return SlackWorkspace.find({ tenant_id: tenantId, linked_user_id: userId, status: 'active' });
  }

  async syncWorkspace(tenantId: string, workspaceId: string): Promise<{ users: number; channels: number }> {
    const workspace = await SlackWorkspace.findOne({ tenant_id: tenantId, workspace_id: workspaceId });
    if (!workspace || !workspace.bot_access_token) {
      throw new Error('Workspace not found or not authenticated');
    }

    const client = this.getClient(tenantId, workspaceId);
    if (!client) throw new Error('Client not initialized');

    // Sync users
    const users = await client.listUsers();
    let userCount = 0;
    for (const user of users) {
      if (!user.is_bot) {
        await SlackUser.findOneAndUpdate(
          { tenant_id: tenantId, workspace_id: workspaceId, slack_user_id: user.id },
          {
            tenant_id: tenantId,
            workspace_id: workspaceId,
            slack_user_id: user.id,
            slack_username: user.name,
            real_name: user.real_name,
            is_bot: user.is_bot,
          },
          { upsert: true, new: true }
        );
        userCount++;
      }
    }

    // Sync channels
    const channels = await client.listConversations();
    let channelCount = 0;
    for (const channel of channels) {
      await SlackChannel.findOneAndUpdate(
        { tenant_id: tenantId, workspace_id: workspaceId, slack_channel_id: channel.id },
        {
          tenant_id: tenantId,
          workspace_id: workspaceId,
          slack_channel_id: channel.id,
          name: channel.name,
          type: channel.is_im ? 'im' : channel.is_group ? 'private' : 'public',
          is_private: channel.is_private,
          member_count: channel.num_members || 0,
          is_archived: channel.is_archived,
        },
        { upsert: true, new: true }
      );
      channelCount++;
    }

    // Update last sync
    workspace.last_sync = new Date();
    await workspace.save();

    logger.info('workspace_synced', { tenantId, workspaceId, users: userCount, channels: channelCount });
    return { users: userCount, channels: channelCount };
  }

  // ============================================================================
  // User Linking
  // ============================================================================

  async generateVerificationCode(tenantId: string, userId: string, workspaceId: string): Promise<string> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await SlackLinkage.findOneAndUpdate(
      { tenant_id: tenantId, user_id: userId },
      {
        tenant_id: tenantId,
        user_id: userId,
        workspace_id: workspaceId,
        verification_code: code,
        expires_at: expiresAt,
        is_active: false,
      },
      { upsert: true, new: true }
    );

    logger.info('verification_code_generated', { tenantId, userId });
    return code;
  }

  async verifyAndLinkUser(
    tenantId: string,
    slackUserId: string,
    workspaceId: string,
    verificationCode: string,
    slackTeamId: string
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    const linkage = await SlackLinkage.findOne({
      tenant_id: tenantId,
      slack_user_id: slackUserId,
      verification_code: verificationCode,
    });

    if (!linkage) {
      return { success: false, message: 'Invalid verification code' };
    }

    if (new Date() > linkage.expires_at) {
      return { success: false, message: 'Verification code expired' };
    }

    // Update linkage
    linkage.verified_at = new Date();
    linkage.is_active = true;
    linkage.slack_team_id = slackTeamId;
    linkage.verification_code = undefined;
    await linkage.save();

    // Update workspace
    await SlackWorkspace.findOneAndUpdate(
      { tenant_id: tenantId, workspace_id: workspaceId },
      { linked_user_id: linkage.user_id, linked_at: new Date() }
    );

    // Update or create user
    await SlackUser.findOneAndUpdate(
      { tenant_id: tenantId, workspace_id: workspaceId, slack_user_id: slackUserId },
      { linked_user_id: linkage.user_id, linked_at: new Date() }
    );

    // Create session
    await SlackSession.findOneAndUpdate(
      { tenant_id: tenantId, user_id: linkage.user_id, slack_user_id: slackUserId },
      {
        tenant_id: tenantId,
        workspace_id: workspaceId,
        user_id: linkage.user_id,
        slack_user_id: slackUserId,
        started_at: new Date(),
        last_activity: new Date(),
        is_active: true,
      },
      { upsert: true, new: true }
    );

    logger.info('user_linked', { tenantId, slackUserId, userId: linkage.user_id });
    return { success: true, message: 'Slack account linked successfully', userId: linkage.user_id };
  }

  async unlinkUser(tenantId: string, userId: string): Promise<{ success: boolean; message: string }> {
    await SlackLinkage.deleteOne({ tenant_id: tenantId, user_id: userId });
    await SlackUser.updateMany(
      { tenant_id: tenantId, linked_user_id: userId },
      { linked_user_id: undefined }
    );
    await SlackSession.deleteMany({ tenant_id: tenantId, user_id: userId });

    logger.info('user_unlinked', { tenantId, userId });
    return { success: true, message: 'Slack account unlinked successfully' };
  }

  // ============================================================================
  // Message Processing
  // ============================================================================

  async processIncomingMessage(
    tenantId: string,
    workspaceId: string,
    channelId: string,
    messageData: {
      user: string;
      text: string;
      ts: string;
      thread_ts?: string;
      files?: any[];
      attachments?: any[];
      reactions?: any[];
    }
  ): Promise<ISlackMessage> {
    // Get or create channel
    await SlackChannel.findOneAndUpdate(
      { tenant_id: tenantId, workspace_id: workspaceId, slack_channel_id: channelId },
      { tenant_id: tenantId, workspace_id: workspaceId, slack_channel_id: channelId },
      { upsert: true, new: true }
    );

    // Get linked user
    const slackUser = await SlackUser.findOne({
      tenant_id: tenantId,
      workspace_id: workspaceId,
      slack_user_id: messageData.user,
    });

    // Store message
    const message = await SlackMessage.create({
      tenant_id: tenantId,
      workspace_id: workspaceId,
      channel_id: channelId,
      slack_message_id: messageData.ts,
      user_id: slackUser?.linked_user_id || 'anonymous',
      thread_ts: messageData.thread_ts,
      parent_ts: messageData.thread_ts,
      content: messageData.text,
      attachments: messageData.attachments,
      has_files: !!(messageData.files && messageData.files.length > 0),
      file_count: messageData.files?.length || 0,
      reactions: messageData.reactions?.map((r: any) => ({ name: r.name, count: r.count, users: r.users })),
      reply_count: 0,
      direction: 'incoming',
      timestamp: new Date(parseFloat(messageData.ts) * 1000),
    });

    // Update session
    if (slackUser?.linked_user_id) {
      await SlackSession.findOneAndUpdate(
        { tenant_id: tenantId, user_id: slackUser.linked_user_id },
        { last_activity: new Date(), $inc: { message_count: 1 } }
      );

      // Update user last interaction
      slackUser.last_interaction = new Date();
      await slackUser.save();
    }

    // Handle thread context
    if (messageData.thread_ts) {
      await this.updateThreadContext(tenantId, workspaceId, channelId, messageData.thread_ts, messageData.user);
    }

    // Store as memory if linked
    if (slackUser?.linked_user_id && messageData.text) {
      await this.storeAsMemory(slackUser.linked_user_id, messageData.text, `Slack message in ${channelId}`);
    }

    logger.info('message_processed', { tenantId, workspaceId, channelId, messageTs: messageData.ts });
    return message;
  }

  private async updateThreadContext(
    tenantId: string,
    workspaceId: string,
    channelId: string,
    threadTs: string,
    participantId: string
  ): Promise<void> {
    await SlackThreadContext.findOneAndUpdate(
      { tenant_id: tenantId, workspace_id: workspaceId, thread_ts: threadTs },
      {
        tenant_id: tenantId,
        workspace_id: workspaceId,
        channel_id: channelId,
        thread_ts: threadTs,
        parent_message_id: threadTs,
        $addToSet: { participant_ids: participantId },
        $inc: { message_count: 1 },
        last_activity: new Date(),
      },
      { upsert: true, new: true }
    );
  }

  private async storeAsMemory(userId: string, content: string, context: string): Promise<void> {
    try {
      // TODO: Call GENIE memory service
      logger.info('storing_slack_as_memory', { userId, contentLength: content.length, context });
    } catch (error) {
      logger.error('store_memory_failed', { userId, error: error instanceof Error ? error.message : 'Unknown' });
    }
  }

  // ============================================================================
  // Send Message
  // ============================================================================

  async sendMessage(
    tenantId: string,
    workspaceId: string,
    channel: string,
    text: string,
    options?: { threadTs?: string; username?: string; iconEmoji?: string }
  ): Promise<{ success: boolean; ts?: string }> {
    const workspace = await SlackWorkspace.findOne({ tenant_id: tenantId, workspace_id: workspaceId });
    if (!workspace?.bot_access_token) {
      return { success: false };
    }

    const client = this.getClient(tenantId, workspaceId);
    if (!client) return { success: false };

    const result = await client.sendMessage(channel, text, {
      thread_ts: options?.threadTs,
      username: options?.username || 'Genie',
      icon_emoji: options?.iconEmoji || ':genie:',
    });

    if (result.ok && result.ts) {
      // Store outgoing message
      await SlackMessage.create({
        tenant_id: tenantId,
        workspace_id: workspaceId,
        channel_id: channel,
        slack_message_id: result.ts,
        user_id: workspace.linked_user_id || 'bot',
        thread_ts: options?.threadTs,
        content: text,
        has_files: false,
        file_count: 0,
        direction: 'outgoing',
        timestamp: new Date(),
      });
    }

    return { success: result.ok, ts: result.ts };
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  async getConversationHistory(
    tenantId: string,
    workspaceId: string,
    channelId: string,
    options?: { limit?: number; before?: string }
  ): Promise<ISlackMessage[]> {
    const query: Record<string, unknown> = {
      tenant_id: tenantId,
      workspace_id: workspaceId,
      channel_id: channelId,
    };

    if (options?.before) {
      const beforeDate = new Date(parseFloat(options.before) * 1000);
      query.timestamp = { $lt: beforeDate };
    }

    return SlackMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(options?.limit || 50);
  }

  async searchMessages(tenantId: string, workspaceId: string, query: string, limit: number = 50): Promise<ISlackMessage[]> {
    return SlackMessage.find({
      tenant_id: tenantId,
      workspace_id: workspaceId,
      content: { $regex: query, $options: 'i' },
    })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  async getUserStats(tenantId: string, userId: string): Promise<{
    totalMessages: number;
    totalChannels: number;
    linkedAt?: Date;
  }> {
    const sessions = await SlackSession.find({ tenant_id: tenantId, user_id: userId });
    const messageCount = await SlackMessage.countDocuments({ tenant_id: tenantId, user_id: userId });
    const linkage = await SlackLinkage.findOne({ tenant_id: tenantId, user_id: userId, is_active: true });

    return {
      totalMessages: messageCount,
      totalChannels: sessions.length,
      linkedAt: linkage?.created_at,
    };
  }

  async getUserChannels(tenantId: string, workspaceId: string, userId: string): Promise<ISlackChannel[]> {
    // Get channels user has messages in
    const channelIds = await SlackMessage.distinct('channel_id', {
      tenant_id: tenantId,
      workspace_id: workspaceId,
      user_id: userId,
    });

    return SlackChannel.find({
      tenant_id: tenantId,
      workspace_id: workspaceId,
      slack_channel_id: { $in: channelIds },
    });
  }

  // ============================================================================
  // Client Management
  // ============================================================================

  private getClient(tenantId: string, workspaceId: string): SlackAPIClient | undefined {
    const key = `${tenantId}:${workspaceId}`;
    return this.clients.get(key);
  }

  async initializeClient(tenantId: string, workspaceId: string, botToken: string): Promise<void> {
    const client = createSlackClient(botToken, workspaceId);
    const authTest = await client.authTest();
    if (authTest.ok) {
      this.clients.set(`${tenantId}:${workspaceId}`, client);
    }
  }
}

// Singleton
let instance: GenieSlackService | null = null;

export function getGenieSlackService(): GenieSlackService {
  if (!instance) {
    instance = new GenieSlackService();
  }
  return instance;
}
