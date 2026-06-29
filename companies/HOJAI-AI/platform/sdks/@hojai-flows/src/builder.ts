/**
 * HOJAI Flow Builder
 * Fluent API for creating workflows
 */

import { Workflow } from './workflow';
import { Node, NodeType } from './node';
import { Trigger, TriggerType } from './trigger';

export class FlowBuilder {
  private id: string;
  private name: string;
  private version = '1.0.0';
  private description?: string;
  private triggers: Trigger[] = [];
  private nodes: Node[] = [];
  private connections: { from: string; to: string; condition?: string }[] = [];
  private memory?: { required?: string[]; updateOn?: string[] };
  private twins?: { creates?: string[]; updates?: string[] };
  private agents: string[] = [];
  private integrations: string[] = [];

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  version(v: string): this {
    this.version = v;
    return this;
  }

  description(desc: string): this {
    this.description = desc;
    return this;
  }

  addTrigger(type: TriggerType, name: string, config: any = {}): this {
    this.triggers.push({
      id: `trigger_${this.triggers.length}`,
      type,
      name,
      config,
      enabled: true,
    });
    return this;
  }

  addNode(type: NodeType, id: string, name: string, config: any = {}): this {
    this.nodes.push({
      id,
      type,
      name,
      config,
      onError: 'continue',
    });
    return this;
  }

  addAgentNode(agentId: string, nodeId: string, name: string, config: any = {}): this {
    this.nodes.push({
      id: nodeId,
      type: 'ai_agent',
      name,
      config: { agent: agentId, ...config },
      onError: 'continue',
    });
    this.agents.push(agentId);
    return this;
  }

  addMemoryNode(nodeId: string, name: string, action: string, config: any = {}): this {
    this.nodes.push({
      id: nodeId,
      type: 'memory',
      name,
      config: { action, ...config },
      onError: 'continue',
    });
    return this;
  }

  addTwinNode(nodeId: string, name: string, twin: string, action: string, config: any = {}): this {
    this.nodes.push({
      id: nodeId,
      type: 'twin',
      name,
      config: { twin, action, ...config },
      onError: 'continue',
    });
    this.twins = this.twins || {};
    this.twins.updates = this.twins.updates || [];
    this.twins.updates.push(twin);
    return this;
  }

  addCondition(nodeId: string, name: string, field: string, operator: string, value: any): this {
    this.nodes.push({
      id: nodeId,
      type: 'condition',
      name,
      config: { field, operator, value },
      onError: 'continue',
    });
    return this;
  }

  addApproval(nodeId: string, name: string, approvers: string[], timeout = 24): this {
    this.nodes.push({
      id: nodeId,
      type: 'approval',
      name,
      config: { approvers, timeout },
      onError: 'stop',
    });
    return this;
  }

  connect(from: string, to: string, condition?: string): this {
    this.connections.push({ from, to, condition });
    return this;
  }

  requiresMemory(memoryTypes: string[]): this {
    this.memory = this.memory || {};
    this.memory.required = memoryTypes;
    return this;
  }

  createsTwin(twinType: string): this {
    this.twins = this.twins || {};
    this.twins.creates = this.twins.creates || [];
    this.twins.creates.push(twinType);
    return this;
  }

  usesIntegration(integration: string): this {
    this.integrations.push(integration);
    return this;
  }

  build(): Workflow {
    return new Workflow({
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.description,
      triggers: this.triggers,
      nodes: this.nodes,
      connections: this.connections,
      memory: this.memory,
      twins: this.twins,
      agents: this.agents,
      integrations: this.integrations,
    });
  }
}

export function createWorkflow(id: string, name: string): FlowBuilder {
  return new FlowBuilder(id, name);
}
