/**
 * sutar-economy-os — Leaderboard service unit tests
 */

import { describe, it, expect } from 'vitest';
import { leaderboardService } from '../../src/services/leaderboard.service.js';

describe('leaderboard — generate + read', () => {
  it('generates a leaderboard sorted desc by value', async () => {
    const lb = await leaderboardService.generateLeaderboard(
      'daily',
      'karma',
      [
        { entityId: 'a', entityType: 'user', displayName: 'Alice', value: 100 },
        { entityId: 'b', entityType: 'user', displayName: 'Bob', value: 200 },
        { entityId: 'c', entityType: 'user', displayName: 'Carol', value: 50 },
      ],
    );
    expect(lb.entries.length).toBe(3);
    expect(lb.entries[0].displayName).toBe('Bob');
    expect(lb.entries[0].rank).toBe(1);
    expect(lb.entries[2].rank).toBe(3);
  });

  it('retrieves the leaderboard for a period+category', async () => {
    const entries = [
      { entityId: 'x', entityType: 'user', displayName: 'X', value: 10 },
      { entityId: 'y', entityType: 'user', displayName: 'Y', value: 20 },
    ];
    await leaderboardService.generateLeaderboard('weekly', 'earnings', entries);
    const got = await leaderboardService.getLeaderboard('weekly', 'earnings');
    expect(got).not.toBeNull();
    expect(got?.entries.length).toBe(2);
  });

  it('returns null for an unknown period/category', async () => {
    const got = await leaderboardService.getLeaderboard('monthly', 'karma');
    expect(got).toBeNull();
  });

  it('looks up an entity rank', async () => {
    await leaderboardService.generateLeaderboard('daily', 'karma', [
      { entityId: 'rank-a', entityType: 'user', displayName: 'A', value: 5 },
      { entityId: 'rank-b', entityType: 'user', displayName: 'B', value: 15 },
    ]);
    const result = await leaderboardService.getEntityRank('rank-a', 'daily', 'karma');
    expect(result?.rank).toBe(2);
    expect(result?.value).toBe(5);
  });

  it('respects the limit option when generating', async () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      entityId: `e${i}`,
      entityType: 'user' as const,
      displayName: `E${i}`,
      value: 100 - i,
    }));
    const lb = await leaderboardService.generateLeaderboard('daily', 'karma', entries, { limit: 3 });
    expect(lb.entries.length).toBe(3);
  });
});

describe('leaderboard — achievements', () => {
  it('awards an achievement and counts its points', async () => {
    const eid = `ach-${Date.now()}-${Math.random()}`;
    const a = await leaderboardService.awardAchievement({
      entityId: eid,
      achievementType: 'first_payment',
      title: 'First Payment',
      description: 'Made your first payment',
      points: 50,
    });
    expect(a.achievementId).toBeDefined();
    expect(a.points).toBe(50);
    const total = await leaderboardService.getTotalAchievementPoints(eid);
    expect(total).toBe(50);
  });

  it('lists achievements for an entity', async () => {
    const eid = `ach-list-${Date.now()}-${Math.random()}`;
    await leaderboardService.awardAchievement({
      entityId: eid, achievementType: 'first_login', title: 't', description: 'd', points: 10,
    });
    await leaderboardService.awardAchievement({
      entityId: eid, achievementType: 'first_purchase', title: 't', description: 'd', points: 20,
    });
    const list = await leaderboardService.getAchievements(eid);
    expect(list.length).toBe(2);
  });

  it('checks milestone achievements', async () => {
    const eid = `ach-milestone-${Date.now()}-${Math.random()}`;
    const awarded = await leaderboardService.checkMilestoneAchievements(eid, 'login_count', 10);
    expect(Array.isArray(awarded)).toBe(true);
  });

  it('clears the cache', async () => {
    await leaderboardService.generateLeaderboard('daily', 'karma', [
      { entityId: 'x', entityType: 'user', displayName: 'X', value: 1 },
    ]);
    await leaderboardService.clearCache('daily', 'karma');
    const got = await leaderboardService.getLeaderboard('daily', 'karma');
    expect(got).toBeNull();
  });
});