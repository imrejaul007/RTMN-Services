/**
 * sutar-economy-os — Integration service unit tests
 *
 * Integration service talks to SADA OS (port 4190), Contract OS, etc.
 * Tests here focus on the parts that don't require a running upstream
 * (entity profile, dashboard summary, healthCheck with all-upstreams-down).
 */

import { describe, it, expect } from 'vitest';
import { integrationService } from '../../src/services/integration.service.js';

describe('integration — entity profile', () => {
  it('returns a profile with karma + trust fields', async () => {
    const eid = `int-${Date.now()}-${Math.random()}`;
    const profile = await integrationService.getEntityProfile(eid);
    expect(profile).toHaveProperty('karma');
    expect(profile).toHaveProperty('trust');
    expect(profile).toHaveProperty('trustMultiplier');
    expect(profile).toHaveProperty('adjustedTier');
    expect(profile.karma.points).toBeGreaterThanOrEqual(0);
  });

  it('returns a dashboard summary with all sections', async () => {
    const eid = `int-dash-${Date.now()}-${Math.random()}`;
    const dash = await integrationService.getDashboardSummary(eid);
    expect(dash).toHaveProperty('totalKarmaPoints');
    expect(dash).toHaveProperty('trustScore');
    expect(dash).toHaveProperty('currentTier');
  });
});

describe('integration — health', () => {
  it('reports per-service health status', async () => {
    const h = await integrationService.healthCheck();
    expect(h).toHaveProperty('contractOS');
    expect(h).toHaveProperty('trustEngine');
    expect(h.contractOS).toHaveProperty('available');
    expect(h.trustEngine).toHaveProperty('available');
  });

  it('validates a transaction against business rules', async () => {
    const eid = `int-val-${Date.now()}-${Math.random()}`;
    const result = await integrationService.validateTransaction(eid, 50);
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('trustLevel');
    expect(result).toHaveProperty('karmaTier');
  });
});

describe('integration — trust + karma', () => {
  it('returns a trust multiplier for an unknown entity', async () => {
    const eid = `int-trust-${Date.now()}-${Math.random()}`;
    const tm = await integrationService.getTrustMultiplier(eid);
    expect(tm).toHaveProperty('multiplier');
    expect(tm).toHaveProperty('trustLevel');
    expect(tm.multiplier).toBeGreaterThan(0);
  });

  it('returns a default trust score when trust engine is down', async () => {
    const eid = `int-trust-${Date.now()}-${Math.random()}`;
    const ts = await integrationService.getTrustScore(eid);
    // Trust engine may be reachable (returns real score) or down (returns default).
    // Either way, we should get back an object with a `score` field.
    expect(ts).not.toBeNull();
    expect(ts?.score).toBeGreaterThanOrEqual(0);
    expect(ts?.level).toBeDefined();
  });
});