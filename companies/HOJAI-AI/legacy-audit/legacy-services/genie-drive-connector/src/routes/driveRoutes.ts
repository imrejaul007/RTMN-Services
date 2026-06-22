/**
 * GENIE Drive Connector - Routes
 */
import { Router, Request, Response } from 'express';
import { getDriveConnectorService } from '../services/driveConnectorService.js';
import { getGoogleDriveService } from '../services/googleDriveService.js';
import { tenantMiddleware } from '../middleware/tenant.js';

const router = Router();
const service = getDriveConnectorService();
const driveService = getGoogleDriveService();

function resp(success: boolean, data?: any, error?: { code: string; message: string }) {
  return { success, ...(data && { data }), ...(error && { error }), meta: { timestamp: new Date().toISOString() } };
}
const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: any) => Promise.resolve(fn(req, res)).catch(next);

router.use(tenantMiddleware());

router.get('/oauth/url', (req: Request, res: Response) => {
  res.json(resp(true, { auth_url: driveService.getAuthUrl() }));
});

router.post('/oauth/callback', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const { code, email } = req.body;
  const tokens = await driveService.getTokenFromCode(code);
  await service.connect(tenant_id!, user_id!, email, tokens.access_token, tokens.refresh_token, tokens.expiry_date);
  res.json(resp(true, { connected: true }));
}));

router.get('/connection', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const connection = await service.getConnection(tenant_id!, user_id!);
  res.json(resp(true, connection ? { connected: true, email: connection.email, last_sync: connection.last_sync } : { connected: false }));
}));

router.post('/sync', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const result = await service.sync(tenant_id!, user_id!);
  res.json(resp(true, result));
}));

router.delete('/disconnect', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  await service.disconnect(tenant_id!, user_id!);
  res.json(resp(true, { disconnected: true }));
}));

router.get('/documents', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const type = req.query.type as string;
  const docs = await service.getDocuments(tenant_id!, user_id!, type);
  res.json(resp(true, docs));
}));

router.get('/documents/search', asyncHandler(async (req: Request, res: Response) => {
  const { tenant_id, user_id } = req.tenantContext || {};
  const docs = await service.searchDocuments(tenant_id!, user_id!, req.query.q as string);
  res.json(resp(true, docs));
}));

export default router;
