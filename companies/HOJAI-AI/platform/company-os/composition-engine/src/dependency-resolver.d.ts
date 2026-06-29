/**
 * Dependency Resolver
 *
 * Resolves dependencies between industry extensions and department packs.
 * Auto-installs required dependencies and detects conflicts.
 */
import { IndustryType, DepartmentType, DependencyResolution } from './types';
/**
 * Dependency Resolver
 */
export declare class DependencyResolver {
    private graph;
    private nodes;
    constructor();
    /**
     * Initialize dependency graph with all components
     */
    initializeGraph(industry: IndustryType, requestedDepartments: DepartmentType[], requestedExtensions: string[]): void;
    /**
     * Resolve dependencies for a composition
     */
    resolve(industry: IndustryType, requestedDepartments: DepartmentType[], requestedExtensions: string[]): DependencyResolution;
    /**
     * Add industry node to graph
     */
    private addIndustryNode;
    /**
     * Add department node to graph
     */
    private addDepartmentNode;
    /**
     * Add extension node to graph
     */
    private addExtensionNode;
    /**
     * Build edges between nodes
     */
    private buildEdges;
    /**
     * Detect cycles in the dependency graph using DFS
     */
    private detectCycles;
    /**
     * Get installation order (topological sort)
     * Returns departments in dependency order (industry and extensions excluded)
     */
    getInstallationOrder(): string[];
    /**
     * Get extension IDs in dependency order (by stripping prefix)
     */
    getExtensionOrder(): string[];
    /**
     * Get all available departments
     */
    static getAllDepartments(): DepartmentType[];
    /**
     * Get dependencies for an industry
     */
    static getIndustryDependencies(industry: IndustryType): {
        required: DepartmentType[];
        optional: DepartmentType[];
    };
}
