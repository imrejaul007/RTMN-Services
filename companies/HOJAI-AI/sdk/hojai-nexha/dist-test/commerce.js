/**
 * Nexha Commerce Runtime Client
 *
 * Wraps nexha-commerce-runtime: per-tenant orders, payments, returns.
 */
import { request } from './utils.js';
export class CommerceClient {
    config;
    constructor(config) {
        this.config = config;
    }
    // ── Orders ────────────────────────────────────────────────
    async createOrder(input) {
        return request(this.config, 'POST', '/api/orders', input);
    }
    async listOrders(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/orders?${params.toString()}`);
    }
    async getOrder(id) {
        return request(this.config, 'GET', `/api/orders/${encodeURIComponent(id)}`);
    }
    async updateOrder(id, patch) {
        return request(this.config, 'PATCH', `/api/orders/${encodeURIComponent(id)}`, patch);
    }
    async placeOrder(id) {
        return request(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/place`);
    }
    async cancelOrder(id, reason) {
        return request(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/cancel`, { reason });
    }
    async fulfillOrder(id) {
        return request(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/fulfill`);
    }
    async shipOrder(id, input) {
        return request(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/ship`, input);
    }
    async deliverOrder(id) {
        return request(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/deliver`);
    }
    async completeOrder(id) {
        return request(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/complete`);
    }
    async refundOrder(id, input) {
        return request(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/refund`, input);
    }
    // ── Payments ──────────────────────────────────────────────
    async createPayment(input) {
        return request(this.config, 'POST', '/api/payments', input);
    }
    async listPayments(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/payments?${params.toString()}`);
    }
    async getPayment(id) {
        return request(this.config, 'GET', `/api/payments/${encodeURIComponent(id)}`);
    }
    async authorizePayment(id) {
        return request(this.config, 'POST', `/api/payments/${encodeURIComponent(id)}/authorize`);
    }
    async capturePayment(id) {
        return request(this.config, 'POST', `/api/payments/${encodeURIComponent(id)}/capture`);
    }
    async completePayment(id) {
        return request(this.config, 'POST', `/api/payments/${encodeURIComponent(id)}/complete`);
    }
    async failPayment(id, reason) {
        return request(this.config, 'POST', `/api/payments/${encodeURIComponent(id)}/fail`, { reason });
    }
    async cancelPayment(id) {
        return request(this.config, 'POST', `/api/payments/${encodeURIComponent(id)}/cancel`);
    }
    async refundPayment(id, input) {
        return request(this.config, 'POST', `/api/payments/${encodeURIComponent(id)}/refund`, input);
    }
    // ── Returns ───────────────────────────────────────────────
    async createReturn(input) {
        return request(this.config, 'POST', '/api/returns', input);
    }
    async listReturns(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/returns?${params.toString()}`);
    }
    async getReturn(id) {
        return request(this.config, 'GET', `/api/returns/${encodeURIComponent(id)}`);
    }
    async approveReturn(id) {
        return request(this.config, 'POST', `/api/returns/${encodeURIComponent(id)}/approve`);
    }
    async rejectReturn(id, reason) {
        return request(this.config, 'POST', `/api/returns/${encodeURIComponent(id)}/reject`, { reason });
    }
    async markReturnInTransit(id) {
        return request(this.config, 'POST', `/api/returns/${encodeURIComponent(id)}/in-transit`);
    }
    async markReturnReceived(id) {
        return request(this.config, 'POST', `/api/returns/${encodeURIComponent(id)}/received`);
    }
    async completeReturn(id) {
        return request(this.config, 'POST', `/api/returns/${encodeURIComponent(id)}/complete`);
    }
    async refundReturn(id, input) {
        return request(this.config, 'POST', `/api/returns/${encodeURIComponent(id)}/refund`, input);
    }
    // ── Stats ─────────────────────────────────────────────────
    async stats() {
        return request(this.config, 'GET', '/api/stats');
    }
}
//# sourceMappingURL=commerce.js.map