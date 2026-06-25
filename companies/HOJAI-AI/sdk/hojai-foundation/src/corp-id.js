/**
 * CorpID Module
 *
 * Wraps the CorpID service (port 4702) via Hub /api/identity/* routes.
 * Maps developer-friendly schemas to the backend's register/login/user APIs.
 */
import { request } from './utils.js';
// ---------------------------------------------------------------------------
// CorpID client
// ---------------------------------------------------------------------------
export class CorpIDClient {
    config;
    authState;
    constructor(config, authState) {
        this.config = config;
        this.authState = authState;
    }
    get cfg() {
        return { ...this.config, authState: this.authState };
    }
    async create(input) {
        const body = {
            email: input.metadata.email ?? `temp-${Date.now()}@placeholder.local`,
            password: input.password ?? `temp-${Math.random().toString(36).slice(2)}`,
            name: input.metadata.name ?? input.type,
            role: mapTypeToRole(input.type)
        };
        return request(this.cfg, 'POST', '/api/identity/auth/register', body);
    }
    /** @internal */
    async _login(email, password) {
        return request(this.cfg, 'POST', '/api/identity/auth/login', { email, password });
    }
    /** @internal */
    async _refresh(refreshToken) {
        return request(this.cfg, 'POST', '/api/identity/auth/refresh', { refreshToken });
    }
    async get(id) {
        return request(this.cfg, 'GET', `/api/identity/users/${encodeURIComponent(id)}`);
    }
    async list(params) {
        const query = new URLSearchParams();
        if (params?.page)
            query.set('page', String(params.page));
        if (params?.limit)
            query.set('limit', String(params.limit));
        if (params?.role)
            query.set('role', params.role);
        const qs = query.toString();
        return request(this.cfg, 'GET', `/api/identity/users${qs ? `?${qs}` : ''}`);
    }
    async update(id, data) {
        const body = {
            name: data.name,
            phone: data.phone,
            country: data.country,
            industry: data.industry,
            taxId: data.taxId
        };
        return request(this.cfg, 'PUT', `/api/identity/users/${encodeURIComponent(id)}`, body);
    }
    async me() {
        return request(this.cfg, 'GET', '/api/identity/profile');
    }
    async updateProfile(data) {
        const body = {
            name: data.name,
            phone: data.phone,
            country: data.country,
            industry: data.industry,
            taxId: data.taxId
        };
        return request(this.cfg, 'PUT', '/api/identity/profile', body);
    }
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mapTypeToRole(type) {
    switch (type) {
        case 'company': return 'admin';
        case 'user': return 'user';
        case 'agent': return 'user';
        case 'device': return 'operator';
        case 'service': return 'service';
        default: return 'user';
    }
}
