/**
 * HOJAI Cloud SDK
 * Unified SDK for all HOJAI Cloud services
 *
 * @example
 * import { HOJAI } from '@hojai/cloud-sdk';
 *
 * const client = new HOJAI({ apiKey: 'your-key' });
 *
 * // Deploy an app
 * const deployment = await client.deploy({ name: 'my-app', manifest: {} });
 *
 * // Track usage
 * await client.trackUsage({ model: 'gpt-4', inputTokens: 1000 });
 */

const fetch = globalThis.fetch || await import('node-fetch').then(m => m.default);

// Default base URL
const DEFAULT_BASE = 'http://localhost:4380';

/**
 * Main HOJAI Cloud SDK client
 */
export class HOJAI {
  constructor({ apiKey, baseUrl = DEFAULT_BASE, debug = false } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.debug = debug;

    // Initialize service clients
    this.cloud = new CloudClient(this);
    this.appStore = new AppStoreClient(this);
    this.cost = new CostClient(this);
    this.secrets = new SecretsClient(this);
    this.voice = new VoiceClient(this);
    this.workflows = new WorkflowsClient(this);
    this.billing = new BillingClient(this);
    this.analytics = new AnalyticsClient(this);
    this.notifications = new NotificationsClient(this);
    this.collaboration = new CollaborationClient(this);
  }

  // HTTP request helper
  async request(path, { method = 'GET', body, service = '' } = {}) {
    const base = service ? this.baseUrl.replace(':4380', `:${service}`) : this.baseUrl;
    const url = `${base}${path}`;

    const headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
    };

