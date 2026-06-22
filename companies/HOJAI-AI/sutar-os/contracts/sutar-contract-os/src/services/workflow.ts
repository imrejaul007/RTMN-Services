/**
 * Contract Approval Workflow Service
 * Phase B.5 — Real implementation (was 4-LOC stub)
 */

import type {
  Workflow,
  WorkflowStep,
  WorkflowNotification,
  WorkflowCondition,
  WorkflowApprover,
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const WORKFLOW_STORE = new Map<string, Workflow>();
const NOTIFICATION_STORE: WorkflowNotification[] = [];

export interface CreateWorkflowInput {
  contractId: string;
  name: string;
  type: 'sequential' | 'parallel' | 'conditional';
  steps: Array<{
    name: string;
    description?: string;
    approverRole: string;
    approverEmail?: string;
    approverId?: string;
    requiredApprovals?: number;
    deadline?: string;
    condition?: WorkflowCondition;
  }>;
  deadline?: string;
}

export function createWorkflow(input: CreateWorkflowInput): Workflow {
  const now = new Date().toISOString();
  const steps: WorkflowStep[] = input.steps.map((s, idx) => ({
    id: `step-${uuidv4()}`,
    name: s.name,
    description: s.description,
    approverRole: s.approverRole,
    approverId: s.approverId,
    approverEmail: s.approverEmail,
    status: 'pending',
    order: idx,
    requiredApprovals: s.requiredApprovals ?? 1,
    currentApprovals: 0,
    approvers: [],
    deadline: s.deadline,
    condition: s.condition,
  }));

  const wf: Workflow = {
    id: `wf-${uuidv4()}`,
    contractId: input.contractId,
    name: input.name,
    type: input.type,
    steps,
    currentStepIndex: 0,
    status: 'pending',
    startedAt: now,
    deadline: input.deadline,
    notifications: [],
  };
  WORKFLOW_STORE.set(wf.id, wf);
  addNotification(wf.id, 'workflow_created', `Workflow "${input.name}" created with ${steps.length} steps`);
  return wf;
}

export function getWorkflow(id: string): Workflow | null {
  return WORKFLOW_STORE.get(id) || null;
}

export function getWorkflowsForContract(contractId: string): Workflow[] {
  return Array.from(WORKFLOW_STORE.values()).filter(w => w.contractId === contractId);
}

export function startWorkflow(id: string): Workflow | null {
  const wf = WORKFLOW_STORE.get(id);
  if (!wf || wf.status !== 'pending') return wf || null;
  wf.status = 'in_progress';
  addNotification(id, 'workflow_started', `Workflow "${wf.name}" started`);
  return wf;
}

export function approveStep(
  workflowId: string,
  stepId: string,
  approver: Omit<WorkflowApprover, 'status' | 'approvedAt'>,
  comments?: string
): { workflow: Workflow; step: WorkflowStep; completed: boolean } | null {
  const wf = WORKFLOW_STORE.get(workflowId);
  if (!wf || wf.status !== 'in_progress') return null;
  const step = wf.steps.find(s => s.id === stepId);
  if (!step || step.status !== 'pending') return null;

  step.approvers.push({
    ...approver,
    status: 'approved',
    approvedAt: new Date().toISOString(),
    comments,
  });
  step.currentApprovals++;
  step.comments = comments;

  if (step.currentApprovals >= step.requiredApprovals) {
    step.status = 'approved';
    step.completedAt = new Date().toISOString();
    advanceWorkflow(wf);
  }

  return { workflow: wf, step, completed: step.status === 'approved' };
}

export function rejectStep(
  workflowId: string,
  stepId: string,
  approver: Omit<WorkflowApprover, 'status' | 'approvedAt'>,
  comments: string
): { workflow: Workflow; step: WorkflowStep } | null {
  const wf = WORKFLOW_STORE.get(workflowId);
  if (!wf) return null;
  const step = wf.steps.find(s => s.id === stepId);
  if (!step) return null;

  step.approvers.push({
    ...approver,
    status: 'rejected',
    approvedAt: new Date().toISOString(),
    comments,
  });
  step.status = 'rejected';
  step.completedAt = new Date().toISOString();
  step.comments = comments;
  wf.status = 'rejected';
  wf.completedAt = new Date().toISOString();
  addNotification(workflowId, 'workflow_rejected', `Workflow rejected: ${comments}`);
  return { workflow: wf, step };
}

export function cancelWorkflow(workflowId: string, reason: string): Workflow | null {
  const wf = WORKFLOW_STORE.get(workflowId);
  if (!wf || wf.status === 'approved') return wf || null;
  wf.status = 'cancelled';
  wf.completedAt = new Date().toISOString();
  addNotification(workflowId, 'workflow_cancelled', `Cancelled: ${reason}`);
  return wf;
}

function advanceWorkflow(wf: Workflow): void {
  if (wf.type === 'sequential') {
    wf.currentStepIndex++;
    if (wf.currentStepIndex >= wf.steps.length) {
      wf.status = 'approved';
      wf.completedAt = new Date().toISOString();
      addNotification(wf.id, 'workflow_completed', `All ${wf.steps.length} steps approved`);
    }
  } else if (wf.type === 'parallel') {
    const allDone = wf.steps.every(s => s.status === 'approved' || s.status === 'skipped');
    if (allDone) {
      wf.status = 'approved';
      wf.completedAt = new Date().toISOString();
      addNotification(wf.id, 'workflow_completed', `All parallel steps approved`);
    }
  } else if (wf.type === 'conditional') {
    wf.currentStepIndex++;
    if (wf.currentStepIndex >= wf.steps.length) {
      wf.status = 'approved';
      wf.completedAt = new Date().toISOString();
    }
  }
}

function addNotification(workflowId: string, type: string, message: string): void {
  const n: WorkflowNotification = {
    id: `notif-${uuidv4()}`,
    type: type as any,
    recipient: 'system',
    message,
    sentAt: new Date().toISOString(),
    delivered: true,
  };
  NOTIFICATION_STORE.push(n);
  const wf = WORKFLOW_STORE.get(workflowId);
  if (wf) wf.notifications.push(n);
}

export function getWorkflowProgress(workflowId: string): {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  percent: number;
} | null {
  const wf = WORKFLOW_STORE.get(workflowId);
  if (!wf) return null;
  const total = wf.steps.length;
  const approved = wf.steps.filter(s => s.status === 'approved').length;
  const rejected = wf.steps.filter(s => s.status === 'rejected').length;
  const pending = wf.steps.filter(s => s.status === 'pending').length;
  return { total, approved, pending, rejected, percent: total ? Math.round((approved / total) * 100) : 0 };
}

export const _internal = { WORKFLOW_STORE, NOTIFICATION_STORE };
export default {
  createWorkflow,
  getWorkflow,
  getWorkflowsForContract,
  startWorkflow,
  approveStep,
  rejectStep,
  cancelWorkflow,
  getWorkflowProgress,
};
