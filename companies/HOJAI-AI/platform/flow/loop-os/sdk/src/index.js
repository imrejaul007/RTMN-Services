/**
 * LoopOS Unified SDK
 * One SDK for all LoopOS services
 *
 * Usage:
 * import LoopOS from '@hojai/loopos-sdk';
 * const loopos = new LoopOS({ baseUrl: 'http://localhost' });
 * await loopos.scheduler.createLoop({ name: 'My Loop', frequency: '*/5 * * * *' });
 */

import axios from 'axios';

// Default ports for all services
const DEFAULT_PORTS = {
  scheduler: 4731,
  state: 4732,
  verification: 4733,
  budget: 4734,
  fleet: 4735,
  trust: 4736,
  outcomes: 4737,
  knowledge: 4738,
  certification: 4739,
  twinos: 4740,
  memoryos: 4741,
  observability: 4742,
  retry: 4743,
  worktrees: 4744,
  agentBus: 4745,
  mcp: 4746,
  simulation: 4747,
  learning: 4748,
  escalation: 4749,
  alerts: 4750,
  graph: 4751
};

/**
 * Main LoopOS class - unified access to all services
 */
class LoopOS {
  constructor(options = {}) {
    const baseUrl = options.baseUrl || 'http://localhost';
    this.apiKey = options.apiKey || 'dev-key';
    this.agentId = options.agentId; // For agent-aware operations

    // Initialize all service clients
    this.scheduler = new SchedulerClient(baseUrl, DEFAULT_PORTS.scheduler, this.apiKey);
    this.state = new StateClient(baseUrl, DEFAULT_PORTS.state, this.apiKey);
    this.verification = new VerificationClient(baseUrl, DEFAULT_PORTS.verification, this.apiKey);
    this.budget = new BudgetClient(baseUrl, DEFAULT_PORTS.budget, this.apiKey);
    this.fleet = new FleetClient(baseUrl, DEFAULT_PORTS.fleet, this.apiKey);
    this.trust = new TrustClient(baseUrl, DEFAULT_PORTS.trust, this.apiKey);
    this.outcomes = new OutcomesClient(baseUrl, DEFAULT_PORTS.outcomes, this.apiKey);
    this.knowledge = new KnowledgeClient(baseUrl, DEFAULT_PORTS.knowledge, this.apiKey);
    this.certification = new CertificationClient(baseUrl, DEFAULT_PORTS.certification, this.apiKey);
    this.twinos = new TwinOSClient(baseUrl, DEFAULT_PORTS.twinos, this.apiKey);
    this.memoryos = new MemoryOSClient(baseUrl, DEFAULT_PORTS.memoryos, this.apiKey);
    this.observability = new ObservabilityClient(baseUrl, DEFAULT_PORTS.observability, this.apiKey);
    this.retry = new RetryClient(baseUrl, DEFAULT_PORTS.retry, this.apiKey);
    this.worktrees = new WorktreesClient(baseUrl, DEFAULT_PORTS.worktrees, this.apiKey);
    this.agentBus = new AgentBusClient(baseUrl, DEFAULT_PORTS.agentBus, this.apiKey);
    this.mcp = new MCPClient(baseUrl, DEFAULT_PORTS.mcp, this.apiKey);
    this.simulation = new SimulationClient(baseUrl, DEFAULT_PORTS.simulation, this.apiKey);
    this.learning = new LearningClient(baseUrl, DEFAULT_PORTS.learning, this.apiKey);
    this.escalation = new EscalationClient(baseUrl, DEFAULT_PORTS.escalation, this.apiKey);
    this.alerts = new AlertsClient(baseUrl, DEFAULT_PORTS.alerts, this.apiKey);
    this.graph = new GraphClient(baseUrl, DEFAULT_PORTS.graph, this.apiKey);
  }

  // Convenience method for agent-aware operations
  setAgent(agentId) {
    this.agentId = agentId;
    return this;
  }

