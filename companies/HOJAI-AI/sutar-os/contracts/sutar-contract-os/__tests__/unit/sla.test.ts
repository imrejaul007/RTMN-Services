/**
 * SUTAR Contract OS - SLA Service Unit Tests
 * Phase B.5: Tests for the new SLA service
 */

import { describe, it, expect } from 'vitest';
import {
  createSLA,
  getSLA,
  getSLAsForContract,
  updateSLA,
  deleteSLA,
  recordMetricReading,
  generateBreachReport,
  getMetricHistory,
} from '../../src/services/sla.js';
import type { SLA, SLAMetric } from '../../src/types/index.js';

function makeSLA(overrides: Partial<SLA> = {}): Omit<SLA, 'id' | 'createdAt' | 'updatedAt'> {
  const metrics: SLAMetric[] = overrides.metrics ?? [
    {
      id: `metric-${Math.random()}`,
      name: 'Uptime',
      type: 'uptime',
      target: 99.9,
      unit: 'percentage',
      threshold: 99.0,
      weight: 1.0,
    },
    {
      id: `metric-rt-${Math.random()}`,
      name: 'Response Time',
      type: 'response_time',
      target: 4,
      unit: 'hours',
      threshold: 8,
      weight: 0.5,
    },
  ];
  return {
    contractId: `contract-${Math.random()}`,
    name: 'Standard SLA',
    description: 'Test SLA',
    metrics,
    reportingPeriod: 'monthly',
    breachNotifications: true,
    ...overrides,
  };
}

describe('SLA — CRUD', () => {
  it('creates an SLA with id and timestamps', () => {
    const sla = createSLA(makeSLA());
    expect(sla.id).toBeTruthy();
    expect(sla.id.startsWith('sla-')).toBe(true);
    expect(sla.createdAt).toBeTruthy();
    expect(sla.updatedAt).toBeTruthy();
  });

  it('retrieves an SLA by id', () => {
    const sla = createSLA(makeSLA());
    const found = getSLA(sla.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(sla.id);
  });

  it('returns null for unknown SLA id', () => {
    const found = getSLA(`unknown-${Math.random()}`);
    expect(found).toBeNull();
  });

  it('lists SLAs for a contract', () => {
    const contractId = `contract-${Math.random()}`;
    createSLA(makeSLA({ contractId }));
    createSLA(makeSLA({ contractId }));
    createSLA(makeSLA({ contractId: 'other' }));
    const list = getSLAsForContract(contractId);
    expect(list).toHaveLength(2);
  });

  it('updates an SLA', () => {
    const sla = createSLA(makeSLA());
    const updated = updateSLA(sla.id, { name: 'Updated Name' });
    expect(updated).toBeDefined();
    expect(updated!.name).toBe('Updated Name');
  });

  it('returns null when updating unknown SLA', () => {
    const r = updateSLA(`unknown-${Math.random()}`, { name: 'X' });
    expect(r).toBeNull();
  });

  it('deletes an SLA', () => {
    const sla = createSLA(makeSLA());
    expect(deleteSLA(sla.id)).toBe(true);
    expect(getSLA(sla.id)).toBeNull();
  });
});

describe('SLA — metric readings & breach report', () => {
  it('records a metric reading with auto-compliance check (higher is better)', () => {
    const sla = createSLA(makeSLA());
    const metric = sla.metrics[0]; // uptime: threshold 99
    const compliant = recordMetricReading({
      metricId: metric.id,
      value: 99.5,
      recordedAt: new Date().toISOString(),
    });
    expect(compliant.compliant).toBe(true);
  });

  it('records a non-compliant reading when below threshold', () => {
    const sla = createSLA(makeSLA());
    const metric = sla.metrics[0];
    const r = recordMetricReading({
      metricId: metric.id,
      value: 95.0,
      recordedAt: new Date().toISOString(),
    });
    expect(r.compliant).toBe(false);
  });

  it('treats lower-is-better metrics correctly (response_time)', () => {
    const sla = createSLA(makeSLA());
    const rtMetric = sla.metrics[1]; // threshold 8
    const compliant = recordMetricReading({
      metricId: rtMetric.id,
      value: 3, // well below 8
      recordedAt: new Date().toISOString(),
    });
    expect(compliant.compliant).toBe(true);

    const breached = recordMetricReading({
      metricId: rtMetric.id,
      value: 12, // above 8
      recordedAt: new Date().toISOString(),
    });
    expect(breached.compliant).toBe(false);
  });

  it('generates a breach report', () => {
    const sla = createSLA(makeSLA());
    recordMetricReading({
      metricId: sla.metrics[0].id,
      value: 95, // breach uptime
      recordedAt: new Date().toISOString(),
    });
    const report = generateBreachReport(sla.id);
    expect(report).toBeDefined();
    expect(report!.overallCompliant).toBe(false);
    expect(report!.metrics.length).toBe(2);
    expect(report!.metrics[0].breachCount).toBe(1);
    expect(report!.metrics[0].complianceRate).toBe(0);
  });

  it('returns null report for unknown SLA', () => {
    const r = generateBreachReport(`unknown-${Math.random()}`);
    expect(r).toBeNull();
  });

  it('returns metric history', () => {
    const sla = createSLA(makeSLA());
    recordMetricReading({ metricId: sla.metrics[0].id, value: 99, recordedAt: new Date().toISOString() });
    recordMetricReading({ metricId: sla.metrics[0].id, value: 95, recordedAt: new Date().toISOString() });
    const history = getMetricHistory(sla.metrics[0].id);
    expect(history).toHaveLength(2);
  });
});
