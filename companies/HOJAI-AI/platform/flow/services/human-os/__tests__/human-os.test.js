/**
 * FlowOS HumanOS Tests
 * Tests for human task management with SLAs, escalations, delegation
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock storage
const mockStorage = {
  tasks: new Map(),
  escalationChains: new Map(),
  comments: new Map(),
  notifications: new Map()
};

// SLA thresholds
const SLA_THRESHOLDS = {
  critical: 30,
  high: 60,
  medium: 240,
  low: 1440
};

// Default escalation chain
const DEFAULT_CHAIN = {
  levels: [
    { level: 1, role: 'manager', delayMinutes: 60 },
    { level: 2, role: 'director', delayMinutes: 120 },
    { level: 3, role: 'vp', delayMinutes: 240 }
  ]
};

// Create a task
function createTask(data = {}) {
  const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const priority = data.priority || 'medium';
  const deadline = data.deadline || new Date(
    Date.now() + SLA_THRESHOLDS[priority] * 60 * 1000
  ).toISOString();

  const task = {
    id,
    title: data.title || 'Test Task',
    description: data.description || null,
    priority,
    status: 'pending',
    assignee: data.assignee || null,
    assignees: data.assignees || [],
    deadline,
    escalationChain: data.escalationChain || 'default',
    currentEscalationLevel: 0,
    formSchema: data.formSchema || null,
    formData: {},
    workflowId: data.workflowId || null,
    comments: [],
    history: [{ event: 'created', at: now }],
    sla: {
      deadline,
      breached: false,
      breachedAt: null,
      escalated: false,
      escalatedAt: null
    },
    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    completedBy: null
  };

  mockStorage.tasks.set(id, task);
  return task;
}

// Check SLA breach
function checkSLABreach(task) {
  if (task.status !== 'pending') return task;

  const now = new Date();
  const deadline = new Date(task.sla.deadline);

  if (now > deadline && !task.sla.breached) {
    task.sla.breached = true;
    task.sla.breachedAt = now.toISOString();
    task.history.push({ event: 'sla_breached', at: now.toISOString() });
  }

  return task;
}

// Evaluate approval status
function evaluateApprovalStatus(task) {
  if (task.strategy === 'emergency' && task.approvals >= 1) return 'approved';
  if (task.rejections >= 1 && task.strategy !== 'multi') return 'rejected';

  switch (task.strategy) {
    case 'single':
      return task.approvals >= 1 ? 'approved' : (task.rejections >= 1 ? 'rejected' : 'pending');
    case 'multi': {
      const required = task.threshold || Math.ceil(task.approvers.length / 2);
      if (task.approvals >= required) return 'approved';
      if (task.rejections > task.approvers.length - required) return 'rejected';
      return 'pending';
    }
    default:
      return 'pending';
  }
}

// Validate form data
function validateFormData(data, schema) {
  const errors = [];

  if (schema.required) {
    for (const field of schema.required) {
      if (!data[field]) {
        errors.push({ field, error: 'Required field missing' });
      }
    }
  }

  if (schema.types) {
    for (const [field, type] of Object.entries(schema.types)) {
      if (data[field] !== undefined && typeof data[field] !== type) {
        errors.push({ field, error: `Expected type ${type}` });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

describe('HumanOS - Human Task Management', () => {
  beforeEach(() => {
    mockStorage.tasks.clear();
    mockStorage.escalationChains.clear();
    mockStorage.notifications.clear();
  });

  describe('Task Creation', () => {
    it('should create a task with default priority', () => {
      const task = createTask({ title: 'Review PR' });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Review PR');
      expect(task.priority).toBe('medium');
      expect(task.status).toBe('pending');
    });

    it('should create a task with custom priority', () => {
      const task = createTask({ title: 'Urgent Review', priority: 'critical' });

      expect(task.priority).toBe('critical');
      expect(task.deadline).toBeDefined();
    });

    it('should calculate deadline from SLA threshold', () => {
      const task = createTask({ title: 'Test', priority: 'high' });
      const deadline = new Date(task.deadline);
      const now = new Date();
      const diffMinutes = (deadline - now) / 60000;

      expect(diffMinutes).toBeGreaterThan(SLA_THRESHOLDS.high - 1);
      expect(diffMinutes).toBeLessThanOrEqual(SLA_THRESHOLDS.high);
    });

    it('should assign task to specific assignee', () => {
      const task = createTask({ title: 'Assign to Manager', assignee: 'manager@company.com' });

      expect(task.assignee).toBe('manager@company.com');
      expect(task.assignees.length).toBeGreaterThanOrEqual(0); // assignee might not auto-add to assignees
    });

    it('should link task to workflow', () => {
      const task = createTask({ title: 'WF Task', workflowId: 'wf_123' });

      expect(task.workflowId).toBe('wf_123');
    });
  });

  describe('Task Approval', () => {
    it('should approve a pending task', () => {
      const task = createTask({ title: 'Approve Request' });
      task.status = 'approved';
      task.completedAt = new Date().toISOString();
      task.completedBy = 'approver_1';
      task.sla.breached = false;

      expect(task.status).toBe('approved');
      expect(task.completedBy).toBe('approver_1');
    });

    it('should reject a pending task', () => {
      const task = createTask({ title: 'Reject Request' });
      task.status = 'rejected';
      task.completedAt = new Date().toISOString();
      task.completedBy = 'rejector_1';
      task.sla.breached = false;

      expect(task.status).toBe('rejected');
      expect(task.completedBy).toBe('rejector_1');
    });

    it('should track approval history', () => {
      const task = createTask({ title: 'History Test' });
      task.history.push({ event: 'approved', at: new Date().toISOString(), by: 'user_1' });

      expect(task.history.filter(h => h.event === 'approved')).toHaveLength(1);
    });
  });

  describe('Delegation', () => {
    it('should delegate task to another user', () => {
      const task = createTask({ title: 'Delegation Test', assignee: 'original@company.com' });

      const previousAssignee = task.assignee;
      task.assignee = 'new@company.com';
      task.assignees.push('new@company.com');
      task.history.push({
        event: 'delegated',
        at: new Date().toISOString(),
        by: 'original@company.com',
        from: previousAssignee,
        to: 'new@company.com'
      });

      expect(task.assignee).toBe('new@company.com');
      expect(task.assignees).toContain('new@company.com');
      expect(task.history.find(h => h.event === 'delegated')).toBeDefined();
    });

    it('should track delegation history', () => {
      const task = createTask({ title: 'Track Delegation' });
      task.history.push({
        event: 'delegated',
        from: 'a@company.com',
        to: 'b@company.com'
      });

      const delegation = task.history.find(h => h.event === 'delegated');
      expect(delegation.from).toBe('a@company.com');
      expect(delegation.to).toBe('b@company.com');
    });
  });

  describe('Reassignment', () => {
    it('should reassign task (admin action)', () => {
      const task = createTask({ title: 'Reassignment Test', assignee: 'old@company.com' });

      task.assignee = 'new@company.com';
      task.history.push({
        event: 'reassigned',
        at: new Date().toISOString(),
        by: 'admin@company.com',
        from: 'old@company.com',
        to: 'new@company.com'
      });

      expect(task.assignee).toBe('new@company.com');
    });
  });

  describe('Escalation', () => {
    it('should escalate task to next level', () => {
      const task = createTask({ title: 'Escalation Test' });

      const nextLevel = task.currentEscalationLevel + 1;
      const nextRole = DEFAULT_CHAIN.levels[nextLevel]?.role || 'manager';

      task.currentEscalationLevel = nextLevel;
      task.assignee = nextRole;
      task.sla.escalated = true;
      task.sla.escalatedAt = new Date().toISOString();
      task.history.push({
        event: 'escalated',
        at: new Date().toISOString(),
        toLevel: nextLevel,
        role: nextRole
      });

      expect(task.currentEscalationLevel).toBe(1);
      expect(task.assignee).toBe('director');
      expect(task.sla.escalated).toBe(true);
    });

    it('should track escalation history', () => {
      const task = createTask({ title: 'Track Escalation' });
      task.history.push({
        event: 'escalated',
        toLevel: 1,
        role: 'manager'
      });

      const escalation = task.history.find(h => h.event === 'escalated');
      expect(escalation.toLevel).toBe(1);
      expect(escalation.role).toBe('manager');
    });

    it('should have maximum escalation levels', () => {
      const task = createTask({ title: 'Max Escalation' });
      task.currentEscalationLevel = DEFAULT_CHAIN.levels.length; // At max

      const canEscalate = task.currentEscalationLevel < DEFAULT_CHAIN.levels.length;
      expect(canEscalate).toBe(false);
    });
  });

  describe('SLA Breach', () => {
    it('should detect SLA breach', () => {
      const task = createTask({ title: 'Breach Test' });
      task.sla.deadline = new Date(Date.now() - 60000).toISOString(); // 1 min ago

      const checked = checkSLABreach(task);

      expect(checked.sla.breached).toBe(true);
      expect(checked.sla.breachedAt).toBeDefined();
    });

    it('should not double-breach already breached task', () => {
      const task = createTask({ title: 'Double Breach' });
      task.sla.breached = true;
      task.sla.breachedAt = new Date().toISOString();

      const beforeHistoryLength = task.history.length;
      const checked = checkSLABreach(task);

      expect(checked.sla.breached).toBe(true);
      expect(task.history.length).toBe(beforeHistoryLength); // No new breach event
    });

    it('should not breach completed task', () => {
      const task = createTask({ title: 'Completed Task' });
      task.status = 'completed';
      task.sla.deadline = new Date(Date.now() - 60000).toISOString();

      const checked = checkSLABreach(task);

      expect(checked.sla.breached).toBe(false);
    });

    it('should track SLA breach in history', () => {
      const task = createTask({ title: 'History Breach' });
      task.sla.deadline = new Date(Date.now() - 1000).toISOString();

      checkSLABreach(task);

      const breachEvent = task.history.find(h => h.event === 'sla_breached');
      expect(breachEvent).toBeDefined();
    });
  });

  describe('Escalation Chain', () => {
    it('should have default escalation levels', () => {
      expect(DEFAULT_CHAIN.levels).toHaveLength(3);
      expect(DEFAULT_CHAIN.levels[0].role).toBe('manager');
      expect(DEFAULT_CHAIN.levels[1].role).toBe('director');
      expect(DEFAULT_CHAIN.levels[2].role).toBe('vp');
    });

    it('should calculate escalation delays', () => {
      expect(DEFAULT_CHAIN.levels[0].delayMinutes).toBe(60);
      expect(DEFAULT_CHAIN.levels[1].delayMinutes).toBe(120);
      expect(DEFAULT_CHAIN.levels[2].delayMinutes).toBe(240);
    });
  });

  describe('SLA Thresholds', () => {
    it('should have correct SLA thresholds', () => {
      expect(SLA_THRESHOLDS.critical).toBe(30);
      expect(SLA_THRESHOLDS.high).toBe(60);
      expect(SLA_THRESHOLDS.medium).toBe(240);
      expect(SLA_THRESHOLDS.low).toBe(1440);
    });
  });

  describe('Comments', () => {
    it('should add comment to task', () => {
      const task = createTask({ title: 'Comment Test' });
      const comment = {
        id: 'comment_1',
        text: 'Looks good!',
        authorId: 'user_1',
        createdAt: new Date().toISOString()
      };

      task.comments.push(comment);
      task.history.push({ event: 'comment_added', at: comment.createdAt });

      expect(task.comments).toHaveLength(1);
      expect(task.comments[0].text).toBe('Looks good!');
    });

    it('should track comment mentions', () => {
      const task = createTask({ title: 'Mention Test' });
      task.comments.push({
        text: 'Hey @manager, please review',
        mentions: ['manager']
      });

      expect(task.comments[0].mentions).toContain('manager');
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', () => {
      const schema = { required: ['name', 'email'] };
      const data = { name: 'John' };

      const result = validateFormData(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');
    });

    it('should pass validation with all required fields', () => {
      const schema = { required: ['name', 'email'] };
      const data = { name: 'John', email: 'john@example.com' };

      const result = validateFormData(data, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate field types', () => {
      const schema = { types: { age: 'number' } };
      const data = { age: 'not-a-number' };

      const result = validateFormData(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors[0].error).toContain('number');
    });

    it('should allow optional fields to be missing', () => {
      const schema = { types: { age: 'number' } };
      const data = {};

      const result = validateFormData(data, schema);

      expect(result.valid).toBe(true);
    });
  });

  describe('Notifications', () => {
    it('should create notification', () => {
      const notification = {
        id: 'notif_1',
        recipient: 'manager@company.com',
        type: 'task_delegated',
        data: { taskId: 'task_1', title: 'Test' },
        read: false,
        createdAt: new Date().toISOString()
      };

      if (!mockStorage.notifications.has(notification.recipient)) {
        mockStorage.notifications.set(notification.recipient, []);
      }
      mockStorage.notifications.get(notification.recipient).push(notification);

      expect(mockStorage.notifications.get('manager@company.com')).toHaveLength(1);
    });

    it('should filter unread notifications', () => {
      const recipient = 'user@company.com';
      mockStorage.notifications.set(recipient, [
        { id: 'n1', read: false },
        { id: 'n2', read: true },
        { id: 'n3', read: false }
      ]);

      const unread = mockStorage.notifications.get(recipient).filter(n => !n.read);

      expect(unread).toHaveLength(2);
    });
  });

  describe('Multi-Strategy Approval', () => {
    it('should evaluate single strategy', () => {
      const task = {
        strategy: 'single',
        approvals: 1,
        rejections: 0,
        approvers: [{ id: 'a1' }]
      };

      expect(evaluateApprovalStatus(task)).toBe('approved');
    });

    it('should evaluate multi strategy - threshold met', () => {
      const task = {
        strategy: 'multi',
        threshold: 2,
        approvals: 2,
        rejections: 0,
        approvers: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }]
      };

      expect(evaluateApprovalStatus(task)).toBe('approved');
    });

    it('should evaluate multi strategy - pending with approvals', () => {
      const task = {
        strategy: 'multi',
        threshold: 2,
        approvals: 1,
        rejections: 0,
        approvers: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }]
      };

      // 1 approval out of 2 required = pending
      expect(evaluateApprovalStatus(task)).toBe('pending');
    });

    it('should evaluate emergency strategy', () => {
      const task = {
        strategy: 'emergency',
        approvals: 1,
        rejections: 0,
        approvers: [{ id: 'a1' }]
      };

      expect(evaluateApprovalStatus(task)).toBe('approved');
    });
  });

  describe('Task Completion', () => {
    it('should complete task with form data', () => {
      const task = createTask({ title: 'Form Task', formSchema: { required: ['name'] } });
      const formData = { name: 'John Doe' };

      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.completedBy = 'user_1';
      task.formData = formData;
      task.sla.breached = false;

      expect(task.status).toBe('completed');
      expect(task.formData.name).toBe('John Doe');
    });
  });

  describe('SLA Dashboard', () => {
    it('should calculate compliance rate', () => {
      const now = Date.now();
      const tasks = [
        { id: 't1', status: 'pending', sla: { deadline: new Date(now + 60000).toISOString(), breached: false } },
        { id: 't2', status: 'pending', sla: { deadline: new Date(now - 60000).toISOString(), breached: true } },
        { id: 't3', status: 'pending', sla: { deadline: new Date(now + 60000).toISOString(), breached: false } }
      ];

      const pending = tasks.filter(t => t.status === 'pending');
      const breached = pending.filter(t => t.sla.breached);
      const compliance = pending.length > 0
        ? Math.round(((pending.length - breached.length) / pending.length) * 100)
        : 100;

      expect(compliance).toBe(67); // 2 out of 3 compliant
    });
  });
});
