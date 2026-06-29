/**
 * LoopOS SDK
 * Easy integration with LoopOS services
 */

import axios from 'axios';

const DEFAULT_PORTS = {
  scheduler: 4731,
  state: 4732,
  verification: 4733,
  budget: 4734,
  fleet: 4735,
  trust: 4736,
  outcomes: 4737,
  knowledge: 4738,
  certification: 4739
};

class LoopOS {
  constructor(options = {}) {
    const baseUrl = options.baseUrl || 'http://localhost';
    this.apiKey = options.apiKey || 'dev-key';

    // Create API clients
    this.scheduler = new SchedulerClient(baseUrl, DEFAULT_PORTS.scheduler, this.apiKey);
    this.state = new StateClient(baseUrl, DEFAULT_PORTS.state, this.apiKey);
    this.verification = new VerificationClient(baseUrl, DEFAULT_PORTS.verification, this.apiKey);
    this.budget = new BudgetClient(baseUrl, DEFAULT_PORTS.budget, this.apiKey);
    this.fleet = new FleetClient(baseUrl, DEFAULT_PORTS.fleet, this.apiKey);
    this.trust = new TrustClient(baseUrl, DEFAULT_PORTS.trust, this.apiKey);
    this.outcomes = new OutcomeClient(baseUrl, DEFAULT_PORTS.outcomes, this.apiKey);
    this.knowledge = new KnowledgeClient(baseUrl, DEFAULT_PORTS.knowledge, this.apiKey);
    this.certification = new CertificationClient(baseUrl, DEFAULT_PORTS.certification, this.apiKey);
  }
}

class BaseClient {
  constructor(baseUrl, port, apiKey) {
    this.client = axios.create({
      baseURL: `${baseUrl}:${port}`,
      headers: { Authorization: `Bearer ${apiKey}` }
    });
  }

  async get(path) {
    const res = await this.client.get(path);
    return res.data;
  }

  async post(path, data) {
    const res = await this.client.post(path, data);
    return res.data;
  }

  async put(path, data) {
    const res = await this.client.put(path, data);
    return res.data;
  }

  async delete(path) {
    const res = await this.client.delete(path);
    return res.data;
  }
}

// Scheduler Client
class SchedulerClient extends BaseClient {
  async createLoop(loop) {
    return this.post('/api/loops', loop);
  }

  async listLoops() {
    return this.get('/api/loops');
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

  async triggerLoop(id) {
    return this.post(`/api/loops/${id}/trigger`);
  }

  async stopLoop(id) {
    return this.post(`/api/loops/${id}/stop`);
  }

  async pauseLoop(id) {
    return this.post(`/api/loops/${id}/pause`);
  }

  async resumeLoop(id) {
    return this.post(`/api/loops/${id}/resume`);
  }

  async getExecutions(loopId) {
    return this.get(`/api/loops/${loopId}/executions`);
  }
}

// State Client
class StateClient extends BaseClient {
  async initializeState(loopId, goal, context = {}) {
    return this.post('/api/states', { loopId, goal, initialContext: context });
  }

  async getState(loopId) {
    return this.get(`/api/states/${loopId}`);
  }

  async updateState(loopId, updates) {
    return this.put(`/api/states/${loopId}`, updates);
  }

  async transition(loopId, newStatus, reason) {
    return this.post(`/api/states/${loopId}/transition`, { newStatus, reason });
  }

  async createCheckpoint(loopId, reason) {
    return this.post(`/api/states/${loopId}/checkpoints`, { reason });
  }

  async listCheckpoints(loopId) {
    return this.get(`/api/states/${loopId}/checkpoints`);
  }

  async restoreCheckpoint(checkpointId) {
    return this.post(`/api/checkpoints/${checkpointId}/restore`);
  }

  async recordAction(loopId, action) {
    return this.post(`/api/states/${loopId}/actions`, action);
  }

  async requestApproval(loopId, action, reason) {
    return this.post(`/api/states/${loopId}/approvals`, { action, reason });
  }
}

// Verification Client
class VerificationClient extends BaseClient {
  async verify(makerAgentId, content, options = {}) {
    return this.post('/api/verify', {
      makerAgentId,
      content,
      ...options
    });
  }

