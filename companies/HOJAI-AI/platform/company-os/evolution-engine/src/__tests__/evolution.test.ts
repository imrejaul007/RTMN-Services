/**
 * Evolution Engine Tests
 */

import { describe, it, expect } from 'vitest';
import { evolutionEngine } from '../evolution-engine';

describe('EvolutionEngine', () => {
  it('should register company at startup stage', () => {
    const state = evolutionEngine.registerCompany('company_test');
    expect(state.currentStage).toBe('startup');
    expect(state.revenue).toBe(0);
    expect(state.employees).toBe(0);
  });

  it('should update metrics', () => {
    evolutionEngine.updateMetrics('company_test', { revenue: 600000 });
    const state = evolutionEngine.getCompanyState('company_test');
    expect(state?.revenue).toBe(600000);
  });

  it('should check evolution readiness', () => {
    const rec = evolutionEngine.checkEvolution('company_test');
    expect(rec).toBeDefined();
    expect(rec?.currentStage).toBe('startup');
  });

  it('should enable franchise mode', () => {
    const state = evolutionEngine.enableFranchiseMode('company_test');
    expect(state?.hasFranchiseModel).toBe(true);
  });

  it('should get capabilities for stage', () => {
    const caps = evolutionEngine.getCapabilities('startup');
    expect(caps.features).toContain('Basic CRM');
    expect(caps.pricing.monthlyFee).toBe(2500);
  });

  it('should evolve company when ready', () => {
    evolutionEngine.updateMetrics('company_evo', { revenue: 1000000, employees: 10 });
    evolutionEngine.evolve('company_evo');
    const state = evolutionEngine.getCompanyState('company_evo');
    expect(state?.currentStage).toBe('growth');
  });
});
