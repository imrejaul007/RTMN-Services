/**
 * State Manager
 *
 * Manages composition state for each company.
 */
import { CompositionState, DepartmentState, ExtensionState, WorkerState, TwinState } from './types';
export declare class StateManager {
    /**
     * Initialize state for a new company
     */
    static initialize(companyId: string): CompositionState;
    /**
     * Get current state
     */
    static get(companyId: string): CompositionState | undefined;
    /**
     * Update state status
     */
    static updateStatus(companyId: string, status: CompositionState['status']): void;
    /**
     * Update current step
     */
    static updateStep(companyId: string, currentStep: number, totalSteps: number): void;
    /**
     * Add installed department
     */
    static addDepartment(companyId: string, dept: DepartmentState): void;
    /**
     * Add installed extension
     */
    static addExtension(companyId: string, ext: ExtensionState): void;
    /**
     * Add installed worker
     */
    static addWorker(companyId: string, worker: WorkerState): void;
    /**
     * Add created twin
     */
    static addTwin(companyId: string, twin: TwinState): void;
    /**
     * Mark department as installed
     */
    static markDepartmentInstalled(companyId: string, deptId: string, endpoint: string): void;
    /**
     * Mark department as failed
     */
    static markDepartmentFailed(companyId: string, deptId: string, error: string): void;
    /**
     * Mark extension as installed
     */
    static markExtensionInstalled(companyId: string, extId: string, endpoints: string[]): void;
    /**
     * Mark extension as failed
     */
    static markExtensionFailed(companyId: string, extId: string, error: string): void;
    /**
     * Mark worker as active
     */
    static markWorkerActive(companyId: string, workerId: string): void;
    /**
     * Mark worker as failed
     */
    static markWorkerFailed(companyId: string, workerId: string, error: string): void;
    /**
     * Mark twin as active
     */
    static markTwinActive(companyId: string, twinId: string): void;
    /**
     * Mark twin as failed
     */
    static markTwinFailed(companyId: string, twinId: string, error: string): void;
    /**
     * Delete state (decomposition)
     */
    static delete(companyId: string): boolean;
    /**
     * Check if state exists
     */
    static has(companyId: string): boolean;
    /**
     * List all states
     */
    static list(): CompositionState[];
    /**
     * Clear all states (for testing)
     */
    static clear(): void;
    /**
     * Get summary of installed components
     */
    static getSummary(companyId: string): {
        departments: number;
        extensions: number;
        workers: number;
        twins: number;
    };
}
