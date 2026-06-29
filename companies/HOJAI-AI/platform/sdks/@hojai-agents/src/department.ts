/**
 * HOJAI Department
 */

import { Agent } from './agent';

export interface DepartmentDefinition {
  id: string;
  name: string;
  type: 'sales' | 'marketing' | 'support' | 'hr' | 'finance' | 'operations' | 'custom';
  description?: string;
  head: Agent;
  agents: Agent[];
  workflows?: string[];
  twins?: string[];
  memory?: string[];
  metadata?: Record<string, any>;
}

export class Department {
  public id: string;
  public name: string;
  public type: DepartmentDefinition['type'];
  public description?: string;
  public head: Agent;
  public agents: Map<string, Agent>;
  public workflows: string[];
  public twins: string[];
  public memory: string[];
  public metadata: Record<string, any>;

  constructor(definition: DepartmentDefinition) {
    this.id = definition.id;
    this.name = definition.name;
    this.type = definition.type;
    this.description = definition.description;
    this.head = definition.head;
    this.agents = new Map(definition.agents.map(a => [a.id, a]));
    this.workflows = definition.workflows || [];
    this.twins = definition.twins || [];
    this.memory = definition.memory || [];
    this.metadata = definition.metadata || {};
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  addAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  removeAgent(id: string): void {
    this.agents.delete(id);
  }

  async execute(task: any): Promise<any> {
    // Route to appropriate agent
    const agent = this.selectAgent(task);
    return agent.execute({ agentId: agent.id, input: task });
  }

  private selectAgent(task: any): Agent {
    // Simple routing - could be enhanced with agent capabilities
    for (const agent of this.agents.values()) {
      if (agent.skills.some(s => task.type?.includes(s))) {
        return agent;
      }
    }
    return this.head;
  }

  toDefinition(): DepartmentDefinition {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      head: this.head,
      agents: Array.from(this.agents.values()),
      workflows: this.workflows,
      twins: this.twins,
      memory: this.memory,
      metadata: this.metadata,
    };
  }
}

// Pre-built departments
export class SalesDepartment extends Department {
  constructor() {
    const { SDRAgent } = require('./agent');

    super({
      id: 'sales-department',
      name: 'Sales Department',
      type: 'sales',
      description: 'AI-powered sales team',
      head: new SDRAgent('sales-head'),
      agents: [
        new SDRAgent('sdr-1'),
        new SDRAgent('sdr-2'),
      ],
      workflows: ['lead-qualification', 'proposal-generation', 'follow-up-sequence'],
      twins: ['customer-twin', 'lead-twin', 'deal-twin'],
      memory: ['customer-history', 'interaction-memory'],
    });
  }
}

export class SupportDepartment extends Department {
  constructor() {
    const { SupportAgent } = require('./agent');

    super({
      id: 'support-department',
      name: 'Customer Support',
      type: 'support',
      description: 'AI-powered customer support',
      head: new SupportAgent('support-head'),
      agents: [
        new SupportAgent('support-1'),
        new SupportAgent('support-2'),
      ],
      workflows: ['ticket-classification', 'response-generation'],
      twins: ['ticket-twin', 'customer-twin'],
      memory: ['ticket-history', 'customer-interactions'],
    });
  }
}
