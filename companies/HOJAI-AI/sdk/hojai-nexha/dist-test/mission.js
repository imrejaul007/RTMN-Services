/**
 * Nexha Mission Planner Client
 *
 * Wraps nexha-mission-planner: multi-step mission orchestration,
 * subtask lifecycle, mission templates.
 */
import { request } from './utils.js';
export class MissionClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async createMission(input) {
        return request(this.config, 'POST', '/api/missions', input);
    }
    async listMissions(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/missions?${params.toString()}`);
    }
    async getMission(missionId) {
        return request(this.config, 'GET', `/api/missions/${encodeURIComponent(missionId)}`);
    }
    async updateMission(missionId, patch) {
        return request(this.config, 'PATCH', `/api/missions/${encodeURIComponent(missionId)}`, patch);
    }
    async plan(missionId) {
        return request(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/plan`);
    }
    async start(missionId) {
        return request(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/start`);
    }
    async pause(missionId) {
        return request(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/pause`);
    }
    async cancel(missionId) {
        return request(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/cancel`);
    }
    async retry(missionId) {
        return request(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/retry`);
    }
    async startSubtask(missionId, subtaskId) {
        return request(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/subtasks/${encodeURIComponent(subtaskId)}/start`);
    }
    async completeSubtask(missionId, subtaskId, output) {
        return request(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/subtasks/${encodeURIComponent(subtaskId)}/complete`, { output });
    }
    async failSubtask(missionId, subtaskId, error) {
        return request(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/subtasks/${encodeURIComponent(subtaskId)}/fail`, { error });
    }
    async skipSubtask(missionId, subtaskId) {
        return request(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/subtasks/${encodeURIComponent(subtaskId)}/skip`);
    }
    async listTemplates(input = {}) {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null)
            params.set(k, String(v)); });
        return request(this.config, 'GET', `/api/templates?${params.toString()}`);
    }
    async getTemplate(templateId) {
        return request(this.config, 'GET', `/api/templates/${encodeURIComponent(templateId)}`);
    }
    async createTemplate(input) {
        return request(this.config, 'POST', '/api/templates', input);
    }
}
//# sourceMappingURL=mission.js.map