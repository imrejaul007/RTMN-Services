/**
 * HOJAI Flow - Workflow definition
 */

import { Node } from './node';
import { Trigger } from './trigger';

export interface FlowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  triggers: Trigger[];
  nodes: Node[];
  connections: Connection[];
  memory?: {
    required?: string[];
    updateOn?: string[];
  };
  twins?: {
    creates?: string[];
    updates?: string[];
  };
  agents?: string[];
  integrations?: string[];
}

export interface Connection {
  from: string;
  to: string;
  condition?: string;
}

export class Workflow {
  public id: string;
  public name: string;
  public version: string;
  public description?: string;
  public triggers: Trigger[];
  public nodes: Map<string, Node>;
  public connections: Connection[];
  public memory?: FlowDefinition['memory'];
  public twins?: FlowDefinition['twins'];
  public agents?: string[];
  public integrations?: string[];

  constructor(definition: FlowDefinition) {
    this.id = definition.id;
    this.name = definition.name;
    this.version = definition.version;
    this.description = definition.description;
    this.triggers = definition.triggers;
    this.nodes = new Map(definition.nodes.map(n => [n.id, n]));
    this.connections = definition.connections;
    this.memory = definition.memory;
    this.twins = definition.twins;
    this.agents = definition.agents;
    this.integrations = definition.integrations;
  }

  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  getNextNodes(nodeId: string): Node[] {
    const connections = this.connections.filter(c => c.from === nodeId);
    return connections
      .map(c => this.nodes.get(c.to))
      .filter((n): n is Node => n !== undefined);
  }

  getConnections(nodeId: string): Connection[] {
    return this.connections.filter(c => c.from === nodeId);
  }

  toJSON(): FlowDefinition {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.description,
      triggers: this.triggers,
      nodes: Array.from(this.nodes.values()),
      connections: this.connections,
      memory: this.memory,
      twins: this.twins,
      agents: this.agents,
      integrations: this.integrations,
    };
  }
}
