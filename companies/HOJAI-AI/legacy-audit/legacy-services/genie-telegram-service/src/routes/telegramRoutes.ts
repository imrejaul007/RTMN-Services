/**
 * GENIE Telegram Service - API Routes
 * Version: 1.0.0 | Date: June 1, 2026
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { getGenieTelegramService } from '../services/genieTelegramService.js';

const logger = createLogger('telegram-routes');
const router = Router();

// Get service instance
const genieService = getGenieTelegramService();

// ============================================================================
// Helper Functions
// ============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createResponse<T>(success: boolean, data?: T, error?: { code: string; message: string; details?: Record<string, unknown> }, meta?: Record<string, unknown>) {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      ...meta,
    },
  };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// Zod Schemas
// ============================================================================

const SendMessageSchema = z.object({
  user_id: z.string().optional(),
  chat_id: z.string().optional(),
  content: z.string().min(1).max(4096),
  parse_mode: z.enum(['Markdown', 'HTML']).optional(),
  reply_to_message_id: z.string().optional(),
  disable_web_page_preview: z.boolean().default(false),
  disable_notification: z.boolean().default(false),
});

const SyncMessagesSchema = z.object({
  user_id: z.string().min(1),
  telegram_chat_id: z.string().min(1),
  limit: z.coerce.number().min(1).max(100).default(100),
});

const SearchMessagesSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================================================
// Middleware
// ============================================================================

router.use(tenantMiddleware());

// ============================================================================
// Webhook Endpoint (no auth - Telegram signs requests)
// ============================================================================

router.post(
  '/webhook/:token',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const update = req.body;

    // Verify webhook token
    if (token !== process.env.WEBHOOK_SECRET_TOKEN) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    logger.info('webhook_received', { updateId: update.update_id });

    // Process update based on type
    if (update.message) {
      // Handle incoming message
      const { id, first_name, last_name, username } = update.message.from || {};
      const { id: chat_id, type, title, username: chat_username } = update.message.chat;

      logger.info('incoming_message', {
        fromId: id,
        fromName: `${first_name} ${last_name || ''}`,
        username,
        chatId: chat_id,
        chatType: type,
      });

      // Process message
      await genieService.processIncomingMessage(
        'default', // Tenant would come from bot config
        String(id),
        String(chat_id),
        String(update.message.message_id),
        update.message.text || update.message.caption || '',
        new Date(update.message.date * 1000),
        {
          hasMedia: !!(update.message.photo || update.message.video || update.message.audio || update.message.document),
          mediaType: update.message.photo ? 'photo' : update.message.video ? 'video' : update.message.audio ? 'audio' : update.message.document ? 'document' : undefined,
          entities: update.message.entities,
          replyToMessageId: update.message.reply_to_message ? String(update.message.reply_to_message.message_id) : undefined,
        }
      );

      // TODO: Forward to AI processing / Genie brain
    }

    if (update.callback_query) {
      // Handle callback query
      const { id, data, from } = update.callback_query;
      logger.info('callback_query', { callbackId: id, data, fromId: from.id });
      // TODO: Process callback
    }

    res.json({ ok: true });
  })
);

// ============================================================================
// GET /api/telegram/stats - Get user statistics
// ============================================================================

router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    logger.info('get_stats', { tenantId, userId });

    const stats = await genieService.getUserStats(tenantId, userId);

    res.json(createResponse(true, stats, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/telegram/sessions - Get active sessions
// ============================================================================

router.get(
  '/sessions',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    logger.info('get_sessions', { tenantId, userId });

    const sessions = await genieService.getUserSessions(tenantId, userId);

    res.json(createResponse(true, sessions, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/telegram/link - Generate verification code
// ============================================================================

router.post(
  '/link',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    logger.info('generate_link_code', { tenantId, userId });

    const code = await genieService.generateVerificationCode(tenantId, userId);

    res.json(createResponse(true, {
      verification_code: code,
      expires_in: '10 minutes',
      instructions: 'Send this code to the GENIE bot on Telegram to link your account',
    }, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/telegram/verify - Verify Telegram linkage
// ============================================================================

router.post(
  '/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;

    const { telegram_user_id, verification_code } = req.body;

    if (!telegram_user_id || !verification_code) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'telegram_user_id and verification_code are required',
        })
      );
      return;
    }

    logger.info('verify_telegram', { tenantId, telegramUserId: telegram_user_id });

    const result = await genieService.verifyTelegramUser(tenantId, telegram_user_id, verification_code);

    if (!result.success) {
      res.status(400).json(createResponse(false, undefined, { code: 'VERIFICATION_FAILED', message: result.message }));
      return;
    }

    res.json(createResponse(true, result, undefined, { tenantId }));
  })
);

// ============================================================================
// DELETE /api/telegram/unlink - Unlink Telegram account
// ============================================================================

router.delete(
  '/unlink',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    logger.info('unlink_telegram', { tenantId, userId });

    const result = await genieService.unlinkTelegramUser(tenantId, userId);

    res.json(createResponse(true, result, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/telegram/history - Get conversation history
// ============================================================================

router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;
    const chatId = req.query.chat_id as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const beforeId = req.query.before_id as string;

    if (!chatId) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'chat_id query parameter is required',
        })
      );
      return;
    }

    logger.info('get_history', { tenantId, userId, chatId, limit });

    const messages = await genieService.getConversationHistory(tenantId, userId, chatId, limit, beforeId);

    res.json(createResponse(true, messages, undefined, { tenantId }));
  })
);

// ============================================================================
// DELETE /api/telegram/history/:chatId - Clear conversation history
// ============================================================================

router.delete(
  '/history/:chatId',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;
    const { chatId } = req.params;

    logger.info('clear_history', { tenantId, userId, chatId });

    const result = await genieService.clearHistory(tenantId, userId, chatId);

    res.json(createResponse(true, result, undefined, { tenantId }));
  })
);

// ============================================================================
// POST /api/telegram/search - Search messages
// ============================================================================

router.post(
  '/search',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    const parseResult = SearchMessagesSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const { query, limit } = parseResult.data;

    logger.info('search_messages', { tenantId, userId, query });

    const messages = await genieService.searchMessages(tenantId, userId, query, limit);

    res.json(createResponse(true, messages, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/telegram/context - Get conversation context
// ============================================================================

router.get(
  '/context',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;
    const chatId = req.query.chat_id as string;

    if (!chatId) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'chat_id query parameter is required',
        })
      );
      return;
    }

    logger.info('get_context', { tenantId, userId, chatId });

    const context = await genieService.getConversationContext(tenantId, userId, chatId);

    if (!context) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'NOT_FOUND',
          message: 'No conversation context found',
        })
      );
      return;
    }

    res.json(createResponse(true, context, undefined, { tenantId }));
  })
);

// ============================================================================
// Internal: Send message to user (called by other services)
// ============================================================================

router.post(
  '/send',
  asyncHandler(async (req: Request, res: Response) => {
    const { user_id, chat_id, content, parse_mode, reply_to_message_id, disable_web_page_preview, disable_notification } = req.body;

    if (!content) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'content is required',
        })
      );
      return;
    }

    // This would integrate with the Telegram Bot API to send the message
    // For now, just acknowledge
    logger.info('send_message_request', { user_id, chat_id, contentLength: content.length });

    res.json(createResponse(true, {
      sent: true,
      message: 'Message queued for delivery',
    }));
  })
);

export default router;
