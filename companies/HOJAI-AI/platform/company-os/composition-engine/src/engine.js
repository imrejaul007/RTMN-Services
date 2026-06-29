"use strict";
/**
 * Composition Engine
 *
 * Core orchestration engine for CompanyOS.
 * Composes companies from department packs, extensions, and AI workers.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositionEngine = void 0;
exports.createCompositionEngine = createCompositionEngine;
const crypto_1 = __importDefault(require("crypto"));
const types_1 = require("./types");
const dependency_resolver_1 = require("./dependency-resolver");
const installer_1 = require("./installer");
const state_manager_1 = require("./state-manager");
const rollback_1 = require("./rollback");
// ============================================
// Composition Engine
// ============================================
class CompositionEngine {
    constructor(baseUrl = 'http://localhost') {
        this.resolver = new dependency_resolver_1.DependencyResolver();
        this.baseUrl = baseUrl;
    }
    /**
     * Compose a complete company
     */
    async compose(request) {
        const startTime = Date.now();
        const { companyId, name, industry, departments, extensions, aiDepartments } = request;
        // 1. Validate request
        const validation = await this.validate(request);
        if (!validation.valid) {
            return {
                success: false,
                companyId,
                installed: { departments: [], extensions: [], workers: [], twins: [] },
                errors: validation.errors.map(e => ({
                    phase: 'dependency',
                    component: e.field,
                    message: e.message,
                    recoverable: false,
                })),
                duration: Date.now() - startTime,
            };
        }
        // 2. Initialize state
        state_manager_1.StateManager.initialize(companyId);
        state_manager_1.StateManager.updateStatus(companyId, 'composing');
        try {
            // 3. Resolve dependencies
            const resolution = this.resolver.resolve(industry, departments, extensions);
            if (resolution.conflicts.length > 0) {
                return {
                    success: false,
                    companyId,
                    installed: { departments: [], extensions: [], workers: [], twins: [] },
                    errors: resolution.conflicts.map(c => ({
                        phase: 'dependency',
                        component: c.id,
                        message: `Conflict with ${c.conflictsWith}`,
                        recoverable: false,
                    })),
                    duration: Date.now() - startTime,
                };
            }
            if (resolution.cycles.length > 0) {
                return {
                    success: false,
                    companyId,
                    installed: { departments: [], extensions: [], workers: [], twins: [] },
                    errors: [{
                            phase: 'dependency',
                            component: 'graph',
                            message: `Circular dependencies detected: ${resolution.cycles.map(c => c.join(' -> ')).join('; ')}`,
                            recoverable: false,
                        }],
                    duration: Date.now() - startTime,
                };
            }
            // 4. Prepare workers
            const workers = this.prepareWorkers(resolution.resolved, aiDepartments);
            // 5. Create installation plan
            const plan = installer_1.Installer.createInstallationPlan(resolution.resolved.filter(r => ['finance', 'hr', 'marketing', 'sales', 'operations', 'legal'].includes(r)), extensions, workers);
            // 6. Execute installation
            state_manager_1.StateManager.updateStep(companyId, 0, plan.steps.length);
            const installer = new installer_1.Installer(companyId, this.baseUrl);
            const installResult = await installer.execute(plan);
            if (!installResult.success) {
                // Rollback
                const rollbackPlan = rollback_1.RollbackManager.createRollbackPlan({
                    departments: installResult.installedDepartments.map(d => d.id),
                    extensions: installResult.installedExtensions.map(e => e.id),
                    workers: installResult.installedWorkers.map(w => w.id),
                });
                const rollbackManager = new rollback_1.RollbackManager(companyId);
                await rollbackManager.execute(rollbackPlan);
                return {
                    success: false,
                    companyId,
                    installed: {
                        departments: installResult.installedDepartments,
                        extensions: installResult.installedExtensions,
                        workers: installResult.installedWorkers,
                        twins: [],
                    },
                    errors: installResult.errors.map(e => ({
                        phase: 'install',
                        component: e.component,
                        message: e.message,
                        recoverable: e.recoverable,
                    })),
                    duration: Date.now() - startTime,
                };
            }
            // 7. Generate twins
            const twins = this.generateTwins(companyId, industry);
            // 7.5: Populate StateManager with installed components
            for (const dept of installResult.installedDepartments) {
                state_manager_1.StateManager.addDepartment(companyId, {
                    id: dept.id,
                    status: 'installed',
                    version: dept.packVersion,
                    endpoint: dept.endpoint,
                });
            }
            for (const ext of installResult.installedExtensions) {
                state_manager_1.StateManager.addExtension(companyId, {
                    id: ext.id,
                    industry: ext.industry,
                    status: 'installed',
                    version: ext.version,
                    endpoints: ext.endpoints,
                });
            }
            for (const worker of installResult.installedWorkers) {
                state_manager_1.StateManager.addWorker(companyId, {
                    id: worker.id,
                    type: worker.type,
                    status: 'active',
                });
            }
            for (const twin of twins) {
                state_manager_1.StateManager.addTwin(companyId, {
                    id: twin.id,
                    type: twin.type,
                    status: 'active',
                });
            }
            // 8. Create manifest
            const manifest = this.createManifest(companyId, name, industry, installResult.installedDepartments, installResult.installedExtensions, installResult.installedWorkers, twins);
            // 9. Update state
            state_manager_1.StateManager.updateStatus(companyId, 'composed');
            return {
                success: true,
                companyId,
                manifest,
                installed: {
                    departments: installResult.installedDepartments,
                    extensions: installResult.installedExtensions,
                    workers: installResult.installedWorkers,
                    twins,
                },
                duration: Date.now() - startTime,
            };
        }
        catch (error) {
            state_manager_1.StateManager.updateStatus(companyId, 'failed');
            return {
                success: false,
                companyId,
                installed: { departments: [], extensions: [], workers: [], twins: [] },
                errors: [{
                        phase: 'install',
                        component: 'engine',
                        message: error instanceof Error ? error.message : 'Unknown error',
                        recoverable: false,
                    }],
                duration: Date.now() - startTime,
            };
        }
    }
    /**
     * Decompose (teardown) a company
     */
    async decompose(companyId) {
        const startTime = Date.now();
        const state = state_manager_1.StateManager.get(companyId);
        if (!state) {
            return {
                success: false,
                companyId,
                removed: { departments: [], extensions: [], workers: [], twins: [] },
                duration: Date.now() - startTime,
            };
        }
        // Capture keys BEFORE rollback modifies state
        const removedDepartments = Array.from(state.installed.departments.keys());
        const removedExtensions = Array.from(state.installed.extensions.keys());
        const removedWorkers = Array.from(state.installed.workers.keys());
        const removedTwins = Array.from(state.installed.twins.keys());
        state_manager_1.StateManager.updateStatus(companyId, 'decomposing');
        try {
            // Create rollback plan with all installed components
            const rollbackPlan = rollback_1.RollbackManager.createRollbackPlan({
                departments: removedDepartments,
                extensions: removedExtensions,
                workers: removedWorkers,
            });
            const rollbackManager = new rollback_1.RollbackManager(companyId);
            const rollbackResult = await rollbackManager.execute(rollbackPlan);
            // Delete state
            state_manager_1.StateManager.delete(companyId);
            return {
                success: rollbackResult.success,
                companyId,
                removed: {
                    departments: removedDepartments,
                    extensions: removedExtensions,
                    workers: removedWorkers,
                    twins: removedTwins,
                },
                duration: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                companyId,
                removed: { departments: [], extensions: [], workers: [], twins: [] },
                duration: Date.now() - startTime,
            };
        }
    }
    /**
     * Get current composition state
     */
    async getState(companyId) {
        return state_manager_1.StateManager.get(companyId);
    }
    /**
     * Get all company states
     */
    getAllStates() {
        return state_manager_1.StateManager.list();
    }
    /**
     * Validate a composition request
     */
    async validate(request) {
        const errors = [];
        const warnings = [];
        // Check company ID
        if (!request.companyId || request.companyId.length < 3) {
            errors.push({
                field: 'companyId',
                message: 'Company ID must be at least 3 characters',
                code: 'INVALID_COMPANY_ID',
            });
        }
        // Check name
        if (!request.name || request.name.length < 2) {
            errors.push({
                field: 'name',
                message: 'Company name must be at least 2 characters',
                code: 'INVALID_NAME',
            });
        }
        // Check industry
        const validIndustries = [
            'restaurant', 'beauty', 'healthcare', 'retail', 'hotel',
            'education', 'realestate', 'fitness', 'legal', 'construction',
            'manufacturing', 'logistics', 'automotive', 'fashion', 'sports',
            'entertainment', 'travel', 'government', 'agriculture', 'nonprofit',
            'professional', 'home_services', 'gaming', 'media',
        ];
        if (!validIndustries.includes(request.industry)) {
            errors.push({
                field: 'industry',
                message: `Invalid industry. Must be one of: ${validIndustries.join(', ')}`,
                code: 'INVALID_INDUSTRY',
            });
        }
        // Check departments
        const validDepartments = ['finance', 'hr', 'marketing', 'sales', 'operations', 'legal'];
        for (const dept of request.departments) {
            if (!validDepartments.includes(dept)) {
                errors.push({
                    field: `departments.${dept}`,
                    message: `Invalid department: ${dept}`,
                    code: 'INVALID_DEPARTMENT',
                });
            }
        }
        // Check for duplicate departments
        const uniqueDepts = new Set(request.departments);
        if (uniqueDepts.size !== request.departments.length) {
            errors.push({
                field: 'departments',
                message: 'Duplicate departments not allowed',
                code: 'DUPLICATE_DEPARTMENT',
            });
        }
        // Check AI departments config
        for (const [dept, config] of Object.entries(request.aiDepartments)) {
            if (!validDepartments.includes(dept)) {
                errors.push({
                    field: `aiDepartments.${dept}`,
                    message: `AI config for invalid department: ${dept}`,
                    code: 'INVALID_AI_DEPARTMENT',
                });
            }
            else if (config.enabled && !config.head) {
                warnings.push({
                    field: `aiDepartments.${dept}`,
                    message: `AI enabled but no head specified for ${dept}`,
                });
            }
        }
        // Warning for missing common departments
        if (!request.departments.includes('finance')) {
            warnings.push({
                field: 'departments',
                message: 'Finance department not included - may be auto-added as required',
            });
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Prepare AI workers based on configuration
     */
    prepareWorkers(resolvedDeps, aiDepartments) {
        const workers = [];
        for (const [dept, config] of Object.entries(aiDepartments)) {
            if (config.enabled && config.head && resolvedDeps.includes(dept)) {
                workers.push(`worker_${config.head}_${dept}`);
            }
        }
        return workers;
    }
    /**
     * Generate twin references
     */
    generateTwins(companyId, industry) {
        const twins = [];
        // Company twin
        twins.push({
            id: (0, types_1.createTwinId)(companyId, 'company'),
            type: 'company',
            service: 'twinos-hub',
            endpoint: 'http://localhost:4705',
        });
        // Industry twin
        twins.push({
            id: (0, types_1.createTwinId)(companyId, `industry_${industry}`),
            type: `industry:${industry}`,
            service: 'twinos-hub',
            endpoint: 'http://localhost:4705',
        });
        return twins;
    }
    /**
     * Create company manifest
     */
    createManifest(companyId, name, industry, departments, extensions, workers, twins) {
        const now = new Date().toISOString();
        const manifest = {
            version: '1.0.0',
            companyId,
            name,
            industry: industry,
            createdAt: now,
            updatedAt: now,
            composition: {
                departments,
                extensions,
                aiWorkers: workers,
            },
            twins: {
                companyTwin: twins.find(t => t.type === 'company'),
                departmentTwins: [],
                extensionTwins: twins.filter(t => t.type.startsWith('industry:')),
                workerTwins: [],
            },
            metadata: {
                createdBy: 'composition-engine',
                environment: 'production',
                region: 'ap-south-1',
                tags: [industry],
            },
            checksum: '',
        };
        // Calculate checksum
        manifest.checksum = this.calculateChecksum(manifest);
        return manifest;
    }
    /**
     * Calculate manifest checksum
     */
    calculateChecksum(manifest) {
        const { checksum: _, ...manifestWithoutChecksum } = manifest;
        const content = JSON.stringify(manifestWithoutChecksum);
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    }
}
exports.CompositionEngine = CompositionEngine;
// ============================================
// Factory Function
// ============================================
function createCompositionEngine(baseUrl) {
    return new CompositionEngine(baseUrl);
}
//# sourceMappingURL=engine.js.map