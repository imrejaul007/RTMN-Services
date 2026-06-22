/**
 * GENIE Email Service - Routes
 * Version: 1.0.0 | Date: June 13, 2026
 */

import { Router, Request, Response, NextFunction } from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as emailService from '../services/emailService.js';

const router = Router();
router.use(tenantMiddleware());

function createResponse(success: boolean, data?: unknown, error?: { code: string; message: string }) {
  return { success, ...(data !== undefined && { data }), ...(error && { error }), meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` } };
}

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/emails - List emails
router.get('/emails', asyncHandler(async (req, res) => {
  const result = await emailService.listEmails(req.userId!, {
    page: parseInt(req.query.page as string) || 1,
    pageSize: parseInt(req.query.pageSize as string) || 20,
    folder: req.query.folder as string,
    unread_only: req.query.unread_only === 'true',
    starred_only: req.query.starred_only === 'true',
    label: req.query.label as string,
    search: req.query.search as string,
  });
  res.json(createResponse(true, result));
}));

// POST /api/emails - Create/Send email
router.post('/emails', asyncHandler(async (req, res) => {
  const email = await emailService.createEmail(req.userId!, req.body);
  res.status(201).json(createResponse(true, email));
}));

// GET /api/emails/unread-count - Get unread count
router.get('/emails/unread-count', asyncHandler(async (req, res) => {
  const count = await emailService.getUnreadCount(req.userId!);
  res.json(createResponse(true, { unread_count: count }));
}));

// POST /api/emails/mark-all-read - Mark all as read
router.post('/emails/mark-all-read', asyncHandler(async (req, res) => {
  const count = await emailService.markAllAsRead(req.userId!);
  res.json(createResponse(true, { marked_count: count }));
}));

// GET /api/emails/:id - Get email
router.get('/emails/:id', asyncHandler(async (req, res) => {
  const email = await emailService.getEmail(req.params.id, req.userId!);
  if (!email) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Email not found' }));
    return;
  }
  res.json(createResponse(true, email));
}));

// PATCH /api/emails/:id - Update email
router.patch('/emails/:id', asyncHandler(async (req, res) => {
  const email = await emailService.updateEmail(req.params.id, req.userId!, req.body);
  if (!email) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Email not found' }));
    return;
  }
  res.json(createResponse(true, email));
}));

// DELETE /api/emails/:id - Delete email
router.delete('/emails/:id', asyncHandler(async (req, res) => {
  const deleted = await emailService.deleteEmail(req.params.id, req.userId!);
  if (!deleted) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Email not found' }));
    return;
  }
  res.json(createResponse(true, { deleted: true }));
}));

// GET /api/emails/search - Search emails
router.get('/emails/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Search query required' }));
    return;
  }
  const emails = await emailService.searchEmails(req.userId!, q as string);
  res.json(createResponse(true, { emails, count: emails.length }));
}));

// GET /api/threads - List email threads
router.get('/threads', asyncHandler(async (req, res) => {
  const result = await emailService.getThreads(
    req.userId!,
    parseInt(req.query.page as string) || 1,
    parseInt(req.query.pageSize as string) || 20
  );
  res.json(createResponse(true, result));
}));

// GET /api/labels - Get labels
router.get('/labels', asyncHandler(async (req, res) => {
  const labels = await emailService.getLabels(req.userId!);
  res.json(createResponse(true, { labels }));
}));

export default router;
