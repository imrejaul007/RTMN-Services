import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  ApprovalRecord,
  ApprovalRequest,
  ApprovalResponse,
  ApprovalStatus,
  ApprovalDecision
} from '../models/Approval';
import { approvalStore } from '../models/Approval';
import { RuleEngine } from '../services/ruleEngine';
import { ApproverService } from '../services/approver';
import { AuditService } from '../services/audit';
import { CustomerOpsBridge } from '../services/customerOpsBridge';

const router = Router();
const ruleEngine = new RuleEngine();
const approverService = new ApproverService(ruleEngine);
const auditService = new AuditService();
const customerBridge = new CustomerOpsBridge();

// Create approval request
router.post('/request', async (req: Request, res: Response) => {
  try {
    const request: ApprovalRequest = req.body;

    // Validate request
    if (!request.requestId || !request.requestType || !request.applicantId) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['requestId', 'requestType', 'applicantId']
      });
      return;
    }

    // Check for duplicate request
    const existing = approvalStore.getByRequestId(request.requestId);
    if (existing) {
      res.status(409).json({
        error: 'Request already exists',
        existingId: existing.id
      });
      return;
    }

    // Get trust score and VIP tier from customer bridge
    const trustData = await customerBridge.getTrustScore(request.applicantId);

    // Create approval record
    const record: ApprovalRecord = {
      id: uuidv4(),
      requestId: request.requestId,
      requestType: request.requestType,
      entityId: request.entityId,
      entityType: request.entityType,
      applicantId: request.applicantId,
      applicantName: request.applicantName,
      amount: request.amount,
      trustScore: trustData?.score,
      vipTier: trustData?.tier,
      status: 'PENDING',
      decision: 'MANUAL_REVIEW',
      decisionReason: 'Pending evaluation',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: request.metadata
    };

    approvalStore.create(record);

    // Audit log
    auditService.log({
      action: 'APPROVAL_REQUEST_CREATED',
      entityId: record.id,
      requestId: record.requestId,
      applicantId: record.applicantId,
      details: {
        requestType: record.requestType,
        amount: record.amount,
        trustScore: record.trustScore,
        vipTier: record.vipTier
      },
      timestamp: new Date()
    });

    // Process approval
    const response = await approverService.processApproval(record);

    // Update record with decision
    approvalStore.update(record.id, {
      status: response.record.status,
      decision: response.record.decision,
      decisionReason: response.record.decisionReason,
      reviewedBy: 'AUTO_APPROVE_ENGINE',
      escalatedTo: response.record.escalatedTo
    });

    res.status(201).json({
      record: approvalStore.get(record.id),
      decision: response.decision,
      autoApprove: response.autoApprove,
      requiresManualReview: response.requiresManualReview
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to process approval request', details: errorMessage });
  }
});

// Get approval by ID
router.get('/:id', (req: Request, res: Response) => {
  const record = approvalStore.get(req.params.id);

  if (!record) {
    res.status(404).json({ error: 'Approval record not found' });
    return;
  }

  res.json(record);
});

// Get approvals by applicant
router.get('/applicant/:applicantId', (req: Request, res: Response) => {
  const records = approvalStore.getByApplicant(req.params.applicantId);
  res.json(records);
});

// List approvals with filters
router.get('/', (req: Request, res: Response) => {
  const filters: any = {};

  if (req.query.status) {
    filters.status = req.query.status as ApprovalStatus;
  }
  if (req.query.requestType) {
    filters.requestType = req.query.requestType as string;
  }
  if (req.query.startDate) {
    filters.startDate = new Date(req.query.startDate as string);
  }
  if (req.query.endDate) {
    filters.endDate = new Date(req.query.endDate as string);
  }

  const records = approvalStore.list(filters);
  res.json(records);
});

