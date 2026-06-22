export interface WorkflowStep { id: string; name: string; approverId: string; status: string; }
export function createWorkflow(name: string): WorkflowStep {
  return { id: 'wf-' + Date.now(), name, approverId: '', status: 'pending' };
}
