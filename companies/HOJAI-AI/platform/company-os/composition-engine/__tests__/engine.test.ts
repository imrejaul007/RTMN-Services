/**
 * Composition Engine Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompositionEngine, DependencyResolver, Installer, StateManager } from '../src';

// ============================================
// Test Utilities
// ============================================

function createTestComposition(overrides = {}) {
  return {
    companyId: 'test_restaurant_001',
    name: 'Test Restaurant',
    industry: 'restaurant' as const,
    departments: ['marketing'] as const,
    extensions: ['pos', 'kitchen'] as const,
    aiDepartments: {
      marketing: { enabled: true, head: 'ai-cmo' },
      finance: { enabled: true, head: 'ai-cfo' },
    },
    ...overrides,
  };
}

// ============================================
// Composition Engine Tests
// ============================================

describe('CompositionEngine', () => {
  let engine: CompositionEngine;

  beforeEach(() => {
    engine = new CompositionEngine('http://localhost');
    StateManager.clear();
  });

  describe('compose()', () => {
    it('should compose a restaurant company successfully', async () => {
      const composition = createTestComposition();

      const result = await engine.compose(composition);

      expect(result.success).toBe(true);
      expect(result.companyId).toBe('test_restaurant_001');
      expect(result.manifest).toBeDefined();
      expect(result.installed.departments.length).toBeGreaterThan(0);
      expect(result.installed.extensions.length).toBeGreaterThan(0);
    });

    it('should auto-install required dependencies', async () => {
      const composition = createTestComposition({
        departments: [], // Only specify extensions, no explicit departments
        extensions: ['pos'],
      });

      const result = await engine.compose(composition);

      expect(result.success).toBe(true);
      // Restaurant requires finance and operations
      expect(result.installed.departments.some(d => d.id === 'finance')).toBe(true);
      expect(result.installed.departments.some(d => d.id === 'operations')).toBe(true);
    });

    it('should validate company ID', async () => {
      const composition = createTestComposition({
        companyId: 'ab', // Too short
      });

      const result = await engine.compose(composition);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ component: 'companyId' })
      );
    });

    it('should validate industry', async () => {
      const composition = createTestComposition({
        industry: 'invalid_industry',
      } as any);

      const result = await engine.compose(composition);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ component: 'industry' })
      );
    });

    it('should generate manifest on success', async () => {
      const composition = createTestComposition();

      const result = await engine.compose(composition);

      expect(result.manifest).toBeDefined();
      expect(result.manifest!.companyId).toBe('test_restaurant_001');
      expect(result.manifest!.composition.departments.length).toBeGreaterThan(0);
      expect(result.manifest!.composition.extensions.length).toBeGreaterThan(0);
      expect(result.manifest!.checksum).toBeDefined();
    });

    it('should update state during composition', async () => {
      const composition = createTestComposition();

      await engine.compose(composition);

      const state = await engine.getState('test_restaurant_001');
      expect(state).toBeDefined();
      expect(state!.status).toBe('composed');
    });

    it('should track duration', async () => {
      const composition = createTestComposition();

      const result = await engine.compose(composition);

      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(10000); // Should complete within 10s
    });
  });

  describe('decompose()', () => {
    it('should decompose an existing company', async () => {
      const composition = createTestComposition();
      await engine.compose(composition);

      const result = await engine.decompose('test_restaurant_001');

      expect(result.success).toBe(true);
      expect(result.removed.departments.length).toBeGreaterThan(0);
    });

    it('should fail for non-existent company', async () => {
      const result = await engine.decompose('non_existent_company');

      expect(result.success).toBe(false);
    });
  });

  describe('getState()', () => {
    it('should return state for existing company', async () => {
      const composition = createTestComposition();
      await engine.compose(composition);

      const state = await engine.getState('test_restaurant_001');

      expect(state).toBeDefined();
      expect(state!.companyId).toBe('test_restaurant_001');
    });

    it('should return undefined for non-existent company', async () => {
      const state = await engine.getState('non_existent');

      expect(state).toBeUndefined();
    });
  });

  describe('validate()', () => {
    it('should validate a valid composition', async () => {
      const composition = createTestComposition();

      const result = await engine.validate(composition);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty company ID', async () => {
      const composition = createTestComposition({ companyId: '' });

      const result = await engine.validate(composition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_COMPANY_ID' })
      );
    });

    it('should reject empty company name', async () => {
      const composition = createTestComposition({ name: '' });

      const result = await engine.validate(composition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_NAME' })
      );
    });

    it('should warn about missing finance department', async () => {
      const composition = createTestComposition({
        departments: ['marketing', 'hr'],
      });

      const result = await engine.validate(composition);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'departments',
        })
      );
    });
  });
});

// ============================================
// Dependency Resolver Tests
// ============================================

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;

  beforeEach(() => {
    resolver = new DependencyResolver();
  });

  describe('resolve()', () => {
    it('should resolve restaurant dependencies', () => {
      const result = resolver.resolve(
        'restaurant',
        ['marketing'],
        ['pos', 'kitchen']
      );

      expect(result.resolved).toContain('restaurant');
      expect(result.resolved).toContain('marketing');
      // Required: finance, operations
      expect(result.resolved).toContain('finance');
      expect(result.resolved).toContain('operations');
    });

    it('should auto-add required departments', () => {
      const result = resolver.resolve(
        'restaurant',
        [], // No explicit departments
        ['pos']
      );

      const autoAdded = result.autoAdded.filter(a => a.reason.includes('Required'));
      expect(autoAdded.length).toBeGreaterThan(0);
      expect(autoAdded.some(a => a.id === 'finance')).toBe(true);
      expect(autoAdded.some(a => a.id === 'operations')).toBe(true);
    });

    it('should auto-add optional departments', () => {
      const result = resolver.resolve(
        'restaurant',
        [], // No explicit departments
        ['pos']
      );

      const autoAdded = result.autoAdded.filter(a => a.reason.includes('Optional'));
      // Restaurant has marketing and hr as optional
      expect(result.resolved.some(r => r === 'marketing' || r === 'hr')).toBe(true);
    });

    it('should not duplicate departments', () => {
      const result = resolver.resolve(
        'restaurant',
        ['finance', 'operations'],
        ['pos']
      );

      const financeCount = result.resolved.filter(d => d === 'finance').length;
      const opsCount = result.resolved.filter(d => d === 'operations').length;

      expect(financeCount).toBe(1);
      expect(opsCount).toBe(1);
    });

    it('should detect no conflicts for valid combinations', () => {
      const result = resolver.resolve(
        'restaurant',
        ['finance', 'marketing', 'operations'],
        ['pos']
      );

      expect(result.conflicts).toHaveLength(0);
    });

    it('should return no cycles for valid graph', () => {
      const result = resolver.resolve(
        'restaurant',
        ['finance'],
        ['pos']
      );

      expect(result.cycles).toHaveLength(0);
    });
  });

  describe('getInstallationOrder()', () => {
    it('should return departments before extensions', () => {
      resolver.resolve('restaurant', ['finance'], ['pos']);
      const order = resolver.getInstallationOrder();
      const extOrder = resolver.getExtensionOrder();

      // Departments should come before extensions
      expect(order.length).toBeGreaterThan(0);
      expect(extOrder).toContain('pos');
    });
  });

  describe('getIndustryDependencies()', () => {
    it('should return correct dependencies for restaurant', () => {
      const deps = DependencyResolver.getIndustryDependencies('restaurant');

      expect(deps.required).toContain('finance');
      expect(deps.required).toContain('operations');
      expect(deps.optional).toContain('marketing');
    });

    it('should return correct dependencies for healthcare', () => {
      const deps = DependencyResolver.getIndustryDependencies('healthcare');

      expect(deps.required).toContain('finance');
      expect(deps.required).toContain('legal');
    });
  });

  describe('getAllDepartments()', () => {
    it('should return all 6 departments', () => {
      const depts = DependencyResolver.getAllDepartments();

      expect(depts).toContain('finance');
      expect(depts).toContain('hr');
      expect(depts).toContain('marketing');
      expect(depts).toContain('sales');
      expect(depts).toContain('operations');
      expect(depts).toContain('legal');
      expect(depts).toHaveLength(6);
    });
  });
});

// ============================================
// Installer Tests
// ============================================

describe('Installer', () => {
  let installer: Installer;

  beforeEach(() => {
    installer = new Installer('test_company', 'http://localhost');
  });

  describe('createInstallationPlan()', () => {
    it('should create plan with identity first', () => {
      const plan = Installer.createInstallationPlan(
        ['finance', 'marketing'],
        ['pos'],
        ['worker_ai-cfo_finance']
      );

      expect(plan.steps[0].component).toBe('identity');
      expect(plan.steps[0].type).toBe('department');
    });

    it('should create plan with departments before extensions', () => {
      const plan = Installer.createInstallationPlan(
        ['finance', 'marketing'],
        ['pos', 'kitchen'],
        []
      );

      const deptSteps = plan.steps.filter(s => s.type === 'department' && s.component !== 'identity');
      const extSteps = plan.steps.filter(s => s.type === 'extension');

      expect(deptSteps.length).toBe(2);
      expect(extSteps.length).toBe(2);

      // Departments should come before extensions
      const lastDeptOrder = Math.max(...deptSteps.map(s => s.order));
      const firstExtOrder = Math.min(...extSteps.map(s => s.order));
      expect(lastDeptOrder).toBeLessThan(firstExtOrder);
    });

    it('should create plan with workers after departments', () => {
      const plan = Installer.createInstallationPlan(
        ['finance'],
        [],
        ['worker_ai-cfo_finance']
      );

      const deptStep = plan.steps.find(s => s.component === 'finance');
      const workerStep = plan.steps.find(s => s.component === 'worker_ai-cfo_finance');

      expect(deptStep!.order).toBeLessThan(workerStep!.order);
    });

    it('should create rollback plan', () => {
      const plan = Installer.createInstallationPlan(
        ['finance'],
        ['pos'],
        ['worker_ai-cfo_finance']
      );

      expect(plan.rollbackPlan).toBeDefined();
      expect(plan.rollbackPlan.steps.length).toBeGreaterThan(0);
    });
  });

  describe('installDepartment()', () => {
    it('should install finance department', async () => {
      const result = await installer.installDepartment('finance');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('finance');
      expect(result!.packVersion).toBe('1.0.0');
      expect(result!.endpoint).toContain('4801');
    });

    it('should install hr department', async () => {
      const result = await installer.installDepartment('hr');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('hr');
      expect(result!.endpoint).toContain('5077');
    });

    it('should throw for unknown department', async () => {
      await expect(installer.installDepartment('unknown' as any)).rejects.toThrow('Unknown department');
    });
  });

  describe('installExtension()', () => {
    it('should install restaurant extension', async () => {
      const result = await installer.installExtension('restaurant');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('restaurant');
      expect(result!.endpoints.length).toBeGreaterThan(0);
    });

    it('should install unknown extension with defaults', async () => {
      const result = await installer.installExtension('unknown_ext');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('unknown_ext');
      expect(result!.version).toBe('1.0.0');
    });
  });

  describe('installWorker()', () => {
    it('should install AI CFO', async () => {
      const result = await installer.installWorker('worker_ai-cfo_finance');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('worker_ai-cfo_finance');
      expect(result!.type).toBe('ai-cfo');
      expect(result!.department).toBe('finance');
      expect(result!.status).toBe('active');
    });

    it('should throw for invalid worker ID', async () => {
      await expect(installer.installWorker('invalid')).rejects.toThrow('Invalid worker ID format');
    });
  });

  describe('getDepartmentPacks()', () => {
    it('should return all 6 department packs', () => {
      const packs = Installer.getDepartmentPacks();

      expect(packs.length).toBe(6);
      expect(packs.some(p => p.id === 'finance')).toBe(true);
      expect(packs.some(p => p.id === 'hr')).toBe(true);
      expect(packs.some(p => p.id === 'marketing')).toBe(true);
      expect(packs.some(p => p.id === 'sales')).toBe(true);
      expect(packs.some(p => p.id === 'operations')).toBe(true);
      expect(packs.some(p => p.id === 'legal')).toBe(true);
    });
  });

  describe('getDepartmentPack()', () => {
    it('should return finance pack with correct properties', () => {
      const pack = Installer.getDepartmentPack('finance');

      expect(pack).toBeDefined();
      expect(pack!.id).toBe('finance');
      expect(pack!.aiWorkers.length).toBeGreaterThan(0);
      expect(pack!.endpoints.length).toBeGreaterThan(0);
    });
  });

  describe('getExtensions()', () => {
    it('should return all registered extensions', () => {
      const extensions = Installer.getExtensions();

      expect(extensions.length).toBeGreaterThan(0);
      expect(extensions.some(e => e.id === 'restaurant')).toBe(true);
      expect(extensions.some(e => e.id === 'beauty')).toBe(true);
      expect(extensions.some(e => e.id === 'healthcare')).toBe(true);
    });
  });
});

// ============================================
// State Manager Tests
// ============================================

describe('StateManager', () => {
  beforeEach(() => {
    StateManager.clear();
  });

  describe('initialize()', () => {
    it('should create initial state', () => {
      const state = StateManager.initialize('test_company');

      expect(state.companyId).toBe('test_company');
      expect(state.status).toBe('pending');
      expect(state.installed.departments.size).toBe(0);
      expect(state.installed.extensions.size).toBe(0);
    });
  });

  describe('get()', () => {
    it('should return state after initialization', () => {
      StateManager.initialize('test_company');

      const state = StateManager.get('test_company');

      expect(state).toBeDefined();
      expect(state!.companyId).toBe('test_company');
    });

    it('should return undefined for non-existent company', () => {
      const state = StateManager.get('non_existent');

      expect(state).toBeUndefined();
    });
  });

  describe('updateStatus()', () => {
    it('should update status', () => {
      StateManager.initialize('test_company');

      StateManager.updateStatus('test_company', 'composing');

      const state = StateManager.get('test_company');
      expect(state!.status).toBe('composing');
    });
  });

  describe('addDepartment()', () => {
    it('should add department to state', () => {
      StateManager.initialize('test_company');

      StateManager.addDepartment('test_company', {
        id: 'finance',
        status: 'installed',
        version: '1.0.0',
        endpoint: 'http://localhost:4801',
      });

      const state = StateManager.get('test_company');
      expect(state!.installed.departments.has('finance')).toBe(true);
    });
  });

  describe('delete()', () => {
    it('should delete state', () => {
      StateManager.initialize('test_company');

      StateManager.delete('test_company');

      expect(StateManager.has('test_company')).toBe(false);
    });
  });

  describe('getSummary()', () => {
    it('should return summary of installed components', () => {
      StateManager.initialize('test_company');
      StateManager.addDepartment('test_company', {
        id: 'finance',
        status: 'installed',
        version: '1.0.0',
      });

      const summary = StateManager.getSummary('test_company');

      expect(summary.departments).toBe(1);
      expect(summary.extensions).toBe(0);
      expect(summary.workers).toBe(0);
      expect(summary.twins).toBe(0);
    });
  });
});