import { Router, Request, Response } from 'express';
import { SupplierService } from '../services/supplier.service';
import { ReputationService } from '../services/reputation.service';
import { SutarBridgeService } from '../services/sutar-bridge.service';
import { requireAuth, AuthedRequest } from '../middleware/auth.middleware';
import { asyncHandler, HttpError } from '../middleware/error.middleware';

const router = Router();

// POST /api/suppliers - register a new supplier
router.post(
  '/',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const supplier = await SupplierService.register(req.body);
    // Best-effort SUTAR trust-score link
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

// GET /api/suppliers/:corpId - public profile (limited fields)
router.get(
  '/:corpId',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const supplier = await SupplierService.getByCorpId(req.params.corpId);
    if (!supplier) throw new HttpError(404, 'Supplier not found');
    // Hide PII unless the caller is the supplier themselves or admin
    const isSelf = req.header('x-corp-id') === supplier.corpId;
    if (!isSelf) {
      supplier.bankDetails = undefined;
      const sanitized = (supplier.documents || []).map((d) => {
        return { type: d.type, number: d.number, verified: d.verified, verifiedAt: d.verifiedAt, verifiedBy: d.verifiedBy };
      });
      supplier.documents = sanitized as typeof supplier.documents;
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

// PATCH /api/suppliers/:corpId/status
router.patch(
  '/:corpId/status',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { status, reason } = req.body as { status: string; reason?: string };
    const authz = await SutarBridgeService.authorize({
      action: `supplier.status.${status}`,
      corpId: req.params.corpId,
    });
    if (!authz.allowed) {
      throw new HttpError(403, `Status change not allowed: ${authz.reason || 'policy denied'}`);
    }
    const supplier = await SupplierService.updateStatus(req.params.corpId, status as any, reason);
    await SutarBridgeService.emitEvent('commerce.supplier.status_changed', {
      corpId: supplier.corpId,
      from: req.body.previousStatus,
      to: supplier.status,
      reason,
    });
    res.json({ success: true, data: supplier });
  })
);

// PATCH /api/suppliers/:corpId/tier
router.patch(
  '/:corpId/tier',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const supplier = await SupplierService.updateTier(req.params.corpId, req.body.tier);
    res.json({ success: true, data: supplier });
  })
);

// POST /api/suppliers/:corpId/categories
router.post(
  '/:corpId/categories',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const supplier = await SupplierService.addCategories(req.params.corpId, req.body.categories || []);
    res.json({ success: true, data: supplier });
  })
);

// GET /api/suppliers/:corpId/reputation
router.get(
  '/:corpId/reputation',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const summary = await ReputationService.getSummary(req.params.corpId);
    res.json({ success: true, data: summary });
  })
);

// POST /api/suppliers/:corpId/auto-score (system-only)
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
