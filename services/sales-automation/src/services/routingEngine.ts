import { store, RoutingRule, Condition, RoutingPriority, RouteAssignment } from '../models/Automation';

export interface RouteRequest {
  leadId: string;
  dealId?: string;
  leadData?: Record<string, any>;
  priority?: RoutingPriority;
  forceQueue?: string;
  forceAgent?: string;
}

export interface RouteResult {
  success: boolean;
  leadId: string;
  queueId?: string;
  queueName?: string;
  agentId?: string;
  priority: RoutingPriority;
  score: number;
  ruleId?: string;
  assignmentId?: string;
  message: string;
}

export class RoutingEngine {
  async routeLead(request: RouteRequest): Promise<RouteResult> {
    const { leadId, dealId, leadData, priority, forceQueue, forceAgent } = request;

    // If forced routing, use that directly
    if (forceQueue || forceAgent) {
      const assignment = store.createRouteAssignment({
        leadId,
        dealId,
        queueId: forceQueue,
        agentId: forceAgent,
        priority: priority || 'medium',
        score: 100
      });

      return {
        success: true,
        leadId,
        queueId: forceQueue,
        agentId: forceAgent,
        priority: priority || 'medium',
        score: 100,
        assignmentId: assignment.id,
        message: `Lead ${leadId} routed to ${forceQueue ? `queue ${forceQueue}` : `agent ${forceAgent}`}`
      };
    }

    // Get active routing rules
    const rules = store.getAllRoutingRules().filter(r => r.active);

    if (rules.length === 0) {
      // Default routing
      const defaultQueue = process.env.ROUTING_DEFAULT_QUEUE || 'general';
      const assignment = store.createRouteAssignment({
        leadId,
        dealId,
        queueId: defaultQueue,
        priority: priority || 'medium',
        score: 50
      });

      return {
        success: true,
        leadId,
        queueId: defaultQueue,
        priority: priority || 'medium',
        score: 50,
        assignmentId: assignment.id,
        message: `Lead ${leadId} routed to default queue (${defaultQueue})`
      };
    }

    // Evaluate rules in order
    for (const rule of rules) {
      if (this.evaluateConditions(rule.conditions, leadData || {})) {
        const assignment = store.createRouteAssignment({
          leadId,
          dealId,
          ruleId: rule.id,
          queueId: rule.targetQueue,
          agentId: rule.targetAgent,
          priority: rule.priority,
          score: rule.score || this.calculateScore(leadData || {})
        });

        return {
          success: true,
          leadId,
          queueId: rule.targetQueue,
          queueName: rule.name,
          agentId: rule.targetAgent,
          priority: rule.priority,
          score: assignment.score,
          ruleId: rule.id,
          assignmentId: assignment.id,
          message: `Lead ${leadId} matched rule "${rule.name}" -> ${rule.targetQueue}`
        };
      }
    }

    // No rule matched, use default
    const defaultQueue = process.env.ROUTING_DEFAULT_QUEUE || 'general';
    const assignment = store.createRouteAssignment({
      leadId,
      dealId,
      priority: priority || 'medium',
      score: 30
    });

    return {
      success: true,
      leadId,
      queueId: defaultQueue,
      priority: priority || 'medium',
      score: 30,
      assignmentId: assignment.id,
      message: `Lead ${leadId} routed to default queue (no rules matched)`
    };
  }

  async batchRouteLeads(requests: RouteRequest[]): Promise<RouteResult[]> {
    const results: RouteResult[] = [];

    for (const request of requests) {
      const result = await this.routeLead(request);
      results.push(result);
    }

    return results;
  }

  private evaluateConditions(conditions: Condition[], data: Record<string, any>): boolean {
    if (conditions.length === 0) {
      return true;
    }

    let result = this.evaluateCondition(conditions[0], data);

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateCondition(condition, data);
      const logicalOp = condition.logicalOperator || 'AND';

      if (logicalOp === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
    }

    return result;
  }

  private evaluateCondition(condition: Condition, data: Record<string, any>): boolean {
    const fieldValue = this.getNestedValue(data, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;

      case 'not_equals':
        return fieldValue !== condition.value;

      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);

      case 'less_than':
        return Number(fieldValue) < Number(condition.value);

      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());

      case 'in':
        if (Array.isArray(condition.value)) {
          return condition.value.includes(fieldValue);
        }
        return false;

      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private calculateScore(data: Record<string, any>): number {
    let score = 50; // Base score

    // High priority sources
    const highPrioritySources = ['referral', 'partner', 'enterprise'];
    const source = (data.source || '').toLowerCase();
    if (highPrioritySources.includes(source)) {
      score += 20;
    }

    // Budget score
    if (data.budget && Number(data.budget) > 10000) {
      score += 15;
    }

    // Engagement score
    if (data.engagement && Number(data.engagement) > 80) {
      score += 15;
    }

    return Math.min(100, score);
  }

  async getBestAvailableAgent(queueId: string): Promise<string | undefined> {
    const queue = store.getQueue(queueId);
    if (!queue || !queue.agents.length) {
      return undefined;
    }

    // Return first available agent (simplified - real implementation would check agent status)
    return queue.agents[0];
  }

  async rebalanceQueues(): Promise<void> {
    const queues = store.getAllQueues().filter(q => q.active);

    for (const queue of queues) {
      if (queue.currentLoad > queue.capacity) {
        // Redistribute load to other queues
        console.log(`Queue ${queue.name} overloaded: ${queue.currentLoad}/${queue.capacity}`);
      }
    }
  }

  getRoutingStats() {
    const queues = store.getAllQueues();
    const rules = store.getAllRoutingRules();

    return {
      queues: queues.map(q => ({
        id: q.id,
        name: q.name,
        agents: q.agents.length,
        currentLoad: q.currentLoad,
        capacity: q.capacity,
        utilization: q.capacity > 0 ? Math.round((q.currentLoad / q.capacity) * 100) : 0
      })),
      rules: {
        total: rules.length,
        active: rules.filter(r => r.active).length,
        byPriority: {
          high: rules.filter(r => r.priority === 'high').length,
          medium: rules.filter(r => r.priority === 'medium').length,
          low: rules.filter(r => r.priority === 'low').length
        }
      }
    };
  }
}
