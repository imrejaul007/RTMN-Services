/**
 * HOJAI Flow Node
 */

export type NodeType =
  | 'trigger'
  | 'action'
  | 'ai_agent'
  | 'condition'
  | 'filter'
  | 'transform'
  | 'approval'
  | 'memory'
  | 'twin'
  | 'crm'
  | 'email'
  | 'sms'
  | 'slack'
  | 'calendar'
  | 'document'
  | 'webhook'
  | 'schedule'
  | 'actor'
  | 'analytics';

export interface NodeConfig {
  // Generic config
  [key: string]: any;
}

export interface Node {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  config: NodeConfig;
  retry?: {
    maxAttempts: number;
    backoff?: 'linear' | 'exponential';
    delay?: number;
  };
  timeout?: number;
  onError?: 'continue' | 'stop' | 'retry';
}

export function createNode(config: Partial<Node> & { id: string; type: NodeType; name: string }): Node {
  return {
    id: config.id,
    type: config.type,
    name: config.name,
    description: config.description,
    config: config.config || {},
    retry: config.retry,
    timeout: config.timeout,
    onError: config.onError || 'continue',
  };
}

// Node type helpers
export function triggerNode(id: string, name: string, config: NodeConfig = {}): Node {
  return createNode({ id, type: 'trigger', name, config });
}

export function actionNode(id: string, name: string, config: NodeConfig = {}): Node {
  return createNode({ id, type: 'action', name, config });
}

export function aiAgentNode(id: string, name: string, agent: string, config: NodeConfig = {}): Node {
  return createNode({
    id,
    type: 'ai_agent',
    name,
    config: { agent, ...config },
  });
}

export function conditionNode(id: string, name: string, config: NodeConfig = {}): Node {
  return createNode({ id, type: 'condition', name, config });
}

export function approvalNode(id: string, name: string, config: NodeConfig = {}): Node {
  return createNode({
    id,
    type: 'approval',
    name,
    config: { approvers: config.approvers || [], timeout: config.timeout || 24 },
  });
}

export function memoryNode(id: string, name: string, config: NodeConfig = {}): Node {
  return createNode({ id, type: 'memory', name, config });
}

export function twinNode(id: string, name: string, config: NodeConfig = {}): Node {
  return createNode({ id, type: 'twin', name, config });
}
