/**
 * Sales Twin Platform - Unit Tests
 */

describe('Sales Twin Platform', () => {
  describe('Customer Twin', () => {
    const mockCustomer = {
      customerId: 'CUST001',
      identity: {
        name: 'Acme Corp',
        email: 'rahul@acme.com',
        company: 'Acme Corporation',
      },
      lifecycle: {
        stage: 'customer',
        since: '2024-01-15',
        health: 85,
        ltv: 500000,
      },
      financials: {
        arr: 120000,
        mrr: 10000,
        orders: 50,
        aov: 2400,
        paymentStatus: 'current',
      },
      intelligence: {
        churnRisk: 15,
        expansionProbability: 72,
        nextBestAction: 'Schedule QBR',
      },
    };

    it('should track customer lifecycle stage', () => {
      const stages = ['lead', 'prospect', 'customer', 'expanding', 'churning'];
      expect(stages).toContain(mockCustomer.lifecycle.stage);
    });

    it('should track LTV', () => {
      expect(mockCustomer.lifecycle.ltv).toBeGreaterThan(0);
    });

    it('should track churn risk', () => {
      expect(mockCustomer.intelligence.churnRisk).toBeGreaterThanOrEqual(0);
      expect(mockCustomer.intelligence.churnRisk).toBeLessThanOrEqual(100);
    });

    it('should track expansion probability', () => {
      expect(mockCustomer.intelligence.expansionProbability).toBeGreaterThan(0);
      expect(mockCustomer.intelligence.expansionProbability).toBeLessThanOrEqual(100);
    });

    it('should track ARR and MRR', () => {
      expect(mockCustomer.financials.arr).toBeGreaterThan(0);
      expect(mockCustomer.financials.mrr).toBeGreaterThan(0);
      expect(mockCustomer.financials.arr).toBe(mockCustomer.financials.mrr * 12);
    });

    it('should track payment status', () => {
      const statuses = ['current', 'late', 'overdue'];
      expect(statuses).toContain(mockCustomer.financials.paymentStatus);
    });
  });

  describe('Account Twin', () => {
    const mockAccount = {
      accountId: 'ACCT001',
      company: {
        name: 'Tech Solutions Ltd',
        industry: 'Technology',
        size: 'mid-market',
        revenue: '$10M-$50M',
        employees: 150,
      },
      financials: {
        arr: 250000,
        potential: 500000,
        shareOfWallet: 50,
        competitors: ['CompetitorA', 'CompetitorB'],
      },
      health: {
        score: 78,
        trend: 'improving',
        risks: [],
      },
    };

    it('should track company size', () => {
      const sizes = ['startup', 'smb', 'mid-market', 'enterprise'];
      expect(sizes).toContain(mockAccount.company.size);
    });

    it('should track industry', () => {
      expect(mockAccount.company.industry).toBeTruthy();
    });

    it('should track health score', () => {
      expect(mockAccount.health.score).toBeGreaterThan(0);
      expect(mockAccount.health.score).toBeLessThanOrEqual(100);
    });

    it('should track ARR vs potential', () => {
      expect(mockAccount.financials.arr).toBeLessThanOrEqual(mockAccount.financials.potential);
    });

    it('should track share of wallet', () => {
      expect(mockAccount.financials.shareOfWallet).toBeGreaterThan(0);
      expect(mockAccount.financials.shareOfWallet).toBeLessThanOrEqual(100);
    });
  });

  describe('Opportunity Twin', () => {
    const mockOpportunity = {
      opportunityId: 'OPP001',
      accountId: 'ACCT001',
      accountName: 'Tech Solutions',
      deal: {
        name: 'Enterprise License Deal',
        value: 500000,
        stage: 'demo',
        probability: 60,
        closeDate: '2026-03-31',
        owner: 'SalesRep001',
      },
      intelligence: {
        health: 75,
        momentum: 'gaining',
        riskFactors: [],
        aiRecommendations: ['Schedule exec check-in'],
      },
    };

    it('should track deal stages', () => {
      const stages = ['discovery', 'demo', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
      expect(stages).toContain(mockOpportunity.deal.stage);
    });

    it('should track probability', () => {
      expect(mockOpportunity.deal.probability).toBeGreaterThan(0);
      expect(mockOpportunity.deal.probability).toBeLessThanOrEqual(100);
    });

    it('should track deal value', () => {
      expect(mockOpportunity.deal.value).toBeGreaterThan(0);
    });

    it('should track momentum', () => {
      const momentumOptions = ['gaining', 'stable', 'losing'];
      expect(momentumOptions).toContain(mockOpportunity.intelligence.momentum);
    });

    it('should track close date', () => {
      expect(mockOpportunity.deal.closeDate).toBeTruthy();
    });
  });

  describe('Revenue Twin', () => {
    const mockRevenue = {
      metrics: {
        arr: 10000000,
        mrr: 833333,
        newArr: 500000,
        expansionArr: 200000,
        churnArr: 100000,
        netNewArr: 600000,
        grr: 92,
        nrr: 108,
      },
      growth: {
        monthly: 8,
        quarterly: 25,
        annually: 120,
        target: 15000000,
        attainment: 67,
      },
      pipeline: {
        qualified: 5000000,
        proposals: 2000000,
        negotiations: 1000000,
        weighted: 2800000,
        coverage: 3.5,
      },
    };

    it('should track ARR and MRR relationship', () => {
      expect(mockRevenue.metrics.arr).toBe(mockRevenue.metrics.mrr * 12);
    });

    it('should track net new ARR calculation', () => {
      const calculated = mockRevenue.metrics.newArr + mockRevenue.metrics.expansionArr - mockRevenue.metrics.churnArr;
      expect(mockRevenue.metrics.netNewArr).toBe(calculated);
    });

    it('should track GRR and NRR', () => {
      expect(mockRevenue.metrics.grr).toBeGreaterThan(0);
      expect(mockRevenue.metrics.nrr).toBeGreaterThan(0);
    });

    it('should track growth targets', () => {
      expect(mockRevenue.growth.target).toBeGreaterThan(0);
      expect(mockRevenue.growth.attainment).toBeGreaterThan(0);
    });

    it('should track pipeline coverage', () => {
      expect(mockRevenue.pipeline.coverage).toBeGreaterThan(0);
    });
  });

  describe('Territory Twin', () => {
    const mockTerritory = {
      territoryId: 'TERR001',
      name: 'South India',
      geography: {
        region: 'South',
        country: 'India',
        states: ['Karnataka', 'Tamil Nadu', 'Telangana'],
      },
      quota: {
        target: 5000000,
        achieved: 3250000,
        attainment: 65,
        period: 'Q2 2026',
      },
      team: {
        reps: 8,
        managers: 2,
        openRoles: 3,
      },
      performance: {
        pipeline: 8000000,
        winRate: 28,
        avgDealSize: 450000,
        salesCycle: 45,
      },
    };

    it('should track quota attainment', () => {
      const calculated = (mockTerritory.quota.achieved / mockTerritory.quota.target) * 100;
      expect(mockTerritory.quota.attainment).toBeCloseTo(calculated, 0);
    });

    it('should track team size', () => {
      expect(mockTerritory.team.reps).toBeGreaterThan(0);
    });

    it('should track performance metrics', () => {
      expect(mockTerritory.performance.winRate).toBeGreaterThan(0);
      expect(mockTerritory.performance.winRate).toBeLessThan(100);
      expect(mockTerritory.performance.salesCycle).toBeGreaterThan(0);
    });
  });

  describe('Salesperson Twin', () => {
    const mockSalesperson = {
      repId: 'REP001',
      info: {
        name: 'Rahul Sharma',
        territory: 'South India',
      },
      quota: {
        target: 1200000,
        achieved: 780000,
        attainment: 65,
        quotaRemaining: 420000,
        daysRemaining: 45,
      },
      performance: {
        pipeline: 2500000,
        deals: 12,
        winRate: 32,
        avgDealSize: 65000,
        calls: 150,
        emails: 300,
        meetings: 45,
      },
    };

    it('should track quota attainment', () => {
      const calculated = (mockSalesperson.quota.achieved / mockSalesperson.quota.target) * 100;
      expect(mockSalesperson.quota.attainment).toBeCloseTo(calculated, 0);
    });

    it('should track activity metrics', () => {
      expect(mockSalesperson.performance.calls).toBeGreaterThan(0);
      expect(mockSalesperson.performance.emails).toBeGreaterThan(0);
      expect(mockSalesperson.performance.meetings).toBeGreaterThan(0);
    });

    it('should track win rate', () => {
      expect(mockSalesperson.performance.winRate).toBeGreaterThan(0);
      expect(mockSalesperson.performance.winRate).toBeLessThan(100);
    });
  });
});

describe('Sales Pipeline Calculations', () => {
  it('should calculate weighted pipeline correctly', () => {
    const opportunities = [
      { value: 100000, probability: 30 },
      { value: 200000, probability: 60 },
      { value: 500000, probability: 80 },
    ];

    const weighted = opportunities.reduce(
      (sum, opp) => sum + (opp.value * opp.probability / 100),
      0
    );

    expect(weighted).toBe(590000); // 30k + 120k + 400k
  });

  it('should calculate LTV correctly', () => {
    const customer = {
      monthlyRevenue: 10000,
      churnRate: 0.05, // 5%
      margin: 0.3,
    };

    const ltv = (customer.monthlyRevenue * customer.margin) / customer.churnRate;
    expect(ltv).toBe(60000); // 300 * 20
  });

  it('should calculate quota attainment correctly', () => {
    const quota = { target: 1000000, achieved: 750000 };
    const attainment = (quota.achieved / quota.target) * 100;
    expect(attainment).toBe(75);
  });
});

describe('Sales Health Scoring', () => {
  it('should calculate composite health score', () => {
    const factors = {
      engagement: 85,
      paymentHistory: 95,
      productAdoption: 70,
      supportTickets: 80,
    };

    // Weighted average
    const health = (
      factors.engagement * 0.3 +
      factors.paymentHistory * 0.3 +
      factors.productAdoption * 0.25 +
      factors.supportTickets * 0.15
    );

    expect(health).toBe(83.25);
  });
});
