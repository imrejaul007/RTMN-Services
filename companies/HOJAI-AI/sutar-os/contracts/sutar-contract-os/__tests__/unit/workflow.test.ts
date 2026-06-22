/**
 * SUTAR Contract OS - Workflow Service Unit Tests
 * Phase B.5: Tests for the new approval workflow service
 */

import { describe, it, expect } from 'vitest';
import {
  createWorkflow,
  getWorkflow,
  getWorkflowsForContract,
  startWorkflow,
  approveStep,
  rejectStep,
  cancelWorkflow,
  getWorkflowProgress,
} from '../../src/services/workflow.js';

function makeWorkflowInput(steps = 2) {
  return {
    contractId: `contract-${Math.random()}`,
    name: 'Approval Workflow',
    type: 'sequential' as const,
    steps: Array.from({ length: steps }, (_, i) => ({
      name: `Step ${i + 1}`,
      approverRole: 'manager',
      approverEmail: `approver${i}@example.com`,
    })),
  };
}

describe('Workflow — create & retrieve', () => {
  it('creates a sequential workflow with N steps', () => {
    const wf = createWorkflow(makeWorkflowInput(3));
    expect(wf.id).toBeTruthy();
    expect(wf.id.startsWith('wf-')).toBe(true);
    expect(wf.steps).toHaveLength(3);
    expect(wf.status).toBe('pending');
    expect(wf.type).toBe('sequential');
  });

  it('retrieves a workflow by id', () => {
    const wf = createWorkflow(makeWorkflowInput());
    const found = getWorkflow(wf.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(wf.id);
  });

  it('returns null for unknown workflow', () => {
    expect(getWorkflow(`unknown-${Math.random()}`)).toBeNull();
  });

  it('lists workflows for a contract', () => {
    const contractId = `c-${Math.random()}`;
    createWorkflow(makeWorkflowInput(1));
    createWorkflow({ ...makeWorkflowInput(1), contractId });
    createWorkflow({ ...makeWorkflowInput(1), contractId });
    const list = getWorkflowsForContract(contractId);
    expect(list).toHaveLength(2);
  });
});

describe('Workflow — start & approve', () => {
  it('starts a pending workflow', () => {
    const wf = createWorkflow(makeWorkflowInput(2));
    const started = startWorkflow(wf.id);
    expect(started!.status).toBe('in_progress');
  });

  it('does not start a workflow that is not pending', () => {
    const wf = createWorkflow(makeWorkflowInput(1));
    startWorkflow(wf.id);
    const again = startWorkflow(wf.id);
    expect(again!.status).toBe('in_progress');
  });

  it('approves the first step of a sequential workflow', () => {
    const wf = createWorkflow(makeWorkflowInput(2));
    startWorkflow(wf.id);
    const step = wf.steps[0];
    const result = approveStep(wf.id, step.id, {
      id: 'approver-1',
      name: 'A1',
      email: 'a1@x.com',
      role: 'manager',
    });
    expect(result).toBeDefined();
    expect(result!.step.status).toBe('approved');
    expect(result!.completed).toBe(true);
  });

  it('completes a 1-step sequential workflow on approval', () => {
    const wf = createWorkflow(makeWorkflowInput(1));
    startWorkflow(wf.id);
    approveStep(wf.id, wf.steps[0].id, {
      id: 'a1',
      name: 'A1',
      email: 'a1@x.com',
      role: 'manager',
    });
    const after = getWorkflow(wf.id);
    expect(after!.status).toBe('approved');
    expect(after!.completedAt).toBeTruthy();
  });

  it('rejects a step and marks the whole workflow as rejected', () => {
    const wf = createWorkflow(makeWorkflowInput(2));
    startWorkflow(wf.id);
    rejectStep(
      wf.id,
      wf.steps[0].id,
      { id: 'a1', name: 'A1', email: 'a1@x.com', role: 'manager' },
      'No good'
    );
    const after = getWorkflow(wf.id);
    expect(after!.status).toBe('rejected');
    expect(after!.steps[0].status).toBe('rejected');
  });

  it('cancels a workflow', () => {
    const wf = createWorkflow(makeWorkflowInput(2));
    startWorkflow(wf.id);
    const cancelled = cancelWorkflow(wf.id, 'no longer needed');
    expect(cancelled!.status).toBe('cancelled');
  });

  it('returns null progress for unknown workflow', () => {
    const p = getWorkflowProgress(`unknown-${Math.random()}`);
    expect(p).toBeNull();
  });

  it('returns progress as a percentage', () => {
    const wf = createWorkflow(makeWorkflowInput(4));
    startWorkflow(wf.id);
    const p = getWorkflowProgress(wf.id);
    expect(p!.total).toBe(4);
    expect(p!.percent).toBe(0);
  });
});

describe('Workflow — parallel approval', () => {
  it('completes a parallel workflow when all steps approved', () => {
    const wf = createWorkflow({
      contractId: `c-${Math.random()}`,
      name: 'Parallel',
      type: 'parallel',
      steps: [
        { name: 'Legal', approverRole: 'legal' },
        { name: 'Finance', approverRole: 'finance' },
      ],
    });
    startWorkflow(wf.id);
    approveStep(wf.id, wf.steps[0].id, { id: 'l1', name: 'L', email: 'l@x.com', role: 'legal' });
    approveStep(wf.id, wf.steps[1].id, { id: 'f1', name: 'F', email: 'f@x.com', role: 'finance' });
    const after = getWorkflow(wf.id);
    expect(after!.status).toBe('approved');
  });
});