  async getVerification(id) {
    return this.get(`/api/verification/${id}`);
  }

  async listVerifications(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.get(`/api/verifications${params ? '?' + params : ''}`);
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

// Budget Client
class BudgetClient extends BaseClient {
  async createBudget(twinId, limits = {}) {
    return this.post('/api/budgets', { twinId, ...limits });
  }

  async getBudget(twinId) {
    return this.get(`/api/budgets/${twinId}`);
  }

  async updateBudget(twinId, updates) {
    return this.put(`/api/budgets/${twinId}`, updates);
  }

  async checkBudget(twinId, usage) {
    return this.post(`/api/budgets/${twinId}/check`, usage);
  }

  async deductBudget(twinId, usage) {
    return this.post(`/api/budgets/${twinId}/deduct`, usage);
  }

  async getRemaining(twinId) {
    return this.get(`/api/budgets/${twinId}/remaining`);
  }

  async getUsage(twinId, period = 'daily') {
    return this.get(`/api/budgets/${twinId}/usage?period=${period}`);
  }

  async resetBudget(twinId, period = 'daily') {
    return this.post(`/api/budgets/${twinId}/reset`, { period });
  }
}

// Fleet Client
class FleetClient extends BaseClient {
  async createFleet(fleet) {
    return this.post('/api/fleets', fleet);
  }

  async listFleets() {
    return this.get('/api/fleets');
  }

  async getFleet(id) {
    return this.get(`/api/fleets/${id}`);
  }

  async updateFleet(id, updates) {
    return this.put(`/api/fleets/${id}`, updates);
  }

  async addAgent(fleetId, agent) {
    return this.post(`/api/fleets/${fleetId}/agents`, agent);
  }

  async listAgents(fleetId) {
    return this.get(`/api/fleets/${fleetId}/agents`);
  }

  async getAgent(id) {
    return this.get(`/api/agents/${id}`);
  }

  async updateAgent(id, updates) {
    return this.put(`/api/agents/${id}`, updates);
  }

  async heartbeat(agentId, health) {
    return this.post(`/api/agents/${agentId}/heartbeat`, { health });
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

  async registerCapability(agentId, capability, proficiency) {
    return this.post('/api/capabilities', { agentId, capability, proficiency });
  }
}

// Trust Client
class TrustClient extends BaseClient {
  async createProfile(twinId, initialScore = 50) {
    return this.post('/api/profiles', { twinId, initialScore });
  }

  async getProfile(twinId) {
    return this.get(`/api/profiles/${twinId}`);
  }

  async listProfiles(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.get(`/api/profiles${params ? '?' + params : ''}`);
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

  async demoteAutonomy(twinId, reason, violation = false) {
    return this.post(`/api/profiles/${twinId}/autonomy/demote`, { reason, violation });
  }

  async addCertification(twinId, certType, issuer) {
    return this.post(`/api/profiles/${twinId}/certify`, { certType, issuer });
  }

  async recordViolation(twinId, violation) {
    return this.post(`/api/profiles/${twinId}/violations`, violation);
  }

  async getViolations(twinId) {
    return this.get(`/api/profiles/${twinId}/violations`);
  }

  async getHistory(twinId) {
    return this.get(`/api/profiles/${twinId}/history`);
  }

  async getSummary() {
    return this.get('/api/trust/summary');
  }
}

// Outcome Client
class OutcomeClient extends BaseClient {
  async recordOutcome(outcome) {
    return this.post('/api/outcomes', outcome);
  }

  async getOutcome(id) {
    return this.get(`/api/outcomes/${id}`);
  }

  async listOutcomes(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.get(`/api/outcomes${params ? '?' + params : ''}`);
  }

  async getTwinOutcomes(twinId) {
    return this.get(`/api/outcomes/${twinId}/twin`);
  }

  async getSkills(twinId) {
    return this.get(`/api/skills/${twinId}`);
  }

  async evolveSkill(twinId, skill, improvement, reason) {
    return this.post(`/api/skills/${twinId}/evolve`, { skill, improvement, reason });
  }

  async getTopSkills(twinId, limit = 10) {
    return this.get(`/api/skills/${twinId}/top?limit=${limit}`);
  }

  async getPatterns(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.get(`/api/patterns${params ? '?' + params : ''}`);
  }

  async getAnalytics(twinId, period = '7d') {
    return this.get(`/api/analytics?twinId=${twinId || ''}&period=${period}`);
  }

  async distributeLearning(learning, approved = false) {
    return this.post('/api/org-learning/distribute', { learning, approved });
  }

  async approveLearning(id, approver) {
    return this.post(`/api/org-learning/${id}/approve`, { approver });
  }
}

// Knowledge Client
class KnowledgeClient extends BaseClient {
  async createEntity(type, name, properties = {}) {
    return this.post('/api/entities', { type, name, properties });
  }

  async getEntity(id) {
    return this.get(`/api/entities/${id}`);
  }

  async listEntities(type, search) {
    const params = new URLSearchParams({ type, search }.filter(([_, v]) => v)).toString();
    return this.get(`/api/entities${params ? '?' + params : ''}`);
  }

  async updateEntity(id, updates) {
    return this.put(`/api/entities/${id}`, updates);
  }

  async deleteEntity(id) {
    return this.delete(`/api/entities/${id}`);
  }

  async createRelation(from, to, type, properties = {}) {
    return this.post('/api/relations', { from, to, type, properties });
  }

  async getConnections(entityId, depth = 1) {
    return this.get(`/api/entities/${entityId}/connections?depth=${depth}`);
  }

  async findPath(from, to) {
    return this.get(`/api/path?from=${from}&to=${to}`);
  }

  async resolve(name, type) {
    return this.post('/api/resolve', { name, type });
  }

  async merge(targetId, sourceId) {
    return this.post(`/api/entities/${targetId}/merge`, { sourceId });
  }

  async search(query, type) {
    const params = new URLSearchParams({ q: query, type }.filter(([_, v]) => v)).toString();
    return this.get(`/api/search${params ? '?' + params : ''}`);
  }

  async inferCauses(effect) {
    return this.post('/api/infer-causes', { effect });
  }

  async createOntology(name, version, schema) {
    return this.post('/api/ontologies', { name, version, ...schema });
  }
}

// Certification Client
class CertificationClient extends BaseClient {
  async runPipeline(twinId, suiteId, options = {}) {
    return this.post('/api/certification/run', { twinId, suiteId, ...options });
  }

  async getPipeline(id) {
    return this.get(`/api/certification/${id}`);
  }

  async listPipelines(twinId, status) {
    const params = new URLSearchParams({ twinId, status }.filter(([_, v]) => v)).toString();
    return this.get(`/api/certifications${params ? '?' + params : ''}`);
  }

  async retryPipeline(id) {
    return this.post(`/api/certification/${id}/retry`);
  }

  async cancelPipeline(id) {
    return this.post(`/api/certification/${id}/cancel`);
  }

  async grantCertification(twinId, certType, issuer, reason) {
    return this.post(`/api/certification/${twinId}/grant`, { certType, issuer, reason });
  }

  async revokeCertification(id, reason) {
    return this.post(`/api/certification/${id}/revoke`, { reason });
  }

  async getCertificationStatus(twinId) {
    return this.get(`/api/certification/${twinId}/status`);
  }

  async createTestSuite(name, category, tests) {
    return this.post('/api/test-suites', { name, category, tests });
  }

  async listTestSuites(category) {
    const params = category ? `?category=${category}` : '';
    return this.get(`/api/test-suites${params}`);
  }

  async createBadge(name, icon, description) {
    return this.post('/api/badges', { name, icon, description });
  }

  async listBadges() {
    return this.get('/api/badges');
  }

  async awardBadge(badgeId, twinId, reason) {
    return this.post(`/api/badges/${badgeId}/award`, { twinId, reason });
  }

  async getEarnedBadges(twinId) {
    return this.get(`/api/badges/${twinId}/earned`);
  }
}

export {
  LoopOS,
  SchedulerClient,
  StateClient,
  VerificationClient,
  BudgetClient,
  FleetClient,
  TrustClient,
  OutcomeClient,
  KnowledgeClient,
  CertificationClient,
  DEFAULT_PORTS
};

export default LoopOS;
