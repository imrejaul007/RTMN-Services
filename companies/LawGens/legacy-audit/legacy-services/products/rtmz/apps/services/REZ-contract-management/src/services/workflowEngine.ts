import { Contract } from '../models/Contract';
import { Signature } from '../models/Signature';
import { logger } from '../utils/logger';

export type WorkflowStepType =
  | 'send_for_signature'
  | 'wait_for_all_signatures'
  | 'wait_for_required_signatures'
  | 'notify'
  | 'update_status'
  | 'condition';

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  params?: Record<string, unknown>;
  onSuccess?: string;
  onFailure?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  steps: WorkflowStep[];
  initialStep: string;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  contractId: string;
  tenantId: string;
  currentStep: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  context: Record<string, unknown>;
  history: {
    stepId: string;
    stepType: string;
    startedAt: Date;
    completedAt?: Date;
    result?: 'success' | 'failure';
    error?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const SIGNATURE_WORKFLOW: WorkflowDefinition = {
  id: 'signature_workflow',
  name: 'Signature Workflow',
  steps: [
    {
      id: 'send_signatures',
      type: 'send_for_signature',
      params: {},
      onSuccess: 'wait_for_signatures',
      onFailure: 'fail'
    },
    {
      id: 'wait_for_signatures',
      type: 'wait_for_all_signatures',
      params: {
        checkIntervalMs: 60000
      },
      onSuccess: 'update_signed',
      onFailure: 'fail'
    },
    {
      id: 'update_signed',
      type: 'update_status',
      params: {
        status: 'signed'
      },
      onSuccess: 'complete',
      onFailure: 'fail'
    },
    {
      id: 'fail',
      type: 'notify',
      params: {
        message: 'Workflow failed',
        type: 'error'
      }
    },
    {
      id: 'complete',
      type: 'notify',
      params: {
        message: 'Workflow completed successfully',
        type: 'success'
      }
    }
  ],
  initialStep: 'send_signatures'
};

export class WorkflowEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private activeInstances: Map<string, WorkflowInstance> = new Map();
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.registerWorkflow(SIGNATURE_WORKFLOW);
  }

  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    logger.info(`Workflow registered: ${workflow.id}`, { name: workflow.name });
  }

  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  async startWorkflow(
    workflowId: string,
    contractId: string,
    tenantId: string,
    initialContext: Record<string, unknown> = {}
  ): Promise<WorkflowInstance> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const instance: WorkflowInstance = {
      id: `WFI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      contractId,
      tenantId,
      currentStep: workflow.initialStep,
      status: 'pending',
      context: initialContext,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.activeInstances.set(instance.id, instance);
    logger.info(`Workflow started: ${instance.id}`, { workflowId, contractId, tenantId });

    await this.executeStep(instance);

    return instance;
  }

  private async executeStep(instance: WorkflowInstance): Promise<void> {
    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${instance.workflowId}`);
    }

    const step = workflow.steps.find(s => s.id === instance.currentStep);
    if (!step) {
      throw new Error(`Step not found: ${instance.currentStep} in workflow ${instance.workflowId}`);
    }

    instance.status = 'in_progress';
    instance.updatedAt = new Date();

    const historyEntry: WorkflowInstance['history'][0] = {
      stepId: step.id,
      stepType: step.type,
      startedAt: new Date(),
      completedAt: undefined,
      result: undefined,
      error: undefined
    };

    try {
      logger.info(`Executing workflow step: ${step.id}`, {
        instanceId: instance.id,
        contractId: instance.contractId
      });

      const result = await this.executeStepAction(step, instance);

      historyEntry.completedAt = new Date();
      historyEntry.result = 'success';
      instance.history.push(historyEntry);

      if (result?.nextStep) {
        instance.currentStep = result.nextStep;
      } else if (step.onSuccess && result?.success !== false) {
        instance.currentStep = step.onSuccess;
      } else if (step.onFailure) {
        instance.currentStep = step.onFailure;
      } else {
        instance.status = 'completed';
        logger.info(`Workflow completed: ${instance.id}`, {
          contractId: instance.contractId
        });
        return;
      }

      if (instance.currentStep === 'complete' || instance.currentStep === 'fail') {
        instance.status = instance.currentStep === 'complete' ? 'completed' : 'failed';
        this.activeInstances.delete(instance.id);
        this.stopCheckInterval(instance.id);
        return;
      }

      instance.updatedAt = new Date();

      if (step.type === 'wait_for_all_signatures' || step.type === 'wait_for_required_signatures') {
        this.startCheckInterval(instance);
      } else {
        await this.executeStep(instance);
      }

    } catch (error) {
      historyEntry.completedAt = new Date();
      historyEntry.result = 'failure';
      historyEntry.error = error instanceof Error ? error.message : 'Unknown error';
      instance.history.push(historyEntry);
      instance.status = 'failed';
      instance.updatedAt = new Date();

      logger.error(`Workflow step failed: ${step.id}`, {
        instanceId: instance.id,
        contractId: instance.contractId,
        error
      });

      if (step.onFailure) {
        instance.currentStep = step.onFailure;
        await this.executeStep(instance);
      } else {
        this.activeInstances.delete(instance.id);
        this.stopCheckInterval(instance.id);
      }
    }
  }

  private async executeStepAction(
    step: WorkflowStep,
    instance: WorkflowInstance
  ): Promise<{ success?: boolean; nextStep?: string }> {
    switch (step.type) {
      case 'send_for_signature':
        return { success: true };

      case 'wait_for_all_signatures':
        return { success: true };

      case 'wait_for_required_signatures':
        return { success: true };

      case 'update_status':
        if (step.params?.status) {
          await Contract.updateOne(
            { contractId: instance.contractId },
            { $set: { status: step.params.status as string } }
          );
          instance.context.lastStatusUpdate = step.params.status;
        }
        return { success: true };

      case 'notify':
        const message = step.params?.message as string;
        const type = step.params?.type as string;
        logger.info(`Workflow notification [${type}]: ${message}`, {
          instanceId: instance.id,
          contractId: instance.contractId
        });
        return { success: true };

      case 'condition':
        const conditionMet = this.evaluateCondition(step.params?.condition as string, instance.context);
        return { success: conditionMet, nextStep: conditionMet ? step.onSuccess : step.onFailure };

      default:
        logger.warn(`Unknown step type: ${step.type}`, { stepId: step.id });
        return { success: true };
    }
  }

  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    try {
      const func = new Function('context', `return ${condition}`);
      return func(context);
    } catch {
      logger.error('Failed to evaluate condition', { condition });
      return false;
    }
  }

  private startCheckInterval(instance: WorkflowInstance): void {
    const checkIntervalMs = 60000;

    const interval = setInterval(async () => {
      const sig = await this.checkSignatureCompletion(instance);
      if (sig.completed) {
        this.stopCheckInterval(instance.id);
        instance.currentStep = sig.allSigned ? 'update_signed' : 'wait_for_signatures';
        await this.executeStep(instance);
      }
    }, checkIntervalMs);

    this.checkIntervals.set(instance.id, interval);
  }

  private stopCheckInterval(instanceId: string): void {
    const interval = this.checkIntervals.get(instanceId);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(instanceId);
    }
  }

  private async checkSignatureCompletion(instance: WorkflowInstance): Promise<{
    completed: boolean;
    allSigned: boolean;
  }> {
    const contract = await Contract.findOne({ contractId: instance.contractId });
    if (!contract) {
      return { completed: true, allSigned: false };
    }

    if (contract.status === 'signed') {
      return { completed: true, allSigned: true };
    }

    if (contract.status === 'terminated') {
      return { completed: true, allSigned: false };
    }

    const signatures = await Signature.find({
      contractId: instance.contractId,
      tenantId: instance.tenantId
    });

    const pendingSigs = signatures.filter(s => s.status === 'pending');
    return {
      completed: pendingSigs.length === 0,
      allSigned: pendingSigs.length === 0
    };
  }

  getInstance(instanceId: string): WorkflowInstance | undefined {
    return this.activeInstances.get(instanceId);
  }

  getActiveInstances(): WorkflowInstance[] {
    return Array.from(this.activeInstances.values());
  }

  async cancelWorkflow(instanceId: string): Promise<boolean> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      return false;
    }

    instance.status = 'cancelled';
    this.stopCheckInterval(instanceId);
    this.activeInstances.delete(instanceId);

    logger.info(`Workflow cancelled: ${instanceId}`, {
      contractId: instance.contractId
    });

    return true;
  }

  cleanup(): void {
    for (const interval of this.checkIntervals.values()) {
      clearInterval(interval);
    }
    this.checkIntervals.clear();
    this.activeInstances.clear();
    logger.info('Workflow engine cleaned up');
  }
}

export const workflowEngine = new WorkflowEngine();
