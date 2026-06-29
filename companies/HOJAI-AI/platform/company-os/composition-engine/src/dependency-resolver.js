"use strict";
/**
 * Dependency Resolver
 *
 * Resolves dependencies between industry extensions and department packs.
 * Auto-installs required dependencies and detects conflicts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyResolver = void 0;
// ============================================
// Industry Extension Dependencies
// ============================================
const INDUSTRY_DEPS = {
    restaurant: { required: ['finance', 'operations'], optional: ['marketing', 'hr'] },
    beauty: { required: ['finance'], optional: ['marketing', 'hr'] },
    healthcare: { required: ['finance', 'legal'], optional: ['hr', 'operations'] },
    retail: { required: ['finance', 'operations'], optional: ['marketing', 'sales'] },
    hotel: { required: ['finance', 'operations'], optional: ['marketing', 'hr'] },
    education: { required: ['finance'], optional: ['marketing', 'hr', 'operations'] },
    realestate: { required: ['finance', 'legal'], optional: ['marketing', 'sales'] },
    fitness: { required: ['finance'], optional: ['marketing', 'hr'] },
    legal: { required: ['legal'], optional: ['finance', 'hr'] },
    construction: { required: ['finance', 'operations'], optional: ['hr', 'legal'] },
    manufacturing: { required: ['finance', 'operations'], optional: ['hr', 'legal'] },
    logistics: { required: ['finance', 'operations'], optional: ['hr'] },
    automotive: { required: ['finance', 'operations'], optional: ['marketing', 'sales'] },
    fashion: { required: ['finance', 'operations'], optional: ['marketing', 'sales'] },
    sports: { required: ['finance'], optional: ['marketing', 'hr', 'operations'] },
    entertainment: { required: ['finance', 'operations'], optional: ['marketing', 'legal'] },
    travel: { required: ['finance', 'operations'], optional: ['marketing', 'hr'] },
    government: { required: ['finance', 'legal'], optional: ['hr', 'operations'] },
    agriculture: { required: ['finance'], optional: ['operations', 'hr'] },
    nonprofit: { required: ['finance'], optional: ['hr', 'marketing'] },
    professional: { required: ['finance'], optional: ['hr', 'legal', 'operations'] },
    home_services: { required: ['finance', 'operations'], optional: ['hr', 'marketing'] },
    gaming: { required: ['finance'], optional: ['marketing', 'operations'] },
    media: { required: ['finance', 'operations'], optional: ['marketing', 'hr'] },
};
// Department conflicts
const DEPARTMENT_CONFLICTS = {
    finance: [],
    hr: [],
    marketing: [],
    sales: [],
    operations: [],
    legal: [],
};
// All departments
const ALL_DEPARTMENTS = ['finance', 'hr', 'marketing', 'sales', 'operations', 'legal'];
/**
 * Dependency Resolver
 */
