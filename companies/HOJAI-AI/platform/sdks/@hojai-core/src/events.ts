/**
 * HOJAI Events
 */

import EventEmitter from 'eventemitter3';

export type HOJAIEvent =
  | 'memory.updated'
  | 'twin.created'
  | 'twin.updated'
  | 'agent.executed'
  | 'flow.started'
  | 'flow.completed'
  | 'flow.failed'
  | 'approval.requested'
  | 'approval.completed';

export interface HOJAIEventData {
  'memory.updated': { memoryId: string; data: any };
  'twin.created': { twinType: string; twinId: string };
  'twin.updated': { twinType: string; twinId: string; changes: any };
  'agent.executed': { agentId: string; input: any; output: any };
  'flow.started': { flowId: string; trigger: any };
  'flow.completed': { flowId: string; result: any };
  'flow.failed': { flowId: string; error: string };
  'approval.requested': { approvalId: string; data: any };
  'approval.completed': { approvalId: string; approved: boolean };
}

export class Events extends EventEmitter {
  constructor() {
    super();
  }

  on<K extends HOJAIEvent>(event: K, handler: (data: HOJAIEventData[K]) => void): this {
    super.on(event, handler);
    return this;
  }

  once<K extends HOJAIEvent>(event: K, handler: (data: HOJAIEventData[K]) => void): this {
    super.once(event, handler);
    return this;
  }

  off<K extends HOJAIEvent>(event: K, handler: (data: HOJAIEventData[K]) => void): this {
    super.off(event, handler);
    return this;
  }

  emit<K extends HOJAIEvent>(event: K, data: HOJAIEventData[K]): boolean {
    return super.emit(event, data);
  }

  // Subscribe to remote events (for webhooks)
  subscribe(event: HOJAIEvent, callback: (data: any) => void): () => void {
    // This would connect to HOJAI event bus
    this.on(event, callback);
    return () => this.off(event, callback);
  }
}
