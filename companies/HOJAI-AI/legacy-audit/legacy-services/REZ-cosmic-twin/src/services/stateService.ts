import { Twin } from '../models/Twin.js';
import { logger } from '../utils/logger.js';

interface StateTransition {
  from: string;
  to: string;
  condition?: Record<string, unknown>;
}

interface StateDefinition {
  initial: boolean;
  transitions: string[];
}

export class StateService {
  private stateDefinitions: Map<string, StateDefinition> = new Map();
  private validTransitions: Map<string, StateTransition[]> = new Map();

  constructor() {
    this.initializeDefaultStates();
  }

  /**
   * Initialize default state definitions for common entity types
   */
  private initializeDefaultStates(): void {
    // Company states
    this.defineState('company', {
      initial: true,
      transitions: ['active', 'inactive', 'archived', 'pending'],
    });

    // Person states
    this.defineState('person', {
      initial: true,
      transitions: ['active', 'inactive', 'suspended', 'pending_verification'],
    });

    // Product states
    this.defineState('product', {
      initial: true,
      transitions: ['active', 'discontinued', 'recalled', 'pending'],
    });

    // Location states
    this.defineState('location', {
      initial: true,
      transitions: ['open', 'closed', 'temporarily_closed', 'relocating'],
    });

    // Event states
    this.defineState('event', {
      initial: true,
      transitions: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    });
  }

  /**
   * Define state machine for an entity type
   */
  defineState(entityType: string, definition: StateDefinition): void {
    this.stateDefinitions.set(entityType, definition);
  }

  /**
   * Define a valid state transition
   */
  defineTransition(
    entityType: string,
    _from: string,
    to: string,
    condition?: Record<string, unknown>
  ): void {
    const key = `${entityType}:${to}`;
    const transitions = this.validTransitions.get(key) || [];
    transitions.push({ from: _from, to, condition });
    this.validTransitions.set(key, transitions);
  }

  /**
   * Check if a transition is valid
   */
  isValidTransition(entityType: string, _from: string, to: string): boolean {
    const definition = this.stateDefinitions.get(entityType);
    if (!definition) {
      return true; // Allow any transition if no definition
    }
    return definition.transitions.includes(to);
  }

  /**
   * Get current state of a twin
   */
  async getTwinState(twinId: string): Promise<Record<string, unknown> | null> {
    const twin = await Twin.findOne({ twinId }, { state: 1 });
    return twin?.state || null;
  }

  /**
   * Get the current state value from a twin's state
   */
  getCurrentStateValue(twin: { state: Record<string, unknown> }): string | null {
    return (twin.state['status'] as string) || (twin.state['state'] as string) || null;
  }

  /**
   * Transition a twin to a new state
   */
  async transitionState(
    twinId: string,
    newState: string,
    metadata?: Record<string, unknown>,
    source: string = 'system'
  ): Promise<{ success: boolean; error?: string; newState?: Record<string, unknown> }> {
    const twin = await Twin.findOne({ twinId });
    if (!twin) {
      return { success: false, error: 'Twin not found' };
    }

    const currentState = this.getCurrentStateValue(twin);

    // Validate transition
    if (currentState && !this.isValidTransition(twin.type, currentState, newState)) {
      return {
        success: false,
        error: `Invalid transition from '${currentState}' to '${newState}' for entity type '${twin.type}'`,
      };
    }

    // Perform transition
    twin.state = {
      ...twin.state,
      status: newState,
      state: newState,
      lastStateChange: new Date().toISOString(),
      ...metadata,
    };
    twin.version += 1;
    twin.lastSync = new Date();

    await twin.save();
    logger.info(`State transition: ${twinId}`, { from: currentState, to: newState, source });

    return { success: true, newState: twin.state };
  }

  /**
   * Get available states for an entity type
   */
  getAvailableStates(entityType: string): string[] {
    const definition = this.stateDefinitions.get(entityType);
    if (!definition) {
      return [];
    }
    return definition.transitions;
  }

  /**
   * Get initial state for an entity type
   */
  getInitialState(entityType: string): string {
    const definition = this.stateDefinitions.get(entityType);
    return definition?.initial ? 'active' : 'unknown';
  }

  /**
   * Validate state structure
   */
  validateState(state: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for circular references
    if (this.containsCircularReference(state)) {
      errors.push('State contains circular reference');
    }

    // Check state size
    const stateSize = JSON.stringify(state).length;
    if (stateSize > 10 * 1024 * 1024) {
      // 10MB limit
      errors.push('State exceeds maximum size of 10MB');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check for circular references in state
   */
  private containsCircularReference(obj: unknown, seen: WeakSet<object> = new WeakSet()): boolean {
    if (obj === null || typeof obj !== 'object') {
      return false;
    }

    if (seen.has(obj as object)) {
      return true;
    }

    seen.add(obj as object);

    for (const value of Object.values(obj as Record<string, unknown>)) {
      if (this.containsCircularReference(value, seen)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Compute state diff between two states
   */
  computeStateDiff(
    oldState: Record<string, unknown>,
    newState: Record<string, unknown>
  ): { added: Record<string, unknown>; removed: string[]; modified: Record<string, { old: unknown; new: unknown }> } {
    const added: Record<string, unknown> = {};
    const removed: string[] = [];
    const modified: Record<string, { old: unknown; new: unknown }> = {};

    const allKeys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);

    for (const key of allKeys) {
      const oldValue = oldState[key];
      const newValue = newState[key];

      if (!(key in oldState) && key in newState) {
        added[key] = newValue;
      } else if (key in oldState && !(key in newState)) {
        removed.push(key);
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        modified[key] = { old: oldValue, new: newValue };
      }
    }

    return { added, removed, modified };
  }
}

export const stateService = new StateService();