class DependencyResolver {
    constructor() {
        this.nodes = new Map();
        this.graph = {
            nodes: this.nodes,
            edges: [],
        };
    }
    /**
     * Initialize dependency graph with all components
     */
    initializeGraph(industry, requestedDepartments, requestedExtensions) {
        this.nodes.clear();
        this.graph.edges = [];
        // Add industry node
        this.addIndustryNode(industry);
        // Add requested department nodes
        for (const dept of requestedDepartments) {
            this.addDepartmentNode(dept);
        }
        // Add extension nodes
        for (const ext of requestedExtensions) {
            this.addExtensionNode(ext, industry);
        }
        // Build edges
        this.buildEdges();
    }
    /**
     * Resolve dependencies for a composition
     */
    resolve(industry, requestedDepartments, requestedExtensions) {
        // Initialize with requested components
        this.initializeGraph(industry, requestedDepartments, requestedExtensions);
        const autoAdded = [];
        const resolved = [];
        const conflicts = [];
        const cycles = [];
        // 1. Add industry (always resolved)
        resolved.push(industry);
        // 2. Add explicitly requested departments
        for (const dept of requestedDepartments) {
            resolved.push(dept);
        }
        // 3. Auto-add required dependencies from industry
        const industryDeps = INDUSTRY_DEPS[industry];
        for (const dept of industryDeps.required) {
            if (!resolved.includes(dept)) {
                autoAdded.push({
                    id: dept,
                    reason: `Required by industry: ${industry}`,
                });
                resolved.push(dept);
                this.addDepartmentNode(dept);
            }
        }
        // 4. Auto-add optional dependencies if not explicitly excluded
        for (const dept of industryDeps.optional) {
            if (!resolved.includes(dept)) {
                autoAdded.push({
                    id: dept,
                    reason: `Optional for industry: ${industry}`,
                });
                resolved.push(dept);
                this.addDepartmentNode(dept);
            }
        }
        // 5. Check for conflicts
        for (const dept of resolved) {
            const deptConflicts = DEPARTMENT_CONFLICTS[dept] || [];
            for (const conflict of deptConflicts) {
                if (resolved.includes(conflict)) {
                    conflicts.push({ id: dept, conflictsWith: conflict });
                }
            }
        }
        // 6. Detect cycles
        const detectedCycles = this.detectCycles();
        if (detectedCycles.length > 0) {
            cycles.push(...detectedCycles);
        }
        return {
            resolved,
            autoAdded,
            conflicts,
            cycles,
        };
    }
    /**
     * Add industry node to graph
     */
    addIndustryNode(industry) {
        const deps = INDUSTRY_DEPS[industry];
        this.nodes.set(industry, {
            id: industry,
            type: 'industry',
            requires: deps.required,
            optional: deps.optional,
            conflicts: [],
        });
    }
    /**
     * Add department node to graph
     */
    addDepartmentNode(dept) {
        if (!this.nodes.has(dept)) {
            this.nodes.set(dept, {
                id: dept,
                type: 'department',
                requires: ['identity'], // All departments require identity
                optional: [],
                conflicts: DEPARTMENT_CONFLICTS[dept] || [],
            });
        }
    }
    /**
     * Add extension node to graph
     */
    addExtensionNode(ext, industry) {
        const nodeId = `ext_${industry}_${ext}`;
        this.nodes.set(nodeId, {
            id: nodeId,
            type: 'extension',
            requires: [...INDUSTRY_DEPS[industry].required],
            optional: [],
            conflicts: [],
        });
    }
    /**
     * Build edges between nodes
     */
    buildEdges() {
        this.graph.edges = [];
        for (const [nodeId, node] of this.nodes) {
            for (const req of node.requires) {
                if (this.nodes.has(req)) {
                    this.graph.edges.push({
                        from: nodeId,
                        to: req,
                        type: 'required',
                    });
                }
            }
            for (const opt of node.optional) {
                if (this.nodes.has(opt)) {
                    this.graph.edges.push({
                        from: nodeId,
                        to: opt,
                        type: 'optional',
                    });
                }
            }
        }
    }
    /**
     * Detect cycles in the dependency graph using DFS
     */
    detectCycles() {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];
        const dfs = (nodeId) => {
            visited.add(nodeId);
            recursionStack.add(nodeId);
            path.push(nodeId);
            // Find all edges from this node
            const outgoing = this.graph.edges.filter(e => e.from === nodeId);
            for (const edge of outgoing) {
                if (!visited.has(edge.to)) {
                    dfs(edge.to);
                }
                else if (recursionStack.has(edge.to)) {
                    // Found a cycle
                    const cycleStart = path.indexOf(edge.to);
                    if (cycleStart !== -1) {
                        cycles.push([...path.slice(cycleStart), edge.to]);
                    }
                }
            }
            path.pop();
            recursionStack.delete(nodeId);
        };
        for (const nodeId of this.nodes.keys()) {
            if (!visited.has(nodeId)) {
                dfs(nodeId);
            }
        }
        return cycles;
    }
    /**
     * Get installation order (topological sort)
     * Returns departments in dependency order (industry and extensions excluded)
     */
    getInstallationOrder() {
        const order = [];
        const visited = new Set();
        const temp = new Set();
        const visit = (nodeId) => {
            if (temp.has(nodeId))
                return; // Skip cycles
            if (visited.has(nodeId))
                return;
            temp.add(nodeId);
            // Visit dependencies first
            const incoming = this.graph.edges.filter(e => e.to === nodeId);
            for (const edge of incoming) {
                visit(edge.from);
            }
            temp.delete(nodeId);
            visited.add(nodeId);
            // Only add department nodes (exclude industry and extensions)
            // Industry is informational only, extensions are handled separately
            const node = this.nodes.get(nodeId);
            if (node && node.type === 'department') {
                order.push(nodeId);
            }
        };
        for (const nodeId of this.nodes.keys()) {
            visit(nodeId);
        }
        return order;
    }
    /**
     * Get extension IDs in dependency order (by stripping prefix)
     */
    getExtensionOrder() {
        const extensions = [];
        for (const nodeId of this.nodes.keys()) {
            if (nodeId.startsWith('ext_')) {
                // Strip prefix: 'ext_restaurant_pos' -> 'pos'
                const parts = nodeId.split('_');
                extensions.push(parts[parts.length - 1]);
            }
        }
        return extensions;
    }
    /**
     * Get all available departments
     */
    static getAllDepartments() {
        return [...ALL_DEPARTMENTS];
    }
    /**
     * Get dependencies for an industry
     */
    static getIndustryDependencies(industry) {
        return INDUSTRY_DEPS[industry] || { required: [], optional: [] };
    }
}
exports.DependencyResolver = DependencyResolver;
//# sourceMappingURL=dependency-resolver.js.map