    if (this.debug) {
      console.log(`[HOJAI SDK] ${method} ${url}`);
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Request failed: ${res.status}`);
    }

    return data;
  }
}

// ── Cloud Client ───────────────────────────────────────────────────────────────

class CloudClient {
  constructor(sdk) { this.sdk = sdk; }

  async deploy({ name, type, manifest, files }) {
    return this.sdk.request('/api/v1/deploy', {
      method: 'POST',
      body: { name, type, manifest, files },
      service: '4380'
    });
  }

  async listDeployments() {
    return this.sdk.request('/api/v1/deployments', { service: '4380' });
  }

  async getDeployment(id) {
    return this.sdk.request(`/api/v1/deployments/${id}`, { service: '4380' });
  }

  async deleteDeployment(id) {
    return this.sdk.request(`/api/v1/deployments/${id}`, { method: 'DELETE', service: '4380' });
  }

  async rollback(id, { snapshotId } = {}) {
    return this.sdk.request(`/api/v1/deployments/${id}/rollback`, {
      method: 'POST',
      body: { snapshotId },
      service: '4380'
    });
  }

  async listPreviews({ projectId } = {}) {
    return this.sdk.request(`/api/v1/previews${projectId ? `?projectId=${projectId}` : ''}`, { service: '4380' });
  }

  async createPreview({ name, branch, prNumber, projectId, files, manifest }) {
    return this.sdk.request('/api/v1/previews', {
      method: 'POST',
      body: { name, branch, prNumber, projectId, files, manifest },
      service: '4380'
    });
  }

  async listDomains({ deploymentId } = {}) {
    return this.sdk.request(`/api/v1/domains${deploymentId ? `?deploymentId=${deploymentId}` : ''}`, { service: '4380' });
  }

  async addDomain({ domain, deploymentId, projectId }) {
    return this.sdk.request('/api/v1/domains', {
      method: 'POST',
      body: { domain, deploymentId, projectId },
      service: '4380'
    });
  }

  async listCertificates() {
    return this.sdk.request('/api/v1/certificates', { service: '4380' });
  }

  async health() {
    return this.sdk.request('/health', { service: '4380' });
  }
}

// ── App Store Client ────────────────────────────────────────────────────────

class AppStoreClient {
  constructor(sdk) { this.sdk = sdk; }

  async listApps({ type, category, search, limit, offset } = {}) {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (limit) params.append('limit', String(limit));
    if (offset) params.append('offset', String(offset));
    const qs = params.toString();
    return this.sdk.request(`/api/v1/apps${qs ? `?${qs}` : ''}`, { service: '4400' });
  }

  async getFeatured() {
    return this.sdk.request('/api/v1/apps/featured', { service: '4400' });
  }

  async getApp(id) {
    return this.sdk.request(`/api/v1/apps/${id}`, { service: '4400' });
  }

  async createApp(data) {
    return this.sdk.request('/api/v1/apps', { method: 'POST', body: data, service: '4400' });
  }

  async updateApp(id, data) {
    return this.sdk.request(`/api/v1/apps/${id}`, { method: 'PATCH', body: data, service: '4400' });
  }

  async install(id, { userId, projectId, config } = {}) {
    return this.sdk.request(`/api/v1/apps/${id}/install`, {
      method: 'POST',
      body: { userId, projectId, config },
      service: '4400'
    });
  }

  async uninstall(id, { userId, projectId }) {
    return this.sdk.request(`/api/v1/apps/${id}/install?userId=${userId}&projectId=${projectId}`, {
      method: 'DELETE',
      service: '4400'
    });
  }

  async getReviews(id) {
    return this.sdk.request(`/api/v1/apps/${id}/reviews`, { service: '4400' });
  }

  async createReview(id, { userId, rating, title, content }) {
    return this.sdk.request(`/api/v1/apps/${id}/reviews`, {
      method: 'POST',
      body: { userId, rating, title, content },
      service: '4400'
    });
  }

  async listCategories() {
    return this.sdk.request('/api/v1/categories', { service: '4400' });
  }

  async search(query, { type, limit } = {}) {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    if (limit) params.append('limit', String(limit));
    return this.sdk.request(`/api/v1/search?${params}`, { service: '4400' });
  }
}

// ── Cost Client ────────────────────────────────────────────────────────────────

class CostClient {
  constructor(sdk) { this.sdk = sdk; }

  async trackUsage({ userId, projectId, model, provider, inputTokens, outputTokens, sttMinutes, ttsChars, agentId }) {
    return this.sdk.request('/api/v1/usage', {
      method: 'POST',
      body: { userId, projectId, model, provider, inputTokens, outputTokens, sttMinutes, ttsChars, agentId },
      service: '4410'
    });
  }

  async getUsage({ userId, projectId, startDate, endDate, limit } = {}) {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (projectId) params.append('projectId', projectId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (limit) params.append('limit', String(limit));
    const qs = params.toString();
    return this.sdk.request(`/api/v1/usage${qs ? `?${qs}` : ''}`, { service: '4410' });
  }

  async getSummary({ userId, projectId, period } = {}) {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (projectId) params.append('projectId', projectId);
    if (period) params.append('period', period);
    const qs = params.toString();
    return this.sdk.request(`/api/v1/usage/summary${qs ? `?${qs}` : ''}`, { service: '4410' });
  }

  async setBudget({ userId, monthlyLimit, alertThreshold }) {
    return this.sdk.request('/api/v1/budgets', {
      method: 'POST',
      body: { userId, monthlyLimit, alertThreshold },
      service: '4410'
    });
  }

  async getBudget(userId) {
    return this.sdk.request(`/api/v1/budgets/${userId}`, { service: '4410' });
  }

  async getPricing() {
    return this.sdk.request('/api/v1/pricing', { service: '4410' });
  }
}

// ── Secrets Client ────────────────────────────────────────────────────────────

class SecretsClient {
  constructor(sdk) { this.sdk = sdk; }

  async create({ name, value, userId, projectId, type, metadata }) {
    return this.sdk.request('/api/v1/secrets', {
      method: 'POST',
      body: { name, value, userId, projectId, type, metadata },
      service: '4420'
    });
  }

  async list({ userId, projectId, type }) {
    const params = new URLSearchParams({ userId });
    if (projectId) params.append('projectId', projectId);
    if (type) params.append('type', type);
    return this.sdk.request(`/api/v1/secrets?${params}`, { service: '4420' });
  }

  async get(id, userId) {
    return this.sdk.request(`/api/v1/secrets/${id}?userId=${userId}`, { service: '4420' });
  }

  async update(id, { userId, name, value, metadata }) {
    return this.sdk.request(`/api/v1/secrets/${id}`, {
      method: 'PATCH',
      body: { userId, name, value, metadata },
      service: '4420'
    });
  }

  async delete(id, userId) {
    return this.sdk.request(`/api/v1/secrets/${id}?userId=${userId}`, { method: 'DELETE', service: '4420' });
  }

  async rotate(id, userId) {
    return this.sdk.request(`/api/v1/secrets/${id}/rotate`, {
      method: 'POST',
      body: { userId },
      service: '4420'
    });
  }

  async getLogs(id) {
    return this.sdk.request(`/api/v1/secrets/${id}/logs`, { service: '4420' });
  }
}

// ── Voice Client ──────────────────────────────────────────────────────────────

class VoiceClient {
  constructor(sdk) { this.sdk = sdk; }

  async listAgents({ status, search } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const qs = params.toString();
    return this.sdk.request(`/api/v1/agents${qs ? `?${qs}` : ''}`, { service: '4430' });
  }

  async getAgent(id) {
    return this.sdk.request(`/api/v1/agents/${id}`, { service: '4430' });
  }

  async createAgent(data) {
    return this.sdk.request('/api/v1/agents', { method: 'POST', body: data, service: '4430' });
  }

  async updateAgent(id, data) {
    return this.sdk.request(`/api/v1/agents/${id}`, { method: 'PATCH', body: data, service: '4430' });
  }

  async deleteAgent(id) {
    return this.sdk.request(`/api/v1/agents/${id}`, { method: 'DELETE', service: '4430' });
  }

  async activateAgent(id) {
    return this.sdk.request(`/api/v1/agents/${id}/activate`, { method: 'POST', service: '4430' });
  }

  async pauseAgent(id) {
    return this.sdk.request(`/api/v1/agents/${id}/pause`, { method: 'POST', service: '4430' });
  }

  async startConversation({ agentId, phone, metadata }) {
    return this.sdk.request('/api/v1/conversations', {
      method: 'POST',
      body: { agentId, phone, metadata },
      service: '4430'
    });
  }

  async listConversations({ agentId, status, limit } = {}) {
    const params = new URLSearchParams();
    if (agentId) params.append('agentId', agentId);
    if (status) params.append('status', status);
    if (limit) params.append('limit', String(limit));
    const qs = params.toString();
    return this.sdk.request(`/api/v1/conversations${qs ? `?${qs}` : ''}`, { service: '4430' });
  }
}

// ── Workflows Client ──────────────────────────────────────────────────────────

class WorkflowsClient {
  constructor(sdk) { this.sdk = sdk; }

  async listWorkflows({ status, search } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const qs = params.toString();
    return this.sdk.request(`/api/v1/workflows${qs ? `?${qs}` : ''}`, { service: '4440' });
  }

  async getWorkflow(id) {
    return this.sdk.request(`/api/v1/workflows/${id}`, { service: '4440' });
  }

  async createWorkflow(data) {
    return this.sdk.request('/api/v1/workflows', { method: 'POST', body: data, service: '4440' });
  }

  async updateWorkflow(id, data) {
    return this.sdk.request(`/api/v1/workflows/${id}`, { method: 'PATCH', body: data, service: '4440' });
  }

  async deleteWorkflow(id) {
    return this.sdk.request(`/api/v1/workflows/${id}`, { method: 'DELETE', service: '4440' });
  }

  async addNode(workflowId, node) {
    return this.sdk.request(`/api/v1/workflows/${workflowId}/nodes`, {
      method: 'POST',
      body: node,
      service: '4440'
    });
  }

  async addEdge(workflowId, edge) {
    return this.sdk.request(`/api/v1/workflows/${workflowId}/edges`, {
      method: 'POST',
      body: edge,
      service: '4440'
    });
  }

  async validateWorkflow(id) {
    return this.sdk.request(`/api/v1/workflows/${id}/validate`, { method: 'POST', service: '4440' });
  }

  async executeWorkflow(id, { input } = {}) {
    return this.sdk.request(`/api/v1/workflows/${id}/execute`, {
      method: 'POST',
      body: { input },
      service: '4440'
    });
  }

  async listExecutions({ workflowId, status, limit } = {}) {
    const params = new URLSearchParams();
    if (workflowId) params.append('workflowId', workflowId);
    if (status) params.append('status', status);
    if (limit) params.append('limit', String(limit));
    const qs = params.toString();
    return this.sdk.request(`/api/v1/executions${qs ? `?${qs}` : ''}`, { service: '4440' });
  }
}

// ── Billing Client ────────────────────────────────────────────────────────────

class BillingClient {
  constructor(sdk) { this.sdk = sdk; }

  async getPlans() {
    return this.sdk.request('/api/v1/plans', { service: '4460' });
  }

  async createSubscription({ userId, plan, billingCycle, stripeCustomerId }) {
    return this.sdk.request('/api/v1/subscriptions', {
      method: 'POST',
      body: { userId, plan, billingCycle, stripeCustomerId },
      service: '4460'
    });
  }

  async getSubscription(id) {
    return this.sdk.request(`/api/v1/subscriptions/${id}`, { service: '4460' });
  }

  async getUserSubscription(userId) {
    return this.sdk.request(`/api/v1/subscriptions/user/${userId}`, { service: '4460' });
  }

  async cancelSubscription(id, { cancelAtPeriodEnd } = {}) {
    return this.sdk.request(`/api/v1/subscriptions/${id}/cancel`, {
      method: 'POST',
      body: { cancelAtPeriodEnd },
      service: '4460'
    });
  }

  async listInvoices({ userId, status } = {}) {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (status) params.append('status', status);
    const qs = params.toString();
    return this.sdk.request(`/api/v1/invoices${qs ? `?${qs}` : ''}`, { service: '4460' });
  }

  async createPayment({ invoiceId, userId, amount, method, provider }) {
    return this.sdk.request('/api/v1/payments', {
      method: 'POST',
      body: { invoiceId, userId, amount, method, provider },
      service: '4460'
    });
  }

  async addPaymentMethod({ userId, type, provider, last4, brand, token }) {
    return this.sdk.request('/api/v1/payment-methods', {
      method: 'POST',
      body: { userId, type, provider, last4, brand, token },
      service: '4460'
    });
  }

  async listPaymentMethods(userId) {
    return this.sdk.request(`/api/v1/payment-methods?userId=${userId}`, { service: '4460' });
  }

  async getStats() {
    return this.sdk.request('/api/v1/stats', { service: '4460' });
  }
}

// ── Analytics Client ──────────────────────────────────────────────────────────

class AnalyticsClient {
  constructor(sdk) { this.sdk = sdk; }

  async trackMetric({ name, type, orgId, labels, value, unit }) {
    return this.sdk.request('/api/v1/metrics', {
      method: 'POST',
      body: { name, type, orgId, labels, value, unit },
      service: '4490'
    });
  }

  async getMetrics({ orgId, name, limit } = {}) {
    const params = new URLSearchParams();
    if (orgId) params.append('orgId', orgId);
    if (name) params.append('name', name);
    if (limit) params.append('limit', String(limit));
    const qs = params.toString();
    return this.sdk.request(`/api/v1/metrics${qs ? `?${qs}` : ''}`, { service: '4490' });
  }

  async trackEvent({ name, orgId, userId, properties, severity }) {
    return this.sdk.request('/api/v1/events', {
      method: 'POST',
      body: { name, orgId, userId, properties, severity },
      service: '4490'
    });
  }

  async getEvents({ orgId, name, severity, limit } = {}) {
    const params = new URLSearchParams();
    if (orgId) params.append('orgId', orgId);
    if (name) params.append('name', name);
    if (severity) params.append('severity', severity);
    if (limit) params.append('limit', String(limit));
    const qs = params.toString();
    return this.sdk.request(`/api/v1/events${qs ? `?${qs}` : ''}`, { service: '4490' });
  }

  async createAlert({ orgId, name, condition, threshold, severity, notificationChannels }) {
    return this.sdk.request('/api/v1/alerts', {
      method: 'POST',
      body: { orgId, name, condition, threshold, severity, notificationChannels },
      service: '4490'
    });
  }

  async listAlerts({ orgId, status } = {}) {
    const params = new URLSearchParams();
    if (orgId) params.append('orgId', orgId);
    if (status) params.append('status', status);
    const qs = params.toString();
    return this.sdk.request(`/api/v1/alerts${qs ? `?${qs}` : ''}`, { service: '4490' });
  }
}

// ── Notifications Client ──────────────────────────────────────────────────────

class NotificationsClient {
  constructor(sdk) { this.sdk = sdk; }

  async send({ userId, orgId, type, title, body, channels, data, priority }) {
    return this.sdk.request('/api/v1/notifications', {
      method: 'POST',
      body: { userId, orgId, type, title, body, channels, data, priority },
      service: '4495'
    });
  }

  async listNotifications({ userId, status, type, limit } = {}) {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    if (limit) params.append('limit', String(limit));
    const qs = params.toString();
    return this.sdk.request(`/api/v1/notifications${qs ? `?${qs}` : ''}`, { service: '4495' });
  }

  async markRead(id) {
    return this.sdk.request(`/api/v1/notifications/${id}`, {
      method: 'PATCH',
      body: { status: 'read' },
      service: '4495'
    });
  }

  async addChannel({ orgId, userId, type, config }) {
    return this.sdk.request('/api/v1/channels', {
      method: 'POST',
      body: { orgId, userId, type, config },
      service: '4495'
    });
  }

  async listChannels({ orgId, userId, type } = {}) {
    const params = new URLSearchParams();
    if (orgId) params.append('orgId', orgId);
    if (userId) params.append('userId', userId);
    if (type) params.append('type', type);
    const qs = params.toString();
    return this.sdk.request(`/api/v1/channels${qs ? `?${qs}` : ''}`, { service: '4495' });
  }

  async createTemplate({ orgId, name, type, subject, body, variables }) {
    return this.sdk.request('/api/v1/templates', {
      method: 'POST',
      body: { orgId, name, type, subject, body, variables },
      service: '4495'
    });
  }
}

// ── Collaboration Client ──────────────────────────────────────────────────────

class CollaborationClient {
  constructor(sdk) { this.sdk = sdk; }

  async createOrg({ name, ownerId, plan }) {
    return this.sdk.request('/api/v1/orgs', {
      method: 'POST',
      body: { name, ownerId, plan },
      service: '4480'
    });
  }

  async listOrgs(userId) {
    return this.sdk.request(`/api/v1/orgs?userId=${userId}`, { service: '4480' });
  }

  async getOrg(id) {
    return this.sdk.request(`/api/v1/orgs/${id}`, { service: '4480' });
  }

  async updateOrg(id, data) {
    return this.sdk.request(`/api/v1/orgs/${id}`, { method: 'PATCH', body: data, service: '4480' });
  }

  async createTeam({ orgId, name, description }) {
    return this.sdk.request('/api/v1/teams', {
      method: 'POST',
      body: { orgId, name, description },
      service: '4480'
    });
  }

  async listTeams({ orgId } = {}) {
    const qs = orgId ? `?orgId=${orgId}` : '';
    return this.sdk.request(`/api/v1/teams${qs}`, { service: '4480' });
  }

  async addMember({ orgId, userId, teamId, role }) {
    return this.sdk.request('/api/v1/members', {
      method: 'POST',
      body: { orgId, userId, teamId, role },
      service: '4480'
    });
  }

  async listMembers({ orgId, teamId, userId } = {}) {
    const params = new URLSearchParams();
    if (orgId) params.append('orgId', orgId);
    if (teamId) params.append('teamId', teamId);
    if (userId) params.append('userId', userId);
    const qs = params.toString();
    return this.sdk.request(`/api/v1/members${qs ? `?${qs}` : ''}`, { service: '4480' });
  }

  async inviteMember({ orgId, email, role, teamId }) {
    return this.sdk.request('/api/v1/invites', {
      method: 'POST',
      body: { orgId, email, role, teamId },
      service: '4480'
    });
  }

  async acceptInvite(id, { userId }) {
    return this.sdk.request(`/api/v1/invites/${id}/accept`, {
      method: 'POST',
      body: { userId },
      service: '4480'
    });
  }

  async getRoles() {
    return this.sdk.request('/api/v1/roles', { service: '4480' });
  }
}

// Named exports for convenience
export const createClient = (opts) => new HOJAI(opts);
export default HOJAI;
