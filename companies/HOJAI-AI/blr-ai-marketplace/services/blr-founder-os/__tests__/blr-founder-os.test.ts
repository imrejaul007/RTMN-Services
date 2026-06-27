import { describe, it, expect } from 'vitest';

// BLR Founder OS Constants
const COMPANY_STAGES = ['pre-seed', 'seed', 'series-a', 'series-b', 'growth'];
const PLAYBOOK_IDS = ['weekly-board-update', 'investor-outreach', 'hiring-decision', 'runway-extension'];

describe('BLR Founder OS', () => {
  describe('Company Stages', () => {
    it('should have all company stages', () => {
      expect(COMPANY_STAGES).toContain('pre-seed');
      expect(COMPANY_STAGES).toContain('seed');
      expect(COMPANY_STAGES).toContain('series-a');
    });
  });

  describe('Playbook IDs', () => {
    it('should have all playbook templates', () => {
      expect(PLAYBOOK_IDS).toContain('weekly-board-update');
      expect(PLAYBOOK_IDS).toContain('investor-outreach');
      expect(PLAYBOOK_IDS).toContain('runway-extension');
    });
  });

  describe('Founder Validation', () => {
    const validateFounder = (founder: { name?: string; company?: string; stage?: string; teamSize?: number }) => {
      const errors: string[] = [];
      if (!founder.name) errors.push('name required');
      if (!founder.company) errors.push('company required');
      if (founder.stage && !COMPANY_STAGES.includes(founder.stage)) errors.push('invalid stage');
      if (founder.teamSize !== undefined && founder.teamSize < 1) errors.push('invalid teamSize');
      return { valid: errors.length === 0, errors };
    };

    it('should validate correct founder', () => {
      const result = validateFounder({ name: 'John', company: 'Acme', stage: 'seed', teamSize: 5 });
      expect(result.valid).toBe(true);
    });

    it('should require name and company', () => {
      const result = validateFounder({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name required');
    });
  });

  describe('KPI Snapshot Validation', () => {
    const validateKPI = (kpi: { date?: string; runwayMonths?: number; burnRateUsd?: number; revenueUsd?: number }) => {
      const errors: string[] = [];
      if (!kpi.date) errors.push('date required');
      if (kpi.runwayMonths !== undefined && kpi.runwayMonths < 0) errors.push('negative runway');
      if (kpi.burnRateUsd !== undefined && kpi.burnRateUsd < 0) errors.push('negative burn');
      return { valid: errors.length === 0, errors };
    };

    it('should validate correct KPI', () => {
      const result = validateKPI({ date: '2026-06-20', runwayMonths: 12, burnRateUsd: 20000, revenueUsd: 5000 });
      expect(result.valid).toBe(true);
    });
  });

  describe('Runway Calculation', () => {
    const calculateRunway = (cash: number, burnRate: number): number => {
      if (burnRate <= 0) return Infinity;
      return Math.round(cash / burnRate * 10) / 10;
    };

    it('should calculate runway in months', () => {
      expect(calculateRunway(60000, 20000)).toBe(3);
      expect(calculateRunway(120000, 15000)).toBe(8);
    });

    it('should return infinity for zero burn', () => {
      expect(calculateRunway(100000, 0)).toBe(Infinity);
    });
  });

  describe('Burn Rate Analysis', () => {
    const analyzeBurn = (kpis: Array<{ burnRateUsd: number; revenueUsd: number }>) => {
      const avgBurn = kpis.reduce((sum, k) => sum + k.burnRateUsd, 0) / kpis.length;
      const avgRevenue = kpis.reduce((sum, k) => sum + k.revenueUsd, 0) / kpis.length;
      const netBurn = avgBurn - avgRevenue;
      const runway = avgRevenue > 0 ? avgBurn / avgRevenue : Infinity;

      return { avgBurn, avgRevenue, netBurn, burnMultiple: avgBurn / (avgRevenue || 1) };
    };

    it('should analyze burn rate', () => {
      const kpis = [
        { burnRateUsd: 20000, revenueUsd: 5000 },
        { burnRateUsd: 22000, revenueUsd: 6000 }
      ];
      const result = analyzeBurn(kpis);
      expect(result.avgBurn).toBe(21000);
      expect(result.netBurn).toBe(15500);
    });
  });

  describe('Morale Tracking', () => {
    const getMoraleTrend = (kpis: Array<{ teamMorale: number; date: string }>) => {
      if (kpis.length < 2) return { trend: 'insufficient_data', change: 0 };
      const sorted = [...kpis].sort((a, b) => a.date.localeCompare(b.date));
      const change = sorted[sorted.length - 1].teamMorale - sorted[0].teamMorale;
      return { trend: change > 0.5 ? 'improving' : change < -0.5 ? 'declining' : 'stable', change };
    };

    it('should detect improving morale', () => {
      const kpis = [
        { teamMorale: 7, date: '2026-06-01' },
        { teamMorale: 8, date: '2026-06-15' }
      ];
      const result = getMoraleTrend(kpis);
      expect(result.trend).toBe('improving');
    });
  });

  describe('Board Update Draft Generation', () => {
    const generateBoardUpdate = (founder: { company: string; name: string }, latestKpi: any) => {
      return {
        title: `Weekly Update — ${founder.company}`,
        body: `Runway: ${latestKpi.runwayMonths ?? '?'} months. Burn: $${latestKpi.burnRateUsd ?? '?'}/mo. Revenue: $${latestKpi.revenueUsd ?? '?'}/mo.`,
      };
    };

    it('should generate board update with KPIs', () => {
      const founder = { company: 'Acme', name: 'John' };
      const kpi = { runwayMonths: 12, burnRateUsd: 20000, revenueUsd: 5000 };
      const update = generateBoardUpdate(founder, kpi);
      expect(update.title).toContain('Acme');
      expect(update.body).toContain('12');
    });
  });

  describe('Investor Outreach Matching', () => {
    const matchInvestors = (stage: string, sector: string) => {
      const investors = [
        { name: 'Seed Fund A', stages: ['pre-seed', 'seed'], sectors: ['AI', 'SaaS'] },
        { name: 'Series A Fund B', stages: ['series-a'], sectors: ['AI'] }
      ];
      return investors.filter(i => i.stages.includes(stage) && i.sectors.includes(sector));
    };

    it('should match investors by stage and sector', () => {
      const matches = matchInvestors('seed', 'AI');
      expect(matches.some(i => i.name === 'Seed Fund A')).toBe(true);
    });
  });

  describe('Hiring Decision Scoring', () => {
    const scoreCandidate = (candidate: { skills: string[]; experience: number }, role: { requiredSkills: string[] }) => {
      const skillMatch = candidate.skills.filter(s => role.requiredSkills.includes(s)).length / role.requiredSkills.length;
      const expScore = Math.min(1, candidate.experience / 10);
      return { skillMatch, expScore, overall: skillMatch * 0.6 + expScore * 0.4 };
    };

    it('should score candidate fit', () => {
      const candidate = { skills: ['react', 'node', 'python'], experience: 5 };
      const role = { requiredSkills: ['react', 'node'] };
      const score = scoreCandidate(candidate, role);
      expect(score.skillMatch).toBe(1);
      expect(score.overall).toBeGreaterThan(0.5);
    });
  });

  describe('Runway Extension Recommendations', () => {
    const getRunwayRecommendations = (currentRunway: number) => {
      if (currentRunway > 12) return [];
      return [
        { action: 'Optimize cloud spend', impact: 1.5, risk: 'low' },
        { action: 'Raise bridge round', impact: 3, risk: 'medium' }
      ];
    };

    it('should recommend for low runway', () => {
      const recs = getRunwayRecommendations(6);
      expect(recs.length).toBe(2);
    });

    it('should not recommend for healthy runway', () => {
      const recs = getRunwayRecommendations(18);
      expect(recs.length).toBe(0);
    });
  });
});