// Update approval status (for manual review)
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { status, decision, decisionReason, reviewedBy, escalatedTo } = req.body;

  const record = approvalStore.get(req.params.id);
  if (!record) {
    res.status(404).json({ error: 'Approval record not found' });
    return;
  }

  const updates: Partial<ApprovalRecord> = {
    status,
    decision,
    decisionReason: decisionReason || record.decisionReason,
    reviewedBy,
    updatedAt: new Date()
  };

  if (escalatedTo) {
    updates.escalatedTo = escalatedTo;
  }

  const updated = approvalStore.update(req.params.id, updates);

  auditService.log({
    action: 'APPROVAL_STATUS_UPDATED',
    entityId: req.params.id,
    requestId: record.requestId,
    details: { oldStatus: record.status, newStatus: status, reviewedBy },
    timestamp: new Date()
  });

  res.json(updated);
});

// Escalate to manager
router.post('/:id/escalate', async (req: Request, res: Response) => {
  const { escalateTo, reason } = req.body;

  const record = approvalStore.get(req.params.id);
  if (!record) {
    res.status(404).json({ error: 'Approval record not found' });
    return;
  }

  const updated = approvalStore.update(req.params.id, {
    status: 'ESCALATED',
    decision: 'ESCALATED',
    decisionReason: reason || 'Escalated for manager review',
    escalatedTo: escalateTo,
    updatedAt: new Date()
  });

  // Notify manager via customer bridge
  await customerBridge.notifyManager(escalateTo || 'MANAGER', {
    approvalId: req.params.id,
    requestId: record.requestId,
    reason: reason || 'Manager review required'
  });

  auditService.log({
    action: 'APPROVAL_ESCALATED',
    entityId: req.params.id,
    requestId: record.requestId,
    details: { escalateTo, reason },
    timestamp: new Date()
  });

  res.json(updated);
});

// Cancel approval request
router.post('/:id/cancel', (req: Request, res: Response) => {
  const record = approvalStore.get(req.params.id);

  if (!record) {
    res.status(404).json({ error: 'Approval record not found' });
    return;
  }

  if (record.status !== 'PENDING') {
    res.status(400).json({
      error: 'Cannot cancel non-pending approval',
      currentStatus: record.status
    });
    return;
  }

  const updated = approvalStore.update(req.params.id, {
    status: 'CANCELLED',
    decisionReason: 'Cancelled by request',
    updatedAt: new Date()
  });

  auditService.log({
    action: 'APPROVAL_CANCELLED',
    entityId: req.params.id,
    requestId: record.requestId,
    timestamp: new Date()
  });

  res.json(updated);
});

// Get statistics
router.get('/stats/summary', (req: Request, res: Response) => {
  const allRecords = approvalStore.getAll();

  const stats = {
    total: allRecords.length,
    byStatus: {
      pending: allRecords.filter(r => r.status === 'PENDING').length,
      approved: allRecords.filter(r => r.status === 'APPROVED').length,
      rejected: allRecords.filter(r => r.status === 'REJECTED').length,
      escalated: allRecords.filter(r => r.status === 'ESCALATED').length,
      cancelled: allRecords.filter(r => r.status === 'CANCELLED').length
    },
    byDecision: {
      autoApproved: allRecords.filter(r => r.decision === 'AUTO_APPROVED').length,
      autoRejected: allRecords.filter(r => r.decision === 'AUTO_REJECTED').length,
      manualReview: allRecords.filter(r => r.decision === 'MANUAL_REVIEW').length,
      escalated: allRecords.filter(r => r.decision === 'ESCALATED').length
    },
    averageTrustScore: allRecords
      .filter(r => r.trustScore !== undefined)
      .reduce((sum, r) => sum + (r.trustScore || 0), 0) /
      allRecords.filter(r => r.trustScore !== undefined).length || 0,
    vipBreakdown: {
      diamond: allRecords.filter(r => r.vipTier === 'DIAMOND').length,
      platinum: allRecords.filter(r => r.vipTier === 'PLATINUM').length,
      gold: allRecords.filter(r => r.vipTier === 'GOLD').length,
      silver: allRecords.filter(r => r.vipTier === 'SILVER').length,
      bronze: allRecords.filter(r => r.vipTier === 'BRONZE').length,
      none: allRecords.filter(r => r.vipTier === 'NONE').length
    }
  };

  res.json(stats);
});

export { router as approvalRouter };
