"use strict";
/**
 * State Manager
 *
 * Manages composition state for each company.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateManager = void 0;
// ============================================
// In-Memory State Store
// ============================================
class StateStore {
    constructor() {
        this.states = new Map();
    }
    get(companyId) {
        return this.states.get(companyId);
    }
    set(companyId, state) {
        this.states.set(companyId, state);
    }
    delete(companyId) {
        this.states.delete(companyId);
    }
    has(companyId) {
        return this.states.has(companyId);
    }
    list() {
        return Array.from(this.states.values());
    }
    clear() {
        this.states.clear();
    }
}
// Singleton instance
const stateStore = new StateStore();
// ============================================
// State Manager
// ============================================
class StateManager {
    /**
     * Initialize state for a new company
     */
    static initialize(companyId) {
        const state = {
            companyId,
            status: 'pending',
            installed: {
                departments: new Map(),
                extensions: new Map(),
                workers: new Map(),
                twins: new Map(),
            },
            lastUpdate: new Date(),
        };
        stateStore.set(companyId, state);
        return state;
    }
    /**
     * Get current state
     */
    static get(companyId) {
        return stateStore.get(companyId);
    }
    /**
     * Update state status
     */
    static updateStatus(companyId, status) {
        const state = stateStore.get(companyId);
        if (state) {
            state.status = status;
            state.lastUpdate = new Date();
            stateStore.set(companyId, state);
        }
    }
    /**
     * Update current step
     */
    static updateStep(companyId, currentStep, totalSteps) {
        const state = stateStore.get(companyId);
        if (state) {
            state.currentStep = currentStep;
            state.totalSteps = totalSteps;
            state.lastUpdate = new Date();
            stateStore.set(companyId, state);
        }
    }
    /**
     * Add installed department
     */
    static addDepartment(companyId, dept) {
        const state = stateStore.get(companyId);
        if (state) {
            state.installed.departments.set(dept.id, dept);
            state.lastUpdate = new Date();
            stateStore.set(companyId, state);
        }
    }
    /**
     * Add installed extension
     */
    static addExtension(companyId, ext) {
        const state = stateStore.get(companyId);
        if (state) {
            state.installed.extensions.set(ext.id, ext);
            state.lastUpdate = new Date();
            stateStore.set(companyId, state);
        }
    }
    /**
     * Add installed worker
     */
    static addWorker(companyId, worker) {
        const state = stateStore.get(companyId);
        if (state) {
            state.installed.workers.set(worker.id, worker);
            state.lastUpdate = new Date();
            stateStore.set(companyId, state);
        }
    }
    /**
     * Add created twin
     */
    static addTwin(companyId, twin) {
        const state = stateStore.get(companyId);
        if (state) {
            state.installed.twins.set(twin.id, twin);
            state.lastUpdate = new Date();
            stateStore.set(companyId, state);
        }
    }
    /**
     * Mark department as installed
     */
    static markDepartmentInstalled(companyId, deptId, endpoint) {
        const state = stateStore.get(companyId);
        if (state) {
            const dept = state.installed.departments.get(deptId);
            if (dept) {
                dept.status = 'installed';
                dept.endpoint = endpoint;
                state.lastUpdate = new Date();
                stateStore.set(companyId, state);
            }
        }
    }
    /**
     * Mark department as failed
     */
    static markDepartmentFailed(companyId, deptId, error) {
        const state = stateStore.get(companyId);
        if (state) {
            const dept = state.installed.departments.get(deptId);
            if (dept) {
                dept.status = 'failed';
                dept.error = error;
                state.lastUpdate = new Date();
                stateStore.set(companyId, state);
            }
        }
    }
    /**
     * Mark extension as installed
     */
    static markExtensionInstalled(companyId, extId, endpoints) {
        const state = stateStore.get(companyId);
        if (state) {
            const ext = state.installed.extensions.get(extId);
            if (ext) {
                ext.status = 'installed';
                ext.endpoints = endpoints;
                state.lastUpdate = new Date();
                stateStore.set(companyId, state);
            }
        }
    }
    /**
     * Mark extension as failed
     */
    static markExtensionFailed(companyId, extId, error) {
        const state = stateStore.get(companyId);
        if (state) {
            const ext = state.installed.extensions.get(extId);
            if (ext) {
                ext.status = 'failed';
                ext.error = error;
                state.lastUpdate = new Date();
                stateStore.set(companyId, state);
            }
        }
    }
    /**
     * Mark worker as active
     */
    static markWorkerActive(companyId, workerId) {
        const state = stateStore.get(companyId);
        if (state) {
            const worker = state.installed.workers.get(workerId);
            if (worker) {
                worker.status = 'active';
                state.lastUpdate = new Date();
                stateStore.set(companyId, state);
            }
        }
    }
    /**
     * Mark worker as failed
     */
    static markWorkerFailed(companyId, workerId, error) {
        const state = stateStore.get(companyId);
        if (state) {
            const worker = state.installed.workers.get(workerId);
            if (worker) {
                worker.status = 'failed';
                worker.error = error;
                state.lastUpdate = new Date();
                stateStore.set(companyId, state);
            }
        }
    }
    /**
     * Mark twin as active
     */
    static markTwinActive(companyId, twinId) {
        const state = stateStore.get(companyId);
        if (state) {
            const twin = state.installed.twins.get(twinId);
            if (twin) {
                twin.status = 'active';
                state.lastUpdate = new Date();
                stateStore.set(companyId, state);
            }
        }
    }
    /**
     * Mark twin as failed
     */
    static markTwinFailed(companyId, twinId, error) {
        const state = stateStore.get(companyId);
        if (state) {
            const twin = state.installed.twins.get(twinId);
            if (twin) {
                twin.status = 'failed';
                twin.error = error;
                state.lastUpdate = new Date();
                stateStore.set(companyId, state);
            }
        }
    }
    /**
     * Delete state (decomposition)
     */
    static delete(companyId) {
        return stateStore.delete(companyId);
    }
    /**
     * Check if state exists
     */
    static has(companyId) {
        return stateStore.has(companyId);
    }
    /**
     * List all states
     */
    static list() {
        return stateStore.list();
    }
    /**
     * Clear all states (for testing)
     */
    static clear() {
        stateStore.clear();
    }
    /**
     * Get summary of installed components
     */
    static getSummary(companyId) {
        const state = stateStore.get(companyId);
        if (!state) {
            return { departments: 0, extensions: 0, workers: 0, twins: 0 };
        }
        return {
            departments: state.installed.departments.size,
            extensions: state.installed.extensions.size,
            workers: state.installed.workers.size,
            twins: state.installed.twins.size,
        };
    }
}
exports.StateManager = StateManager;
//# sourceMappingURL=state-manager.js.map