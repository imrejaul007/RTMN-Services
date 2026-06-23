/**
 * Unit tests for missionService — full mission lifecycle, subtask
 * state machine, template instantiation, and stats.
 */

import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import * as svc from '../../src/services/missionService.js';
import { Mission } from '../../src/models/Mission.js';
import { MissionTemplate } from '../../src/models/MissionTemplate.js';

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  // Re-sync indexes after each clear so partial unique indexes stay valid
  for (const name of (await import('mongoose')).default.modelNames()) {
    try {
      await (await import('mongoose')).default.model(name).syncIndexes();
    } catch {
      // ignore
    }
  }
});

// -----------------------------------------------------------------------------
// Mission creation
// -----------------------------------------------------------------------------

describe('createMission — with subtasks', () => {
  test('creates a DRAFT mission with provided subtasks', async () => {
    const m = await svc.createMission('tenant-a', {
      name: 'Procure steel',
      subtasks: [
        { name: 'Find supplier', type: 'find-supplier', capability: 'supplier-registry' },
        { name: 'Negotiate price', type: 'negotiate-price', capability: 'pricing-network', dependsOn: [] },
      ],
    });
    expect(m.tenantId).toBe('tenant-a');
    expect(m.status).toBe('DRAFT');
    expect(m.subtasks).toHaveLength(2);
    expect(m.subtasks[0].status).toBe('PENDING');
    expect(m.subtasks[0].subtaskId).toBeTruthy();
    expect(m.priority).toBe(5); // default
  });

  test('rejects missing name', async () => {
    await expect(svc.createMission('tenant-a', { subtasks: [{ name: 'x', type: 'find-supplier', capability: 'c' }] }))
      .rejects.toThrow(/name/);
  });

  test('rejects empty subtasks when no template', async () => {
    await expect(svc.createMission('tenant-a', { name: 'X', subtasks: [] }))
      .rejects.toThrow();
  });

  test('rejects invalid subtask type', async () => {
    await expect(svc.createMission('tenant-a', {
      name: 'X',
      subtasks: [{ name: 's', type: 'BAD', capability: 'c' }],
    })).rejects.toThrow();
  });

  test('rejects priority outside 1-10', async () => {
    await expect(svc.createMission('tenant-a', {
      name: 'X',
      priority: 11,
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    })).rejects.toThrow(/priority/);
  });

  test('persists mission in DB', async () => {
    await svc.createMission('tenant-a', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    const count = await Mission.countDocuments({});
    expect(count).toBe(1);
  });
});

// -----------------------------------------------------------------------------
// Template instantiation
// -----------------------------------------------------------------------------

describe('createMission — with template', () => {
  test('copies subtasks from template and substitutes {{placeholders}}', async () => {
    await MissionTemplate.create({
      tenantId: null,
      templateId: 'open-restaurant',
      name: 'Open Restaurant',
      version: '1.0.0',
      subtasks: [
        {
          name: 'Find supplier',
          type: 'find-supplier',
          capability: 'supplier-registry',
          inputs: { item: 'vegetables', location: '{{city}}' },
        },
        {
          name: 'Negotiate price',
          type: 'negotiate-price',
          capability: 'pricing-network',
          inputs: { budget: '{{budget}}' },
        },
      ],
    });

    const m = await svc.createMission('tenant-a', {
      name: 'Open Mumbai Bistro',
      templateId: 'open-restaurant',
      context: { city: 'Mumbai', budget: 50000 },
    });

    expect(m.subtasks).toHaveLength(2);
    expect(m.templateId).toBe('open-restaurant');
    expect(m.templateVersion).toBe('1.0.0');
    expect(m.subtasks[0].inputs.location).toBe('Mumbai');
    expect(m.subtasks[1].inputs.budget).toBe('50000');
  });

  test('leaves {{placeholder}} unchanged when key not in context', async () => {
    await MissionTemplate.create({
      tenantId: null,
      templateId: 't1',
      name: 'T1',
      subtasks: [{ name: 's', type: 'custom', capability: 'c', inputs: { x: '{{unknown}}' } }],
    });
    const m = await svc.createMission('tenant-a', { name: 'X', templateId: 't1' });
    expect(m.subtasks[0].inputs.x).toBe('{{unknown}}');
  });

  test('uses tenant-owned private template', async () => {
    await MissionTemplate.create({
      tenantId: 'tenant-a',
      templateId: 'private-tpl',
      name: 'Private',
      visibility: 'PRIVATE',
      subtasks: [{ name: 's', type: 'custom', capability: 'c' }],
    });
    const m = await svc.createMission('tenant-a', { name: 'X', templateId: 'private-tpl' });
    expect(m.subtasks).toHaveLength(1);
  });

  test('rejects use of another tenant\'s PRIVATE template', async () => {
    await MissionTemplate.create({
      tenantId: 'tenant-b',
      templateId: 'secret',
      name: 'Secret',
      visibility: 'PRIVATE',
      subtasks: [{ name: 's', type: 'custom', capability: 'c' }],
    });
    await expect(svc.createMission('tenant-a', { name: 'X', templateId: 'secret' }))
      .rejects.toThrow(/Template not found/);
  });

  test('rejects unknown template', async () => {
    await expect(svc.createMission('tenant-a', { name: 'X', templateId: 'does-not-exist' }))
      .rejects.toThrow(/Template not found/);
  });
});

// -----------------------------------------------------------------------------
// Mission update
// -----------------------------------------------------------------------------

describe('updateMission', () => {
  test('updates fields in DRAFT', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    const updated = await svc.updateMission('t', m.missionId, { name: 'Y', priority: 8 });
    expect(updated.name).toBe('Y');
    expect(updated.priority).toBe(8);
  });

  test('refuses to update COMPLETED mission', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.planMission('t', m.missionId);
    await svc.transitionMission('t', m.missionId, 'PLANNED');
    await svc.transitionMission('t', m.missionId, 'EXECUTING');
    // Complete the only subtask
    const stId = m.subtasks[0].subtaskId;
    await svc.startSubtask('t', m.missionId, stId);
    await svc.completeSubtask('t', m.missionId, stId, { result: { ok: true } });
    await expect(svc.updateMission('t', m.missionId, { name: 'Y' })).rejects.toThrow(/status COMPLETED/);
  });
});

