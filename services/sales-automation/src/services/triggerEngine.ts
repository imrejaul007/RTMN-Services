import { store, Workflow, WorkflowExecution, Trigger, WorkflowAction } from '../models/Automation';

export interface TriggerResult {
  success: boolean;
  workflowId: string;
  executionId: string;
  actionsExecuted: number;
  results: Record<string, any>;
  message: string;
}

export class TriggerEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private processing: boolean = false;

  start(intervalMs: number = 60000): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.checkScheduledTriggers().catch(console.error);
    }, intervalMs);

    console.log('Trigger engine started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Trigger engine stopped');
    }
  }

  async checkScheduledTriggers(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      const workflows = store.getAllWorkflows().filter(w => w.active);

      for (const workflow of workflows) {
        for (const trigger of workflow.triggers) {
          if (trigger.type === 'schedule' && trigger.enabled) {
            await this.evaluateScheduledTrigger(workflow, trigger);
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async evaluateScheduledTrigger(workflow: Workflow, trigger: Trigger): Promise<void> {
    // Simplified schedule evaluation
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Parse schedule (simplified - "every_hour", "daily_9am", etc.)
    if (trigger.schedule === 'hourly' && now.getMinutes() === 0) {
      await this.executeWorkflow(workflow, { triggerType: 'schedule' });
    }
  }

  async handleEvent(eventType: string, eventData: Record<string, any>): Promise<TriggerResult[]> {
    const results: TriggerResult[] = [];
    const workflows = store.getAllWorkflows().filter(w => w.active);

    for (const workflow of workflows) {
      for (const trigger of workflow.triggers) {
        if (trigger.type === 'event' && trigger.event === eventType && trigger.enabled) {
          // Check conditions if specified
          if (trigger.conditions && trigger.conditions.length > 0) {
            const matches = await this.testConditions([trigger], eventData);
            if (!matches) {
              continue;
            }
          }

          const result = await this.executeWorkflow(workflow, {
            triggerType: 'event',
            eventType,
            ...eventData
          });
          results.push(result);
        }
      }
    }

    return results;
  }

  async executeWorkflow(
    workflow: Workflow,
    triggerData: Record<string, any>
  ): Promise<TriggerResult> {
    const execution = store.createWorkflowExecution({
      workflowId: workflow.id,
      triggerType: triggerData.triggerType || 'manual',
      triggerData
    });

    const results: Record<string, any> = {};

    try {
      // Sort actions by order
      const sortedActions = [...workflow.actions].sort((a, b) => a.order - b.order);

      for (const action of sortedActions) {
        // Check action condition if specified
        if (action.condition) {
          const matches = await this.evaluateConditionString(action.condition, triggerData);
          if (!matches) {
            console.log(`Skipping action ${action.type} - condition not met`);
            continue;
          }
        }

        // Wait for delay if specified
        if (action.delayMinutes) {
          await new Promise(resolve => setTimeout(resolve, action.delayMinutes * 60 * 1000));
        }

        // Execute action
        const actionResult = await this.executeAction(action, triggerData);
        results[action.id] = actionResult;
        execution.actionsExecuted++;
      }

      // Update workflow stats
      store.updateWorkflow(workflow.id, {
        executionCount: workflow.executionCount + 1,
        lastExecutedAt: new Date()
      });

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.results = results;

      return {
        success: true,
        workflowId: workflow.id,
        executionId: execution.id,
        actionsExecuted: execution.actionsExecuted,
        results,
        message: `Workflow ${workflow.name} executed successfully`
      };
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = (error as Error).message;
      results.error = (error as Error).message;

      return {
        success: false,
        workflowId: workflow.id,
        executionId: execution.id,
        actionsExecuted: execution.actionsExecuted,
        results,
        message: `Workflow ${workflow.name} failed: ${(error as Error).message}`
      };
    }
  }

  private async executeAction(
    action: WorkflowAction,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    switch (action.type) {
      case 'followup':
        return this.executeFollowUpAction(action, context);

      case 'route':
        return this.executeRouteAction(action, context);

      case 'escalate':
        return this.executeEscalateAction(action, context);

      case 'notify':
        return this.executeNotifyAction(action, context);

      case 'update':
        return this.executeUpdateAction(action, context);

      case 'webhook':
        return this.executeWebhookAction(action, context);

      default:
        console.log(`Unknown action type: ${action.type}`);
        return { success: true, message: 'Action type not implemented' };
    }
  }

  private async executeFollowUpAction(action: WorkflowAction, context: Record<string, any>): Promise<Record<string, any>> {
    const leadId = context.leadId || action.config.leadId;
    if (!leadId) {
      throw new Error('Lead ID required for follow-up action');
    }

    const followUp = store.createFollowUp({
      leadId,
      type: action.config.type || 'email',
      template: action.config.template || '',
      subject: action.config.subject,
      scheduledAt: new Date(Date.now() + (action.delayMinutes || 0) * 60 * 1000),
      priority: action.config.priority || 'medium',
      metadata: { workflowId: action.id, ...context }
    });

    return { success: true, followUpId: followUp.id };
  }

  private async executeRouteAction(action: WorkflowAction, context: Record<string, any>): Promise<Record<string, any>> {
    const leadId = context.leadId || action.config.leadId;
    if (!leadId) {
      throw new Error('Lead ID required for route action');
    }

    return {
      success: true,
      leadId,
      queue: action.config.targetQueue || 'general'
    };
  }

  private async executeEscalateAction(action: WorkflowAction, context: Record<string, any>): Promise<Record<string, any>> {
    const leadId = context.leadId || action.config.leadId;
    if (!leadId) {
      throw new Error('Lead ID required for escalate action');
    }

    const escalation = store.createEscalation({
      leadId,
      currentLevel: action.config.level || 1,
      metadata: { workflowId: action.id, ...context }
    });

    return { success: true, escalationId: escalation.id };
  }

  private async executeNotifyAction(action: WorkflowAction, context: Record<string, any>): Promise<Record<string, any>> {
    const channels = action.config.channels || ['email'];
    const message = action.config.message || 'Notification from workflow';

    console.log(`[NOTIFY] ${channels.join(', ')}: ${message}`);

    return {
      success: true,
      channels,
      message
    };
  }

  private async executeUpdateAction(action: WorkflowAction, context: Record<string, any>): Promise<Record<string, any>> {
    const updates = action.config.updates || {};

    return {
      success: true,
      updates,
      message: 'Record updated'
    };
  }

  private async executeWebhookAction(action: WorkflowAction, context: Record<string, any>): Promise<Record<string, any>> {
    const url = action.config.url;
    if (!url) {
      throw new Error('URL required for webhook action');
    }

    // Simulated webhook call
    console.log(`[WEBHOOK] POST ${url}`);

    return {
      success: true,
      url,
      payload: context
    };
  }

  async testConditions(triggers: Trigger[], data: Record<string, any>): Promise<boolean> {
    for (const trigger of triggers) {
      if (trigger.type === 'event') {
        if (trigger.conditions && trigger.conditions.length > 0) {
          for (const condition of trigger.conditions) {
            const value = this.getNestedValue(data, condition.field);
            if (!this.evaluateCondition(value, condition.operator, condition.value)) {
              return false;
            }
          }
        }
      }
    }
    return true;
  }

  private async evaluateConditionString(condition: string, data: Record<string, any>): Promise<boolean> {
    // Simple condition evaluation (e.g., "lead.score > 50")
    try {
      const [field, op, value] = condition.split(/\s+/);
      const fieldValue = this.getNestedValue(data, field);
      return this.evaluateCondition(fieldValue, op as any, this.parseValue(value));
    } catch {
      return false;
    }
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private evaluateCondition(value: any, operator: string, compareValue: any): boolean {
    switch (operator) {
      case '==':
      case '===':
        return value === compareValue;
      case '!=':
      case '!==':
        return value !== compareValue;
      case '>':
        return Number(value) > Number(compareValue);
      case '>=':
        return Number(value) >= Number(compareValue);
      case '<':
        return Number(value) < Number(compareValue);
      case '<=':
        return Number(value) <= Number(compareValue);
      case 'contains':
        return String(value).toLowerCase().includes(String(compareValue).toLowerCase());
      default:
        return false;
    }
  }

  private parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(Number(value))) return Number(value);
    return value.replace(/['"]/g, '');
  }

  getWorkflowStats() {
    const workflows = store.getAllWorkflows();
    const executions = Array.from(
      workflows.flatMap(w => store.getExecutionsByWorkflow(w.id))
    );

    return {
      workflows: {
        total: workflows.length,
        active: workflows.filter(w => w.active).length,
        byTriggerType: {
          event: workflows.filter(w => w.triggers.some(t => t.type === 'event')).length,
          schedule: workflows.filter(w => w.triggers.some(t => t.type === 'schedule')).length,
          condition: workflows.filter(w => w.triggers.some(t => t.type === 'condition')).length,
          manual: workflows.filter(w => w.triggers.some(t => t.type === 'manual')).length
        }
      },
      executions: {
        total: executions.length,
        completed: executions.filter(e => e.status === 'completed').length,
        failed: executions.filter(e => e.status === 'failed').length,
        running: executions.filter(e => e.status === 'running').length
      }
    };
  }
}