  // Health check all services
  async healthCheck() {
    const results = [];
    for (const [name, port] of Object.entries(DEFAULT_PORTS)) {
      try {
        const response = await axios.get(`http://localhost:${port}/health`, { timeout: 2000 });
        results.push({ service: name, port, status: 'healthy' });
      } catch {
        results.push({ service: name, port, status: 'unhealthy' });
      }
    }
    return results;
  }
}

// ──────────────────────────────────────────────────────────────
// Base Client
// ──────────────────────────────────────────────────────────────

class BaseClient {
  constructor(baseUrl, port, apiKey) {
    this.baseUrl = `${baseUrl}:${port}`;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async get(path, params) {
    const response = await this.client.get(path, { params });
    return response.data;
  }

  async post(path, data) {
    const response = await this.client.post(path, data);
    return response.data;
  }

  async put(path, data) {
    const response = await this.client.put(path, data);
    return response.data;
  }

  async delete(path) {
    const response = await this.client.delete(path);
    return response.data;
  }
}

// ──────────────────────────────────────────────────────────────
// Scheduler Client
// ──────────────────────────────────────────────────────────────

class SchedulerClient extends BaseClient {
  constructor(...args) { super(...args); }

  async createLoop(loop) {
    return this.post('/api/loops', loop);
  }

  async listLoops(filters = {}) {
    return this.get('/api/loops', filters);
  }

  async getLoop(id) {
    return this.get(`/api/loops/${id}`);
  }

  async updateLoop(id, updates) {
    return this.put(`/api/loops/${id}`, updates);
  }

  async deleteLoop(id) {
    return this.delete(`/api/loops/${id}`);
  }

  async trigger(id) {
    return this.post(`/api/loops/${id}/trigger`);
  }

  async pause(id) {
    return this.post(`/api/loops/${id}/pause`);
  }

  async resume(id) {
    return this.post(`/api/loops/${id}/resume`);
  }

  async getExecution(id) {
    return this.get(`/api/loops/${id}/executions`);
  }
}

// ──────────────────────────────────────────────────────────────
// State Client
// ──────────────────────────────────────────────────────────────

class StateClient extends BaseClient {
  constructor(...args) { super(...args); }

  async createState(state) {
    return this.post('/api/states', state);
  }

  async getState(id) {
    return this.get(`/api/states/${id}`);
  }

  async updateState(id, updates) {
    return this.put(`/api/states/${id}`, updates);
  }

  async transition(id, newStatus, reason) {
    return this.post(`/api/states/${id}/transition`, { newStatus, reason });
  }

  async checkpoint(id, reason) {
    return this.post(`/api/states/${id}/checkpoints`, { reason });
  }

  async listCheckpoints(id) {
    return this.get(`/api/states/${id}/checkpoints`);
  }

  async requestApproval(id, action, reason) {
    return this.post(`/api/states/${id}/approvals`, { action, reason });
  }
}

// ──────────────────────────────────────────────────────────────
// Verification Client
// ──────────────────────────────────────────────────────────────

class VerificationClient extends BaseClient {
  constructor(...args) { super(...args); }

  async verify(makerAgentId, content, options = {}) {
    return this.post('/api/verify', { makerAgentId, content, ...options });
  }

  async getVerification(id) {
    return this.get(`/api/verification/${id}`);
  }

  async approve(id, approver, reason) {
    return this.post(`/api/verification/${id}/approve`, { approver, reason });
  }

  async reject(id, approver, reason) {
    return this.post(`/api/verification/${id}/reject`, { approver, reason });
  }

  async createPolicy(policy) {
    return this.post('/api/policies', policy);
  }

  async listPolicies() {
    return this.get('/api/policies');
  }

  async getPendingApprovals() {
    return this.get('/api/approvals');
  }
}

// ──────────────────────────────────────────────────────────────
// Budget Client
// ──────────────────────────────────────────────────────────────

class BudgetClient extends BaseClient {
  constructor(...args) { super(...args); }

