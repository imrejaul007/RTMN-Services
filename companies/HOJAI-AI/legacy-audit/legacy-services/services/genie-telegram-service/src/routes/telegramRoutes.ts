/**
 * GENIE Telegram Service - Routes
 */
import { Router, Request, Response, NextFunction } from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as telegramService from '../services/telegramService.js';

const router = Router();
router.use(tenantMiddleware());
const resp = (s: boolean, d?: any) => ({ success: s, data: d, meta: { timestamp: new Date().toISOString() } });
const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/chats', asyncHandler(async (req, res) => {
  res.json(resp(true, { chats: await telegramService.getChats(req.userId!) })));
});
router.post('/chats', asyncHandler(async (req, res) => {
  const chat = await telegramService.createChat(req.userId!, req.body);
  res.status(201).json(resp(true, chat));
}));
router.get('/chats/:id', asyncHandler(async (req, res) => {
  const chat = await telegramService.getChat(req.params.id, req.userId!);
  if (!chat) { res.status(404).json(resp(false, undefined)); return; }
  res.json(resp(true, chat));
}));
router.post('/chats/:id/messages', asyncHandler(async (req, res) => {
  const msg = await telegramService.sendMessage(req.params.id, req.userId!, req.body.text);
  res.status(201).json(resp(true, msg));
}));
router.get('/chats/:id/messages', asyncHandler(async (req, res) => {
  const msgs = await telegramService.getMessages(req.params.id, req.userId!);
  res.json(resp(true, { messages: msgs }));
}));
export default router;
