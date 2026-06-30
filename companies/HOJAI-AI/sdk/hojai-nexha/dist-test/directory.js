/**
 * Nexha Business Directory Client
 *
 * Wraps nexha-business-directory: register companies, list agents,
 * search by capability, fetch trust linkages.
 */
import { request } from './utils.js';
export class DirectoryClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async registerCompany(input) {
        return request(this.config, 'POST', '/api/v1/companies', input);
    }
    async listCompanies(options = {}) {
        const params = new URLSearchParams();
        if (options.tenantId)
            params.set('tenantId', options.tenantId);
        if (options.industry)
            params.set('industry', options.industry);
        if (options.capability)
            params.set('capability', options.capability);
        if (options.limit)
            params.set('limit', String(options.limit));
        return request(this.config, 'GET', `/api/v1/companies?${params.toString()}`);
    }
    async getCompany(companyId) {
        return request(this.config, 'GET', `/api/v1/companies/${encodeURIComponent(companyId)}`);
    }
    async updateCompany(companyId, patch) {
        return request(this.config, 'PATCH', `/api/v1/companies/${encodeURIComponent(companyId)}`, patch);
    }
    async deleteCompany(companyId) {
        return request(this.config, 'DELETE', `/api/v1/companies/${encodeURIComponent(companyId)}`);
    }
    async registerAgent(input) {
        return request(this.config, 'POST', `/api/v1/companies/${encodeURIComponent(input.companyId)}/agents`, input);
    }
    async listAgents(companyId) {
        return request(this.config, 'GET', `/api/v1/companies/${encodeURIComponent(companyId)}/agents`);
    }
    async getAgent(agentId) {
        return request(this.config, 'GET', `/api/v1/agents/${encodeURIComponent(agentId)}`);
    }
    async searchByCapability(input) {
        return request(this.config, 'GET', `/api/v1/capabilities?capability=${encodeURIComponent(input.capability)}&industry=${encodeURIComponent(input.industry || '')}&limit=${input.limit || 50}`);
    }
    async getTrustLinkage(companyIds) {
        return request(this.config, 'POST', '/api/v1/trust', { companyIds });
    }
}
//# sourceMappingURL=directory.js.map