  async createBudget(twinId, limits = {}) {
    return this.post('/api/budgets', { twinId, ...limits });
  }

  async getBudget(twinId) {
    return this.get(`/api/budgets/${twinId}`);
  }

  async check(twinId, usage) {
    return this.post(`/api/budgets/${twinId}/check`, usage);
  }

  async deduct(twinId, usage) {
    return this.post(`/api/budgets/${twinId}/deduct`, usage);
  }

  async getRemaining(twinId) {
    return this.get(`/api/budgets/${twinId}/remaining`);
  }

  async reset(twinId, period = 'daily') {
    return this.post(`/api/budgets/${twinId}/reset`, { period });
  }

  async listBudgets(filters = {}) {
    return this.get('/api/budgets', filters);
  }
}

// ──────────────────────────────────────────────────────────────
// Fleet Client
// ──────────────────────────────────────────────────────────────

class FleetClient extends BaseClient {
  constructor(...args) { super(...args); }

  async createFleet(fleet) {
    return this.post('/api/fleets', fleet);
  }

  async getFleet(id) {
    return this.get(`/api/fleets/${id}`);
  }

  async listFleets(filters = {}) {
    return this.get('/api/fleets', filters);
  }

  async addAgent(fleetId, agent) {
    return this.post(`/api/fleets/${fleetId}/agents`, agent);
  }

  async getFleetHealth(fleetId) {
    return this.get(`/api/fleets/${fleetId}/health`);
  }

  async escalate(fleetId, agentId, issue, severity) {
    return this.post(`/api/fleets/${fleetId}/escalate`, { agentId, issue, severity });
  }

  async findByCapability(capability) {
    return this.get(`/api/capabilities/${capability}/agents`);
  }
}

// ──────────────────────────────────────────────────────────────
// Trust Client
// ──────────────────────────────────────────────────────────────

class TrustClient extends BaseClient {
  constructor(...args) { super(...args); }

  async createProfile(twinId, initialScore = 50) {
    return this.post('/api/profiles', { twinId, initialScore });
  }

  async getProfile(twinId) {
    return this.get(`/api/profiles/${twinId}`);
  }

  async updateScore(twinId, dimension, delta, reason) {
    return this.post(`/api/profiles/${twinId}/update`, { dimension, delta, reason });
  }

  async getAutonomy(twinId) {
    return this.get(`/api/profiles/${twinId}/autonomy`);
  }

  async promoteAutonomy(twinId, reason) {
    return this.post(`/api/profiles/${twinId}/autonomy/promote`, { reason });
  }

  async demoteAutonomy(twinId, reason) {
    return this.post(`/api/profiles/${twinId}/autonomy/demote`, { reason });
  }

  async recordViolation(twinId, violation) {
    return this.post(`/api/profiles/${twinId}/violations`, violation);
  }

  async getTrustSummary() {
    return this.get('/api/trust/summary');
  }
}

// ──────────────────────────────────────────────────────────────
// Outcomes Client
// ──────────────────────────────────────────────────────────────

class OutcomesClient extends BaseClient {
  constructor(...args) { super(...args); }

  async recordOutcome(outcome) {
    return this.post('/api/outcomes', outcome);
  }

  async getOutcome(id) {
    return this.get(`/api/outcomes/${id}`);
  }

  async listOutcomes(filters = {}) {
    return this.get('/api/outcomes', filters);
  }

  async getSkills(twinId) {
    return this.get(`/api/skills/${twinId}`);
  }

  async evolveSkill(twinId, skill, improvement, reason) {
    return this.post(`/api/skills/${twinId}/evolve`, { skill, improvement, reason });
  }

  async getAnalytics(twinId, period = '7d') {
    return this.get('/api/analytics', { twinId, period });
  }
}

// ──────────────────────────────────────────────────────────────
// Knowledge Client
// ──────────────────────────────────────────────────────────────

class KnowledgeClient extends BaseClient {
  constructor(...args) { super(...args); }

