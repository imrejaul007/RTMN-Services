/**
 * LoopOS MCP SDK
 * Easy tool integration for AI agents
 */

import axios from 'axios';

const DEFAULT_PORT = 4746;

class MCPSDK {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || `http://localhost:${DEFAULT_PORT}`;
    this.apiKey = options.apiKey || 'dev-key';
    this.agentId = options.agentId;
    this.tools = new Map();
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: { Authorization: `Bearer ${this.apiKey}` }
    });
  }

  // ── Tool Management ───────────────────────────────

  /**
   * Register a new tool
   */
  async registerTool(tool) {
    const response = await this.client.post('/api/tools', tool);
    const registeredTool = response.data;
    this.tools.set(registeredTool.id, registeredTool);
    return registeredTool;
  }

  /**
   * Get available tools
   */
  async listTools(filters = {}) {
    const response = await this.client.get('/api/tools', { params: filters });
    return response.data.tools;
  }

  /**
   * Discover tools by query
   */
  async discover(query) {
    const response = await this.client.get('/api/discover', { params: query });
    return response.data.tools;
  }

  // ── Agent Tool Access ─────────────────────────────

  /**
   * Grant tool to this agent
   */
  async grantTool(toolId, permissions = {}) {
    if (!this.agentId) throw new Error('Agent ID not set');
    const response = await this.client.post(`/api/agents/${this.agentId}/tools`, {
      toolId,
      permissions
    });
    return response.data;
  }

  /**
   * Get tools available to this agent
   */
  async getMyTools() {
    if (!this.agentId) throw new Error('Agent ID not set');
    const response = await this.client.get(`/api/agents/${this.agentId}/tools`);
    return response.data.tools;
  }

  // ── Tool Execution ────────────────────────────────

  /**
   * Execute a tool
   */
  async execute(toolId, params = {}, options = {}) {
    const response = await this.client.post('/api/execute', {
      agentId: this.agentId,
      toolId,
      params,
      timeout: options.timeout || 30000
    });
    return response.data;
  }

  /**
   * Execute tool by name
   */
  async executeByName(toolName, params = {}) {
    const tools = await this.listTools({ search: toolName });
    if (tools.length === 0) throw new Error(`Tool not found: ${toolName}`);

    const tool = tools.find(t => t.name === toolName) || tools[0];
    return this.execute(tool.id, params);
  }

  /**
   * Batch execute multiple tools
   */
  async executeBatch(tasks) {
    const response = await this.client.post('/api/execute/batch', {
      agentId: this.agentId,
      tasks
    });
    return response.data.results;
  }

  // ── Tool Schema ─────────────────────────────────

  /**
   * Get tool schema for LLM tool calling
   */
  async getToolSchema(toolId) {
    const response = await this.client.get(`/api/tools/${toolId}/schema`);
    return response.data;
  }

  /**
   * Get all schemas for LLM function calling
   */
  async getManifest() {
    const response = await this.client.get('/api/manifest');
    return response.data;
  }

  // ── Pre-built Tool Wrappers ──────────────────────

  /**
   * Read file
   */
  async readFile(path) {
    return this.executeByName('filesystem_read', { path });
  }

  /**
   * Write file
   */
  async writeFile(path, content) {
    return this.executeByName('filesystem_write', { path, content });
  }

  /**
   * List directory
   */
  async listDirectory(path = '.') {
    return this.executeByName('filesystem_list', { path });
  }

  /**
   * Send HTTP request
   */
  async httpRequest(url, options = {}) {
    return this.executeByName('http_request', { url, ...options });
  }

  /**
   * Query database
   */
  async queryDatabase(sql, params = []) {
    return this.executeByName('database_query', { sql, params });
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, body) {
    return this.executeByName('email_send', { to, subject, body });
  }

  /**
   * Send Slack message
   */
  async sendSlack(channel, message) {
    return this.executeByName('slack_send', { channel, message });
  }

  /**
   * Search vector store
   */
  async searchVector(query, limit = 10) {
    return this.executeByName('vector_search', { query, limit });
  }

  /**
   * Insert to vector store
   */
  async insertVector(id, content, metadata = {}) {
    return this.executeByName('vector_upsert', { id, content, metadata });
  }

  /**
   * Search knowledge base
   */
  async searchKnowledge(query, filters = {}) {
    return this.executeByName('knowledge_search', { query, ...filters });
  }

  /**
   * Create calendar event
   */
  async createCalendarEvent(event) {
    return this.executeByName('calendar_create', event);
  }

  /**
   * Get GitHub repo info
   */
  async getGitHubRepo(owner, repo) {
    return this.executeByName('github_repo', { owner, repo });
  }

  /**
   * Search CRM
   */
  async searchCRM(query) {
    return this.executeByName('crm_search', { query });
  }

  /**
   * Create CRM lead
   */
  async createLead(lead) {
    return this.executeByName('crm_lead_create', lead);
  }

  /**
   * Update CRM lead
   */
  async updateLead(leadId, updates) {
    return this.executeByName('crm_lead_update', { id: leadId, ...updates });
  }

  // ── Tool Builder ─────────────────────────────────

  /**
   * Create a custom tool
   */
  createTool(config) {
    return {
      name: config.name,
      category: config.category || 'custom',
      description: config.description || '',
      server: config.server || 'generic',
      action: config.action,
      inputSchema: config.inputSchema || { type: 'object', properties: {} },
      outputSchema: config.outputSchema || { type: 'object' },
      config: config.config
    };
  }

  /**
   * Create HTTP API tool
   */
  createHttpTool(config) {
    return this.createTool({
      name: config.name,
      category: 'api',
      description: config.description,
      server: 'api',
      action: 'request',
      inputSchema: {
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
          path: { type: 'string' },
          query: { type: 'object' },
          body: { type: 'object' }
        }
      },
      config: { baseURL: config.baseURL }
    });
  }

  /**
   * Create database tool
   */
  createDatabaseTool(config) {
    return this.createTool({
      name: config.name,
      category: 'data',
      description: config.description,
      server: 'database',
      action: config.action || 'query',
      inputSchema: {
        type: 'object',
        properties: {
          sql: { type: 'string' },
          params: { type: 'array' }
        }
      },
      credentials: config.credentials
    });
  }
}

