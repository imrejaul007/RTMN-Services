/**
 * Nexha Pricing Network Client
 *
 * Wraps nexha-pricing-network: product catalog, price points,
 * market comparison, price alerts, dynamic pricing.
 */
import { request } from './utils.js';
export class PricingClient {
    config;
    constructor(config) {
        this.config = config;
    }
    // ── Products ──────────────────────────────────────────────
    async registerProduct(input) {
        return request(this.config, 'POST', '/api/v1/products', input);
    }
    async listProducts(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/v1/products?${params.toString()}`);
    }
    async getProduct(sku) {
        return request(this.config, 'GET', `/api/v1/products/${encodeURIComponent(sku)}`);
    }
    // ── Prices ────────────────────────────────────────────────
    async recordPrice(input) {
        return request(this.config, 'POST', '/api/v1/prices', input);
    }
    async listPrices(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/v1/prices?${params.toString()}`);
    }
    // ── Compare ───────────────────────────────────────────────
    async compare(sku, input = {}) {
        return request(this.config, 'POST', '/api/v1/compare', { sku, ...input });
    }
    async compareBatch(input) {
        return request(this.config, 'POST', '/api/v1/compare/batch', input);
    }
    // ── Alerts ────────────────────────────────────────────────
    async createAlert(input) {
        return request(this.config, 'POST', '/api/v1/alerts', input);
    }
    async listAlerts(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/v1/alerts?${params.toString()}`);
    }
    async deactivateAlert(id) {
        return request(this.config, 'POST', `/api/v1/alerts/${encodeURIComponent(id)}/deactivate`);
    }
    async evaluateAlerts() {
        return request(this.config, 'POST', '/api/v1/alerts/evaluate');
    }
    // ── Dynamic Pricing ───────────────────────────────────────
    async dynamicPrice(input) {
        return request(this.config, 'POST', '/api/v1/dynamic-price', input);
    }
}
//# sourceMappingURL=pricing.js.map