  async createEntity(type, name, properties = {}) {
    return this.post('/api/entities', { type, name, properties });
  }

  async getEntity(id) {
    return this.get(`/api/entities/${id}`);
  }

  async listEntities(filters = {}) {
    return this.get('/api/entities', filters);
  }

  async createRelation(from, to, type, properties = {}) {
    return this.post('/api/relations', { from, to, type, properties });
  }

  async getConnections(entityId, depth = 1) {
    return this.get(`/api/entities/${entityId}/connections`, { depth });
  }

  async findPath(from, to) {
    return this.get('/api/path', { from, to });
  }

  async search(query, type) {
    return this.get('/api/search', { q: query, type });
  }
}

// ──────────────────────────────────────────────────────────────
// Certification Client
// ──────────────────────────────────────────────────────────────

class CertificationClient extends BaseClient {
  constructor(...args) { super(...args); }

  async runPipeline(twinId, suiteId, options = {}) {
    return this.post('/api/certification/run', { twinId, suiteId, ...options });
  }

  async getPipeline(id) {
    return this.get(`/api/certification/${id}`);
  }

  async listPipelines(filters = {}) {
    return this.get('/api/certifications', filters);
  }

  async grantCertification(twinId, certType, issuer, reason) {
    return this.post(`/api/certification/${twinId}/grant`, { certType, issuer, reason });
  }

  async getCertificationStatus(twinId) {
    return this.get(`/api/certification/${twinId}/status`);
  }

  async createTestSuite(name, category, tests) {
    return this.post('/api/test-suites', { name, category, tests });
  }

  async createBadge(name, icon, description) {
    return this.post('/api/badges', { name, icon, description });
  }
}

// ──────────────────────────────────────────────────────────────
// TwinOS Client
// ──────────────────────────────────────────────────────────────

class TwinOSClient extends BaseClient {
  constructor(...args) { super(...args); }

  async bindLoop(loopId, twinId, permissions = []) {
    return this.post('/api/bindings', { loopId, twinId, permissions });
  }

  async getBinding(loopId) {
    return this.get(`/api/bindings/loop/${loopId}`);
  }

  async getTwinContext(twinId) {
    return this.get(`/api/twin-context/${twinId}`);
  }

  async checkPermission(twinId, action, resource, value) {
    return this.post('/api/permissions/check', { twinId, action, resource, value });
  }
}

// ──────────────────────────────────────────────────────────────
// MemoryOS Client
// ──────────────────────────────────────────────────────────────

class MemoryOSClient extends BaseClient {
  constructor(...args) { super(...args); }

  async storeLoopMemory(loopId, twinId, state, actions, checkpoints = []) {
    return this.post('/api/memory/loops', { loopId, twinId, state, actions, checkpoints });
  }

  async getLoopMemory(loopId, limit = 50) {
    return this.get(`/api/memory/loops/${loopId}`, { limit });
  }

  async storeAction(loopId, twinId, action) {
    return this.post('/api/memory/actions', { loopId, twinId, ...action });
  }

  async storeDecision(loopId, twinId, decision) {
    return this.post('/api/memory/decisions', { loopId, twinId, ...decision });
  }

  async getPatterns(twinId) {
    return this.get(`/api/memory/patterns/${twinId}`);
  }

  async queryMemory(twinId, query, types = [], limit = 20) {
    return this.post('/api/memory/query', { twinId, query, types, limit });
  }
}

// ──────────────────────────────────────────────────────────────
// Observability Client
// ──────────────────────────────────────────────────────────────

class ObservabilityClient extends BaseClient {
  constructor(...args) { super(...args); }

  async getDashboard() {
    return this.get('/api/dashboard');
  }

  async getLoopMetrics() {
    return this.get('/api/metrics/loops');
  }

