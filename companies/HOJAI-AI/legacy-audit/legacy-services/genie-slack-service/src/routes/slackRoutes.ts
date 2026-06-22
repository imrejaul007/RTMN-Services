/**
 * GENIE Slack Service - API Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getGenieSlackService } from '../services/genieSlackService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createLogger } from '../utils/logger.js';
import { SlackOAuthSchema, SendMessageSchema } from '../types.js';

const logger = createLogger('slack-routes');
const router = Router();
const slackService = getGenieSlackService();

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createResponse<T>(success: boolean, data?: T, error?: { code: string; message: string }) {
  return { success, ...(data !== undefined && { data }), ...(error && { error }), meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() } };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => { Promise.resolve(fn(req, res, next)).catch(next); };
}

router.use(tenantMiddleware());

// ============================================================================
// OAuth & Workspace
// ============================================================================

router.post('/oauth', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const { code, redirect_uri } = req.body;

  // Exchange code for tokens
  const clientId = process.env.SLACK_CLIENT_ID!;
  const clientSecret = process.env.SLACK_CLIENT_SECRET!;
  const { SlackAPIClient } = await import('../services/slackService.js');

  const oauthResult = await SlackAPIClient.oauthAccess(clientId, clientSecret, code, redirect_uri);
  if (!oauthResult.ok) {
    res.status(400).json(createResponse(false, undefined, { code: 'OAUTH_FAILED', message: oauthResult.error || 'OAuth failed' }));
    return;
  }

  // Create workspace
  const workspace = await slackService.createWorkspace(
    tenantId,
    oauthResult.team!.id,
    oauthResult.team!.name,
    oauthResult.team!.domain,
    oauthResult.access_token
  );

  res.json(createResponse(true, { workspace, access_token: oauthResult.access_token }));
}));

router.get('/workspaces', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;

  const workspaces = await slackService.getUserWorkspaces(tenantId, userId);
  res.json(createResponse(true, workspaces));
}));

router.post('/workspaces/:workspaceId/sync', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const { workspaceId } = req.params;

  const result = await slackService.syncWorkspace(tenantId, workspaceId);
  res.json(createResponse(true, result));
}));

// ============================================================================
// Linking
// ============================================================================

router.post('/link', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { workspace_id } = req.body;

  if (!workspace_id) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'workspace_id required' }));
    return;
  }

  const code = await slackService.generateVerificationCode(tenantId, userId, workspace_id);
  res.json(createResponse(true, { verification_code: code, expires_in: '10 minutes' }));
}));

router.post('/unlink', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;

  const result = await slackService.unlinkUser(tenantId, userId);
  res.json(createResponse(true, result));
}));

// ============================================================================
// Messages
// ============================================================================

router.get('/channels/:workspaceId/:channelId/history', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const { workspaceId, channelId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before as string;

  const messages = await slackService.getConversationHistory(tenantId, workspaceId, channelId, { limit, before });
  res.json(createResponse(true, messages.reverse()));
}));

router.post('/send', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const { workspace_id, channel, text, thread_ts } = req.body;

  const parseResult = SendMessageSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'Invalid request' }));
    return;
  }

  const result = await slackService.sendMessage(tenantId, workspace_id, channel, text, { threadTs: thread_ts });
  res.json(createResponse(true, result));
}));

router.post('/search', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;
  const { workspace_id, query, limit } = req.body;

  const messages = await slackService.searchMessages(tenantId, workspace_id, query, limit || 50);
  res.json(createResponse(true, messages));
}));

// ============================================================================
// Webhook (Slack Events)
// ============================================================================

router.post('/webhook/:workspaceId', asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const tenantId = req.tenantContext?.tenant_id || 'default';

  // URL verification challenge
  if (req.body.type === 'url_verification') {
    res.json({ challenge: req.body.challenge });
    return;
  }

  // Handle event
  const event = req.body.event;
  if (event) {
    if (event.type === 'message' && !event.subtype) {
      await slackService.processIncomingMessage(tenantId, workspaceId, event.channel, {
        user: event.user,
        text: event.text,
        ts: event.ts,
        thread_ts: event.thread_ts,
        files: event.files,
        attachments: event.attachments,
      });
    }
  }

  res.json({ ok: true });
}));

// ============================================================================
// Stats
// ============================================================================

router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const userId = req.userId!;

  const stats = await slackService.getUserStats(tenantId, userId);
  res.json(createResponse(true, stats));
}));

export default router;
