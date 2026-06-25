/**
 * PolicyOS Module
 *
 * Wraps PolicyOS (port 4254) via Hub /api/foundation/policy-os/* routes.
 * Categories: access_control, data_privacy, financial, operational,
 *   security, compliance, workflow, customer_experience, hr, marketing, product
 */
import { request } from './utils.js';
// ---------------------------------------------------------------------------
// PolicyOS client
// ---------------------------------------------------------------------------
export class PolicyClient {
    cfg;
    constructor(config, authState) {
        this.cfg = { ...config, authState };
    }
    async create(input) {
        return request(this.cfg, 'POST', '/api/foundation/policy-os/policies', {
            name: input.name,
            category: input.category,
            description: input.description ?? '',
            rules: input.rules ?? [],
            conditions: input.conditions ?? {},
            actions: input.actions ?? { onAllow: {}, onDeny: {} },
            exceptions: input.exceptions ?? [],
            effectiveFrom: input.effectiveFrom ?? null,
            effectiveUntil: input.effectiveUntil ?? null,
            tags: input.tags ?? [],
            owner: input.owner ?? 'u-admin'
        });
    }
    async get(id) {
        return request(this.cfg, 'GET', `/api/foundation/policy-os/policies/${encodeURIComponent(id)}`);
    }
    async list(params) {
        const query = new URLSearchParams();
        if (params?.category)
            query.set('category', params.category);
        if (params?.status)
            query.set('status', params.status);
        if (params?.owner)
            query.set('owner', params.owner);
        const qs = query.toString();
        const res = await request(this.cfg, 'GET', `/api/foundation/policy-os/policies${qs ? `?${qs}` : ''}`);
        return res.policies ?? [];
    }
    async evaluate(input) {
        const body = { context: input.context };
        if (input.policyId)
            body.policyId = input.policyId;
        if (input.corpId)
            body.context.corpId = input.corpId;
        body.context.action = input.action;
        return request(this.cfg, 'POST', '/api/foundation/policy-os/policies/evaluate', body);
    }
    async evaluateBatch(inputs) {
        const body = inputs.map(i => {
            const ctx = { ...i.context, action: i.action };
            if (i.corpId)
                ctx.corpId = i.corpId;
            return { context: ctx, policyId: i.policyId };
        });
        return request(this.cfg, 'POST', '/api/foundation/policy-os/policies/evaluate-batch', body);
    }
}
