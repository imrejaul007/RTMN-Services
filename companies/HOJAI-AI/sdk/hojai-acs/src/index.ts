/**
 * @hojai/acs — Agent Capability Index SDK
 *
 * Real-time agent capability scoring for the Nexha federation marketplace.
 * Wraps the nexha-acs-engine service (port 4260).
 *
 * @example
 * ```ts
 * import { ACSClient } from '@hojai/acs';
 *
 * const acs = new ACSClient({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // Register an agent
 * const { agent, score } = await acs.register({
 *   agentId: 'agent-maya-1',
 *   name: 'Electronics Sourcer',
 *   domains: ['electronics', 'logistics']
 * });
 *
 * // Emit capability signals
 * await acs.emit({ agentId: 'agent-maya-1', kind: 'task_completed', domain: 'electronics' });
 * await acs.emit({ agentId: 'agent-maya-1', kind: 'response_time', meta: { avgMs: 2000 } });
 *
 * // Get score breakdown
 * const score = await acs.getScore('agent-maya-1', 'electronics');
 * console.log(`Band: ${score.band} (${score.score}/1000)`);
 *
 * // Leaderboard
 * const top = await acs.rankings({ domain: 'electronics', limit: 10 });
 *
 * // Federation stats
 * const stats = await acs.stats();
 * console.log(`Avg score: ${stats.avgScore}, Top domain: ${stats.topDomain}`);
 * ```
 */

export { ACSClient } from './acs.js';
export type {
  TrustBand, ACSAgent, SignalKind, Signal,
  ScoreBreakdown, ACSScore, RankingEntry, ACSStats
} from './types.js';
