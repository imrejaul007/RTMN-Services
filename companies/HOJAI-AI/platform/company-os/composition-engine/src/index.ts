/**
 * Composition Engine
 *
 * Main export for the composition engine module.
 */

export { CompositionEngine, createCompositionEngine } from './engine';
export { DependencyResolver } from './dependency-resolver';
export { Installer } from './installer';
export { StateManager } from './state-manager';
export { RollbackManager } from './rollback';

export * from './types';