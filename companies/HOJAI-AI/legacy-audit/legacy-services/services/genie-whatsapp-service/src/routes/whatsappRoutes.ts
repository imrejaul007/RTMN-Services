/**
 * GENIE WhatsApp Service - Routes
 * Version: 1.0.0 | Date: June 13, 2026
 */

import { Router, Request, Response, NextFunction } from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as whatsappService from '../services/whatsappService.js';

const router = Router();
router.use(tenantMiddleware());

function createResponse(success: boolean, data?: unknown, error?: { code: string; message: string }) {
  return { success, ...(data !== undefined && { data }), ...(error && { error }), meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` } };
}

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/chats - List chats
router.get('/chats', asyncHandler(async (req, res) => {
  const chats = await whatsappService.getChats(req.userId!);
  res.json(createResponse(true, { chats }));
}));

// POST /api/chats - Create chat
router.post('/chats', asyncHandler(async (req, res) => {
  const chat = await whatsappService.createChat(req.userId!, req.body);
  res.status(201).json(createResponse(true, chat));
}));

// GET /api/chats/:id - Get chat
router.get('/chats/:id', asyncHandler(async (req, res) => {
  const chat = await whatsappService.getChat(req.params.id, req.userId!);
  if (!chat) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Chat not found' }));
    return;
  }
  res.json(createResponse(true, chat));
}));

// DELETE /api/chats/:id - Delete chat
router.delete('/chats/:id', asyncHandler(async (req, res) => {
  const deleted = await whatsappService.deleteChat(req.params.id, req.userId!);
  if (!deleted) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Chat not found' }));
    return;
  }
  res.json(createResponse(true, { deleted: true }));
}));

// POST /api/chats/:id/read - Mark as read
router.post('/chats/:id/read', asyncHandler(async (req, res) => {
  const marked = await whatsappService.markAsRead(req.params.id, req.userId!);
  if (!marked) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Chat not found' }));
    return;
  }
  res.json(createResponse(true, { marked: true }));
}));

// POST /api/chats/:id/messages - Send message
router.post('/chats/:id/messages', asyncHandler(async (req, res) => {
  const message = await whatsappService.sendMessage(req.params.id, req.userId!, req.body);
  res.status(201).json(createResponse(true, message));
}));

// GET /api/chats/:id/messages - Get messages
router.get('/chats/:id/messages', asyncHandler(async (req, res) => {
  const result = await whatsappService.getMessages(req.params.id, req.userId!, {
    page: parseInt(req.query.page as string) || 1,
    pageSize: parseInt(req.query.pageSize as string) || 50,
    before: req.query.before as string,
  });
  res.json(createResponse(true, result));
}));

// GET /api/statuses - Get statuses
router.get('/statuses', asyncHandler(async (req, res) => {
  const statuses = await whatsappService.getStatuses(req.userId!);
  res.json(createResponse(true, { statuses }));
}));

// POST /api/statuses - Post status
router.post('/statuses', asyncHandler(async (req, res) => {
  const status = await whatsappService.postStatus(req.userId!, req.body);
  res.status(201).json(createResponse(true, status));
}));

export default router;
