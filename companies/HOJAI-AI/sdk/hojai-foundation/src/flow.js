/**
 * FlowOS Module
 *
 * Wraps the flow-orchestrator (port 4244) via Hub /api/foundation/flow-orchestrator/* routes.
 * Plans = workflows. Executions = runs. Templates = reusable plan blueprints.
 */
import { request } from './utils.js';
// ---------------------------------------------------------------------------
// Flow client
// ---------------------------------------------------------------------------
export class FlowClient {
    cfg;
    constructor(config, authState) {
        this.cfg = { ...config, authState };
    }
    async create(input) {
        return request(this.cfg, 'POST', '/api/foundation/flow-orchestrator/plans', {
            name: input.name,
            description: input.description,
            steps: input.steps.map((s, i) => ({ id: s.id ?? `step-${i}`, ...s }))
        });
    }
    async get(id) {
        return request(this.cfg, 'GET', `/api/foundation/flow-orchestrator/plans/${encodeURIComponent(id)}`);
    }
    async list() {
        const res = await request(this.cfg, 'GET', '/api/foundation/flow-orchestrator/plans');
        return res.plans ?? [];
    }
    async run(id, input) {
        return request(this.cfg, 'POST', '/api/foundation/flow-orchestrator/executions', {
            planId: id, context: input?.inputs, twinId: input?.twinId
        });
    }
    async runSync(id, input) {
        return request(this.cfg, 'POST', '/api/foundation/flow-orchestrator/executions/sync', {
            planId: id, context: input?.inputs, twinId: input?.twinId
        });
    }
    async getRun(executionId) {
        return request(this.cfg, 'GET', `/api/foundation/flow-orchestrator/executions/${encodeURIComponent(executionId)}`);
    }
    async listRuns() {
        const res = await request(this.cfg, 'GET', '/api/foundation/flow-orchestrator/executions');
        return res.executions ?? [];
    }
    async feedback(executionId, outcome, notes) {
        return request(this.cfg, 'POST', `/api/foundation/flow-orchestrator/executions/${encodeURIComponent(executionId)}/feedback`, { outcome, notes });
    }
}