  async getBudgetMetrics() {
    return this.get('/api/metrics/budgets');
  }

  async getFleetMetrics() {
    return this.get('/api/metrics/fleets');
  }

  async getTrustMetrics() {
    return this.get('/api/metrics/trust');
  }

  async getOutcomeMetrics() {
    return this.get('/api/metrics/outcomes');
  }

  async getCostSummary() {
    return this.get('/api/costs');
  }

  async getAlerts(filters = {}) {
    return this.get('/api/alerts', filters);
  }

  async createAlert(alert) {
    return this.post('/api/alerts', alert);
  }

  async acknowledgeAlert(id, by) {
    return this.post(`/api/alerts/${id}/acknowledge`, { by });
  }
}

// ──────────────────────────────────────────────────────────────
// Retry Client
// ──────────────────────────────────────────────────────────────

class RetryClient extends BaseClient {
  constructor(...args) { super(...args); }

  async createPolicy(policy) {
    return this.post('/api/policies', policy);
  }

  async getCircuit(id) {
    return this.get(`/api/circuits/${id}`);
  }

  async listCircuits(filters = {}) {
    return this.get('/api/circuits', filters);
  }

  async execute(action, policyId, circuitId, options = {}) {
    return this.post('/api/execute', { action, policyId, circuitId, ...options });
  }

  async canExecute(circuitId) {
    return this.post(`/api/circuits/${circuitId}/can-execute`);
  }

  async resetCircuit(id) {
    return this.post(`/api/circuits/${id}/reset`);
  }
}

// ──────────────────────────────────────────────────────────────
// Worktrees Client
// ──────────────────────────────────────────────────────────────

class WorktreesClient extends BaseClient {
  constructor(...args) { super(...args); }

  async createWorktree(worktree) {
    return this.post('/api/worktrees', worktree);
  }

  async execute(id, context = {}, maxConcurrency) {
    return this.post(`/api/worktrees/${id}/execute`, { context, maxConcurrency });
  }

  async getExecution(id) {
    return this.get(`/api/executions/${id}`);
  }

  async listExecutions(filters = {}) {
    return this.get('/api/executions', filters);
  }

  async fanOut(items, worker, maxConcurrency = 10) {
    return this.post('/api/fan-out', { items, worker, maxConcurrency });
  }

  async fanIn(sources, reducer) {
    return this.post('/api/fan-in', { sources, reducer });
  }

  async mapReduce(data, mapper, reducer) {
    return this.post('/api/map-reduce', { data, mapper, reducer });
  }

  async pipeline(stages, initialData) {
    return this.post('/api/pipeline', { stages, initialData });
  }
}

// ──────────────────────────────────────────────────────────────
// Agent Bus Client
// ──────────────────────────────────────────────────────────────

class AgentBusClient extends BaseClient {
  constructor(...args) { super(...args); }

  async registerAgent(agent) {
    return this.post('/api/agents', agent);
  }

  async getAgent(id) {
    return this.get(`/api/agents/${id}`);
  }

  async listAgents(filters = {}) {
    return this.get('/api/agents', filters);
  }

  async createChannel(name, type = 'shared', subscribers = []) {
    return this.post('/api/channels', { name, type, subscribers });
  }

  async sendMessage(message) {
    return this.post('/api/messages', message);
  }

  async getInbox(agentId, filters = {}) {
    return this.get(`/api/agents/${agentId}/inbox`, filters);
  }

  async reply(messageId, from, content) {
    return this.post(`/api/messages/${messageId}/reply`, { from, content });
  }

  async discover(capability, status = 'online') {
    return this.get('/api/discover', { capability, status });
  }
}

// ──────────────────────────────────────────────────────────────
// MCP Client
// ──────────────────────────────────────────────────────────────

class MCPClient extends BaseClient {
  constructor(...args) { super(...args); }

  async registerTool(tool) {
    return this.post('/api/tools', tool);
  }

