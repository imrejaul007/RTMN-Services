/**
 * GENIE Discord Service - Routes
 */
import { Router, Request, Response, NextFunction } from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as discordService from '../services/discordService.js';

const router = Router();
router.use(tenantMiddleware());
const resp = (s: boolean, d?: any) => ({ success: s, data: d, meta: { timestamp: new Date().toISOString() } });
const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/servers', asyncHandler(async (req, res) => {
  res.json(resp(true, { servers: await discordService.getServers(req.userId!) })));
}));
router.get('/servers/:id/channels', asyncHandler(async (req, res) => {
  res.json(resp(true, { channels: await discordService.getChannels(req.params.id, req.userId!) })));
}));
router.get('/channels/:id/messages', asyncHandler(async (req, res) => {
  res.json(resp(true, { messages: await discordService.getMessages(req.params.id, req.userId!) })));
}));
router.post('/channels/:id/messages', asyncHandler(async (req, res) => {
  const msg = await discordService.sendMessage(req.params.id, req.userId!, req.body.content);
  res.status(201).json(resp(true, msg));
}));
export default router;
