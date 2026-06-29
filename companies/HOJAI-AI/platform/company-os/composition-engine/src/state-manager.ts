/**
 * State Manager
 *
 * Manages composition state for each company.
 */

import {
  CompositionState,
  DepartmentState,
  ExtensionState,
  WorkerState,
  TwinState,
} from './types';

// ============================================
// In-Memory State Store
// ============================================

class StateStore {
  private states: Map<string, CompositionState> = new Map();

  get(companyId: string): CompositionState | undefined {
    return this.states.get(companyId);
  }

  set(companyId: string, state: CompositionState): void {
    this.states.set(companyId, state);
  }

  delete(companyId: string): void {
    this.states.delete(companyId);
  }

  has(companyId: string): boolean {
    return this.states.has(companyId);
  }

  list(): CompositionState[] {
    return Array.from(this.states.values());
  }

  clear(): void {
    this.states.clear();
  }
}

// Singleton instance
const stateStore = new StateStore();

// ============================================
// State Manager
// ============================================

export class StateManager {
  /**
   * Initialize state for a new company
   */
  static initialize(companyId: string): CompositionState {
    const state: CompositionState = {
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
  static get(companyId: string): CompositionState | undefined {
    return stateStore.get(companyId);
  }

  /**
   * Update state status
   */
  static updateStatus(companyId: string, status: CompositionState['status']): void {
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
  static updateStep(companyId: string, currentStep: number, totalSteps: number): void {
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
  static addDepartment(companyId: string, dept: DepartmentState): void {
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
  static addExtension(companyId: string, ext: ExtensionState): void {
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
  static addWorker(companyId: string, worker: WorkerState): void {
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
  static addTwin(companyId: string, twin: TwinState): void {
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
  static markDepartmentInstalled(companyId: string, deptId: string, endpoint: string): void {
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
  static markDepartmentFailed(companyId: string, deptId: string, error: string): void {
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
  static markExtensionInstalled(companyId: string, extId: string, endpoints: string[]): void {
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
  static markExtensionFailed(companyId: string, extId: string, error: string): void {
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
  static markWorkerActive(companyId: string, workerId: string): void {
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
  static markWorkerFailed(companyId: string, workerId: string, error: string): void {
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
  static markTwinActive(companyId: string, twinId: string): void {
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
  static markTwinFailed(companyId: string, twinId: string, error: string): void {
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
  static delete(companyId: string): boolean {
    return stateStore.delete(companyId);
  }

  /**
   * Check if state exists
   */
  static has(companyId: string): boolean {
    return stateStore.has(companyId);
  }

  /**
   * List all states
   */
  static list(): CompositionState[] {
    return stateStore.list();
  }

  /**
   * Clear all states (for testing)
   */
  static clear(): void {
    stateStore.clear();
  }

  /**
   * Get summary of installed components
   */
  static getSummary(companyId: string): {
    departments: number;
    extensions: number;
    workers: number;
    twins: number;
  } {
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