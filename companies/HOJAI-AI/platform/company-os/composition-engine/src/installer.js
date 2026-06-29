"use strict";
/**
 * Installer
 *
 * Executes installation of departments, extensions, and workers
 * based on the installation plan.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Installer = void 0;
// ============================================
// Department Pack Registry
// ============================================
const DEPARTMENT_PACKS = {
    finance: {
        id: 'finance',
        name: 'Finance Department',
        version: '1.0.0',
        description: 'Complete finance and accounting department',
        capabilities: ['Accounting', 'Treasury', 'Tax', 'Budgeting', 'Reporting'],
        aiWorkers: [
            {
                id: 'ai-cfo',
                name: 'AI Chief Financial Officer',
                department: 'finance',
                level: 'senior',
                skills: ['financial_analysis', 'cash_flow_management', 'risk_assessment'],
                policies: ['spending-limits', 'approval-matrix'],
                authority: { maxTransactionValue: 100000, requireApprovalAbove: 500000 },
            },
            {
                id: 'ai-accountant',
                name: 'AI Accountant',
                department: 'finance',
                level: 'senior',
                skills: ['bookkeeping', 'invoice_processing', 'reconciliation'],
                policies: ['invoice-validation'],
                authority: { maxTransactionValue: 10000, requireApprovalAbove: 50000 },
            },
        ],
        dependencies: { required: ['identity'], optional: [] },
        conflicts: [],
        endpoints: ['/api/finance', '/api/accounting', '/api/treasury'],
        port: 4801,
    },
    hr: {
        id: 'hr',
        name: 'HR Department',
        version: '1.0.0',
        description: 'Complete human resources department',
        capabilities: ['Recruitment', 'Payroll', 'Performance', 'Benefits', 'Training'],
        aiWorkers: [
            {
                id: 'ai-recruiter',
                name: 'AI Recruiter',
                department: 'hr',
                level: 'senior',
                skills: ['resume_screening', 'interview_scheduling', 'candidate_matching'],
                policies: ['hiring-approval'],
                authority: { maxTransactionValue: 0, requireApprovalAbove: 0 },
            },
            {
                id: 'ai-payroll-manager',
                name: 'AI Payroll Manager',
                department: 'hr',
                level: 'senior',
                skills: ['payroll_processing', 'compliance', 'tax_calculation'],
                policies: ['payroll-validation'],
                authority: { maxTransactionValue: 1000, requireApprovalAbove: 10000 },
            },
        ],
        dependencies: { required: ['identity'], optional: [] },
        conflicts: [],
        endpoints: ['/api/hr', '/api/employees', '/api/payroll'],
        port: 5077,
    },
    marketing: {
        id: 'marketing',
        name: 'Marketing Department',
        version: '1.0.0',
        description: 'Complete marketing department',
        capabilities: ['Campaigns', 'Content', 'SEO', 'Social', 'Analytics'],
        aiWorkers: [
            {
                id: 'ai-cmo',
                name: 'AI Chief Marketing Officer',
                department: 'marketing',
                level: 'senior',
                skills: ['campaign_strategy', 'budget_optimization', 'brand_management'],
                policies: ['campaign-limits'],
                authority: { maxTransactionValue: 50000, requireApprovalAbove: 200000 },
            },
            {
                id: 'ai-content-manager',
                name: 'AI Content Manager',
                department: 'marketing',
                level: 'senior',
                skills: ['content_creation', 'seo_optimization', 'social_posting'],
                policies: ['content-approval'],
                authority: { maxTransactionValue: 5000, requireApprovalAbove: 25000 },
            },
        ],
        dependencies: { required: ['identity'], optional: [] },
        conflicts: [],
        endpoints: ['/api/marketing', '/api/campaigns', '/api/content'],
        port: 5500,
    },
    sales: {
        id: 'sales',
        name: 'Sales Department',
        version: '1.0.0',
        description: 'Complete sales department',
        capabilities: ['CRM', 'Pipelines', 'Quotes', 'Leads', 'Success'],
        aiWorkers: [
            {
                id: 'ai-sdr',
                name: 'AI Sales Development Rep',
                department: 'sales',
                level: 'senior',
                skills: ['lead_qualification', 'cold_outreach', 'meeting_scheduling'],
                policies: ['outreach-limits'],
                authority: { maxTransactionValue: 0, requireApprovalAbove: 0 },
            },
            {
                id: 'ai-closer',
                name: 'AI Sales Closer',
                department: 'sales',
                level: 'senior',
                skills: ['deal_negotiation', 'proposal_creation', 'pricing_optimization'],
                policies: ['discount-limits'],
                authority: { maxTransactionValue: 25000, requireApprovalAbove: 100000 },
            },
        ],
        dependencies: { required: ['identity'], optional: [] },
        conflicts: [],
        endpoints: ['/api/sales', '/api/crm', '/api/pipelines'],
        port: 5055,
    },
    operations: {
        id: 'operations',
        name: 'Operations Department',
        version: '1.0.0',
        description: 'Complete operations department',
        capabilities: ['Scheduling', 'Inventory', 'Quality', 'SOPs', 'Procurement'],
        aiWorkers: [
            {
                id: 'ai-ops-manager',
                name: 'AI Operations Manager',
                department: 'operations',
                level: 'senior',
                skills: ['process_optimization', 'resource_allocation', 'risk_management'],
                policies: ['ops-approval'],
                authority: { maxTransactionValue: 25000, requireApprovalAbove: 100000 },
            },
        ],
        dependencies: { required: ['identity'], optional: [] },
        conflicts: [],
        endpoints: ['/api/operations', '/api/projects', '/api/processes'],
        port: 5250,
    },
    legal: {
        id: 'legal',
        name: 'Legal Department',
        version: '1.0.0',
        description: 'Complete legal department',
        capabilities: ['Contracts', 'Compliance', 'Policies', 'Risk', 'IP'],
        aiWorkers: [
            {
                id: 'ai-legal-counsel',
                name: 'AI Legal Counsel',
                department: 'legal',
                level: 'senior',
                skills: ['contract_review', 'compliance_check', 'risk_assessment'],
                policies: ['legal-review'],
                authority: { maxTransactionValue: 0, requireApprovalAbove: 0 },
            },
        ],
        dependencies: { required: ['identity'], optional: [] },
        conflicts: [],
        endpoints: ['/api/legal', '/api/contracts', '/api/compliance'],
        port: 5035,
    },
};
// ============================================
// Industry Extension Registry
// ============================================
const EXTENSION_PACKS = {
    restaurant: {
        id: 'restaurant',
        industry: 'restaurant',
        name: 'Restaurant Extension',
        version: '1.0.0',
        description: 'Restaurant-specific capabilities',
        modules: [
            { id: 'menus', name: 'Menu Management', endpoints: ['/api/menus'] },
            { id: 'kitchen', name: 'Kitchen Display', endpoints: ['/api/kitchen'] },
            { id: 'pos', name: 'Point of Sale', endpoints: ['/api/pos'] },
            { id: 'reservations', name: 'Table Reservations', endpoints: ['/api/reservations'] },
            { id: 'delivery', name: 'Delivery Management', endpoints: ['/api/delivery'] },
            { id: 'recipes', name: 'Recipe Management', endpoints: ['/api/recipes'] },
        ],
        dependencies: { required: ['finance', 'operations'], optional: ['marketing'] },
        specificity: { totalLOC: 15000, verticalLOC: 14250, ratio: 0.95 },
        port: 5010,
    },
    beauty: {
        id: 'beauty',
        industry: 'beauty',
        name: 'Beauty Extension',
        version: '1.0.0',
        description: 'Beauty/salon-specific capabilities',
        modules: [
            { id: 'services', name: 'Service Management', endpoints: ['/api/services'] },
            { id: 'stylists', name: 'Stylist Management', endpoints: ['/api/stylists'] },
            { id: 'appointments', name: 'Appointments', endpoints: ['/api/appointments'] },
            { id: 'memberships', name: 'Memberships', endpoints: ['/api/memberships'] },
        ],
        dependencies: { required: ['finance'], optional: ['marketing', 'hr'] },
        specificity: { totalLOC: 12000, verticalLOC: 11040, ratio: 0.92 },
        port: 5090,
    },
    healthcare: {
        id: 'healthcare',
        industry: 'healthcare',
        name: 'Healthcare Extension',
        version: '1.0.0',
        description: 'Healthcare-specific capabilities',
        modules: [
            { id: 'patients', name: 'Patient Management', endpoints: ['/api/patients'] },
            { id: 'doctors', name: 'Doctor Management', endpoints: ['/api/doctors'] },
            { id: 'emr', name: 'Electronic Medical Records', endpoints: ['/api/emr'] },
            { id: 'prescriptions', name: 'Prescriptions', endpoints: ['/api/prescriptions'] },
        ],
        dependencies: { required: ['finance', 'legal'], optional: ['hr'] },
        specificity: { totalLOC: 18000, verticalLOC: 15840, ratio: 0.88 },
        port: 5020,
    },
    retail: {
        id: 'retail',
        industry: 'retail',
        name: 'Retail Extension',
        version: '1.0.0',
        description: 'Retail-specific capabilities',
        modules: [
            { id: 'catalog', name: 'Product Catalog', endpoints: ['/api/catalog'] },
            { id: 'inventory', name: 'Inventory Management', endpoints: ['/api/inventory'] },
            { id: 'stores', name: 'Store Management', endpoints: ['/api/stores'] },
            { id: 'promotions', name: 'Promotions', endpoints: ['/api/promotions'] },
        ],
        dependencies: { required: ['finance', 'operations'], optional: ['marketing', 'sales'] },
        specificity: { totalLOC: 16000, verticalLOC: 13920, ratio: 0.87 },
        port: 5030,
    },
    hotel: {
        id: 'hotel',
        industry: 'hotel',
        name: 'Hotel Extension',
        version: '1.0.0',
        description: 'Hotel-specific capabilities',
        modules: [
            { id: 'rooms', name: 'Room Management', endpoints: ['/api/rooms'] },
            { id: 'housekeeping', name: 'Housekeeping', endpoints: ['/api/housekeeping'] },
            { id: 'concierge', name: 'Concierge', endpoints: ['/api/concierge'] },
            { id: 'billing', name: 'Guest Billing', endpoints: ['/api/billing'] },
        ],
        dependencies: { required: ['finance', 'operations'], optional: ['marketing', 'hr'] },
        specificity: { totalLOC: 14000, verticalLOC: 12600, ratio: 0.90 },
        port: 5025,
    },
};
// ============================================
// Installer
// ============================================
class Installer {
    constructor(companyId, baseUrl = 'http://localhost') {
        this.errors = [];
        this.startTime = 0;
        this.companyId = companyId;
        this.baseUrl = baseUrl;
    }
    /**
     * Execute installation plan
     */
    async execute(plan) {
        this.startTime = Date.now();
        this.errors = [];
        const installedDepartments = [];
        const installedExtensions = [];
        const installedWorkers = [];
        for (const step of plan.steps) {
            try {
                switch (step.type) {
                    case 'department':
                        const dept = await this.installDepartment(step.component);
                        if (dept)
                            installedDepartments.push(dept);
                        break;
                    case 'extension':
                        const ext = await this.installExtension(step.component);
                        if (ext)
                            installedExtensions.push(ext);
                        break;
                    case 'worker':
                        const worker = await this.installWorker(step.component);
                        if (worker)
                            installedWorkers.push(worker);
                        break;
                    case 'twin':
                        // Twin creation is handled separately
                        break;
                }
            }
            catch (error) {
                this.errors.push({
                    step: step.order,
                    component: step.component,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    recoverable: step.action !== 'verify',
                });
                if (!step.dependencies.every(d => plan.steps.find(s => s.order === d)?.action === 'install')) {
                    // Non-recoverable error
                    break;
                }
            }
        }
        return {
            success: this.errors.filter(e => !e.recoverable).length === 0,
            installedDepartments,
            installedExtensions,
            installedWorkers,
            errors: this.errors,
            duration: Date.now() - this.startTime,
        };
    }
    /**
     * Install a department pack
     */
    async installDepartment(dept) {
        const pack = DEPARTMENT_PACKS[dept];
        if (!pack) {
            throw new Error(`Unknown department: ${dept}`);
        }
        // Simulate installation (in reality, this would call the actual service)
        await this.simulateDelay(100);
        return {
            id: dept,
            packVersion: pack.version,
            endpoint: `${this.baseUrl}:${pack.port}`,
            installedAt: new Date().toISOString(),
            config: {
                currency: 'INR',
                timezone: 'Asia/Kolkata',
            },
        };
    }
    /**
     * Install an industry extension
     */
    async installExtension(extId) {
        const pack = EXTENSION_PACKS[extId];
        if (!pack) {
            // Extension not registered, create minimal entry
            return {
                id: extId,
                industry: extId,
                version: '1.0.0',
                endpoints: [`${this.baseUrl}:5010/api/${extId}`],
                installedAt: new Date().toISOString(),
                config: {},
            };
        }
        await this.simulateDelay(150);
        const allEndpoints = pack.modules.flatMap(m => m.endpoints);
        return {
            id: pack.id,
            industry: pack.industry,
            version: pack.version,
            endpoints: allEndpoints.map(e => `${this.baseUrl}:${pack.port}${e}`),
            installedAt: new Date().toISOString(),
            config: {
                modules: pack.modules.map(m => m.id),
            },
        };
    }
    /**
     * Install an AI worker
     */
    async installWorker(workerId) {
        // Parse worker ID: worker_ai-cfo_finance
        const parts = workerId.split('_');
        if (parts.length < 3) {
            throw new Error(`Invalid worker ID format: ${workerId}`);
        }
        const type = parts[1];
        const department = parts[2];
        await this.simulateDelay(80);
        return {
            id: workerId,
            type,
            department,
            version: '1.0.0',
            status: 'active',
            deployedAt: new Date().toISOString(),
            policies: [],
        };
    }
    /**
     * Create installation plan from resolved dependencies
     */
    static createInstallationPlan(departments, extensions, workers) {
        const steps = [];
        let order = 1;
        // Step 1: Identity (always first)
        steps.push({
            order: order++,
            component: 'identity',
            type: 'department',
            action: 'install',
            dependencies: [],
            timeout: 30000,
        });
        // Step 2: Departments (alphabetical for determinism)
        const sortedDepts = departments.filter(d => d !== 'identity').sort();
        for (const dept of sortedDepts) {
            steps.push({
                order: order++,
                component: dept,
                type: 'department',
                action: 'install',
                dependencies: [1], // Depends on identity
                timeout: 60000,
            });
        }
        // Step 3: Extensions
        for (const ext of extensions) {
            steps.push({
                order: order++,
                component: ext,
                type: 'extension',
                action: 'install',
                dependencies: sortedDepts.map((_, i) => i + 2), // Depends on all departments
                timeout: 90000,
            });
        }
        // Step 4: Workers
        for (const worker of workers) {
            // Find which department this worker belongs to
            const deptIndex = worker.split('_')[2];
            const deptOrder = sortedDepts.indexOf(deptIndex);
            steps.push({
                order: order++,
                component: worker,
                type: 'worker',
                action: 'install',
                dependencies: deptOrder >= 0 ? [deptOrder + 2] : [1],
                timeout: 45000,
            });
        }
        // Step 5: Twins (last)
        steps.push({
            order: order++,
            component: 'company-twin',
            type: 'twin',
            action: 'install',
            dependencies: steps.slice(1, -1).map(s => s.order),
            timeout: 30000,
        });
        return {
            steps,
            estimatedDuration: steps.length * 1000, // Rough estimate
            rollbackPlan: {
                steps: steps.slice().reverse().map((s, i) => ({
                    order: i + 1,
                    component: s.component,
                    action: 'uninstall',
                })),
                snapshotId: '',
            },
        };
    }
    /**
     * Get all available department packs
     */
    static getDepartmentPacks() {
        return Object.values(DEPARTMENT_PACKS);
    }
    /**
     * Get department pack by ID
     */
    static getDepartmentPack(dept) {
        return DEPARTMENT_PACKS[dept];
    }
    /**
     * Get all available extensions
     */
    static getExtensions() {
        return Object.values(EXTENSION_PACKS);
    }
    /**
     * Get extension by ID
     */
    static getExtension(extId) {
        return EXTENSION_PACKS[extId];
    }
    simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.Installer = Installer;
//# sourceMappingURL=installer.js.map