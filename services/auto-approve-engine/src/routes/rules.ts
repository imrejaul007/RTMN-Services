import { Router, Request, Response } from 'express';
import { ApprovalRule } from '../models/Approval';
import { rulesStore } from '../models/Rules';
import { AuditService } from '../services/audit';

const router = Router();
const auditService = new AuditService();

// Get all rules
router.get('/', (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === 'true';

  const rules = includeInactive
    ? rulesStore.getAll()
    : rulesStore.getActive();

  res.json(rules);
});

// Get rule by ID
router.get('/:id', (req: Request, res: Response) => {
  const rule = rulesStore.get(req.params.id);

  if (!rule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  res.json(rule);
});

// Get rules by request type
router.get('/type/:requestType', (req: Request, res: Response) => {
  const rules = rulesStore.getByRequestType(req.params.requestType);
  res.json(rules);
});

// Create new rule
router.post('/', (req: Request, res: Response) => {
  const { name, description, requestType, priority, conditions, actions, isActive } = req.body;

  // Validate required fields
  if (!name || !requestType || !conditions || !actions) {
    res.status(400).json({
      error: 'Missing required fields',
      required: ['name', 'requestType', 'conditions', 'actions']
    });
    return;
  }

  // Validate conditions structure
  for (const condition of conditions) {
    if (!condition.field || !condition.operator || condition.value === undefined) {
      res.status(400).json({
        error: 'Invalid condition structure',
        required: ['field', 'operator', 'value']
      });
      return;
    }
  }

  // Validate actions structure
  for (const action of actions) {
    if (!action.type || !action.reason) {
      res.status(400).json({
        error: 'Invalid action structure',
        required: ['type', 'reason']
      });
      return;
    }
  }

  const rule = rulesStore.create({
    name,
    description: description || '',
    requestType,
    priority: priority || 50,
    conditions,
    actions,
    isActive: isActive !== false
  });

  auditService.log({
    action: 'RULE_CREATED',
    entityId: rule.id,
    details: { name, requestType, priority },
    timestamp: new Date()
  });

  res.status(201).json(rule);
});

// Update rule
router.put('/:id', (req: Request, res: Response) => {
  const existing = rulesStore.get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  const { name, description, requestType, priority, conditions, actions, isActive } = req.body;

  const updates: Partial<ApprovalRule> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (requestType !== undefined) updates.requestType = requestType;
  if (priority !== undefined) updates.priority = priority;
  if (conditions !== undefined) updates.conditions = conditions;
  if (actions !== undefined) updates.actions = actions;
  if (isActive !== undefined) updates.isActive = isActive;

  const updated = rulesStore.update(req.params.id, updates);

  auditService.log({
    action: 'RULE_UPDATED',
    entityId: req.params.id,
    details: { name, requestType },
    timestamp: new Date()
  });

  res.json(updated);
});

// Toggle rule active status
router.patch('/:id/toggle', (req: Request, res: Response) => {
  const rule = rulesStore.get(req.params.id);

  if (!rule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  const updated = rulesStore.toggleActive(req.params.id);

  auditService.log({
    action: 'RULE_TOGGLED',
    entityId: req.params.id,
    details: { name: rule.name, newStatus: updated?.isActive },
    timestamp: new Date()
  });

  res.json(updated);
});

// Delete rule
router.delete('/:id', (req: Request, res: Response) => {
  const rule = rulesStore.get(req.params.id);

  if (!rule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  rulesStore.delete(req.params.id);

  auditService.log({
    action: 'RULE_DELETED',
    entityId: req.params.id,
    details: { name: rule.name },
    timestamp: new Date()
  });

  res.json({ message: 'Rule deleted successfully', id: req.params.id });
});

// Reset to default rules
router.post('/reset', (req: Request, res: Response) => {
  rulesStore.reset();

  auditService.log({
    action: 'RULES_RESET',
    details: { message: 'All rules reset to defaults' },
    timestamp: new Date()
  });

  res.json({
    message: 'Rules reset to defaults',
    rules: rulesStore.getAll()
  });
});

// Reorder rules priority
router.patch('/reorder', (req: Request, res: Response) => {
  const { rulePriorities } = req.body;

  if (!Array.isArray(rulePriorities)) {
    res.status(400).json({ error: 'rulePriorities must be an array of {id, priority}' });
    return;
  }

  const results = [];
  for (const { id, priority } of rulePriorities) {
    const updated = rulesStore.update(id, { priority });
    if (updated) {
      results.push(updated);
    }
  }

  auditService.log({
    action: 'RULES_REORDERED',
    details: { count: results.length },
    timestamp: new Date()
  });

  res.json({
    message: 'Rules reordered successfully',
    rules: results
  });
});

// Test rule evaluation (without creating approval)
router.post('/test', (req: Request, res: Response) => {
  const { requestType, trustScore, vipTier, amount, metadata } = req.body;

  const testData = {
    requestType: requestType || 'TRANSACTION',
    trustScore: trustScore || 50,
    vipTier: vipTier || 'NONE',
    amount: amount || 0,
    metadata: metadata || {}
  };

  // Import RuleEngine dynamically for testing
  const { RuleEngine } = require('../services/ruleEngine');
  const ruleEngine = new RuleEngine();
  const matchingRules = ruleEngine.findMatchingRules(testData);

  res.json({
    input: testData,
    matchingRules: matchingRules.map((r: any) => ({
      id: r.id,
      name: r.name,
      priority: r.priority,
      actions: r.actions
    })),
    wouldResult: matchingRules.length > 0
      ? matchingRules[0].actions[0].type
      : 'NO_MATCH'
  });
});

export { router as rulesRouter };
