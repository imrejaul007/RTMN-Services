import { Workflow, IWorkflow, IWorkflowStep } from './models/Workflow';
import { WorkflowInstance, IWorkflowInstance, IStepExecution } from './models/WorkflowInstance';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export class WorkflowExecutor {
  private runningInstances: Map<string, boolean> = new Map();

  async createInstance(
    workflowId: string,
    trigger: { type: 'event' | 'schedule' | 'manual' | 'api'; by: string },
    initialContext: Record<string, any> = {}
  ): Promise<IWorkflowInstance> {
    const workflow = await Workflow.findOne({ workflowId });
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'active') {
      throw new Error(`Workflow ${workflowId} is not active`);
    }

    const instance = new WorkflowInstance({
      instanceId: `WI-${uuidv4().substring(0, 8).toUpperCase()}`,
      workflowId: workflow.workflowId,
      workflowName: workflow.name,
      status: 'pending',
      context: { ...workflow.variables, ...initialContext },
      triggeredBy: trigger.by,
      triggeredByType: trigger.type,
    });

    await instance.save();
    logger.info(`Created workflow instance: ${instance.instanceId}`);
    return instance;
  }

  async executeInstance(instanceId: string): Promise<IWorkflowInstance> {
    const instance = await WorkflowInstance.findOne({ instanceId });
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    if (this.runningInstances.get(instanceId)) {
      throw new Error(`Instance ${instanceId} is already running`);
    }

    this.runningInstances.set(instanceId, true);

    try {
      instance.status = 'running';
      instance.startedAt = new Date();
      await instance.save();

      const workflow = await Workflow.findOne({ workflowId: instance.workflowId });
      if (!workflow) {
        throw new Error(`Workflow ${instance.workflowId} not found`);
      }

      let currentStep = workflow.steps[0];

      while (currentStep && instance.status === 'running') {
        instance.currentStep = currentStep.stepId;

        const stepExecution: IStepExecution = {
          stepId: currentStep.stepId,
          stepName: currentStep.name,
          status: 'running',
          startedAt: new Date(),
          retryCount: 0,
        };

        instance.executionHistory.push(stepExecution);
        await instance.save();

        try {
          const result = await this.executeStep(currentStep, instance.context);

          stepExecution.status = 'completed';
          stepExecution.completedAt = new Date();
          stepExecution.output = result;

          instance.context[currentStep.stepId] = result;
          await instance.save();

          if (currentStep.type === 'condition') {
            const shouldContinue = this.evaluateCondition(
              currentStep.condition,
              instance.context
            );
            if (shouldContinue && currentStep.nextStep) {
              currentStep = workflow.steps.find(s => s.stepId === currentStep.nextStep);
            } else {
              currentStep = undefined;
            }
          } else if (currentStep.nextStep) {
            currentStep = workflow.steps.find(s => s.stepId === currentStep.nextStep);
          } else {
            currentStep = undefined;
          }
        } catch (error: any) {
          stepExecution.status = 'failed';
          stepExecution.error = error.message;

          if (currentStep.onError) {
            currentStep = workflow.steps.find(s => s.stepId === currentStep.onError);
          } else {
            instance.status = 'failed';
            instance.error = error.message;
            break;
          }
        }
      }

      if (instance.status === 'running') {
        instance.status = 'completed';
        instance.completedAt = new Date();
      }

      await instance.save();
      logger.info(`Workflow instance ${instanceId} completed with status: ${instance.status}`);
    } finally {
      this.runningInstances.delete(instanceId);
    }

    return instance;
  }

  private async executeStep(
    step: IWorkflowStep,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    switch (step.type) {
      case 'action':
        return await this.executeAction(step, context);
      case 'delay':
        const delay = step.config.duration || 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return { delayed: delay };
      case 'condition':
        return { evaluated: true };
      case 'parallel':
        return await this.executeParallel(step, context);
      case 'merge':
        return { merged: true };
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeAction(
    step: IWorkflowStep,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    const { actionType, params } = step.config;

    logger.info(`Executing action: ${actionType}`, { params });

    switch (actionType) {
      case 'http':
        return await this.executeHttpAction(params, context);
      case 'transform':
        return this.executeTransformAction(params, context);
      case 'notify':
        return this.executeNotifyAction(params, context);
      case 'store':
        return this.executeStoreAction(params, context);
      default:
        return { actionType, executed: true };
    }
  }

  private async executeHttpAction(
    params: Record<string, any>,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    const { url, method, headers, body } = params;

    const response = await fetch(url, {
      method: method || 'GET',
      headers: headers || {},
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return { status: response.status, data };
  }

  private executeTransformAction(
    params: Record<string, any>,
    context: Record<string, any>
  ): Record<string, any> {
    const { mapping } = params;
    const result: Record<string, any> = {};

    for (const [target, source] of Object.entries(mapping)) {
      result[target] = this.resolveValue(source, context);
    }

    return result;
  }

  private executeNotifyAction(
    params: Record<string, any>,
    context: Record<string, any>
  ): Record<string, any> {
    const { channel, message } = params;
    logger.info(`Notification sent to ${channel}: ${message}`);
    return { notified: channel, message };
  }

  private executeStoreAction(
    params: Record<string, any>,
    context: Record<string, any>
  ): Record<string, any> {
    const { key, value } = params;
    context[key] = this.resolveValue(value, context);
    return { stored: key };
  }

  private async executeParallel(
    step: IWorkflowStep,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    const { steps: parallelSteps } = step.config;
    const results = await Promise.all(
      parallelSteps.map(async (subStep: IWorkflowStep) => {
        return this.executeStep(subStep, context);
      })
    );
    return { results };
  }

  private evaluateCondition(
    condition: string | undefined,
    context: Record<string, any>
  ): boolean {
    if (!condition) return true;

    try {
      const fn = new Function('context', `with(context) { return ${condition}; }`);
      return fn(context) as boolean;
    } catch {
      return false;
    }
  }

  private resolveValue(value: any, context: Record<string, any>): any {
    if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
      const key = value.slice(2, -1);
      return key.split('.').reduce((obj, k) => obj?.[k], context);
    }
    return value;
  }

  async pauseInstance(instanceId: string): Promise<IWorkflowInstance> {
    const instance = await WorkflowInstance.findOne({ instanceId });
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    instance.status = 'paused';
    await instance.save();
    return instance;
  }

  async resumeInstance(instanceId: string): Promise<IWorkflowInstance> {
    const instance = await WorkflowInstance.findOne({ instanceId });
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    if (instance.status !== 'paused') {
      throw new Error(`Instance ${instanceId} is not paused`);
    }

    return this.executeInstance(instanceId);
  }

  async cancelInstance(instanceId: string): Promise<IWorkflowInstance> {
    const instance = await WorkflowInstance.findOne({ instanceId });
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    instance.status = 'cancelled';
    await instance.save();
    return instance;
  }
}

export const workflowExecutor = new WorkflowExecutor();
