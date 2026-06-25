/**
 * TrustOS Module (SADA)
 *
 * Wraps SADA OS (port 4190) via Hub /api/foundation/sada-os/* routes.
 * Requires auth (authMiddleware on all endpoints).
 */
import { request } from './utils.js';
// ---------------------------------------------------------------------------
// Trust client
// ---------------------------------------------------------------------------
export class TrustClient {
    cfg;
    constructor(config, authState) {
        this.cfg = { ...config, authState };
    }
    async getScore(entityId) {
        return request(this.cfg, 'GET', `/api/foundation/sada-os/trust/${encodeURIComponent(entityId)}`);
    }
    async verify(input) {
        return request(this.cfg, 'POST', '/api/foundation/sada-os/verification', input);
    }
    async recordActivity(entityId, action, weight = 1.0, impact = 1.0) {
        return request(this.cfg, 'POST', `/api/foundation/sada-os/trust/${encodeURIComponent(entityId)}/activity`, { action, weight, impact });
    }
    async history(entityId) {
        return request(this.cfg, 'GET', `/api/foundation/sada-os/trust/${encodeURIComponent(entityId)}/history`);
    }
    async leaderboard(limit = 10) {
        return request(this.cfg, 'GET', `/api/foundation/sada-os/trust/leaderboard?limit=${limit}`);
    }
    async validate(params) {
        return request(this.cfg, 'POST', '/api/foundation/sada-os/governance/validate', params);
    }
    async assessRisk(entityId, context) {
        return request(this.cfg, 'POST', '/api/foundation/sada-os/risk/assess', { entityId, context });
    }
}