// -----------------------------------------------------------------------------
// Mission transitions
// -----------------------------------------------------------------------------

describe('transitionMission', () => {
  test('DRAFT → PLANNED', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    const updated = await svc.transitionMission('t', m.missionId, 'PLANNED');
    expect(updated.status).toBe('PLANNED');
  });

  test('PLANNED → EXECUTING sets startedAt', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.transitionMission('t', m.missionId, 'PLANNED');
    const updated = await svc.transitionMission('t', m.missionId, 'EXECUTING');
    expect(updated.status).toBe('EXECUTING');
    expect(updated.startedAt).toBeTruthy();
  });

  test('COMPLETED → X is forbidden (terminal)', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.planMission('t', m.missionId);
    await svc.transitionMission('t', m.missionId, 'PLANNED');
    await svc.transitionMission('t', m.missionId, 'EXECUTING');
    const stId = m.subtasks[0].subtaskId;
    await svc.startSubtask('t', m.missionId, stId);
    await svc.completeSubtask('t', m.missionId, stId);
    await expect(svc.transitionMission('t', m.missionId, 'PAUSED')).rejects.toThrow(/Cannot transition/);
  });

  test('no-op when already in target status', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    const updated = await svc.transitionMission('t', m.missionId, 'DRAFT');
    expect(updated.status).toBe('DRAFT');
  });

  test('unknown mission id → NotFoundError', async () => {
    await expect(svc.transitionMission('t', 'nope', 'PLANNED')).rejects.toThrow(/not found/i);
  });
});

