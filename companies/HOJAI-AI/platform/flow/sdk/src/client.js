/**
 * FlowOS SDK - Client
 * Main entry point for the FlowOS SDK
 */

export class FlowOSClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:4399';
    this.apiKey = config.apiKey || null;
    this.tenantId = config.tenantId || null;
    this.timeout = config.timeout || 30000;

    // Initialize service clients
    this.workflows = new WorkflowClient(this);
    this.executions = new ExecutionClient(this);
    this.connectors = new ConnectorClient(this);
    this.twins = new TwinClient(this);
    this.simulation = new SimulationClient(this);
    this.checkpoints = new CheckpointClient(this);
  }

  async request(method, path, data = null, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      ...(this.tenantId && { 'X-Tenant-ID': this.tenantId }),
      ...options.headers,
    };

    const config = {
      method,
      url,
      headers,
      timeout: options.timeout || this.timeout,
    };

    if (data && (method !== 'GET')) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new FlowOSError(error.response.data.message || 'Request failed', error.response.status);
      }
      throw new FlowOSError(error.message, 0);
    }
  }
}

class FlowOSError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'FlowOSError';
    this.statusCode = statusCode;
  }
}

export class WorkflowClient {
  constructor(client) {
    this.client = client;
  }

  async create(workflow) {
    return this.client.request('POST', '/api/workflows', workflow);
  }

  async get(id) {
    return this.client.request('GET', `/api/workflows/${id}`);
  }

  async list(options = {}) {
    const params = new URLSearchParams(options).toString();
    return this.client.request('GET', `/api/workflows${params ? `?${params}` : ''}`);
  }

  async update(id, updates) {
    return this.client.request('PUT', `/api/workflows/${id}`, updates);
  }

  async delete(id) {
    return this.client.request('DELETE', `/api/workflows/${id}`);
  }

  async execute(id, context = {}) {
    return this.client.request('POST', `/api/workflows/${id}/execute`, { context });
  }

  async validate(workflow) {
    return this.client.request('POST', '/api/workflows/validate', workflow);
  }

  async duplicate(id) {
    const workflow = await this.get(id);
    const { id: _, ...workflowData } = workflow;
    return this.create({ ...workflowData, name: `${workflow.name} (Copy)` });
  }

  async export(id) {
    return this.client.request('GET', `/api/workflows/${id}/export`);
  }

  async import(workflowData) {
    return this.client.request('POST', '/api/workflows/import', workflowData);
  }
}

export class ExecutionClient {
  constructor(client) {
    this.client = client;
  }

  async get(id) {
    return this.client.request('GET', `/api/executions/${id}`);
  }

  async list(workflowId, options = {}) {
    const params = new URLSearchParams({ workflowId, ...options }).toString();
    return this.client.request('GET', `/api/executions?${params}`);
  }

  async pause(id) {
    return this.client.request('POST', `/api/executions/${id}/pause`);
  }

  async resume(id) {
    return this.client.request('POST', `/api/executions/${id}/resume`);
  }

  async cancel(id) {
    return this.client.request('POST', `/api/executions/${id}/cancel`);
  }

  async retry(id) {
    return this.client.request('POST', `/api/executions/${id}/retry`);
  }

  async getLogs(id) {
    return this.client.request('GET', `/api/executions/${id}/logs`);
  }

  async getMetrics(id) {
    return this.client.request('GET', `/api/executions/${id}/metrics`);
  }
}

export class ConnectorClient {
  constructor(client) {
    this.client = client;
    // FlowOS Connector Integration (port 5375)
    this.integrationUrl = client.baseUrl.replace(/\/$/, '') + ':5375';
  }

  // === Hub Connectors (original methods) ===
  async list(type = null) {
    const path = type ? `/api/connectors?type=${type}` : '/api/connectors';
    return this.client.request('GET', path);
  }

  async get(id) {
    return this.client.request('GET', `/api/connectors/${id}`);
  }

  async create(config) {
    return this.client.request('POST', '/api/connectors', config);
  }

  async test(id, testData = {}) {
    return this.client.request('POST', `/api/connectors/${id}/test`, testData);
  }

  // === Workflow Connector Integration (NEW) ===

