/**
 * TwinOS Module
 *
 * Wraps TwinOS Hub (port 4705) via Hub /api/twins/* routes.
 * Uses PUT for updates (not PATCH — TwinOS Hub uses PUT).
 * Links use /api/relationships (not /api/twins/:id/link).
 */
import { request } from './utils.js';
// ---------------------------------------------------------------------------
// TwinOS client
// ---------------------------------------------------------------------------
export class TwinClient {
    cfg;
    constructor(config, authState) {
        this.cfg = { ...config, authState };
    }
    async create(input) {
        const body = {
            id: `twin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: input.name,
            type: input.type,
            category: input.category,
            service: input.service,
            port: input.port,
            metadata: input.attributes ?? {},
            tags: input.tags ?? []
        };
        return request(this.cfg, 'POST', '/api/twins', body);
    }
    async get(id) {
        return request(this.cfg, 'GET', `/api/twins/${encodeURIComponent(id)}`);
    }
    async update(id, input) {
        if (input.state !== undefined) {
            return request(this.cfg, 'PUT', `/api/twins/${encodeURIComponent(id)}/state`, { data: input.state });
        }
        const body = {};
        if (input.name !== undefined)
            body.name = input.name;
        if (input.metadata !== undefined)
            body.metadata = input.metadata;
        if (input.tags !== undefined)
            body.tags = input.tags;
        return request(this.cfg, 'PUT', `/api/twins/${encodeURIComponent(id)}`, body);
    }
    async getState(id) {
        return request(this.cfg, 'GET', `/api/twins/${encodeURIComponent(id)}/state`);
    }
    async history(id) {
        return request(this.cfg, 'GET', `/api/twins/sync/history?twinId=${encodeURIComponent(id)}`);
    }
    async link(sourceId, targetId, type) {
        return request(this.cfg, 'POST', '/api/twins/relationships', { sourceId, targetId, type });
    }
    async delete(id) {
        return request(this.cfg, 'DELETE', `/api/twins/${encodeURIComponent(id)}`);
    }
}
