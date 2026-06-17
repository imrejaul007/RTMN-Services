import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { refundStore, RefundRequest, RefundChannel, RefundStatus } from '../models/Refund';
import { policyEngine } from '../services/policyEngine';
import { refundProcessor } from '../services/refundProcessor';
import { customerOpsBridge } from '../services/customerOpsBridge';
import { twinSync } from '../services/twinSync';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Create refund request
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      customerEmail,
      channel,
      channelRefId,
      originalAmount,
      refundAmount,
      currency = 'USD',
      reason,
      reasonDescription,
      items,
      evidence,
      priority = 'normal'
    } = req.body;

    // Validate required fields
    if (!customerId || !channel || !channelRefId || !refundAmount || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Check for duplicate request
    const existing = refundStore.findAll({
      customerId,
      channel: channel as RefundChannel
    }).find(r =>
      r.channelRefId === channelRefId &&
      (r.status === 'pending' || r.status === 'processing' || r.status === 'auto_approved')
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Pending refund request already exists for this transaction',
        existingRequestId: existing.requestId
      });
    }

    // Get trust score context
    const trustScoreContext = await customerOpsBridge.getTrustScoreContext(customerId);

    // Create refund request
    const refundId = uuidv4();
    const requestId = `REQ-${Date.now()}-${uuidv4().slice(0, 8)}`;

    const refundRequest: RefundRequest = {
      id: refundId,
      requestId,
      customerId,
      customerEmail,
      channel: channel as RefundChannel,
      channelRefId,
      originalAmount,
      refundAmount,
      currency,
      status: 'pending',
      priority,
      reason,
      reasonDescription,
      items,
      evidence,
      trustScoreContext,
      autoApproved: false,
      auditTrail: [
        {
          action: 'created',
          actor: req.user?.id || 'system',
          timestamp: new Date(),
          details: { source: 'api' }
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Evaluate policies
    const policyResult = await policyEngine.evaluate(refundRequest);

    if (policyResult) {
      refundRequest.autoApproved = policyResult.suggestedAction === 'auto_approve';

      if (policyResult.processingFee) {
        refundRequest.processingFee = policyResult.processingFee;
        refundRequest.netRefundAmount = refundRequest.refundAmount - policyResult.processingFee;
      }

      if (policyResult.adjustedAmount) {
        refundRequest.refundAmount = policyResult.adjustedAmount;
        refundRequest.netRefundAmount = policyResult.adjustedAmount - (refundRequest.processingFee || 0);
      }

      refundRequest.auditTrail.push({
        action: 'policy_evaluated',
        actor: 'policy-engine',
        timestamp: new Date(),
        details: {
          policyId: policyResult.policy?.id,
          action: policyResult.suggestedAction,
          reason: policyResult.reason
        }
      });
    }

    // Save refund request
    refundStore.create(refundRequest);

    // Update customer twin
    await customerOpsBridge.notifyRefundRequest(refundRequest);

    // Sync to payment twin
    await twinSync.syncRefundRequest(refundRequest);

    // Process if auto-approved
    if (refundRequest.autoApproved) {
      refundRequest.status = 'auto_approved';
      refundRequest.approvedBy = 'system';
      refundRequest.approvalReason = 'Auto-approved by policy engine';
      refundStore.update(refundId, refundRequest);

      // Process the refund
      setImmediate(async () => {
        try {
          await refundProcessor.process(refundRequest.id);
        } catch (error) {
          logger.error(`Failed to process auto-approved refund ${refundId}:`, error);
        }
      });
    }

    logger.info(`Refund request created: ${requestId}`, {
      customerId,
      channel,
      amount: refundAmount,
      autoApproved: refundRequest.autoApproved
    });

    res.status(201).json({
      success: true,
      data: refundRequest
    });
  } catch (error) {
    logger.error('Failed to create refund request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create refund request'
    });
  }
});

// Get refund request by ID
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const refund = refundStore.findById(req.params.id) ||
                   refundStore.findByRequestId(req.params.id);

    if (!refund) {
      return res.status(404).json({
        success: false,
        error: 'Refund request not found'
      });
    }

    res.json({
      success: true,
      data: refund
    });
  } catch (error) {
    logger.error('Failed to get refund request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get refund request'
    });
  }
});

// List refund requests with filters
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, channel, customerId, priority, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const filters: Partial<RefundRequest> = {};

    if (status) filters.status = status as RefundStatus;
    if (channel) filters.channel = channel as RefundChannel;
    if (customerId) filters.customerId = customerId as string;
    if (priority) filters.priority = priority as RefundRequest['priority'];

    let refunds = refundStore.findAll(filters);

    // Apply date filters
    if (startDate) {
      const start = new Date(startDate as string);
      refunds = refunds.filter(r => new Date(r.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      refunds = refunds.filter(r => new Date(r.createdAt) <= end);
    }

    // Pagination
    const total = refunds.length;
    const paginatedRefunds = refunds.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: paginatedRefunds,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + paginatedRefunds.length < total
      }
    });
  } catch (error) {
    logger.error('Failed to list refund requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list refund requests'
    });
  }
});

