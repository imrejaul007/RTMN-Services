/**
 * Nexha Provisioning Engine Client
 *
 * Wraps nexha-provisioning-engine: declarative provisioning plans
 * with state transitions, apply/destroy lifecycles.
 */
import { request } from './utils.js';
export class ProvisioningClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async createPlan(input) {
        return request(this.config, 'POST', '/api/plans', input);
    }
    async listPlans(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/plans?${params.toString()}`);
    }
    async getPlan(planId) {
        return request(this.config, 'GET', `/api/plans/${encodeURIComponent(planId)}`);
    }
    async getPlanJson(planId) {
        return request(this.config, 'GET', `/api/plans/${encodeURIComponent(planId)}/plan.json`);
    }
    async getPlanYaml(planId) {
        return request(this.config, 'GET', `/api/plans/${encodeURIComponent(planId)}/plan.yaml`);
    }
    async transition(planId, input) {
        return request(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/transition`, input);
    }
    async apply(planId) {
        return request(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/apply`);
    }
    async failResource(planId, input) {
        return request(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/fail-resource`, input);
    }
    async recordOutputs(planId, input) {
        return request(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/outputs`, input);
    }
    async cancel(planId) {
        return request(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/cancel`);
    }
    async destroy(planId) {
        return request(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/destroy`);
    }
    async markDestroyed(planId) {
        return request(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/mark-destroyed`);
    }
    async listEvents(planId) {
        return request(this.config, 'GET', `/api/plans/${encodeURIComponent(planId)}/events`);
    }
    async stats() {
        return request(this.config, 'GET', '/api/stats');
    }
}
//# sourceMappingURL=provisioning.js.map