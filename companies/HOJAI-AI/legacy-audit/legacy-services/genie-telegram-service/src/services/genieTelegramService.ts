/**
 * GENIE Telegram Service - Genie Integration Service
 * Version: 1.0.0 | Date: June 1, 2026
 * Purpose: Connects Telegram to GENIE Personal Intelligence OS
 */

import { v4 as uuidv4 } from 'uuid';
import {
  TelegramUser,
  TelegramChat,
  TelegramMessage,
  TelegramSession,
  TelegramLinkage,
  TelegramConversationContext,
  ITelegramUser,
  ITelegramChat,
  ITelegramMessage,
  ITelegramSession,
  ITelegramLinkage,
  ITelegramConversationContext,
} from '../models/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('genie-telegram-service');

/**
 * Configuration for Genie integration
 */
interface GenieConfig {
  memoryServiceUrl: string;
  relationshipServiceUrl: string;
  briefingServiceUrl: string;
  authServiceUrl: string;
}

/**
 * Default Genie service URLs (can be overridden via environment)
 */
const DEFAULT_GENIE_CONFIG: GenieConfig = {
  memoryServiceUrl: process.env.GENIE_MEMORY_SERVICE_URL || 'http://localhost:4703',
  relationshipServiceUrl: process.env.GENIE_RELATIONSHIP_SERVICE_URL || 'http://localhost:4702',
  briefingServiceUrl: process.env.GENIE_BRIEFING_SERVICE_URL || 'http://localhost:4704',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4002',
};

/**
 * Memory entry from Telegram message
 */
interface MemoryEntry {
  content: string;
  category: 'conversation' | 'fact' | 'preference' | 'social';
  source: 'telegram';
  importance: 'high' | 'medium' | 'low';
  context?: string;
  tags?: string[];
}

/**
 * Genie Telegram Service
 */
export class GenieTelegramService {
  private config: GenieConfig;

  constructor(config: Partial<GenieConfig> = {}) {
    this.config = { ...DEFAULT_GENIE_CONFIG, ...config };
  }

  /**
   * Generate a verification code for linking
   */
  async generateVerificationCode(tenantId: string, userId: string): Promise<string> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await TelegramLinkage.findOneAndUpdate(
      { tenant_id: tenantId, user_id: userId },
      {
        tenant_id: tenantId,
        user_id: userId,
        verification_code: code,
        expires_at: expiresAt,
        is_active: false,
      },
      { upsert: true, new: true }
    );