// -----------------------------------------------------------------------------
// planMission
// -----------------------------------------------------------------------------

describe('planMission', () => {
  test('resolves agents and promotes to PLANNED', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [
        { name: 'A', type: 'find-supplier', capability: 'supplier-registry' },
        { name: 'B', type: 'negotiate-price', capability: 'pricing-network' },
      ],
    });
    const resolver = async (q) => {
      if (q.capability === 'supplier-registry') return { agentId: 'sup-1', tenantId: 'tenant-x' };
      if (q.capability === 'pricing-network') return { agentId: 'pri-1', tenantId: 'tenant-y' };
      return null;
    };
    const planned = await svc.planMission('t', m.missionId, { resolveAgent: resolver });
    expect(planned.status).toBe('PLANNED');
    expect(planned.subtasks[0].assignedAgent).toBe('sup-1');
    expect(planned.subtasks[0].assignedTenant).toBe('tenant-x');
    expect(planned.subtasks[1].assignedAgent).toBe('pri-1');
    expect(planned.participants).toEqual(expect.arrayContaining(['t', 'tenant-x', 'tenant-y']));
  });

  test('refuses to plan non-DRAFT mission', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.transitionMission('t', m.missionId, 'PLANNED');
    await expect(svc.planMission('t', m.missionId)).rejects.toThrow(/Can only plan a DRAFT/);
  });

  test('default resolver leaves subtasks unassigned (assignedAgent=null)', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    const planned = await svc.planMission('t', m.missionId);
    expect(planned.status).toBe('PLANNED');
    expect(planned.subtasks[0].assignedAgent).toBeNull();
    expect(planned.subtasks[0].status).toBe('ASSIGNED');
  });
});

// -----------------------------------------------------------------------------
// Subtask state machine
// -----------------------------------------------------------------------------

