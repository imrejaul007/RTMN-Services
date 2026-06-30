/**
 * Nexha Hooks SDK Client
 *
 * Wraps nexha-hooks-sdk: webhook subscriptions, event delivery,
 * signature verification.
 */
import { request } from './utils.js';
export class HooksClient {
    config;
    constructor(config) {
        this.config = config;
    }
    // ── Subscriptions ─────────────────────────────────────────
    async createSubscription(input) {
        return request(this.config, 'POST', '/api/subscriptions', input);
    }
    async listSubscriptions(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/subscriptions?${params.toString()}`);
    }
    async getSubscription(id) {
        return request(this.config, 'GET', `/api/subscriptions/${encodeURIComponent(id)}`);
    }
    async updateSubscription(id, patch) {
        return request(this.config, 'PATCH', `/api/subscriptions/${encodeURIComponent(id)}`, patch);
    }
    async disableSubscription(id) {
        return request(this.config, 'POST', `/api/subscriptions/${encodeURIComponent(id)}/disable`);
    }
    async enableSubscription(id) {
        return request(this.config, 'POST', `/api/subscriptions/${encodeURIComponent(id)}/enable`);
    }
    async deleteSubscription(id) {
        return request(this.config, 'DELETE', `/api/subscriptions/${encodeURIComponent(id)}`);
    }
    async rotateSecret(id) {
        return request(this.config, 'POST', `/api/subscriptions/${encodeURIComponent(id)}/rotate-secret`);
    }
    // ── Events & Deliveries ───────────────────────────────────
    async emitEvent(input) {
        return request(this.config, 'POST', '/api/events', input);
    }
    async processDeliveries(input = {}) {
        return request(this.config, 'POST', '/api/deliveries/process', input);
    }
    async listDeliveries(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/deliveries?${params.toString()}`);
    }
    async getDelivery(id) {
        return request(this.config, 'GET', `/api/deliveries/${encodeURIComponent(id)}`);
    }
    // ── Signing & Verification ────────────────────────────────
    async sign(input) {
        return request(this.config, 'POST', '/api/sign', input);
    }
    async verify(input) {
        return request(this.config, 'POST', '/api/verify', input);
    }
    // ── Stats ─────────────────────────────────────────────────
    async stats() {
        return request(this.config, 'GET', '/api/stats');
    }
}
//# sourceMappingURL=hooks.js.map