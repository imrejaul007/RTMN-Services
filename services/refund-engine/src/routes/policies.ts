import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { policyStore, RefundPolicy, PolicyRule } from '../models/Policy';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get all policies
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const policies = policyStore.findAll();
    res.json({
      success: true,
      data: policies
    });
  } catch (error) {
    logger.error('Failed to get policies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get policies'
    });
  }
});

// Get policy by ID
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const policy = policyStore.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found'
      });
    }

    res.json({
      success: true,
      data: policy
    });
  } catch (error) {
    logger.error('Failed to get policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get policy'
    });
  }
});

// Create new policy
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      channel,
      region,
      itemCategories,
      refundWindowDays,
      partialRefundWindowDays,
      maxRefundAmount,
      minRefundAmount,
      autoApproveMaxAmount,
      autoApproveTrustScoreMin,
      manualReviewTrustScoreMin,
      processingFeePercent,
      waiveProcessingFeeAbove,
      rules,
      priority,
      regulatoryCompliant,
      auditRequired
    } = req.body;

    if (!name || !refundWindowDays) {
      return res.status(400).json({
        success: false,
        error: 'Name and refund window days are required'
      });
    }

    const policyId = req.body.id || uuidv4();

    // Validate rules if provided
    const validatedRules: PolicyRule[] = rules?.map((rule: PolicyRule, index: number) => ({
      id: rule.id || `${policyId}-rule-${index + 1}`,
      name: rule.name || `Rule ${index + 1}`,
      conditions: rule.conditions || [],
      conditionLogic: rule.conditionLogic || 'AND',
      actions: rule.actions || ['require_review'],
      priority: rule.priority || index + 1,
      enabled: rule.enabled !== false
    })) || [];

    const policy: RefundPolicy = {
      id: policyId,
      name,
      description: description || '',
      version: '1.0.0',
      channel,
      region,
      itemCategories,
      refundWindowDays,
      partialRefundWindowDays,
      maxRefundAmount,
      minRefundAmount,
      autoApproveMaxAmount,
      autoApproveTrustScoreMin,
      manualReviewTrustScoreMin,
      processingFeePercent,
      waiveProcessingFeeAbove,
      rules: validatedRules,
      enabled: true,
      priority: priority || policyStore.findAll().length,
      regulatoryCompliant: regulatoryCompliant ?? true,
      auditRequired: auditRequired ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user?.id || 'system'
    };

    policyStore.create(policy);

    logger.info(`Policy created: ${policyId}`, { name, channel });

    res.status(201).json({
      success: true,
      data: policy
    });
  } catch (error) {
    logger.error('Failed to create policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create policy'
    });
  }
});

// Update policy
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const existing = policyStore.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found'
      });
    }

    if (req.params.id === 'default') {
      // Only allow enabling/disabling and rule updates for default policy
      const allowedUpdates: Partial<RefundPolicy> = {};
      if (req.body.enabled !== undefined) allowedUpdates.enabled = req.body.enabled;
      if (req.body.rules) allowedUpdates.rules = req.body.rules;

      const updated = policyStore.update(req.params.id, allowedUpdates);
      return res.json({ success: true, data: updated });
    }

    const updates: Partial<RefundPolicy> = {};

    const allowedFields = [
      'name', 'description', 'channel', 'region', 'itemCategories',
      'refundWindowDays', 'partialRefundWindowDays', 'maxRefundAmount',
      'minRefundAmount', 'autoApproveMaxAmount', 'autoApproveTrustScoreMin',
      'manualReviewTrustScoreMin', 'processingFeePercent', 'waiveProcessingFeeAbove',
      'rules', 'enabled', 'priority', 'regulatoryCompliant', 'auditRequired'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        (updates as Record<string, unknown>)[field] = req.body[field];
      }
    });

    // Update version if significant changes
    if (req.body.rules || req.body.refundWindowDays || req.body.autoApproveMaxAmount) {
      const currentVersion = existing.version.split('.');
      updates.version = `${currentVersion[0]}.${parseInt(currentVersion[1]) + 1}.0`;
    }

    const updatedPolicy = policyStore.update(req.params.id, updates);

    logger.info(`Policy updated: ${req.params.id}`, { fields: Object.keys(updates) });

    res.json({
      success: true,
      data: updatedPolicy
    });
  } catch (error) {
    logger.error('Failed to update policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update policy'
    });
  }
});

// Delete policy
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.params.id === 'default') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete default policy'
      });
    }

    const deleted = policyStore.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found'
      });
    }

    logger.info(`Policy deleted: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Policy deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete policy'
    });
  }
});

// Add rule to policy
router.post('/:id/rules', authMiddleware, async (req: Request, res: Response) => {
  try {
    const policy = policyStore.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found'
      });
    }

    const { name, conditions, conditionLogic, actions, priority } = req.body;

    const rule: PolicyRule = {
      id: uuidv4(),
      name: name || `Rule ${policy.rules.length + 1}`,
      conditions: conditions || [],
      conditionLogic: conditionLogic || 'AND',
      actions: actions || ['require_review'],
      priority: priority || policy.rules.length + 1,
      enabled: true
    };

    policyStore.update(req.params.id, {
      rules: [...policy.rules, rule]
    });

    res.status(201).json({
      success: true,
      data: rule
    });
  } catch (error) {
    logger.error('Failed to add rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add rule'
    });
  }
});

// Update rule in policy
router.patch('/:id/rules/:ruleId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const policy = policyStore.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found'
      });
    }

    const ruleIndex = policy.rules.findIndex(r => r.id === req.params.ruleId);

    if (ruleIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found'
      });
    }

    const updatedRule = { ...policy.rules[ruleIndex], ...req.body };
    const updatedRules = [...policy.rules];
    updatedRules[ruleIndex] = updatedRule;

    policyStore.update(req.params.id, { rules: updatedRules });

    res.json({
      success: true,
      data: updatedRule
    });
  } catch (error) {
    logger.error('Failed to update rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update rule'
    });
  }
});

// Delete rule from policy
router.delete('/:id/rules/:ruleId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const policy = policyStore.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found'
      });
    }

    const updatedRules = policy.rules.filter(r => r.id !== req.params.ruleId);

    if (updatedRules.length === policy.rules.length) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found'
      });
    }

    policyStore.update(req.params.id, { rules: updatedRules });

    res.json({
      success: true,
      message: 'Rule deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete rule'
    });
  }
});

// Toggle policy enabled status
router.post('/:id/toggle', authMiddleware, async (req: Request, res: Response) => {
  try {
    const policy = policyStore.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found'
      });
    }

    if (req.params.id === 'default') {
      return res.status(400).json({
        success: false,
        error: 'Cannot disable default policy'
      });
    }

    const updated = policyStore.update(req.params.id, {
      enabled: !policy.enabled
    });

    logger.info(`Policy ${policy.id} ${updated?.enabled ? 'enabled' : 'disabled'}`);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    logger.error('Failed to toggle policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle policy'
    });
  }
});

export default router;
