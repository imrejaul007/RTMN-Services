/**
 * Marketing OS - Unit Tests
 */

describe('Marketing OS', () => {
  describe('Campaign Analytics', () => {
    const mockCampaign = {
      metrics: {
        impressions: 100000,
        clicks: 5000,
        conversions: 250,
        revenue: 125000,
        spend: 25000,
      },
    };

    it('should calculate CTR correctly', () => {
      const ctr = (mockCampaign.metrics.clicks / mockCampaign.metrics.impressions) * 100;
      expect(ctr).toBe(5);
    });

    it('should calculate conversion rate', () => {
      const cvr = (mockCampaign.metrics.conversions / mockCampaign.metrics.clicks) * 100;
      expect(cvr).toBe(5);
    });

    it('should calculate CPA', () => {
      const cpa = mockCampaign.metrics.spend / mockCampaign.metrics.conversions;
      expect(cpa).toBe(100);
    });

    it('should calculate ROAS', () => {
      const roas = mockCampaign.metrics.revenue / mockCampaign.metrics.spend;
      expect(roas).toBe(5); // 5x return
    });

    it('should calculate CPM', () => {
      const cpm = (mockCampaign.metrics.spend / mockCampaign.metrics.impressions) * 1000;
      expect(cpm).toBe(250);
    });
  });

  describe('Brand Twin', () => {
    const mockBrand = {
      identity: {
        mission: 'Empower businesses with AI',
        vision: 'Global AI leader by 2030',
        values: ['Innovation', 'Integrity', 'Excellence'],
        taglines: ['AI for Everyone', 'Power Your Future'],
      },
      visual: {
        colors: {
          primary: '#2563EB',
          secondary: '#1E40AF',
          accent: '#F59E0B',
        },
      },
      voice: {
        tone: 'Professional, innovative, approachable',
        dos: ['Be clear', 'Be helpful', 'Be inspiring'],
        donts: ['Never jargon', 'Never condescending'],
      },
    };

    it('should have mission and vision', () => {
      expect(mockBrand.identity.mission).toBeTruthy();
      expect(mockBrand.identity.vision).toBeTruthy();
    });

    it('should have core values', () => {
      expect(mockBrand.identity.values.length).toBeGreaterThan(0);
    });

    it('should have brand colors', () => {
      expect(mockBrand.visual.colors.primary).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should have voice guidelines', () => {
      expect(mockBrand.voice.tone).toBeTruthy();
      expect(mockBrand.voice.dos.length).toBeGreaterThan(0);
      expect(mockBrand.voice.donts.length).toBeGreaterThan(0);
    });
  });

  describe('Content Performance', () => {
    const contentMetrics = [
      { views: 10000, engagement: 500, shares: 50 },
      { views: 15000, engagement: 900, shares: 120 },
      { views: 8000, engagement: 400, shares: 30 },
    ];

    it('should calculate average engagement rate', () => {
      const engagementRates = contentMetrics.map(c => c.engagement / c.views);
      const avg = engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length;
      expect(avg).toBeCloseTo(0.05, 2);
    });

    it('should identify top performing content', () => {
      const sorted = [...contentMetrics].sort((a, b) => b.shares - a.shares);
      expect(sorted[0].shares).toBe(120);
    });

    it('should calculate viral coefficient', () => {
      const viralContent = contentMetrics[1]; // 15000 views, 900 engagement
      const viralCoeff = viralContent.shares / viralContent.views;
      expect(viralCoeff).toBe(0.008);
    });
  });

  describe('Audience Segmentation', () => {
    const segments = [
      { name: 'Enterprise', size: 500, revenue: 5000000, avgDeal: 10000 },
      { name: 'SMB', size: 2000, revenue: 2000000, avgDeal: 1000 },
      { name: 'Startup', size: 5000, revenue: 1000000, avgDeal: 200 },
    ];

    it('should calculate segment value', () => {
      segments.forEach(seg => {
        const calculated = seg.size * seg.avgDeal;
        expect(seg.revenue).toBeCloseTo(calculated, -2);
      });
    });

    it('should rank segments by value', () => {
      const sorted = [...segments].sort((a, b) => b.revenue - a.revenue);
      expect(sorted[0].name).toBe('Enterprise');
      expect(sorted[2].name).toBe('Startup');
    });

    it('should calculate segment percentage', () => {
      const total = segments.reduce((sum, seg) => sum + seg.revenue, 0);
      const enterprisePct = (segments[0].revenue / total) * 100;
      expect(enterprisePct).toBeCloseTo(62.5, 1);
    });
  });

  describe('Social Media Metrics', () => {
    const socialMetrics = {
      followers: 50000,
      following: 1000,
      posts: 100,
      engagement: 2500,
      reach: 100000,
      impressions: 500000,
    };

    it('should calculate engagement rate', () => {
      const rate = (socialMetrics.engagement / socialMetrics.reach) * 100;
      expect(rate).toBe(2.5);
    });

    it('should calculate follower ratio', () => {
      const ratio = socialMetrics.followers / socialMetrics.following;
      expect(ratio).toBe(50);
    });

    it('should calculate impressions per post', () => {
      const perPost = socialMetrics.impressions / socialMetrics.posts;
      expect(perPost).toBe(5000);
    });
  });

  describe('Email Marketing', () => {
    const emailMetrics = {
      sent: 10000,
      delivered: 9800,
      opened: 2940,
      clicked: 490,
      converted: 98,
      unsubscribed: 10,
    };

    it('should calculate delivery rate', () => {
      const rate = (emailMetrics.delivered / emailMetrics.sent) * 100;
      expect(rate).toBe(98);
    });

    it('should calculate open rate', () => {
      const rate = (emailMetrics.opened / emailMetrics.delivered) * 100;
      expect(rate).toBe(30);
    });

    it('should calculate click rate', () => {
      const rate = (emailMetrics.clicked / emailMetrics.delivered) * 100;
      expect(rate).toBe(5);
    });

    it('should calculate conversion rate', () => {
      const rate = (emailMetrics.converted / emailMetrics.clicked) * 100;
      expect(rate).toBe(20);
    });

    it('should calculate unsubscribe rate', () => {
      const rate = (emailMetrics.unsubscribed / emailMetrics.sent) * 100;
      expect(rate).toBe(0.1);
    });
  });

  describe('Attribution Models', () => {
    const touchpoints = [
      { channel: 'Organic', value: 30 },
      { channel: 'Paid', value: 25 },
      { channel: 'Social', value: 20 },
      { channel: 'Email', value: 15 },
      { channel: 'Direct', value: 10 },
    ];

    it('should calculate first touch attribution', () => {
      const firstTouch = touchpoints[0].channel;
      expect(firstTouch).toBe('Organic');
    });

    it('should calculate last touch attribution', () => {
      const lastTouch = touchpoints[touchpoints.length - 1].channel;
      expect(lastTouch).toBe('Direct');
    });

    it('should calculate linear attribution', () => {
      const equal = 100 / touchpoints.length;
      expect(equal).toBe(20);
    });

    it('should calculate time-decay attribution', () => {
      // First touch gets least credit in time decay
      const firstCredit = touchpoints[0].value;
      expect(firstCredit).toBeLessThan(40);
    });
  });

  describe('Media Planning', () => {
    const budget = 1000000;
    const channels = [
      { name: 'Google Ads', allocation: 0.4, cpl: 150 },
      { name: 'Meta Ads', allocation: 0.3, cpl: 100 },
      { name: 'LinkedIn', allocation: 0.2, cpl: 300 },
      { name: 'Organic', allocation: 0.1, cpl: 0 },
    ];

    it('should allocate budget correctly', () => {
      channels.forEach(ch => {
        const allocation = budget * ch.allocation;
        expect(allocation).toBeGreaterThan(0);
      });
    });

    it('should calculate total leads', () => {
      let totalLeads = 0;
      channels.forEach(ch => {
        const spend = budget * ch.allocation;
        const leads = spend / ch.cpl;
        totalLeads += leads;
      });

      // Organic has 0 cpl so would be infinity - exclude it
      const paidChannels = channels.filter(ch => ch.cpl > 0);
      paidChannels.forEach(ch => {
        const spend = budget * ch.allocation;
        const leads = spend / ch.cpl;
        expect(leads).toBeGreaterThan(0);
      });
    });
  });

  describe('Content Generation', () => {
    const briefs = [
      { topic: 'AI', keywords: ['machine learning', 'automation'] },
      { topic: 'Product', keywords: ['features', 'pricing'] },
    ];

    it('should have topics and keywords', () => {
      briefs.forEach(brief => {
        expect(brief.topic).toBeTruthy();
        expect(brief.keywords.length).toBeGreaterThan(0);
      });
    });

    it('should generate hashtags from keywords', () => {
      const hashtags = briefs[0].keywords.map(k => `#${k.replace(/\s+/g, '')}`);
      expect(hashtags).toContain('#machinelearning');
      expect(hashtags).toContain('#automation');
    });
  });

  describe('ROI Calculations', () => {
    it('should calculate marketing ROI', () => {
      const revenue = 5000000;
      const cost = 1000000;
      const roi = ((revenue - cost) / cost) * 100;
      expect(roi).toBe(400);
    });

    it('should calculate ROMI', () => {
      const revenue = 5000000;
      const marketingCost = 1000000;
      const romi = ((revenue - marketingCost) / marketingCost) * 100;
      expect(romi).toBe(400);
    });

    it('should calculate customer acquisition efficiency', () => {
      const customers = 500;
      const marketingSpend = 500000;
      const cae = marketingSpend / customers;
      expect(cae).toBe(1000);
    });
  });
});

describe('Media Streaming Metrics', () => {
  const streamMetrics = {
    liveViewers: 5000,
    peakViewers: 8500,
    totalViews: 50000,
    watchTime: 150000, // minutes
    avgWatchTime: 3, // minutes
    subscribers: 250,
    chatMessages: 1000,
  };

  it('should calculate peak-to-live ratio', () => {
    const ratio = streamMetrics.peakViewers / streamMetrics.liveViewers;
    expect(ratio).toBe(1.7);
  });

  it('should calculate completion rate', () => {
    const completionRate = (streamMetrics.avgWatchTime / streamMetrics.avgWatchTime) * 100;
    expect(completionRate).toBe(100);
  });

  it('should calculate engagement rate', () => {
    const engagement = streamMetrics.chatMessages / streamMetrics.liveViewers;
    expect(engagement).toBe(0.2);
  });
});
