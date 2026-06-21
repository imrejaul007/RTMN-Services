import { Router, Request, Response } from 'express';
import { SupplierService } from '../services/supplier.service';
import { ReputationService } from '../services/reputation.service';
import { SutarBridgeService } from '../services/sutar-bridge.service';
import { requireAuth, AuthedRequest } from '../middleware/auth.middleware';
import { asyncHandler, HttpError } from '../middleware/error.middleware';

const router = Router();

/**
 * POST /api/suppliers
 *
 * Register a new supplier. Requires strict auth.
 *
 * The flow is:
 *   1. Caller mints a corpId via /api/corpid/issue (strict auth required)
 *   2. Caller registers the supplier profile via THIS endpoint (strict auth)
 *   3. Caller sets the initial password via /api/auth/register (public)
 *
 * The corpId must be provided in the body and must NOT collide with an
 * existing supplier. We do not allow callers to spoof another corpId
 * because the auth middleware binds the JWT/header to a verified identity.
 */
router.post(
  '/',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const corpIdInBody = req.body?.corpId as string | undefined;
    if (!corpIdInBody) {
      throw new HttpError(400, 'corpId is required in body');
    }
    // Authorization: the body corpId must match the caller's authenticated corpId
    // (admin/system callers may register on behalf of others).
    if (req.corpId !== corpIdInBody && req.role !== 'admin' && req.role !== 'system') {
      throw new HttpError(403, 'corpId in body does not match authenticated identity');
    }
    const supplier = await SupplierService.register(req.body);
    const trustScoreId = await SutarBridgeService.linkTrustScore(supplier.corpId, 'supplier');
    if (trustScoreId) {
      supplier.sutarTrustScoreId = trustScoreId;
      await supplier.save();
    }
    await SutarBridgeService.emitEvent('commerce.supplier.registered', {
      corpId: supplier.corpId,
      businessName: supplier.businessName,
      categories: supplier.categories,
    });
    res.status(201).json({ success: true, data: supplier });
  })
);

/**
 * GET /api/suppliers/:corpId
 *
 * Public profile read with PII gated by JWT identity (not headers).
 * Closes B-AUTH-4: the previous version checked `x-corp-id` header which
 * any caller could set to any value.
 */
router.get(
  '/:corpId',
  requireAuth('public'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const supplier = await SupplierService.getByCorpId(req.params.corpId);
    if (!supplier) throw new HttpError(404, 'Supplier not found');

    // Determine if the caller is allowed to see PII:
    //   - The supplier themselves (JWT subject matches the corpId)
    //   - Admin / system callers
    // Note: 'public' auth mode means req.corpId may be undefined.
    const isSelf = req.corpId === supplier.corpId;
    const isPrivileged = req.role === 'admin' || req.role === 'system';

    if (!isSelf && !isPrivileged) {
      supplier.bankDetails = undefined;
      supplier.documents = (supplier.documents || []).map((d) => ({
        type: d.type,
        number: d.number,
        verified: d.verified,
        verifiedAt: d.verifiedAt,
        verifiedBy: d.verifiedBy,
      })) as typeof supplier.documents;
    }
    res.json({ success: true, data: supplier });
  })
);

// GET /api/suppliers - search
router.get(
  '/',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const { category, city, state, tier, minScore, status, limit, skip } = req.query;
    const result = await SupplierService.search({
      category: category as string | undefined,
      city: city as string | undefined,
      state: state as string | undefined,
      tier: tier as any,
      minScore: minScore ? Number(minScore) : undefined,
      status: status as any,
      limit: limit ? Number(limit) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
    res.json({ success: true, data: result.suppliers, total: result.total });
  })
);

/**
 * PATCH /api/suppliers/:corpId/status
 * Self OR admin can change own status. Policy-gated via SUTAR.
 */
router.patch(
  '/:corpId/status',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    if (req.corpId !== req.params.corpId && req.role !== 'admin' && req.role !== 'system') {
      throw new HttpError(403, 'Cannot change status of another supplier');
    }
    const { status, reason } = req.body as { status: string; reason?: string };
    const authz = await SutarBridgeService.authorize({
      action: `supplier.status.${status}`,
      corpId: req.params.corpId,
    });
    if (!authz.allowed) {
      throw new HttpError(403, `Status change not allowed: ${authz.reason || 'policy denied'}`);
    }
    const previousStatus = (await SupplierService.getByCorpId(req.params.corpId))?.status;
    const supplier = await SupplierService.updateStatus(req.params.corpId, status as any, reason);
    await SutarBridgeService.emitEvent('commerce.supplier.status_changed', {
      corpId: supplier.corpId,
      from: previousStatus,
      to: supplier.status,
      reason,
    });
    res.json({ success: true, data: supplier });
  })
);

/**
 * PATCH /api/suppliers/:corpId/tier
 * Admin-only tier changes (tier affects marketplace visibility).
 */
router.patch(
  '/:corpId/tier',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    if (req.role !== 'admin' && req.role !== 'system') {
      throw new HttpError(403, 'Tier changes require admin or system role');
    }
    const supplier = await SupplierService.updateTier(req.params.corpId, req.body.tier);
    res.json({ success: true, data: supplier });
  })
);

/**
 * POST /api/suppliers/:corpId/categories
 * Self can add categories to own profile.
 */
router.post(
  '/:corpId/categories',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    if (req.corpId !== req.params.corpId && req.role !== 'admin' && req.role !== 'system') {
      throw new HttpError(403, 'Cannot modify categories of another supplier');
    }
    const supplier = await SupplierService.addCategories(req.params.corpId, req.body.categories || []);
    res.json({ success: true, data: supplier });
  })
);

/**
 * GET /api/suppliers/:corpId/reputation
 * Public.
 */
router.get(
  '/:corpId/reputation',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const summary = await ReputationService.getSummary(req.params.corpId);
    res.json({ success: true, data: summary });
  })
);

/**
 * POST /api/suppliers/:corpId/auto-score
 * System/admin only.
 */
router.post(
  '/:corpId/auto-score',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    if (req.role !== 'system' && req.role !== 'admin') {
      throw new HttpError(403, 'Only system/admin can run auto-scoring');
    }
    const { onTimeDeliveryRate, qualityAcceptanceRate, onTimePaymentRate, responseRate, sampleSize } = req.body;
    await ReputationService.runAutoScoring({
      corpId: req.params.corpId,
      onTimeDeliveryRate,
      qualityAcceptanceRate,
      onTimePaymentRate,
      responseRate,
      sampleSize,
    });
    res.json({ success: true });
  })
);

export { router as supplierRouter };