// Update refund request
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const refund = refundStore.findById(req.params.id);

    if (!refund) {
      return res.status(404).json({
        success: false,
        error: 'Refund request not found'
      });
    }

    // Only allow updates in certain statuses
    const allowedStatuses: RefundStatus[] = ['pending', 'approved'];
    if (!allowedStatuses.includes(refund.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot update refund in status: ${refund.status}`
      });
    }

    const allowedFields = ['refundAmount', 'reason', 'reasonDescription', 'evidence', 'priority'];
    const updates: Partial<RefundRequest> = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        (updates as Record<string, unknown>)[field] = req.body[field];
      }
    });

    updates.auditTrail = [
      ...refund.auditTrail,
      {
        action: 'updated',
        actor: req.user?.id || 'system',
        timestamp: new Date(),
        details: { changes: updates }
      }
    ];

    const updatedRefund = refundStore.update(refund.id, updates);

    res.json({
      success: true,
      data: updatedRefund
    });
  } catch (error) {
    logger.error('Failed to update refund request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update refund request'
    });
  }
});

// Approve refund request
router.post('/:id/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const refund = refundStore.findById(req.params.id);

    if (!refund) {
      return res.status(404).json({
        success: false,
        error: 'Refund request not found'
      });
    }

    if (!['pending', 'approved'].includes(refund.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot approve refund in status: ${refund.status}`
      });
    }

    const { amount, notes } = req.body;

    const updates: Partial<RefundRequest> = {
      status: 'approved',
      approvedBy: req.user?.id || 'system',
      approvalReason: notes || 'Manually approved',
      auditTrail: [
        ...refund.auditTrail,
        {
          action: 'approved',
          actor: req.user?.id || 'system',
          timestamp: new Date(),
          details: { amount: amount || refund.refundAmount, notes }
        }
      ]
    };

    if (amount && amount !== refund.refundAmount) {
      updates.refundAmount = amount;
    }

    const updatedRefund = refundStore.update(refund.id, updates);

    // Process the refund
    setImmediate(async () => {
      try {
        await refundProcessor.process(refund.id);
      } catch (error) {
        logger.error(`Failed to process approved refund ${refund.id}:`, error);
      }
    });

    res.json({
      success: true,
      data: updatedRefund
    });
  } catch (error) {
    logger.error('Failed to approve refund request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve refund request'
    });
  }
});

// Reject refund request
router.post('/:id/reject', authMiddleware, async (req: Request, res: Response) => {
  try {
    const refund = refundStore.findById(req.params.id);

    if (!refund) {
      return res.status(404).json({
        success: false,
        error: 'Refund request not found'
      });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot reject refund in status: ${refund.status}`
      });
    }

    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    const updates: Partial<RefundRequest> = {
      status: 'rejected',
      auditTrail: [
        ...refund.auditTrail,
        {
          action: 'rejected',
          actor: req.user?.id || 'system',
          timestamp: new Date(),
          details: { reason }
        }
      ]
    };

    const updatedRefund = refundStore.update(refund.id, updates);

    // Notify customer
    await customerOpsBridge.notifyRefundRejected(updatedRefund, reason);

    res.json({
      success: true,
      data: updatedRefund
    });
  } catch (error) {
    logger.error('Failed to reject refund request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject refund request'
    });
  }
});

// Cancel refund request
router.post('/:id/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const refund = refundStore.findById(req.params.id);

    if (!refund) {
      return res.status(404).json({
        success: false,
        error: 'Refund request not found'
      });
    }

    const cancellableStatuses: RefundStatus[] = ['pending', 'auto_approved', 'approved'];
    if (!cancellableStatuses.includes(refund.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel refund in status: ${refund.status}`
      });
    }

    const updates: Partial<RefundRequest> = {
      status: 'cancelled',
      auditTrail: [
        ...refund.auditTrail,
        {
          action: 'cancelled',
          actor: req.user?.id || 'system',
          timestamp: new Date(),
          details: { reason: req.body.reason || 'Customer cancelled' }
        }
      ]
    };

    const updatedRefund = refundStore.update(refund.id, updates);

    res.json({
      success: true,
      data: updatedRefund
    });
  } catch (error) {
    logger.error('Failed to cancel refund request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel refund request'
    });
  }
});

// Retry failed refund
router.post('/:id/retry', authMiddleware, async (req: Request, res: Response) => {
  try {
    const refund = refundStore.findById(req.params.id);

    if (!refund) {
      return res.status(404).json({
        success: false,
        error: 'Refund request not found'
      });
    }

    if (refund.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: `Cannot retry refund in status: ${refund.status}`
      });
    }

    refundStore.update(refund.id, {
      status: 'processing',
      auditTrail: [
        ...refund.auditTrail,
        {
          action: 'retry_initiated',
          actor: req.user?.id || 'system',
          timestamp: new Date()
        }
      ]
    });

    // Process the refund
    setImmediate(async () => {
      try {
        await refundProcessor.process(refund.id);
      } catch (error) {
        logger.error(`Failed to retry refund ${refund.id}:`, error);
      }
    });

    res.json({
      success: true,
      message: 'Refund retry initiated'
    });
  } catch (error) {
    logger.error('Failed to retry refund:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry refund'
    });
  }
});

export default router;