  async listTools(filters = {}) {
    return this.get('/api/tools', filters);
  }

  async discover(query) {
    return this.get('/api/discover', query);
  }

  async executeTool(toolId, params = {}, options = {}) {
    return this.post('/api/execute', { toolId, params, ...options });
  }

  async executeByName(toolName, params) {
    const tools = await this.listTools({ search: toolName });
    if (!tools.length) throw new Error(`Tool not found: ${toolName}`);
    return this.executeTool(tools[0].id, params);
  }

  async grantToolToAgent(agentId, toolId, permissions = {}) {
    return this.post(`/api/agents/${agentId}/tools`, { toolId, permissions });
  }

  async getManifest() {
    return this.get('/api/manifest');
  }
}

// ──────────────────────────────────────────────────────────────
// Simulation Client
// ──────────────────────────────────────────────────────────────

class SimulationClient extends BaseClient {
  constructor(...args) { super(...args); }

  async createScenario(scenario) {
    return this.post('/api/scenarios', scenario);
  }

  async listScenarios(filters = {}) {
    return this.get('/api/scenarios', filters);
  }

  async runSimulation(scenarioId, agentId, options = {}) {
    return this.post('/api/simulations', { scenarioId, agentId, ...options });
  }

  async getSimulation(id) {
    return this.get(`/api/simulations/${id}`);
  }

  async getSimulationResults(id) {
    return this.get(`/api/simulations/${id}/results`);
  }

  async createSyntheticEntity(entity) {
    return this.post('/api/synthetic', entity);
  }

  async interactWithSynthetic(entityId, action, message, context = {}) {
    return this.post(`/api/synthetic/${entityId}/interact`, { action, message, context });
  }

  async useTemplate(templateId) {
    return this.post('/api/scenarios/templates', { template: templateId });
  }
}

// ──────────────────────────────────────────────────────────────
// Learning Client
// ──────────────────────────────────────────────────────────────

class LearningClient extends BaseClient {
  constructor(...args) { super(...args); }

  async recordLearning(learning) {
    return this.post('/api/learnings', learning);
  }

  async getLearning(id) {
    return this.get(`/api/learnings/${id}`);
  }

  async listLearnings(filters = {}) {
    return this.get('/api/learnings', filters);
  }

  async rateLearning(id, agentId, rating, feedback) {
    return this.post(`/api/learnings/${id}/rate`, { agentId, rating, feedback });
  }

  async applyLearning(id, agentId, context, result) {
    return this.post(`/api/learnings/${id}/apply`, { agentId, context, result });
  }

  async getRelevantLearnings(agentId, minRating, limit = 20) {
    return this.get(`/api/learnings/relevant/${agentId}`, { minRating, limit });
  }

  async shareLearning(id, visibility = 'network') {
    return this.post(`/api/learnings/${id}/share`, { visibility });
  }

  async search(query, types, tags, minRating) {
    return this.get('/api/search', { q: query, types, tags, minRating });
  }

  async getTrending(period = '7d', limit = 10) {
    return this.get('/api/trending', { period, limit });
  }

  async subscribeToTopics(agentId, topics) {
    return this.post('/api/subscriptions', { agentId, topics });
  }
}

// ──────────────────────────────────────────────────────────────
// Escalation Client
// ──────────────────────────────────────────────────────────────

class EscalationClient extends BaseClient {
  constructor(...args) { super(...args); }

  async createApprover(approver) {
    return this.post('/api/approvers', approver);
  }

  async listApprovers(filters = {}) {
    return this.get('/api/approvers', filters);
  }

  async createChain(chain) {
    return this.post('/api/chains', chain);
  }

  async listChains() {
    return this.get('/api/chains');
  }

  async createRequest(request) {
    return this.post('/api/requests', request);
  }

  async getRequest(id) {
    return this.get(`/api/requests/${id}`);
  }

