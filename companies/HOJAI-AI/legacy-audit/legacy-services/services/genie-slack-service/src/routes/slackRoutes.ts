/**
 * GENIE Slack Service - Routes
 */
import { Router, Request, Response, NextFunction } from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as slackService from '../services/slackService.js';

const router = Router();
router.use(tenantMiddleware());

const resp = (success: boolean, data?: any) => ({ success, data, meta: { timestamp: new Date().toISOString() } });
const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/channels', asyncHandler(async (req, res) => {
  res.json(resp(true, { channels: await slackService.getChannels(req.userId!) }));
});

router.post('/channels', asyncHandler(async (req, res) => {
  const channel = await slackService.createChannel(req.userId!, req.body);
  res.status(201).json(resp(true, channel));
}));

router.get('/channels/:id', asyncHandler(async (req, res) => {
  const channel = await slackService.getChannel(req.params.id, req.userId!);
  if (!channel) { res.status(404).json(resp(false, undefined)); return; }
  res.json(resp(true, channel));
}));

router.get('/channels/:id/messages', asyncHandler(async (req, res) => {
  const messages = await slackService.getMessages(req.params.id, req.userId!, parseInt(req.query.limit as string) || 50);
  res.json(resp(true, { messages }));
}));

router.post('/channels/:id/messages', asyncHandler(async (req, res) => {
  const message = await slackService.sendMessage(req.params.id, req.userId!, req.body.text);
  res.status(201).json(resp(true, message));
}));

router.get('/search', asyncHandler(async (req, res) => {
  const messages = await slackService.searchMessages(req.userId!, req.query.q as string);
  res.json(resp(true, { messages }));
}));

export default router;
