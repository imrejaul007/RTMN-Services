/**
 * GENIE Discord Service - Routes
 */
import { Router, Request, Response, NextFunction } from 'express';
import { getGenieDiscordService } from '../services/genieDiscordService.js';
import { getDiscordService } from '../services/discordService.js';
import { tenantMiddleware } from '../middleware/tenant.js';

const router = Router();
const genieService = getGenieDiscordService();

function createResponse(success: boolean, data?: any, error?: { code: string; message: string }) {
  return { success, ...(data && { data }), ...(error && { error }), meta: { timestamp: new Date().toISOString() } };
}

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);
}

router.use(tenantMiddleware());

// Webhook (Discord sends events here)
router.post('/webhook/:guildId', asyncHandler(async (req: Request, res: Response) => {
  const { guildId } = req.params;
  const tenantId = req.tenantContext?.tenant_id || 'default';
  const body = req.body;

  if (body.t === 'MESSAGE_CREATE' || (body.d && body.d.content)) {
    const msg = body.d;
    await genieService.processMessage(tenantId, guildId, msg.channel_id, {
      messageId: msg.id, authorId: msg.author?.id || msg.user_id,
      content: msg.content || '', timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
      embeds: msg.embeds, attachments: msg.attachments, threadId: msg.thread_metadata?.thread_id,
    });
  }

  res.json({ ok: true });
}));

// Server management
router.post('/servers/link', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const { guild_id, guild_name } = req.body;
  const server = await genieService.linkServer(tenant_id!, guild_id, guild_name, user_id);
  res.json(createResponse(true, server));
}));

router.post('/servers/:guildId/sync', asyncHandler(async (req: Request, res: Response) => {
  const { guildId } = req.params;
  const { tenant_id } = req.tenantContext || {};
  const result = await genieService.syncServer(tenant_id!, guildId);
  res.json(createResponse(true, result));
}));

// Messages
router.get('/:guildId/:channelId/messages', asyncHandler(async (req: Request, res: Response) => {
  const { guildId, channelId } = req.params;
  const { tenant_id } = req.tenantContext || {};
  const limit = parseInt(req.query.limit as string) || 50;
  const messages = await genieService.getMessages(tenant_id!, guildId, channelId, limit);
  res.json(createResponse(true, messages));
}));

router.post('/:guildId/:channelId/send', asyncHandler(async (req: Request, res: Response) => {
  const { guildId, channelId } = req.params;
  const { tenant_id } = req.tenantContext || {};
  const { content } = req.body;
  const sent = await genieService.sendMessage(tenant_id!, guildId, channelId, content);
  res.json(createResponse(true, { sent }));
}));

router.post('/search', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id } = req.tenantContext || {};
  const { guild_id, query, limit } = req.body;
  const messages = await genieService.searchMessages(tenant_id!, guild_id, query, limit || 50);
  res.json(createResponse(true, messages));
}));

// Stats
router.get('/:guildId/stats', asyncHandler(async (req: Request, res: Response) => {
  const { guildId } = req.params;
  const { tenant_id } = req.tenantContext || {};
  const stats = await genieService.getServerStats(tenant_id!, guildId);
  res.json(createResponse(true, stats));
}));

export default router;
