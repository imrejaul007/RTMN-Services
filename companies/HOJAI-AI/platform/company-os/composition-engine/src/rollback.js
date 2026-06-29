"use strict";
/**
 * Rollback
 *
 * Handles rollback of failed compositions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollbackManager = void 0;
const state_manager_1 = require("./state-manager");
// ============================================
// Rollback Manager
// ============================================
class RollbackManager {
    constructor(companyId) {
        this.companyId = companyId;
    }
    /**
     * Execute rollback plan
     */
    async execute(plan) {
        const stepsCompleted = [];
        const errors = [];
        for (const step of plan.steps) {
            try {
                await this.executeStep(step);
                stepsCompleted.push({
                    order: step.order,
                    component: step.component,
                    action: step.action,
                    success: true,
                });
            }
            catch (error) {
                errors.push({
                    order: step.order,
                    component: step.component,
                    action: step.action,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                stepsCompleted.push({
                    order: step.order,
                    component: step.component,
                    action: step.action,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        // Update state
        state_manager_1.StateManager.updateStatus(this.companyId, 'failed');
        return {
            success: errors.length === 0,
            stepsCompleted,
            errors,
            duration: 0, // Would track actual duration
        };
    }
    /**
     * Execute a single rollback step
     */
    async executeStep(step) {
        switch (step.action) {
            case 'uninstall':
                await this.uninstallComponent(step.component);
                break;
            case 'restore':
                await this.restoreFromSnapshot(step.snapshotKey);
                break;
            case 'cleanup':
                await this.cleanupResources(step.component);
                break;
        }
    }
    /**
     * Uninstall a component
     */
    async uninstallComponent(component) {
        // Parse component type from name
        if (component.startsWith('dept_')) {
            const deptId = component.replace('dept_', '');
            const state = state_manager_1.StateManager.get(this.companyId);
            if (state?.installed.departments.has(deptId)) {
                state.installed.departments.delete(deptId);
                state_manager_1.StateManager.updateStatus(this.companyId, 'pending');
            }
        }
        else if (component.startsWith('ext_')) {
            const extId = component.replace('ext_', '');
            const state = state_manager_1.StateManager.get(this.companyId);
            if (state?.installed.extensions.has(extId)) {
                state.installed.extensions.delete(extId);
                state_manager_1.StateManager.updateStatus(this.companyId, 'pending');
            }
        }
        else if (component.startsWith('worker_')) {
            const workerId = component;
            const state = state_manager_1.StateManager.get(this.companyId);
            if (state?.installed.workers.has(workerId)) {
                state.installed.workers.delete(workerId);
                state_manager_1.StateManager.updateStatus(this.companyId, 'pending');
            }
        }
        // Simulate uninstall delay
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    /**
     * Restore from snapshot
     */
    async restoreFromSnapshot(snapshotKey) {
        // In reality, this would restore from the manifest registry
        // For now, just simulate the delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    /**
     * Cleanup resources
     */
    async cleanupResources(component) {
        // Cleanup any orphaned resources
        await new Promise(resolve => setTimeout(resolve, 30));
    }
    /**
     * Create rollback plan for failed composition
     */
    static createRollbackPlan(installedComponents) {
        const steps = [];
        let order = 1;
        // Reverse order: workers first, then extensions, then departments
        for (const worker of installedComponents.workers.reverse()) {
            steps.push({
                order: order++,
                component: worker,
                action: 'uninstall',
            });
        }
        for (const ext of installedComponents.extensions.reverse()) {
            steps.push({
                order: order++,
                component: `ext_${ext}`,
                action: 'uninstall',
            });
        }
        for (const dept of installedComponents.departments.reverse()) {
            steps.push({
                order: order++,
                component: `dept_${dept}`,
                action: 'uninstall',
            });
        }
        return {
            steps,
            snapshotId: '',
        };
    }
}
exports.RollbackManager = RollbackManager;
//# sourceMappingURL=rollback.js.map