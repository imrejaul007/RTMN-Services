/**
 * Rollback
 *
 * Handles rollback of failed compositions.
 */

import { RollbackPlan, RollbackStep } from './types';
import { StateManager } from './state-manager';
import { Installer } from './installer';

// ============================================
// Rollback Manager
// ============================================

export class RollbackManager {
  private companyId: string;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  /**
   * Execute rollback plan
   */
  async execute(plan: RollbackPlan): Promise<RollbackResult> {
    const stepsCompleted: RollbackStepResult[] = [];
    const errors: RollbackError[] = [];

    for (const step of plan.steps) {
      try {
        await this.executeStep(step);
        stepsCompleted.push({
          order: step.order,
          component: step.component,
          action: step.action,
          success: true,
        });
      } catch (error) {
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
    StateManager.updateStatus(this.companyId, 'failed');

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
  private async executeStep(step: RollbackStep): Promise<void> {
    switch (step.action) {
      case 'uninstall':
        await this.uninstallComponent(step.component);
        break;

      case 'restore':
        await this.restoreFromSnapshot(step.snapshotKey!);
        break;

      case 'cleanup':
        await this.cleanupResources(step.component);
        break;
    }
  }

  /**
   * Uninstall a component
   */
  private async uninstallComponent(component: string): Promise<void> {
    // Parse component type from name
    if (component.startsWith('dept_')) {
      const deptId = component.replace('dept_', '');
      const state = StateManager.get(this.companyId);
      if (state?.installed.departments.has(deptId)) {
        state.installed.departments.delete(deptId);
        StateManager.updateStatus(this.companyId, 'pending');
      }
    } else if (component.startsWith('ext_')) {
      const extId = component.replace('ext_', '');
      const state = StateManager.get(this.companyId);
      if (state?.installed.extensions.has(extId)) {
        state.installed.extensions.delete(extId);
        StateManager.updateStatus(this.companyId, 'pending');
      }
    } else if (component.startsWith('worker_')) {
      const workerId = component;
      const state = StateManager.get(this.companyId);
      if (state?.installed.workers.has(workerId)) {
        state.installed.workers.delete(workerId);
        StateManager.updateStatus(this.companyId, 'pending');
      }
    }

    // Simulate uninstall delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Restore from snapshot
   */
  private async restoreFromSnapshot(snapshotKey: string): Promise<void> {
    // In reality, this would restore from the manifest registry
    // For now, just simulate the delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Cleanup resources
   */
  private async cleanupResources(component: string): Promise<void> {
    // Cleanup any orphaned resources
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  /**
   * Create rollback plan for failed composition
   */
  static createRollbackPlan(installedComponents: {
    departments: string[];
    extensions: string[];
    workers: string[];
  }): RollbackPlan {
    const steps: RollbackStep[] = [];
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

// ============================================
// Rollback Result Types
// ============================================

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