  /**
   * Configure a connector for a specific workflow
   * @param {string} workflowId - Workflow ID
   * @param {string} connectorId - Connector ID (e.g., 'salesforce', 'stripe')
   * @param {object} config - Connector configuration
   */
  async configure(workflowId, connectorId, config) {
    return this.client.request('POST', '/api/connectors/configure', {
      workflowId,
      connectorId,
      config
    });
  }

  /**
   * Get connector configurations for a workflow
   * @param {string} workflowId - Workflow ID
   */
  async getConfigurations(workflowId) {
    return this.client.request('GET', `/api/connectors/configure/${workflowId}`);
  }

  /**
   * Invoke a connector action from a workflow
   * @param {string} workflowId - Workflow ID
   * @param {string} connectorId - Connector ID
   * @param {string} action - Action to invoke
   * @param {object} params - Action parameters
   * @param {string} idempotencyKey - Optional idempotency key
   */
  async invoke(workflowId, connectorId, action, params = {}, idempotencyKey = null) {
    return this.client.request('POST', '/api/connectors/invoke', {
      workflowId,
      connectorId,
      action,
      params,
      idempotencyKey
    });
  }

  /**
   * Batch invoke multiple connector actions
   * @param {string} workflowId - Workflow ID
   * @param {array} requests - Array of {connectorId, action, params}
   */
  async batchInvoke(workflowId, requests) {
    return this.client.request('POST', '/api/connectors/batch', {
      workflowId,
      requests
    });
  }

  /**
   * Get all available connectors from the registry
   */
  async listRegistry() {
    return this.client.request('GET', '/api/connectors/registry');
  }

  /**
   * Get connector capabilities
   * @param {string} connectorId - Connector ID
   */
  async getCapabilities(connectorId) {
    return this.client.request('GET', `/api/connectors/${connectorId}/capabilities`);
  }

  /**
   * Get connector execution history for a workflow
   * @param {string} workflowId - Workflow ID
   * @param {number} limit - Max results
   */
  async getHistory(workflowId, limit = 50) {
    return this.client.request('GET', `/api/connectors/history/${workflowId}?limit=${limit}`);
  }

  /**
   * Get connector execution details
   * @param {string} executionId - Execution ID
   */
  async getExecution(executionId) {
    return this.client.request('GET', `/api/connectors/executions/${executionId}`);
  }
}

export class TwinClient {
  constructor(client) {
    this.client = client;
  }

  async get(workflowId) {
    return this.client.request('GET', `/api/twins/${workflowId}`);
  }

  async getState(workflowId) {
    return this.client.request('GET', `/api/twins/${workflowId}/state`);
  }

  async getMetrics(workflowId) {
    return this.client.request('GET', `/api/twins/${workflowId}/metrics`);
  }

  async getHistory(workflowId, options = {}) {
    const params = new URLSearchParams(options).toString();
    return this.client.request('GET', `/api/twins/${workflowId}/history${params ? `?${params}` : ''}`);
  }
}

export class SimulationClient {
  constructor(client) {
    this.client = client;
  }

  async create(workflowDefinition, options = {}) {
    return this.client.request('POST', '/api/simulations', { workflowDefinition, options });
  }

  async run(id) {
    return this.client.request('POST', `/api/simulations/${id}/run`);
  }

  async get(id) {
    return this.client.request('GET', `/api/simulations/${id}`);
  }

  async getResults(id) {
    return this.client.request('GET', `/api/simulations/${id}/results`);
  }

  async compare(simulationIds) {
    return this.client.request('POST', '/api/simulations/compare', { simulationIds });
  }
}

export class CheckpointClient {
  constructor(client) {
    this.client = client;
  }

  async create(workflowId, state, metadata = {}) {
    return this.client.request('POST', '/api/checkpoints', { workflowId, state, metadata });
  }

  async get(id) {
    return this.client.request('GET', `/api/checkpoints/${id}`);
  }

  async restore(id) {
    return this.client.request('POST', `/api/checkpoints/${id}/restore`);
  }

  async verify(id) {
    return this.client.request('GET', `/api/checkpoints/${id}/verify`);
  }

  async list(workflowId, options = {}) {
    return this.client.request('GET', `/api/workflows/${workflowId}/checkpoints`);
  }

  async prune(workflowId, maxCheckpoints = 10) {
    return this.client.request('POST', `/api/workflows/${workflowId}/checkpoints/prune`, { maxCheckpoints });
  }
}

export default FlowOSClient;