// Pre-built tool templates
const TOOL_TEMPLATES = {
  filesystem: (config = {}) => ({
    name: config.name || 'filesystem',
    category: 'storage',
    description: 'File system operations',
    server: 'filesystem',
    action: config.action || 'read',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' }
      }
    }
  }),

  http: (config = {}) => ({
    name: config.name || 'http_client',
    category: 'api',
    description: config.description || 'HTTP client',
    server: 'api',
    action: 'request',
    inputSchema: {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
        path: { type: 'string' },
        body: { type: 'object' }
      }
    },
    config: { baseURL: config.baseURL }
  }),

  database: (config = {}) => ({
    name: config.name || 'database',
    category: 'data',
    description: 'Database operations',
    server: 'database',
    action: config.action || 'query',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'SQL query' },
        params: { type: 'array', description: 'Query parameters' }
      }
    }
  }),

  slack: (config = {}) => ({
    name: 'slack',
    category: 'communication',
    description: 'Slack messaging',
    server: 'slack',
    action: 'send',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel name' },
        message: { type: 'string', description: 'Message text' }
      }
    },
    config: { webhookUrl: config.webhookUrl }
  }),

  email: (config = {}) => ({
    name: 'email',
    category: 'communication',
    description: 'Email operations',
    server: 'email',
    action: 'send',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body' }
      }
    },
    config: config
  }),

  vector: (config = {}) => ({
    name: config.name || 'vector_store',
    category: 'ai',
    description: 'Vector store operations',
    server: 'vector_store',
    action: config.action || 'search',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results' }
      }
    }
  })
};

export { MCPSDK, TOOL_TEMPLATES };
export default MCPSDK;
