/**
 * Nexha ACP Messaging Client
 *
 * Wraps nexha-acp-messaging: cross-Nexha negotiation, multi-party
 * message exchange for autonomous business deals.
 */
import { request } from './utils.js';
export class AcpClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async createNegotiation(input) {
        return request(this.config, 'POST', '/api/negotiations', input);
    }
    async listNegotiations(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/negotiations?${params.toString()}`);
    }
    async getNegotiation(id) {
        return request(this.config, 'GET', `/api/negotiations/${encodeURIComponent(id)}`);
    }
    async listMessages(negotiationId) {
        return request(this.config, 'GET', `/api/negotiations/${encodeURIComponent(negotiationId)}/messages`);
    }
    async sendMessage(negotiationId, input) {
        return request(this.config, 'POST', `/api/negotiations/${encodeURIComponent(negotiationId)}/messages`, input);
    }
    async stats() {
        return request(this.config, 'GET', '/api/stats');
    }
}
//# sourceMappingURL=acp.js.map