/**
 * Rollback
 *
 * Handles rollback of failed compositions.
 */
import { RollbackPlan } from './types';
export declare class RollbackManager {
    private companyId;
    constructor(companyId: string);
    /**
     * Execute rollback plan
     */
    execute(plan: RollbackPlan): Promise<RollbackResult>;
    /**
     * Execute a single rollback step
     */
    private executeStep;
    /**
     * Uninstall a component
     */
    private uninstallComponent;
    /**
     * Restore from snapshot
     */
    private restoreFromSnapshot;
    /**
     * Cleanup resources
     */
    private cleanupResources;
    /**
     * Create rollback plan for failed composition
     */
    static createRollbackPlan(installedComponents: {
        departments: string[];
        extensions: string[];
        workers: string[];
    }): RollbackPlan;
}
export interface RollbackResult {
    success: boolean;
    stepsCompleted: RollbackStepResult[];
    errors: RollbackError[];
    duration: number;
}
export interface RollbackStepResult {
    order: number;
    component: string;
    action: string;
    success: boolean;
    error?: string;
}
export interface RollbackError {
    order: number;
    component: string;
    action: string;
    error: string;
}