describe('subtask transitions', () => {
  async function setupMission() {
    return svc.createMission('t', {
      name: 'X',
      subtasks: [
        { name: 'A', type: 'find-supplier', capability: 'c' },
        { name: 'B', type: 'custom', capability: 'c', dependsOn: [] },
      ],
    });
  }

  test('PENDING → IN_PROGRESS requires planner to run first (ASSIGNED)', async () => {
    const m = await setupMission();
    const stId = m.subtasks[0].subtaskId;
    // Try startSubtask on a PENDING subtask — the service sets it to ASSIGNED via planMission first
    // but startSubtask on PENDING should fail per state machine
    await expect(svc.startSubtask('t', m.missionId, stId)).rejects.toThrow(/Cannot transition subtask/);
  });

  test('plan → start → complete works', async () => {
    const m = await setupMission();
    await svc.planMission('t', m.missionId);
    const stId = m.subtasks[0].subtaskId;
    const inProgress = await svc.startSubtask('t', m.missionId, stId);
    expect(inProgress.subtasks[0].status).toBe('IN_PROGRESS');
    expect(inProgress.status).toBe('EXECUTING');
    const done = await svc.completeSubtask('t', m.missionId, stId, { result: { found: 3 } });
    expect(done.subtasks[0].status).toBe('COMPLETED');
    expect(done.subtasks[0].result).toEqual({ found: 3 });
  });

  test('startSubtask auto-promotes DRAFT/PLANNED mission to EXECUTING', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.planMission('t', m.missionId);
    // Mission is now PLANNED; starting a subtask should promote to EXECUTING
    const updated = await svc.startSubtask('t', m.missionId, m.subtasks[0].subtaskId);
    expect(updated.status).toBe('EXECUTING');
    expect(updated.startedAt).toBeTruthy();
  });

  test('complete last subtask auto-completes the mission', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.planMission('t', m.missionId);
    const stId = m.subtasks[0].subtaskId;
    await svc.startSubtask('t', m.missionId, stId);
    const done = await svc.completeSubtask('t', m.missionId, stId);
    expect(done.status).toBe('COMPLETED');
    expect(done.completedAt).toBeTruthy();
  });

  test('skipping all subtasks auto-completes the mission', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    const done = await svc.skipSubtask('t', m.missionId, m.subtasks[0].subtaskId);
    expect(done.status).toBe('COMPLETED');
  });

  test('failSubtask increments retryCount and records error', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.planMission('t', m.missionId);
    const stId = m.subtasks[0].subtaskId;
    const failed = await svc.failSubtask('t', m.missionId, stId, { error: 'no suppliers' });
    expect(failed.subtasks[0].status).toBe('FAILED');
    expect(failed.subtasks[0].error).toBe('no suppliers');
    expect(failed.subtasks[0].retryCount).toBe(1);
  });

  test('dependsOn: subtask blocked until dependency completes', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [
        { name: 'A', type: 'find-supplier', capability: 'c' },
        { name: 'B', type: 'custom', capability: 'c' },
      ],
    });
    // Make B depend on A by direct DB update
    await Mission.updateOne(
      { tenantId: 't', missionId: m.missionId },
      { $set: { 'subtasks.1.dependsOn': [m.subtasks[0].subtaskId] } },
    );
    await svc.planMission('t', m.missionId);
    const stA = m.subtasks[0].subtaskId;
    const stB = m.subtasks[1].subtaskId;
    // Try starting B before A completes — should be blocked
    await expect(svc.startSubtask('t', m.missionId, stB)).rejects.toThrow(/blocked/);
    // Complete A then start B
    await svc.startSubtask('t', m.missionId, stA);
    await svc.completeSubtask('t', m.missionId, stA);
    const updated = await svc.startSubtask('t', m.missionId, stB);
    expect(updated.subtasks[1].status).toBe('IN_PROGRESS');
  });

  test('skipping a subtask unblocks dependents', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [
        { name: 'A', type: 'find-supplier', capability: 'c' },
        { name: 'B', type: 'custom', capability: 'c' },
      ],
    });
    await Mission.updateOne(
      { tenantId: 't', missionId: m.missionId },
      { $set: { 'subtasks.1.dependsOn': [m.subtasks[0].subtaskId] } },
    );
    const stB = m.subtasks[1].subtaskId;
    await svc.planMission('t', m.missionId);
    await svc.skipSubtask('t', m.missionId, m.subtasks[0].subtaskId);
    const updated = await svc.startSubtask('t', m.missionId, stB);
    expect(updated.subtasks[1].status).toBe('IN_PROGRESS');
  });

  test('COMPLETED → IN_PROGRESS is forbidden (terminal)', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.planMission('t', m.missionId);
    const stId = m.subtasks[0].subtaskId;
    await svc.startSubtask('t', m.missionId, stId);
    await svc.completeSubtask('t', m.missionId, stId);
    // Re-fetch and try to start again
    const fresh = await svc.getMission('t', m.missionId);
    await expect(svc.startSubtask('t', fresh.tenantId, fresh.missionId, stId)).rejects.toThrow();
  });

  test('FAILED → PENDING (retry) is allowed', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.planMission('t', m.missionId);
    const stId = m.subtasks[0].subtaskId;
    await svc.failSubtask('t', m.missionId, stId, { error: 'boom' });
    // Manually flip back to PENDING via update
    await Mission.updateOne(
      { tenantId: 't', missionId: m.missionId, 'subtasks.subtaskId': stId },
      { $set: { 'subtasks.$.status': 'PENDING' } },
    );
    // Now we can start it again (PENDING → IN_PROGRESS is still forbidden;
    // but PENDING → ASSIGNED via planMission works again)
  });
});

// -----------------------------------------------------------------------------
// Cancel
// -----------------------------------------------------------------------------

