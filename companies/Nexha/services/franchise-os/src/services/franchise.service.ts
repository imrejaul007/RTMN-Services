/**
 * NeXha FranchiseOS - Core Service
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { Franchise, Brand, FranchisePerformance, RoyaltyCalculation } from '../types/franchise.js';

// ============================================================================
// Schemas
// ============================================================================

export const CreateFranchiseSchema = z.object({
  brandId: z.string().uuid(),
  brandName: z.string().min(1),
  locationName: z.string().min(1),
  franchiseeName: z.string().min(2),
  franchiseePhone: z.string().min(10),
  franchiseeEmail: z.string().email(),
  type: z.enum(['owned', 'franchise', 'licensed', 'partner', 'JV']),
  address: z.object({
    street: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const UpdatePerformanceSchema = z.object({
  revenue: z.number().optional(),
  revenueTarget: z.number().optional(),
  orders: z.number().optional(),
  ordersTarget: z.number().optional(),
  customers: z.number().optional(),
  customersTarget: z.number().optional(),
});

export type CreateFranchiseInput = z.infer<typeof CreateFranchiseSchema>;
export type UpdatePerformanceInput = z.infer<typeof UpdatePerformanceSchema>;

// ============================================================================
// In-memory Store
// ============================================================================

interface FranchiseStore {
  franchises: Map<string, Franchise>;
  brands: Map<string, Brand>;
  royaltyCalculations: Map<string, RoyaltyCalculation>;
}

const store: FranchiseStore = {
  franchises: new Map(),
  brands: new Map(),
  royaltyCalculations: new Map(),
};

// ============================================================================
// Franchise Service
// ============================================================================

export class FranchiseService {
  /**
   * Create a new franchise
   */
  async createFranchise(input: CreateFranchiseInput): Promise<Franchise> {
    const franchise: Franchise = {
      id: randomUUID(),
      franchiseNumber: `FR-${Date.now().toString(36).toUpperCase()}`,
      brandId: input.brandId,
      brandName: input.brandName,
      locationId: randomUUID(),
      locationName: input.locationName,
      franchiseeName: input.franchiseeName,
      franchiseePhone: input.franchiseePhone,
      franchiseeEmail: input.franchiseeEmail,
      type: input.type,
      status: 'pending_onboarding',
      address: input.address,
      phone: input.phone,
      email: input.email,
      syncStatus: 'not_configured',
      integrations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.franchises.set(franchise.id, franchise);
    return franchise;
  }

  /**
   * Get franchise by ID
   */
  async getFranchise(id: string): Promise<Franchise | null> {
    return store.franchises.get(id) || null;
  }

  /**
   * Get franchise by number
   */
  async getFranchiseByNumber(franchiseNumber: string): Promise<Franchise | null> {
    return Array.from(store.franchises.values()).find(
      f => f.franchiseNumber === franchiseNumber
    ) || null;
  }

  /**
   * List franchises
   */
  async listFranchises(filters?: {
    brandId?: string;
    status?: Franchise['status'];
    city?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ franchises: Franchise[]; total: number }> {
    let results = Array.from(store.franchises.values());

    if (filters?.brandId) {
      results = results.filter(f => f.brandId === filters.brandId);
    }
    if (filters?.status) {
      results = results.filter(f => f.status === filters.status);
    }
    if (filters?.city) {
      results = results.filter(f =>
        f.address.city.toLowerCase().includes(filters.city!.toLowerCase())
      );
    }

    const total = results.length;

    if (filters?.offset) {
      results = results.slice(filters.offset);
    }
    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return { franchises: results, total };
  }

  /**
   * Update franchise
   */
  async updateFranchise(id: string, updates: Partial<Franchise>): Promise<Franchise | null> {
    const franchise = store.franchises.get(id);
    if (!franchise) return null;

    const updated = { ...franchise, ...updates, updatedAt: new Date() };
    store.franchises.set(id, updated);
    return updated;
  }

  /**
   * Activate franchise
   */
  async activateFranchise(id: string): Promise<Franchise | null> {
    return this.updateFranchise(id, { status: 'active', syncStatus: 'synced' });
  }

  /**
   * Suspend franchise
   */
  async suspendFranchise(id: string, reason?: string): Promise<Franchise | null> {
    return this.updateFranchise(id, {
      status: 'suspended',
      metadata: { suspensionReason: reason },
    });
  }

  /**
   * Update performance
   */
  async updatePerformance(id: string, performance: Partial<FranchisePerformance>): Promise<Franchise | null> {
    const franchise = store.franchises.get(id);
    if (!franchise) return null;

    const updated = {
      ...franchise,
      performance: {
        period: franchise.performance?.period || { start: new Date(), end: new Date() },
        revenue: performance.revenue ?? franchise.performance?.revenue ?? 0,
        revenueTarget: performance.revenueTarget ?? franchise.performance?.revenueTarget ?? 0,
        orders: performance.orders ?? franchise.performance?.orders ?? 0,
        ordersTarget: performance.ordersTarget ?? franchise.performance?.ordersTarget ?? 0,
        customers: performance.customers ?? franchise.performance?.customers ?? 0,
        customersTarget: performance.customersTarget ?? franchise.performance?.customersTarget ?? 0,
        averageOrderValue: franchise.performance?.averageOrderValue ?? 0,
      },
      updatedAt: new Date(),
    };

    // Calculate score
    const revenueAchievement = updated.performance.revenueTarget > 0
      ? (updated.performance.revenue / updated.performance.revenueTarget) * 100
      : 0;
    const ordersAchievement = updated.performance.ordersTarget > 0
      ? (updated.performance.orders / updated.performance.ordersTarget) * 100
      : 0;
    updated.performance.score = (revenueAchievement + ordersAchievement) / 2;

    // Calculate AOV
    if (updated.performance.orders > 0) {
      updated.performance.averageOrderValue = updated.performance.revenue / updated.performance.orders;
    }

    store.franchises.set(id, updated);
    return updated;
  }

  /**
   * Add integration
   */
  async addIntegration(
    id: string,
    integration: Franchise['integrations'][0]
  ): Promise<Franchise | null> {
    const franchise = store.franchises.get(id);
    if (!franchise) return null;

    const updated = {
      ...franchise,
      integrations: [...franchise.integrations, integration],
      updatedAt: new Date(),
    };

    store.franchises.set(id, updated);
    return updated;
  }

  /**
   * Get franchise performance
   */
  async getPerformance(id: string): Promise<FranchisePerformance | null> {
    const franchise = store.franchises.get(id);
    return franchise?.performance || null;
  }
}

// ============================================================================
// Brand Service
// ============================================================================

export class BrandService {
  /**
   * Create brand
   */
  async createBrand(input: {
    name: string;
    type: Brand['type'];
    config?: Partial<Brand['config']>;
  }): Promise<Brand> {
    const brand: Brand = {
      id: randomUUID(),
      name: input.name,
      type: input.type,
      franchises: [],
      stats: {
        totalFranchises: 0,
        activeFranchises: 0,
        totalRevenue: 0,
        averageScore: 0,
        topPerformers: [],
      },
      config: {
        defaultRoyalty: input.config?.defaultRoyalty,
        syncFrequency: input.config?.syncFrequency || 60,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.brands.set(brand.id, brand);
    return brand;
  }

  /**
   * Get brand by ID
   */
  async getBrand(id: string): Promise<Brand | null> {
    return store.brands.get(id) || null;
  }

  /**
   * List brands
   */
  async listBrands(): Promise<Brand[]> {
    return Array.from(store.brands.values());
  }

  /**
   * Get brand stats
   */
  async getBrandStats(id: string): Promise<Brand['stats'] | null> {
    const brand = store.brands.get(id);
    if (!brand) return null;

    const franchises = Array.from(store.franchises.values()).filter(
      f => f.brandId === id
    );

    const active = franchises.filter(f => f.status === 'active');
    const totalRevenue = active.reduce(
      (sum, f) => sum + (f.performance?.revenue || 0),
      0
    );
    const scores = active
      .filter(f => f.performance?.score)
      .map(f => f.performance!.score!);
    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return {
      totalFranchises: franchises.length,
      activeFranchises: active.length,
      totalRevenue,
      averageScore: avgScore,
      topPerformers: active
        .sort((a, b) => (b.performance?.score || 0) - (a.performance?.score || 0))
        .slice(0, 5)
        .map(f => f.id),
    };
  }
}

// ============================================================================
// Royalty Service
// ============================================================================

export class RoyaltyService {
  /**
   * Calculate royalty for franchise
   */
  async calculateRoyalty(
    franchiseId: string,
    period: { start: Date; end: Date }
  ): Promise<RoyaltyCalculation | null> {
    const franchise = store.franchises.get(franchiseId);
    if (!franchise) return null;

    const revenue = franchise.performance?.revenue || 0;
    const royaltyConfig = franchise.royalty;

    if (!royaltyConfig) {
      return null;
    }

    let amount = 0;
    if (royaltyConfig.type === 'percentage') {
      amount = revenue * (royaltyConfig.value / 100);
    } else {
      amount = royaltyConfig.value;
    }

    // Apply minimum guarantee
    if (royaltyConfig.minimumGuarantee && amount < royaltyConfig.minimumGuarantee) {
      amount = royaltyConfig.minimumGuarantee;
    }

    const calculation: RoyaltyCalculation = {
      id: randomUUID(),
      franchiseId,
      period,
      revenue,
      royaltyType: royaltyConfig.type,
      royaltyRate: royaltyConfig.value,
      amount,
      status: 'pending',
      dueDate: new Date(period.end.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days after period end
      createdAt: new Date(),
    };

    store.royaltyCalculations.set(calculation.id, calculation);
    return calculation;
  }

  /**
   * Get royalty calculations
   */
  async getCalculations(filters?: {
    franchiseId?: string;
    status?: RoyaltyCalculation['status'];
  }): Promise<RoyaltyCalculation[]> {
    let results = Array.from(store.royaltyCalculations.values());

    if (filters?.franchiseId) {
      results = results.filter(c => c.franchiseId === filters.franchiseId);
    }
    if (filters?.status) {
      results = results.filter(c => c.status === filters.status);
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Mark royalty as paid
   */
  async markPaid(id: string): Promise<RoyaltyCalculation | null> {
    const calculation = store.royaltyCalculations.get(id);
    if (!calculation) return null;

    const updated = {
      ...calculation,
      status: 'paid' as const,
      paidAt: new Date(),
    };

    store.royaltyCalculations.set(id, updated);
    return updated;
  }
}

// ============================================================================
// Compliance Monitoring Service
// ============================================================================

export interface ComplianceChecklist {
  id: string;
  franchiseId: string;
  auditId: string;
  category: 'branding' | 'operations' | 'hygiene' | 'training' | 'documentation' | 'safety';
  item: string;
  status: 'pending' | 'passed' | 'failed' | 'not_applicable';
  notes?: string;
  evidence?: string;
  checkedAt?: Date;
  checkedBy?: string;
}

export interface ComplianceViolation {
  id: string;
  franchiseId: string;
  type: 'branding' | 'operations' | 'hygiene' | 'training' | 'documentation' | 'safety' | 'royalty' | 'other';
  severity: 'warning' | 'minor' | 'major' | 'critical';
  description: string;
  evidence?: string;
  status: 'open' | 'under_remediation' | 'resolved' | 'escalated' | 'dismissed';
  remediationDeadline?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  fineAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceAudit {
  id: string;
  franchiseId: string;
  franchiseName: string;
  brandId: string;
  brandName: string;
  auditorId: string;
  auditorName: string;
  scheduledDate: Date;
  completedDate?: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  overallResult?: 'compliant' | 'non_compliant' | 'partially_compliant';
  score?: number; // 0-100
  checklist: ComplianceChecklist[];
  violations: ComplianceViolation[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceReport {
  franchiseId: string;
  franchiseName: string;
  brandName: string;
  overallScore: number;
  complianceRate: number; // % of checklist items passed
  openViolations: number;
  criticalViolations: number;
  lastAuditDate?: Date;
  lastAuditResult?: string;
  categories: Array<{
    category: string;
    score: number;
    itemsPassed: number;
    itemsFailed: number;
  }>;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Compliance monitoring service.
 * Handles brand standard audits, checklists, and violation tracking.
 */
export class ComplianceService {
  private audits = new Map<string, ComplianceAudit>();
  private violations = new Map<string, ComplianceViolation>();

  /**
   * Schedule a new compliance audit for a franchise
   */
  async scheduleAudit(input: {
    franchiseId: string;
    franchiseName: string;
    brandId: string;
    brandName: string;
    auditorId: string;
    auditorName: string;
    scheduledDate: Date;
    checklistItems: Array<{
      category: ComplianceChecklist['category'];
      item: string;
    }>;
  }): Promise<ComplianceAudit> {
    const auditId = randomUUID();

    const checklist: ComplianceChecklist[] = input.checklistItems.map(item => ({
      id: randomUUID(),
      franchiseId: input.franchiseId,
      auditId,
      category: item.category,
      item: item.item,
      status: 'pending' as const,
    }));

    const audit: ComplianceAudit = {
      id: auditId,
      franchiseId: input.franchiseId,
      franchiseName: input.franchiseName,
      brandId: input.brandId,
      brandName: input.brandName,
      auditorId: input.auditorId,
      auditorName: input.auditorName,
      scheduledDate: input.scheduledDate,
      status: 'scheduled',
      checklist,
      violations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.audits.set(auditId, audit);
    return audit;
  }

  /**
   * Get audit by ID
   */
  async getAudit(id: string): Promise<ComplianceAudit | null> {
    return this.audits.get(id) || null;
  }

  /**
   * Get audits for a franchise
   */
  async getAuditsByFranchise(franchiseId: string): Promise<ComplianceAudit[]> {
    return Array.from(this.audits.values())
      .filter(a => a.franchiseId === franchiseId)
      .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
  }

  /**
   * Start an audit
   */
  async startAudit(id: string): Promise<ComplianceAudit | null> {
    const audit = this.audits.get(id);
    if (!audit) return null;
    audit.status = 'in_progress';
    audit.updatedAt = new Date();
    this.audits.set(id, audit);
    return audit;
  }

  /**
   * Complete a checklist item during an audit
   */
  async completeChecklistItem(
    auditId: string,
    checklistId: string,
    status: ComplianceChecklist['status'],
    checkedBy: string,
    notes?: string
  ): Promise<ComplianceAudit | null> {
    const audit = this.audits.get(auditId);
    if (!audit) return null;

    const item = audit.checklist.find(c => c.id === checklistId);
    if (!item) return null;

    item.status = status;
    item.checkedAt = new Date();
    item.checkedBy = checkedBy;
    if (notes) item.notes = notes;

    audit.updatedAt = new Date();
    this.audits.set(auditId, audit);
    return audit;
  }

  /**
   * Complete an audit and calculate overall result
   */
  async completeAudit(
    id: string,
    notes?: string
  ): Promise<ComplianceAudit | null> {
    const audit = this.audits.get(id);
    if (!audit) return null;

    audit.status = 'completed';
    audit.completedDate = new Date();
    audit.notes = notes;

    const passed = audit.checklist.filter(c => c.status === 'passed').length;
    const total = audit.checklist.length;
    audit.score = total > 0 ? Math.round((passed / total) * 100) : 0;

    // Overall result
    const failed = audit.checklist.filter(c => c.status === 'failed').length;
    if (failed === 0) {
      audit.overallResult = 'compliant';
    } else if (failed <= total * 0.2) {
      audit.overallResult = 'partially_compliant';
    } else {
      audit.overallResult = 'non_compliant';
    }

    audit.updatedAt = new Date();
    this.audits.set(id, audit);
    return audit;
  }

  /**
   * Create a compliance violation
   */
  async createViolation(input: {
    franchiseId: string;
    type: ComplianceViolation['type'];
    severity: ComplianceViolation['severity'];
    description: string;
    evidence?: string;
    remediationDeadline?: Date;
    fineAmount?: number;
  }): Promise<ComplianceViolation> {
    const violation: ComplianceViolation = {
      id: randomUUID(),
      franchiseId: input.franchiseId,
      ...input,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.violations.set(violation.id, violation);
    return violation;
  }

  /**
   * Get violations for a franchise
   */
  async getViolationsByFranchise(
    franchiseId: string,
    status?: ComplianceViolation['status']
  ): Promise<ComplianceViolation[]> {
    let results = Array.from(this.violations.values())
      .filter(v => v.franchiseId === franchiseId);
    if (status) results = results.filter(v => v.status === status);
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Resolve a violation
   */
  async resolveViolation(
    id: string,
    resolvedBy: string,
    notes?: string
  ): Promise<ComplianceViolation | null> {
    const violation = this.violations.get(id);
    if (!violation) return null;
    violation.status = 'resolved';
    violation.resolvedAt = new Date();
    violation.resolvedBy = resolvedBy;
    violation.resolutionNotes = notes;
    violation.updatedAt = new Date();
    this.violations.set(id, violation);
    return violation;
  }

  /**
   * Escalate a violation
   */
  async escalateViolation(id: string): Promise<ComplianceViolation | null> {
    const violation = this.violations.get(id);
    if (!violation) return null;
    violation.status = 'escalated';
    violation.updatedAt = new Date();
    this.violations.set(id, violation);
    return violation;
  }

  /**
   * Get compliance report for a franchise
   */
  async getComplianceReport(franchiseId: string): Promise<ComplianceReport | null> {
    const audits = await this.getAuditsByFranchise(franchiseId);
    const violations = await this.getViolationsByFranchise(franchiseId);

    if (audits.length === 0) return null;

    const latestAudit = audits[0];
    const franchiseName = latestAudit.franchiseName;
    const brandName = latestAudit.brandName;

    // Calculate category scores
    const categories: ComplianceReport['categories'] = [];
    const categoryMap = new Map<string, { passed: number; failed: number }>();

    for (const audit of audits) {
      for (const item of audit.checklist) {
        const key = item.category;
        if (!categoryMap.has(key)) categoryMap.set(key, { passed: 0, failed: 0 });
        const cat = categoryMap.get(key)!;
        if (item.status === 'passed') cat.passed++;
        else if (item.status === 'failed') cat.failed++;
      }
    }

    for (const [category, counts] of categoryMap) {
      const total = counts.passed + counts.failed;
      categories.push({
        category,
        score: total > 0 ? Math.round((counts.passed / total) * 100) : 0,
        itemsPassed: counts.passed,
        itemsFailed: counts.failed,
      });
    }

    // Overall score from latest audit
    const overallScore = latestAudit.score || 0;
    const latestChecklist = latestAudit.checklist;
    const complianceRate = latestChecklist.length > 0
      ? Math.round((latestChecklist.filter(c => c.status === 'passed').length / latestChecklist.length) * 100)
      : 0;

    const openViolations = violations.filter(v => v.status === 'open').length;
    const criticalViolations = violations.filter(v =>
      v.severity === 'critical' && v.status !== 'resolved'
    ).length;

    // Determine trend from last 3 audits
    let trend: ComplianceReport['trend'] = 'stable';
    if (audits.length >= 2) {
      const scores = audits.slice(0, 3).map(a => a.score || 0);
      if (scores[0] > scores[1]) trend = 'improving';
      else if (scores[0] < scores[1]) trend = 'declining';
    }

    return {
      franchiseId,
      franchiseName,
      brandName,
      overallScore,
      complianceRate,
      openViolations,
      criticalViolations,
      lastAuditDate: latestAudit.completedDate,
      lastAuditResult: latestAudit.overallResult,
      categories,
      trend,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const franchiseService = new FranchiseService();
export const brandService = new BrandService();
export const royaltyService = new RoyaltyService();
export const complianceService = new ComplianceService();
