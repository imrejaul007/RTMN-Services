/**
 * @hojai/visual-builder-sdk
 *
 * SDK for HOJAI Visual Workflow Builder
 */

export type NodeType =
  | 'trigger' | 'memory' | 'twin' | 'ai_agent'
  | 'intelligence' | 'sutar' | 'condition' | 'action'
  | 'human' | 'integration' | 'notification' | 'crm';

export interface NodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  position?: NodePosition;
  config: Record<string, any>;
}

export interface WorkflowConnection {
  from: string;
  to: string;
  condition?: string;
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  projectId?: string;
  templateId?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  variables?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Trigger {
  type: string;
  source: string;
  event?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  version: string;
  triggers: Trigger[];
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

export interface NodeTypeConfig {
  name: string;
  icon: string;
  color: string;
  description: string;
  props?: string[];
}

export interface ExportOptions {
  category?: string;
  includeMetadata?: boolean;
}

export class VisualBuilderSDK {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:4600') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // === Node Types ===

  async getNodeTypes(): Promise<{ nodeTypes: Record<NodeType, NodeTypeConfig> }> {
    return this.request('/api/node-types');
  }

  // === Templates ===

  async listTemplates(category?: string): Promise<{ templates: WorkflowTemplate[] }> {
    const url = category ? `/api/templates?category=${category}` : '/api/templates';
    return this.request(url);
  }

  async getTemplate(id: string): Promise<WorkflowTemplate> {
    return this.request<WorkflowTemplate>(`/api/templates/${id}`);
  }

  // === Workflows ===

  async createWorkflow(params: {
    templateId?: string;
    name?: string;
    projectId?: string;
  }): Promise<Workflow> {
    return this.request<Workflow>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async listWorkflows(projectId?: string): Promise<{ workflows: Workflow[] }> {
    const url = projectId ? `/api/workflows?projectId=${projectId}` : '/api/workflows';
    return this.request(url);
  }

  async getWorkflow(id: string): Promise<Workflow> {
    return this.request<Workflow>(`/api/workflows/${id}`);
  }

  async updateWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow> {
    return this.request<Workflow>(`/api/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkflow(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/workflows/${id}`, { method: 'DELETE' });
  }

  // === Nodes ===

  async addNode(
    workflowId: string,
    node: { type: NodeType; position?: NodePosition; config?: Record<string, any> }
  ): Promise<WorkflowNode> {
    return this.request<WorkflowNode>(`/api/workflows/${workflowId}/nodes`, {
      method: 'POST',
      body: JSON.stringify(node),
    });
  }

  async updateNode(
    workflowId: string,
    nodeId: string,
    updates: Partial<WorkflowNode>
  ): Promise<WorkflowNode> {
    return this.request<WorkflowNode>(`/api/workflows/${workflowId}/nodes/${nodeId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteNode(workflowId: string, nodeId: string): Promise<{ success: boolean }> {
    return this.request(`/api/workflows/${workflowId}/nodes/${nodeId}`, { method: 'DELETE' });
  }

  // === Connections ===

  async addConnection(
    workflowId: string,
    connection: { from: string; to: string; label?: string }
  ): Promise<WorkflowConnection> {
    return this.request<WorkflowConnection>(`/api/workflows/${workflowId}/connections`, {
      method: 'POST',
      body: JSON.stringify(connection),
    });
  }

  async deleteConnection(
    workflowId: string,
    connectionId: string
  ): Promise<{ success: boolean }> {
    return this.request(`/api/workflows/${workflowId}/connections/${connectionId}`, { method: 'DELETE' });
  }

  // === Export ===

  async exportWorkflow(id: string, options?: ExportOptions): Promise<WorkflowTemplate> {
    const params = new URLSearchParams(options as any);
    return this.request<WorkflowTemplate>(`/api/workflows/${id}/export?${params}`);
  }

  // === Import (create workflow from template) ===

  async importTemplate(template: WorkflowTemplate, name?: string): Promise<Workflow> {
    return this.request<Workflow>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify({ templateId: template.id, name }),
    });
  }

  // === Validation ===

  validateWorkflow(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for at least one trigger
    const hasTrigger = workflow.nodes.some(n => n.type === 'trigger');
    if (!hasTrigger) {
      errors.push('Workflow must have at least one trigger node');
    }

    // Check for duplicate connections
    const connections = workflow.connections;
    const seen = new Set<string>();
    for (const conn of connections) {
      const key = `${conn.from}-${conn.to}`;
      if (seen.has(key)) {
        errors.push(`Duplicate connection: ${conn.from} -> ${conn.to}`);
      }
      seen.add(key);
    }

    // Check for self-loops
    for (const conn of connections) {
      if (conn.from === conn.to) {
        errors.push(`Self-loop detected on node: ${conn.from}`);
      }
    }

    // Check all connection references exist
    const nodeIds = new Set(workflow.nodes.map(n => n.id));
    for (const conn of connections) {
      if (!nodeIds.has(conn.from)) {
        errors.push(`Unknown node in connection: ${conn.from}`);
      }
      if (!nodeIds.has(conn.to)) {
        errors.push(`Unknown node in connection: ${conn.to}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // === Serialization ===

  serialize(workflow: Workflow): string {
    return JSON.stringify(workflow, null, 2);
  }

  deserialize(json: string): Workflow {
    return JSON.parse(json);
  }
}

export default VisualBuilderSDK;
export { VisualBuilderSDK as Client };