  async listRequests(filters = {}) {
    return this.get('/api/requests', filters);
  }

  async approveRequest(id, approverId, comment) {
    return this.post(`/api/requests/${id}/approve`, { approverId, comment });
  }

  async rejectRequest(id, approverId, reason, requeue = false) {
    return this.post(`/api/requests/${id}/reject`, { approverId, reason, requeue });
  }

  async delegateRequest(id, fromId, toId, reason) {
    return this.post(`/api/requests/${id}/delegate`, { approverId: fromId, toApproverId: toId, reason });
  }

  async quickEscalate(escalation) {
    return this.post('/api/escalate', escalation);
  }

  async getPendingForApprover(approverId) {
    return this.get(`/api/approvers/${approverId}/pending`);
  }

  async getAnalytics(period) {
    return this.get('/api/analytics', { period });
  }
}

// ──────────────────────────────────────────────────────────────
// Alerts Client
// ──────────────────────────────────────────────────────────────

class AlertsClient extends BaseClient {
  constructor(...args) { super(...args); }

  async subscribe(subscription) {
    return this.post('/api/subscriptions', subscription);
  }

  async listSubscriptions(filters = {}) {
    return this.get('/api/subscriptions', filters);
  }

  async registerWebhook(webhook) {
    return this.post('/api/webhooks', webhook);
  }

  async listWebhooks() {
    return this.get('/api/webhooks');
  }

  async testWebhook(id) {
    return this.post(`/api/webhooks/${id}/test`);
  }

  async createAlert(alert) {
    return this.post('/api/alerts', alert);
  }

  async getAlert(id) {
    return this.get(`/api/alerts/${id}`);
  }

  async listAlerts(filters = {}) {
    return this.get('/api/alerts', filters);
  }

  async acknowledgeAlert(id, acknowledgedBy) {
    return this.post(`/api/alerts/${id}/acknowledge`, { acknowledgedBy });
  }

  async snoozeAlert(id, minutes = 60, reason) {
    return this.post(`/api/alerts/${id}/snooze`, { minutes, reason });
  }

  async checkBudget(twinId) {
    return this.post('/api/check-budget', { twinId });
  }

  async getAnalytics(period) {
    return this.get('/api/analytics', { period });
  }
}

// ──────────────────────────────────────────────────────────────
// Graph Client
// ──────────────────────────────────────────────────────────────

class GraphClient extends BaseClient {
  constructor(...args) { super(...args); }

  async createNode(node) {
    return this.post('/api/nodes', node);
  }

  async getNode(id) {
    return this.get(`/api/nodes/${id}`);
  }

  async listNodes(filters = {}) {
    return this.get('/api/nodes', filters);
  }

  async updateTrust(id, trustScore, trustLevel) {
    return this.put(`/api/nodes/${id}/trust`, { trustScore, trustLevel });
  }

  async createEdge(edge) {
    return this.post('/api/edges', edge);
  }

  async listEdges(filters = {}) {
    return this.get('/api/edges', filters);
  }

  async getEgoGraph(nodeId, depth = 1) {
    return this.get(`/api/graph/ego/${nodeId}`, { depth });
  }

  async findPath(from, to, type) {
    return this.get('/api/graph/path', { from, to, type });
  }

  async getClusters(minTrustScore = 50) {
    return this.get('/api/graph/clusters', { minTrustScore });
  }

  async getStats() {
    return this.get('/api/graph/stats');
  }

  async getTopNodes(limit = 10, by = 'trustScore') {
    return this.get('/api/graph/top', { limit, by });
  }

  async getInfluencers(limit = 10) {
    return this.get('/api/graph/influencers', { limit });
  }

  async getVerificationChain(nodeId) {
    return this.get(`/api/graph/verification-chain/${nodeId}`);
  }
}

// ──────────────────────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────────────────────

export {
  LoopOS,
  DEFAULT_PORTS
};

export default LoopOS;