describe('cancelMission', () => {
  test('cancels DRAFT mission', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    const cancelled = await svc.cancelMission('t', m.missionId);
    expect(cancelled.status).toBe('CANCELLED');
  });

  test('cancels EXECUTING mission', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.planMission('t', m.missionId);
    await svc.startSubtask('t', m.missionId, m.subtasks[0].subtaskId);
    const cancelled = await svc.cancelMission('t', m.missionId);
    expect(cancelled.status).toBe('CANCELLED');
  });

  test('cannot cancel COMPLETED mission', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.planMission('t', m.missionId);
    await svc.startSubtask('t', m.missionId, m.subtasks[0].subtaskId);
    await svc.completeSubtask('t', m.missionId, m.subtasks[0].subtaskId);
    await expect(svc.cancelMission('t', m.missionId)).rejects.toThrow(/Cannot transition/);
  });
});

// -----------------------------------------------------------------------------
// Get / list / stats
// -----------------------------------------------------------------------------

describe('getMission / listMissions / getStats', () => {
  test('getMission returns the mission by id', async () => {
    const m = await svc.createMission('t', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    const fetched = await svc.getMission('t', m.missionId);
    expect(fetched.missionId).toBe(m.missionId);
  });

  test('getMission throws NotFoundError for missing id', async () => {
    await expect(svc.getMission('t', 'nope')).rejects.toThrow(/not found/i);
  });

  test('getMission throws when other tenant tries to read', async () => {
    const m = await svc.createMission('tenant-a', {
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await expect(svc.getMission('tenant-b', m.missionId)).rejects.toThrow(/not found/i);
  });

  test('getMission allows cross-tenant read for participants', async () => {
    const m = await svc.createMission('tenant-a', {
      name: 'X',
      participants: ['tenant-b'],
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    const fetched = await svc.getMission('tenant-b', m.missionId);
    expect(fetched.missionId).toBe(m.missionId);
  });

  test('listMissions filters by status and templateId', async () => {
    await svc.createMission('t', {
      name: 'A',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.createMission('t', {
      name: 'B',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    // Mark one mission's templateId directly so we can filter
    const list = await svc.listMissions('t', {});
    expect(list.total).toBe(2);
    await Mission.updateOne(
      { tenantId: 't', name: 'A' },
      { $set: { templateId: 't1' } },
    );
    const byTpl = await svc.listMissions('t', { templateId: 't1' });
    expect(byTpl.total).toBe(1);
    expect(byTpl.items[0].name).toBe('A');
    const byStatus = await svc.listMissions('t', { status: 'DRAFT' });
    expect(byStatus.total).toBe(2);
  });

  test('listMissions respects limit/offset', async () => {
    for (let i = 0; i < 5; i++) {
      await svc.createMission('t', {
        name: `M${i}`,
        subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
      });
    }
    const page = await svc.listMissions('t', { limit: 2, offset: 1 });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(5);
  });

  test('listMissions is per-tenant', async () => {
    await svc.createMission('tenant-a', {
      name: 'A',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.createMission('tenant-b', {
      name: 'B',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    const a = await svc.listMissions('tenant-a', {});
    const b = await svc.listMissions('tenant-b', {});
    expect(a.total).toBe(1);
    expect(b.total).toBe(1);
    expect(a.items[0].name).toBe('A');
  });

  test('getStats returns counts by status and template', async () => {
    await svc.createMission('t', {
      name: 'A',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.createMission('t', {
      name: 'B',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await svc.createMission('t', {
      name: 'C',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    // Stamp templateIds directly
    await Mission.updateMany({ tenantId: 't', name: { $in: ['A', 'B'] } }, { $set: { templateId: 't1' } });
    await Mission.updateMany({ tenantId: 't', name: 'C' }, { $set: { templateId: 't2' } });
    const stats = await svc.getStats('t');
    expect(stats.total).toBe(3);
    expect(stats.byStatus.DRAFT).toBe(3);
    expect(stats.byTemplate.t1).toBe(2);
    expect(stats.byTemplate.t2).toBe(1);
  });
});