    logger.info('verification_code_generated', { tenantId, userId });
    return code;
  }

  /**
   * Verify Telegram user with code
   */
  async verifyTelegramUser(
    tenantId: string,
    telegramUserId: string,
    verificationCode: string
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    const linkage = await TelegramLinkage.findOne({
      tenant_id: tenantId,
      telegram_user_id: telegramUserId,
      verification_code: verificationCode,
    });

    if (!linkage) {
      return { success: false, message: 'Invalid verification code' };
    }

    if (new Date() > linkage.expires_at) {
      return { success: false, message: 'Verification code expired' };
    }

    // Update linkage as verified
    linkage.verified_at = new Date();
    linkage.is_active = true;
    linkage.verification_code = undefined;
    await linkage.save();

    logger.info('telegram_user_verified', { tenantId, telegramUserId });
    return {
      success: true,
      message: 'Telegram account linked successfully',
      userId: linkage.user_id,
    };
  }

  /**
   * Link Telegram user to REZ user
   */
  async linkTelegramUser(
    tenantId: string,
    userId: string,
    telegramUserId: string,
    telegramChatId: string
  ): Promise<{ success: boolean; message: string }> {
    // Check if already linked
    const existing = await TelegramLinkage.findOne({
      tenant_id: tenantId,
      telegram_user_id: telegramUserId,
      is_active: true,
    });

    if (existing && existing.user_id !== userId) {
      return { success: false, message: 'Telegram account already linked to another user' };
    }

    // Update or create linkage
    await TelegramLinkage.findOneAndUpdate(
      { tenant_id: tenantId, user_id: userId },
      {
        tenant_id: tenantId,
        user_id: userId,
        telegram_user_id: telegramUserId,
        telegram_chat_id: telegramChatId,
        verified_at: new Date(),
        is_active: true,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
      { upsert: true, new: true }
    );

    // Update or create user
    await TelegramUser.findOneAndUpdate(
      { tenant_id: tenantId, telegram_user_id: telegramUserId },
      {
        tenant_id: tenantId,
        telegram_user_id: telegramUserId,
        linked_user_id: userId,
        linked_at: new Date(),
        status: 'active',
      },
      { upsert: true, new: true }
    );

    // Create session
    await TelegramSession.findOneAndUpdate(
      { tenant_id: tenantId, user_id: userId, telegram_chat_id: telegramChatId },
      {
        tenant_id: tenantId,
        user_id: userId,
        telegram_chat_id: telegramChatId,
        started_at: new Date(),
        last_activity: new Date(),
        is_active: true,
      },
      { upsert: true, new: true }
    );

    // Create or update conversation context
    await TelegramConversationContext.findOneAndUpdate(
      { tenant_id: tenantId, user_id: userId, chat_id: telegramChatId },
      {
        tenant_id: tenantId,
        user_id: userId,
        chat_id: telegramChatId,
        conversation_turns: 0,
      },
      { upsert: true, new: true }
    );

    logger.info('telegram_linked', { tenantId, userId, telegramUserId });
    return { success: true, message: 'Telegram account linked successfully' };
  }

  /**
   * Unlink Telegram user
   */
  async unlinkTelegramUser(
    tenantId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    await TelegramLinkage.deleteOne({ tenant_id: tenantId, user_id: userId });
    await TelegramUser.updateOne(
      { tenant_id: tenantId, linked_user_id: userId },
      { status: 'inactive', linked_user_id: undefined }
    );
    await TelegramSession.deleteMany({ tenant_id: tenantId, user_id: userId });

    logger.info('telegram_unlinked', { tenantId, userId });
    return { success: true, message: 'Telegram account unlinked successfully' };
  }

  /**
   * Process incoming Telegram message and store it
   */
  async processIncomingMessage(
    tenantId: string,
    telegramUserId: string,
    telegramChatId: string,
    messageId: string,
    content: string,
    timestamp: Date,
    metadata?: {
      hasMedia?: boolean;
      mediaType?: string;
      entities?: Array<{ type: string; offset: number; length: number }>;
      replyToMessageId?: string;
      forwardedFrom?: { chatId: string; messageId: string };
    }
  ): Promise<ITelegramMessage> {
    // Get or create chat
    let chat = await TelegramChat.findOne({
      tenant_id: tenantId,
      telegram_chat_id: telegramChatId,
    });

    if (!chat) {
      chat = await TelegramChat.create({
        tenant_id: tenantId,
        telegram_chat_id: telegramChatId,
        type: 'private',
        is_active: true,
      });
    }

    // Get user
    const user = await TelegramUser.findOne({
      tenant_id: tenantId,
      telegram_user_id: telegramUserId,
    });

    // Store message
    const message = await TelegramMessage.create({
      tenant_id: tenantId,
      user_id: user?.linked_user_id || 'anonymous',
      telegram_message_id: messageId,
      chat_id: telegramChatId,
      chat_type: chat.type,
      direction: 'incoming',
      content,
      entities: metadata?.entities,
      has_media: metadata?.hasMedia || false,
      media_type: metadata?.mediaType as ITelegramMessage['media_type'],
      reply_to_message_id: metadata?.replyToMessageId,
      forwarded_from_chat_id: metadata?.forwardedFrom?.chatId,
      forwarded_from_message_id: metadata?.forwardedFrom?.messageId,
      timestamp,
    });

    // Update session
    await TelegramSession.findOneAndUpdate(
      { tenant_id: tenantId, user_id: user?.linked_user_id || 'anonymous', telegram_chat_id: telegramChatId },
      {
        last_activity: new Date(),
        $inc: { message_count: 1 },
      }
    );

    // Update conversation context
    await TelegramConversationContext.findOneAndUpdate(
      {
        tenant_id: tenantId,
        user_id: user?.linked_user_id || 'anonymous',
        chat_id: telegramChatId,
      },
      {
        $inc: { conversation_turns: 1 },
        last_bot_message_id: undefined,
      }
    );

    // Update user last interaction
    if (user) {
      user.last_interaction = new Date();
      await user.save();
    }

    logger.info('message_processed', {
      tenantId,
      telegramUserId,
      messageId,
      hasMedia: metadata?.hasMedia,
    });

    return message;
  }

  /**
   * Store outgoing bot message
   */
  async processOutgoingMessage(
    tenantId: string,
    userId: string,
    telegramChatId: string,
    messageId: string,
    content: string,
    timestamp: Date
  ): Promise<ITelegramMessage> {
    const message = await TelegramMessage.create({
      tenant_id: tenantId,
      user_id: userId,
      telegram_message_id: messageId,
      chat_id: telegramChatId,
      chat_type: 'private',
      direction: 'outgoing',
      content,
      has_media: false,
      timestamp,
    });

    // Update conversation context with bot message ID
    await TelegramConversationContext.findOneAndUpdate(
      { tenant_id: tenantId, user_id: userId, chat_id: telegramChatId },
      { last_bot_message_id: messageId }
    );

    return message;
  }

  /**
   * Store conversation memory to GENIE memory service
   */
  async storeConversationMemory(
    userId: string,
    telegramUserId: string,
    messageContent: string,
    context?: string
  ): Promise<void> {
    try {
      const memoryEntry: MemoryEntry = {
        content: messageContent,
        category: 'conversation',
        source: 'telegram',
        importance: 'medium',
        context: context || 'Telegram conversation',
        tags: ['telegram', 'conversation'],
      };

      // Call GENIE memory service
      // Note: In production, use proper HTTP client with retry logic
      logger.info('storing_memory', { userId, contentLength: messageContent.length });

      // TODO: Implement actual HTTP call to genie-memory-service
      // const response = await fetch(`${this.config.memoryServiceUrl}/api/memories`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
      //   body: JSON.stringify(memoryEntry),
      // });
    } catch (error) {
      logger.error('store_memory_failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    tenantId: string,
    userId: string,
    telegramChatId: string,
    limit: number = 50,
    beforeMessageId?: string
  ): Promise<ITelegramMessage[]> {
    const query: Record<string, unknown> = {
      tenant_id: tenantId,
      user_id: userId,
      chat_id: telegramChatId,
    };

    if (beforeMessageId) {
      const beforeMsg = await TelegramMessage.findOne({
        tenant_id: tenantId,
        telegram_message_id: beforeMessageId,
      });
      if (beforeMsg) {
        query.timestamp = { $lt: beforeMsg.timestamp };
      }
    }

    const messages = await TelegramMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(limit);

    return messages.reverse();
  }

  /**
   * Get user by Telegram ID
   */
  async getUserByTelegramId(
    tenantId: string,
    telegramUserId: string
  ): Promise<ITelegramUser | null> {
    return TelegramUser.findOne({
      tenant_id: tenantId,
      telegram_user_id: telegramUserId,
    });
  }

  /**
   * Get linked user ID from Telegram user
   */
  async getLinkedUserId(
    tenantId: string,
    telegramUserId: string
  ): Promise<string | null> {
    const linkage = await TelegramLinkage.findOne({
      tenant_id: tenantId,
      telegram_user_id: telegramUserId,
      is_active: true,
    });

    return linkage?.user_id || null;
  }

  /**
   * Get user's active Telegram sessions
   */
  async getUserSessions(
    tenantId: string,
    userId: string
  ): Promise<ITelegramSession[]> {
    return TelegramSession.find({
      tenant_id: tenantId,
      user_id: userId,
      is_active: true,
    });
  }

  /**
   * Get conversation context for a user/chat
   */
  async getConversationContext(
    tenantId: string,
    userId: string,
    telegramChatId: string
  ): Promise<ITelegramConversationContext | null> {
    return TelegramConversationContext.findOne({
      tenant_id: tenantId,
      user_id: userId,
      chat_id: telegramChatId,
    });
  }

  /**
   * Update conversation topics
   */
  async updateConversationTopics(
    tenantId: string,
    userId: string,
    telegramChatId: string,
    topics: string[]
  ): Promise<void> {
    await TelegramConversationContext.findOneAndUpdate(
      { tenant_id: tenantId, user_id: userId, chat_id: telegramChatId },
      { recent_topics: topics }
    );
  }

  /**
   * Get user statistics
   */
  async getUserStats(
    tenantId: string,
    userId: string
  ): Promise<{
    totalMessages: number;
    totalChats: number;
    activeChats: number;
    linkedAt?: Date;
  }> {
    const sessions = await TelegramSession.find({
      tenant_id: tenantId,
      user_id: userId,
    });

    const linkage = await TelegramLinkage.findOne({
      tenant_id: tenantId,
      user_id: userId,
      is_active: true,
    });

    const messageCount = await TelegramMessage.countDocuments({
      tenant_id: tenantId,
      user_id: userId,
    });

    return {
      totalMessages: messageCount,
      totalChats: sessions.length,
      activeChats: sessions.filter((s) => s.is_active).length,
      linkedAt: linkage?.created_at,
    };
  }

  /**
   * Search messages
   */
  async searchMessages(
    tenantId: string,
    userId: string,
    query: string,
    limit: number = 50
  ): Promise<ITelegramMessage[]> {
    return TelegramMessage.find({
      tenant_id: tenantId,
      user_id: userId,
      content: { $regex: query, $options: 'i' },
    })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Clear conversation history
   */
  async clearHistory(
    tenantId: string,
    userId: string,
    telegramChatId: string
  ): Promise<{ deletedCount: number }> {
    const result = await TelegramMessage.deleteMany({
      tenant_id: tenantId,
      user_id: userId,
      chat_id: telegramChatId,
      direction: 'incoming',
    });

    // Reset conversation context
    await TelegramConversationContext.findOneAndUpdate(
      { tenant_id: tenantId, user_id: userId, chat_id: telegramChatId },
      {
        conversation_turns: 0,
        recent_topics: [],
        pending_actions: [],
      }
    );

    logger.info('history_cleared', { tenantId, userId, telegramChatId });
    return { deletedCount: result.deletedCount || 0 };
  }
}

// Singleton instance
let instance: GenieTelegramService | null = null;

export function getGenieTelegramService(config?: Partial<GenieConfig>): GenieTelegramService {
  if (!instance) {
    instance = new GenieTelegramService(config);
  }
  return instance;
}
