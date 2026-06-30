/**
 * Nexha Supplier Network Client
 *
 * Wraps nexha-supplier-network: supplier discovery, registration,
 * capability matching for B2B procurement.
 */
import { request } from './utils.js';
export class SupplierClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async search(input) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/v1/suppliers?${params.toString()}`);
    }
    async get(id) {
        return request(this.config, 'GET', `/api/v1/suppliers/${encodeURIComponent(id)}`);
    }
    async register(input) {
        return request(this.config, 'POST', '/api/v1/suppliers', input);
    }
    async update(id, patch) {
        return request(this.config, 'PATCH', `/api/v1/suppliers/${encodeURIComponent(id)}`, patch);
    }
    async deactivate(id) {
        return request(this.config, 'DELETE', `/api/v1/suppliers/${encodeURIComponent(id)}`);
    }
}
//# sourceMappingURL=supplier.js.map