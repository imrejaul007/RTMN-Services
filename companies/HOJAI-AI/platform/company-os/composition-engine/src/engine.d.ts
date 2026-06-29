/**
 * Composition Engine
 *
 * Core orchestration engine for CompanyOS.
 * Composes companies from department packs, extensions, and AI workers.
 */
import { CompanyComposition, CompositionResult, DecomposeResult, CompositionState, ValidationResult } from './types';
export declare class CompositionEngine {
    private resolver;
    private baseUrl;
    constructor(baseUrl?: string);
    /**
     * Compose a complete company
     */
    compose(request: CompanyComposition): Promise<CompositionResult>;
    /**
     * Decompose (teardown) a company
     */
    decompose(companyId: string): Promise<DecomposeResult>;
    /**
     * Get current composition state
     */
    getState(companyId: string): Promise<CompositionState | undefined>;
    /**
     * Get all company states
     */
    getAllStates(): CompositionState[];
    /**
     * Validate a composition request
     */
    validate(request: CompanyComposition): Promise<ValidationResult>;
    /**
     * Prepare AI workers based on configuration
     */
    private prepareWorkers;
    /**
     * Generate twin references
     */
    private generateTwins;
    /**
     * Create company manifest
     */
    private createManifest;
    /**
     * Calculate manifest checksum
     */
    private calculateChecksum;
}
export declare function createCompositionEngine(baseUrl?: string): CompositionEngine;
