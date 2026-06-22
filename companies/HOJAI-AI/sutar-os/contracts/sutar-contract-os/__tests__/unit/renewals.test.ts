/**
 * SUTAR Contract OS - Renewal Service Unit Tests
 *
 * The renewal service uses module-level state. We use vi.resetModules()
 * + dynamic import to get a fresh store per test.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import type { Contract } from '../../src/types/index.js';

async function loadService() {
  vi.resetModules();
  const mod = await import('../../src/services/renewals.js');
  return mod.renewalService;
}

function makeContract(overrides: Partial<Contract> = {}): Contract {
  const now = new Date();
  const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // +60 days
  return {
    id: `contract-${Math.random().toString(36).slice(2, 9)}`,
    type: 'service',
    title: 'Renewable',
    terms: 'terms',
    clauses: [],
    parties: [
      { id: 'p1', name: 'Alice', email: 'alice@example.com', role: 'client', signed: false },
      { id: 'p2', name: 'Bob', email: 'bob@example.com', role: 'vendor', signed: false },
    ],
    startDate: now.toISOString(),
    endDate: future.toISOString(),
    value: 1000,
    status: 'active',
    signatures: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    renewalNoticeDays: 30,
    autoRenew: false,
    ...overrides,
  } as Contract;
}

describe('renewalService.createRenewalSchedule', () => {
  let renewalService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    renewalService = await loadService();
  });

  it('creates a schedule with status "scheduled" and computes notice + renewal dates', () => {
    const contract = makeContract();
    const schedule = renewalService.createRenewalSchedule(contract, { noticeDays: 14 });
    expect(schedule.id).toMatch(/^renewal-/);
    expect(schedule.contractId).toBe(contract.id);
    expect(schedule.status).toBe('scheduled');
    expect(schedule.termsChanged).toBe(false);

    const endDate = new Date(contract.endDate);
    const noticeDate = new Date(schedule.noticeDate);
    const renewalDate = new Date(schedule.renewalDate);

    const noticeDays = Math.round((endDate.getTime() - noticeDate.getTime()) / (24 * 60 * 60 * 1000));
    expect(noticeDays).toBe(14);

    const renewalGap = Math.round((renewalDate.getTime() - endDate.getTime()) / (24 * 60 * 60 * 1000));
    expect(renewalGap).toBe(1); // day after expiry
  });

  it('uses contract.renewalNoticeDays when no override is given', () => {
    const contract = makeContract({ renewalNoticeDays: 45 });
    const schedule = renewalService.createRenewalSchedule(contract);
    const endDate = new Date(contract.endDate);
    const noticeDate = new Date(schedule.noticeDate);
    const noticeDays = Math.round((endDate.getTime() - noticeDate.getTime()) / (24 * 60 * 60 * 1000));
    expect(noticeDays).toBe(45);
  });

  it('honours custom newEndDate, newValue, termsChanged options', () => {
    const contract = makeContract();
    const schedule = renewalService.createRenewalSchedule(contract, {
      newEndDate: '2027-12-31T00:00:00.000Z',
      newValue: 2000,
      termsChanged: true,
    });
    expect(schedule.newEndDate).toBe('2027-12-31T00:00:00.000Z');
    expect(schedule.newValue).toBe(2000);
    expect(schedule.termsChanged).toBe(true);
  });
});

describe('renewalService.getRenewalSchedule / getRenewalScheduleForContract', () => {
  let renewalService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    renewalService = await loadService();
  });

  it('retrieves a schedule by id', () => {
    const contract = makeContract();
    const schedule = renewalService.createRenewalSchedule(contract);
    expect(renewalService.getRenewalSchedule(schedule.id)?.id).toBe(schedule.id);
  });

  it('returns the latest schedule for a contract', () => {
    const contract = makeContract();
    const s1 = renewalService.createRenewalSchedule(contract);
    const s2 = renewalService.createRenewalSchedule(contract);
    expect(renewalService.getRenewalScheduleForContract(contract.id)?.id).toBe(s2.id);
    expect(s1.id).not.toBe(s2.id);
  });

  it('returns undefined for a contract with no schedules', () => {
    expect(renewalService.getRenewalScheduleForContract('no-such-contract')).toBeUndefined();
  });
});

describe('renewalService.getExpiringContracts / getContractsNeedingNotice', () => {
  let renewalService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    renewalService = await loadService();
  });

  it('returns only active contracts ending within the window', () => {
    const now = Date.now();
    const active1 = makeContract({ endDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'active' });
    const active2 = makeContract({ endDate: new Date(now + 60 * 24 * 60 * 60 * 1000).toISOString(), status: 'active' });
    const draftContract = makeContract({ endDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'draft' });
    const contracts = [active1, active2, draftContract];
    const expiring = renewalService.getExpiringContracts(contracts, 30);
    expect(expiring.length).toBe(1);
    expect(expiring[0].id).toBe(active1.id);
  });

  it('getContractsNeedingNotice behaves the same with a different default', () => {
    const now = Date.now();
    const c1 = makeContract({ endDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'active' });
    const c2 = makeContract({ endDate: new Date(now + 200 * 24 * 60 * 60 * 1000).toISOString(), status: 'active' });
    const result = renewalService.getContractsNeedingNotice([c1, c2], 30);
    expect(result.map((c) => c.id)).toContain(c1.id);
    expect(result.map((c) => c.id)).not.toContain(c2.id);
  });
});

describe('renewalService.sendRenewalNotification', () => {
  let renewalService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    renewalService = await loadService();
  });

  it('records a notification on the schedule', () => {
    const contract = makeContract();
    const schedule = renewalService.createRenewalSchedule(contract);
    const notif = renewalService.sendRenewalNotification(schedule.id, contract, 'renewal_reminder_30');
    expect(notif).toBeDefined();
    expect(notif?.template).toBe('renewal_reminder_30');
    expect(notif?.recipient).toContain('alice@example.com');
    expect(notif?.recipient).toContain('bob@example.com');
    const refreshed = renewalService.getRenewalSchedule(schedule.id);
    expect(refreshed?.sentNotifications.length).toBe(1);
  });

  it('returns undefined for an unknown schedule id', () => {
    const contract = makeContract();
    expect(renewalService.sendRenewalNotification('nope', contract, 'renewal_reminder_30')).toBeUndefined();
  });
});

describe('renewalService.renewContract / cancelRenewal / updateRenewalSchedule', () => {
  let renewalService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    renewalService = await loadService();
  });

  it('renewContract updates contract dates and creates a renewed schedule', () => {
    const contract = makeContract();
    const result = renewalService.renewContract(contract, {
      newEndDate: '2027-12-31T00:00:00.000Z',
      newValue: 2500,
      reason: 'price bump',
    });
    expect(result).toBeDefined();
    expect(result?.contract.endDate).toBe('2027-12-31T00:00:00.000Z');
    expect(result?.contract.value).toBe(2500);
    expect(result?.contract.renewalCount).toBe(1);
    expect(result?.schedule.status).toBe('renewed');
  });

  it('renewContract refuses to renew contracts in disallowed statuses', () => {
    const contract = makeContract({ status: 'terminated' });
    expect(renewalService.renewContract(contract, { newEndDate: '2027-01-01' })).toBeUndefined();
  });

  it('cancelRenewal transitions the schedule to cancelled', () => {
    const contract = makeContract();
    const schedule = renewalService.createRenewalSchedule(contract);
    expect(renewalService.cancelRenewal(schedule.id, 'changed mind')).toBe(true);
    expect(renewalService.getRenewalSchedule(schedule.id)?.status).toBe('cancelled');
  });

  it('updateRenewalSchedule merges updates', () => {
    const contract = makeContract();
    const schedule = renewalService.createRenewalSchedule(contract);
    const updated = renewalService.updateRenewalSchedule(schedule.id, { termsChanged: true });
    expect(updated?.termsChanged).toBe(true);
    expect(updated?.id).toBe(schedule.id);
  });
});

describe('renewalService.processAutoRenewals', () => {
  let renewalService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    renewalService = await loadService();
  });

  it('renews auto-renew contracts past their end date', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // yesterday
    const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(); // 1y ago
    const contract = makeContract({
      id: 'auto-1',
      startDate: start,
      endDate: pastDate,
      autoRenew: true,
      status: 'active',
    });
    // Create a matching scheduled renewal
    renewalService.createRenewalSchedule(contract);

    const result = renewalService.processAutoRenewals([contract]);
    expect(result.renewed.length).toBe(1);
    expect(result.renewed[0].id).toBe('auto-1');
    expect(new Date(result.renewed[0].endDate).getTime()).toBeGreaterThan(Date.now());
    expect(result.renewed[0].renewalCount).toBe(1);
  });

  it('does not renew contracts without autoRenew', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const contract = makeContract({
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: pastDate,
      autoRenew: false,
      status: 'active',
    });
    renewalService.createRenewalSchedule(contract);
    const result = renewalService.processAutoRenewals([contract]);
    expect(result.renewed.length).toBe(0);
  });
});

describe('renewalService.getRenewalStats / getRenewalCalendar / bulkCreateSchedules', () => {
  let renewalService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    renewalService = await loadService();
  });

  it('stats include counts by status', () => {
    const contract = makeContract();
    renewalService.createRenewalSchedule(contract);
    const stats = renewalService.getRenewalStats();
    expect(stats.totalSchedules).toBe(1);
    expect(stats.scheduled).toBe(1);
  });

  it('getRenewalCalendar returns one entry per day in the range', () => {
    const start = new Date();
    const end = new Date(start.getTime() + 4 * 24 * 60 * 60 * 1000);
    const calendar = renewalService.getRenewalCalendar(start.toISOString(), end.toISOString());
    expect(calendar.length).toBe(5); // start..end inclusive
    expect(calendar.every((d) => Array.isArray(d.renewals))).toBe(true);
  });

  it('bulkCreateSchedules skips non-active contracts', () => {
    const a = makeContract({ status: 'active' });
    const b = makeContract({ status: 'draft' });
    const schedules = renewalService.bulkCreateSchedules([a, b]);
    expect(schedules.length).toBe(1);
  });
});
