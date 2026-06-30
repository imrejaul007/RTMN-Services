/**
 * Nexha Distribution Network Client
 *
 * Wraps nexha-distribution-network: shipment booking, tracking,
 * status transitions (advance, cancel, fail, return), quote requests.
 */
import { request } from './utils.js';
export class DistributionClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async quote(request_) {
        return request(this.config, 'POST', '/api/v1/quote', request_);
    }
    async createShipment(input) {
        return request(this.config, 'POST', '/api/v1/shipments', input);
    }
    async listShipments(options = {}) {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/v1/shipments?${params.toString()}`);
    }
    async getShipment(id) {
        return request(this.config, 'GET', `/api/v1/shipments/${encodeURIComponent(id)}`);
    }
    async advance(id, note) {
        return request(this.config, 'PATCH', `/api/v1/shipments/${encodeURIComponent(id)}/advance`, { note });
    }
    async cancel(id, reason) {
        return request(this.config, 'POST', `/api/v1/shipments/${encodeURIComponent(id)}/cancel`, { reason });
    }
    async fail(id, reason) {
        return request(this.config, 'POST', `/api/v1/shipments/${encodeURIComponent(id)}/fail`, { reason });
    }
    async return(id, reason) {
        return request(this.config, 'POST', `/api/v1/shipments/${encodeURIComponent(id)}/return`, { reason });
    }
}
//# sourceMappingURL=distribution.js.map