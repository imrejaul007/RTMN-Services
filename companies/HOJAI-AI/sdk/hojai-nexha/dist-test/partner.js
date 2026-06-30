/**
 * Nexha Partner Graph Client
 *
 * Wraps nexha-partner-graph: partner relationships, interactions,
 * partner recommendations.
 */
import { request } from './utils.js';
export class PartnerClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async recordInteraction(input) {
        return request(this.config, 'POST', '/api/interactions', input);
    }
    async listInteractions(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/interactions?${params.toString()}`);
    }
    async listPartners(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/partners?${params.toString()}`);
    }
    async listPartnersByType(relationshipType) {
        return request(this.config, 'GET', `/api/partners/by-type/${encodeURIComponent(relationshipType)}`);
    }
    async getPartner(partnerRef) {
        return request(this.config, 'GET', `/api/partners/${encodeURIComponent(partnerRef)}`);
    }
    async recommend(input) {
        return request(this.config, 'POST', '/api/recommend', input);
    }
    async stats() {
        return request(this.config, 'GET', '/api/stats');
    }
}
//# sourceMappingURL=partner.js.map