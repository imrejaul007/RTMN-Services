/**
 * Nexha Tenant Summary Client
 *
 * Wraps nexha-tenant-summary: aggregated tenant-level view that fans out
 * to all upstream Nexha services and returns a unified summary.
 */
import { request } from './utils.js';
export class TenantClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async listSources() {
        return request(this.config, 'GET', '/api/sources');
    }
    async getSummary(tenantId) {
        return request(this.config, 'GET', `/api/tenants/${encodeURIComponent(tenantId)}/summary`);
    }
    async getSection(tenantId, section) {
        return request(this.config, 'GET', `/api/tenants/${encodeURIComponent(tenantId)}/summary/${encodeURIComponent(section)}`);
    }
    async checkUpstreams() {
        return request(this.config, 'GET', '/api/health/upstreams');
    }
}
//# sourceMappingURL=tenant.js.map