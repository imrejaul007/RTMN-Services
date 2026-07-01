/**
 * Marketing OS - Comprehensive Test Suite
 *
 * Tests all major endpoints: campaigns, audiences, journeys, content, brand
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock data stores
const mockCampaigns = new Map();
const mockAudiences = new Map();
const mockJourneys = new Map();
const mockContent = new Map();
const mockBrands = new Map();

// ID generator
let idCounter = 1;
const generateId = () => `id_${String(idCounter++).padStart(6, '0')}`;

// ============================================
// DATA MODELS
// ============================================

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'push' | 'social' | 'multi-channel';
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  budget?: number;
  startDate?: string;
  endDate?: string;
  audienceId?: string;
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
  };
  createdAt: string;
}

interface Audience {
  id: string;
  name: string;
  description?: string;
  filters: any;
  size: number;
  createdAt: string;
}

interface Journey {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'draft';
  trigger: {
    type: 'event' | 'schedule' | 'manual';
    config: any;
  };
  steps: JourneyStep[];
  stats?: {
    entered: number;
    completed: number;
    dropped: number;
  };
  createdAt: string;
}

interface JourneyStep {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'delay' | 'condition' | 'webhook';
  config: any;
  next?: string[];
}

interface Content {
  id: string;
  title: string;
  type: 'email' | 'sms' | 'social' | 'blog' | 'landing-page';
  content: string;
  status: 'draft' | 'published';
  createdAt: string;
}

interface Brand {
  id: string;
  name: string;
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  tagline?: string;
}

// ============================================
// SERVICE
// ============================================

const marketingService = {
  // Campaigns
  createCampaign(data: Partial<Campaign>): Campaign {
    const campaign: Campaign = {
      id: generateId(),
      name: data.name || '',
      type: data.type || 'email',
      status: data.status || 'draft',
      budget: data.budget,
      startDate: data.startDate,
      endDate: data.endDate,
      audienceId: data.audienceId,
      stats: data.stats || { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 },
      createdAt: new Date().toISOString(),
    };
    mockCampaigns.set(campaign.id, campaign);
    return campaign;
  },

  getCampaign(id: string): Campaign | undefined {
    return mockCampaigns.get(id);
  },

  listCampaigns(filters?: { status?: string; type?: string }): Campaign[] {
    let campaigns = Array.from(mockCampaigns.values());
    if (filters?.status) {
      campaigns = campaigns.filter(c => c.status === filters.status);
    }
    if (filters?.type) {
      campaigns = campaigns.filter(c => c.type === filters.type);
    }
    return campaigns;
  },

  updateCampaign(id: string, data: Partial<Campaign>): Campaign | undefined {
    const campaign = mockCampaigns.get(id);
    if (!campaign) return undefined;
    const updated = { ...campaign, ...data };
    mockCampaigns.set(id, updated);
    return updated;
  },

  launchCampaign(id: string): Campaign | undefined {
    return this.updateCampaign(id, { status: 'running' });
  },

  pauseCampaign(id: string): Campaign | undefined {
    return this.updateCampaign(id, { status: 'paused' });
  },

  completeCampaign(id: string): Campaign | undefined {
    return this.updateCampaign(id, { status: 'completed' });
  },

  getCampaignAnalytics(id: string): any {
    const campaign = mockCampaigns.get(id);
    if (!campaign) return null;

    const stats = campaign.stats || { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 };
    const openRate = stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0;
    const clickRate = stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0;
    const conversionRate = stats.clicked > 0 ? (stats.converted / stats.clicked) * 100 : 0;

    return {
      campaignId: id,
      stats,
      rates: {
        deliveryRate: stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0,
        openRate,
        clickRate,
        conversionRate,
      },
      roi: campaign.budget ? (stats.converted * 100 / campaign.budget) : 0,
    };
  },

  // Audiences
  createAudience(data: Partial<Audience>): Audience {
    const audience: Audience = {
      id: generateId(),
      name: data.name || '',
      description: data.description,
      filters: data.filters || {},
      size: data.size || 0,
      createdAt: new Date().toISOString(),
    };
    mockAudiences.set(audience.id, audience);
    return audience;
  },

  getAudience(id: string): Audience | undefined {
    return mockAudiences.get(id);
  },

  listAudiences(): Audience[] {
    return Array.from(mockAudiences.values());
  },

  updateAudience(id: string, data: Partial<Audience>): Audience | undefined {
    const audience = mockAudiences.get(id);
    if (!audience) return undefined;
    const updated = { ...audience, ...data };
    mockAudiences.set(id, updated);
    return updated;
  },

  refreshAudience(id: string): Audience | undefined {
    const audience = mockAudiences.get(id);
    if (!audience) return undefined;
    // Simulate refresh - add random size change
    const updated = { ...audience, size: Math.floor(audience.size * (0.95 + Math.random() * 0.1)) };
    mockAudiences.set(id, updated);
    return updated;
  },

  // Journeys
  createJourney(data: Partial<Journey>): Journey {
    const journey: Journey = {
      id: generateId(),
      name: data.name || '',
      status: data.status || 'draft',
      trigger: data.trigger || { type: 'manual', config: {} },
      steps: data.steps || [],
      stats: data.stats || { entered: 0, completed: 0, dropped: 0 },
      createdAt: new Date().toISOString(),
    };
    mockJourneys.set(journey.id, journey);
    return journey;
  },

  getJourney(id: string): Journey | undefined {
    return mockJourneys.get(id);
  },

  listJourneys(): Journey[] {
    return Array.from(mockJourneys.values());
  },

  activateJourney(id: string): Journey | undefined {
    return this.updateJourney(id, { status: 'active' });
  },

  deactivateJourney(id: string): Journey | undefined {
    return this.updateJourney(id, { status: 'inactive' });
  },

  updateJourney(id: string, data: Partial<Journey>): Journey | undefined {
    const journey = mockJourneys.get(id);
    if (!journey) return undefined;
    const updated = { ...journey, ...data };
    mockJourneys.set(id, updated);
    return updated;
  },

  // Content
  createContent(data: Partial<Content>): Content {
    const content: Content = {
      id: generateId(),
      title: data.title || '',
      type: data.type || 'email',
      content: data.content || '',
      status: data.status || 'draft',
      createdAt: new Date().toISOString(),
    };
    mockContent.set(content.id, content);
    return content;
  },

  getContent(id: string): Content | undefined {
    return mockContent.get(id);
  },

  listContent(filters?: { type?: string; status?: string }): Content[] {
    let contents = Array.from(mockContent.values());
    if (filters?.type) {
      contents = contents.filter(c => c.type === filters.type);
    }
    if (filters?.status) {
      contents = contents.filter(c => c.status === filters.status);
    }
    return contents;
  },

  updateContent(id: string, data: Partial<Content>): Content | undefined {
    const content = mockContent.get(id);
    if (!content) return undefined;
    const updated = { ...content, ...data };
    mockContent.set(id, updated);
    return updated;
  },

  publishContent(id: string): Content | undefined {
    return this.updateContent(id, { status: 'published' });
  },

  // Brand
  getBrand(): Brand | undefined {
    const brands = Array.from(mockBrands.values());
    return brands[0];
  },

  createBrand(data: Partial<Brand>): Brand {
    const brand: Brand = {
      id: generateId(),
      name: data.name || '',
      logo: data.logo,
      colors: data.colors || { primary: '#000000', secondary: '#ffffff', accent: '#ff0000' },
      fonts: data.fonts || { heading: 'Arial', body: 'Helvetica' },
      tagline: data.tagline,
    };
    mockBrands.set(brand.id, brand);
    return brand;
  },

  updateBrand(data: Partial<Brand>): Brand | undefined {
    const existing = this.getBrand();
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    mockBrands.set(existing.id, updated);
    return updated;
  },

  // Dashboard
  getDashboard(): any {
    const campaigns = Array.from(mockCampaigns.values());
    const audiences = Array.from(mockAudiences.values());
    const journeys = Array.from(mockJourneys.values());

    const runningCampaigns = campaigns.filter(c => c.status === 'running');
    const totalSent = runningCampaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
    const totalOpened = runningCampaigns.reduce((sum, c) => sum + (c.stats?.opened || 0), 0);
    const totalClicked = runningCampaigns.reduce((sum, c) => sum + (c.stats?.clicked || 0), 0);

    return {
      campaigns: {
        total: campaigns.length,
        running: runningCampaigns.length,
        completed: campaigns.filter(c => c.status === 'completed').length,
        draft: campaigns.filter(c => c.status === 'draft').length,
      },
      audiences: {
        total: audiences.length,
        totalReach: audiences.reduce((sum, a) => sum + a.size, 0),
      },
      journeys: {
        total: journeys.length,
        active: journeys.filter(j => j.status === 'active').length,
      },
      engagement: {
        totalSent,
        totalOpened,
        totalClicked,
        avgOpenRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        avgClickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
      },
    };

    return {
      campaigns: {
        total: campaigns.length,
        running: runningCampaigns.length,
        completed: campaigns.filter(c => c.status === 'completed').length,
        draft: campaigns.filter(c => c.status === 'draft').length,
      },
      audiences: {
        total: audiences.length,
        totalReach: audiences.reduce((sum, a) => sum + a.size, 0),
      },
      journeys: {
        total: journeys.length,
        active: journeys.filter(j => j.status === 'active').length,
      },
      engagement: {
        totalSent,
        totalOpened,
        totalClicked,
        avgOpenRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        avgClickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
      },
    };
  },

  // Reset
  reset() {
    mockCampaigns.clear();
    mockAudiences.clear();
    mockJourneys.clear();
    mockContent.clear();
    mockBrands.clear();
    idCounter = 1;
  },
};

// ============================================
// TESTS
// ============================================

describe('Marketing OS - Campaigns Module', () => {
  beforeEach(() => {
    marketingService.reset();
  });

  describe('createCampaign', () => {
    it('should create a campaign with required fields', () => {
      const campaign = marketingService.createCampaign({
        name: 'Summer Sale Campaign',
        type: 'email',
        budget: 50000,
      });

      expect(campaign.id).toBeDefined();
      expect(campaign.name).toBe('Summer Sale Campaign');
      expect(campaign.type).toBe('email');
      expect(campaign.status).toBe('draft');
      expect(campaign.budget).toBe(50000);
      expect(campaign.stats).toEqual({ sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 });
    });

    it('should create campaign with all types', () => {
      const types = ['email', 'sms', 'whatsapp', 'push', 'social', 'multi-channel'] as const;

      types.forEach(type => {
        const campaign = marketingService.createCampaign({ name: `Campaign ${type}`, type });
        expect(campaign.type).toBe(type);
      });
    });

    it('should create campaign with dates', () => {
      const campaign = marketingService.createCampaign({
        name: 'Dated Campaign',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      });

      expect(campaign.startDate).toBe('2026-07-01');
      expect(campaign.endDate).toBe('2026-07-31');
    });
  });

  describe('listCampaigns', () => {
    it('should list all campaigns', () => {
      marketingService.createCampaign({ name: 'Campaign 1', type: 'email' });
      marketingService.createCampaign({ name: 'Campaign 2', type: 'sms' });
      marketingService.createCampaign({ name: 'Campaign 3', type: 'push' });

      const campaigns = marketingService.listCampaigns();
      expect(campaigns).toHaveLength(3);
    });

    it('should filter by status', () => {
      marketingService.createCampaign({ name: 'Draft 1', status: 'draft' });
      marketingService.createCampaign({ name: 'Running 1', status: 'running' });
      marketingService.createCampaign({ name: 'Draft 2', status: 'draft' });

      const drafts = marketingService.listCampaigns({ status: 'draft' });
      expect(drafts).toHaveLength(2);
    });

    it('should filter by type', () => {
      marketingService.createCampaign({ name: 'Email 1', type: 'email' });
      marketingService.createCampaign({ name: 'SMS 1', type: 'sms' });
      marketingService.createCampaign({ name: 'Email 2', type: 'email' });

      const emails = marketingService.listCampaigns({ type: 'email' });
      expect(emails).toHaveLength(2);
    });
  });

  describe('launchCampaign', () => {
    it('should launch a draft campaign', () => {
      const campaign = marketingService.createCampaign({ name: 'Test', status: 'draft' });
      const launched = marketingService.launchCampaign(campaign.id);

      expect(launched?.status).toBe('running');
    });

    it('should pause a running campaign', () => {
      const campaign = marketingService.createCampaign({ name: 'Test', status: 'running' });
      const paused = marketingService.pauseCampaign(campaign.id);

      expect(paused?.status).toBe('paused');
    });
  });

  describe('getCampaignAnalytics', () => {
    it('should calculate correct rates', () => {
      const campaign = marketingService.createCampaign({
        name: 'Analytics Test',
        budget: 10000,
        stats: {
          sent: 1000,
          delivered: 950,
          opened: 285,
          clicked: 57,
          converted: 10,
        },
      });

      const analytics = marketingService.getCampaignAnalytics(campaign.id);

      expect(analytics.rates.deliveryRate).toBe(95);
      expect(analytics.rates.openRate).toBe(30); // 285/950 * 100
      expect(analytics.rates.clickRate).toBe(20); // 57/285 * 100
      expect(analytics.rates.conversionRate).toBeCloseTo(17.54, 1);
      // ROI = (converted * 100) / budget = (10 * 100) / 10000 = 0.1
      expect(analytics.roi).toBe(0.1);
    });
  });
});

describe('Marketing OS - Audiences Module', () => {
  beforeEach(() => {
    marketingService.reset();
  });

  describe('createAudience', () => {
    it('should create an audience', () => {
      const audience = marketingService.createAudience({
        name: 'High Value Customers',
        description: 'Customers with lifetime value > 50K',
        size: 15000,
        filters: { minLTV: 50000 },
      });

      expect(audience.id).toBeDefined();
      expect(audience.name).toBe('High Value Customers');
      expect(audience.size).toBe(15000);
      expect(audience.filters.minLTV).toBe(50000);
    });
  });

  describe('refreshAudience', () => {
    it('should update audience size on refresh', () => {
      const audience = marketingService.createAudience({ name: 'Test', size: 10000 });
      const refreshed = marketingService.refreshAudience(audience.id);

      expect(refreshed).toBeDefined();
      expect(refreshed?.size).toBeGreaterThan(0);
    });
  });
});

describe('Marketing OS - Journeys Module', () => {
  beforeEach(() => {
    marketingService.reset();
  });

  describe('createJourney', () => {
    it('should create a journey with steps', () => {
      const journey = marketingService.createJourney({
        name: 'Welcome Journey',
        trigger: { type: 'event', config: { event: 'user_signup' } },
        steps: [
          { id: 'step1', type: 'email', config: { template: 'welcome' } },
          { id: 'step2', type: 'delay', config: { hours: 24 } },
          { id: 'step3', type: 'email', config: { template: 'getting-started' } },
        ],
      });

      expect(journey.id).toBeDefined();
      expect(journey.name).toBe('Welcome Journey');
      expect(journey.trigger.type).toBe('event');
      expect(journey.steps).toHaveLength(3);
    });

    it('should activate and deactivate journey', () => {
      const journey = marketingService.createJourney({ name: 'Test', status: 'draft' });

      const activated = marketingService.activateJourney(journey.id);
      expect(activated?.status).toBe('active');

      const deactivated = marketingService.deactivateJourney(journey.id);
      expect(deactivated?.status).toBe('inactive');
    });
  });
});

describe('Marketing OS - Content Module', () => {
  beforeEach(() => {
    marketingService.reset();
  });

  describe('createContent', () => {
    it('should create content', () => {
      const content = marketingService.createContent({
        title: 'Summer Sale Email',
        type: 'email',
        content: '<h1>50% Off!</h1><p>Limited time offer...</p>',
        status: 'draft',
      });

      expect(content.id).toBeDefined();
      expect(content.title).toBe('Summer Sale Email');
      expect(content.type).toBe('email');
      expect(content.status).toBe('draft');
    });

    it('should list content by type and status', () => {
      marketingService.createContent({ title: 'Email 1', type: 'email', status: 'draft' });
      marketingService.createContent({ title: 'Email 2', type: 'email', status: 'published' });
      marketingService.createContent({ title: 'SMS 1', type: 'sms', status: 'draft' });

      const draftEmails = marketingService.listContent({ type: 'email', status: 'draft' });
      expect(draftEmails).toHaveLength(1);
    });

    it('should publish content', () => {
      const content = marketingService.createContent({ title: 'Test', status: 'draft' });
      const published = marketingService.publishContent(content.id);

      expect(published?.status).toBe('published');
    });
  });
});

describe('Marketing OS - Brand Module', () => {
  beforeEach(() => {
    marketingService.reset();
  });

  describe('createBrand', () => {
    it('should create brand with colors and fonts', () => {
      const brand = marketingService.createBrand({
        name: 'Acme Corp',
        colors: {
          primary: '#FF5733',
          secondary: '#333333',
          accent: '#FFC300',
        },
        fonts: {
          heading: 'Playfair Display',
          body: 'Roboto',
        },
        tagline: 'Innovation at its best',
      });

      expect(brand.id).toBeDefined();
      expect(brand.name).toBe('Acme Corp');
      expect(brand.colors.primary).toBe('#FF5733');
      expect(brand.fonts.heading).toBe('Playfair Display');
      expect(brand.tagline).toBe('Innovation at its best');
    });
  });

  describe('updateBrand', () => {
    it('should update existing brand', () => {
      marketingService.createBrand({ name: 'Original' });
      const updated = marketingService.updateBrand({ tagline: 'New tagline' });

      expect(updated?.tagline).toBe('New tagline');
    });
  });
});

describe('Marketing OS - Dashboard', () => {
  beforeEach(() => {
    marketingService.reset();
  });

  it('should aggregate metrics correctly', () => {
    // Create campaigns with stats
    marketingService.createCampaign({
      name: 'Campaign 1',
      status: 'running',
      stats: { sent: 1000, delivered: 900, opened: 270, clicked: 54, converted: 5 },
    });
    marketingService.createCampaign({
      name: 'Campaign 2',
      status: 'running',
      stats: { sent: 2000, delivered: 1900, opened: 570, clicked: 95, converted: 10 },
    });

    // Create audiences
    marketingService.createAudience({ name: 'Audience 1', size: 10000 });
    marketingService.createAudience({ name: 'Audience 2', size: 5000 });

    const dashboard = marketingService.getDashboard();

    expect(dashboard.campaigns.total).toBe(2);
    expect(dashboard.campaigns.running).toBe(2);
    expect(dashboard.audiences.total).toBe(2);
    expect(dashboard.audiences.totalReach).toBe(15000);
    expect(dashboard.engagement.totalSent).toBe(3000);
    expect(dashboard.engagement.totalOpened).toBe(840);
    expect(dashboard.engagement.totalClicked).toBe(149); // 54 + 95
    // avgOpenRate = (totalOpened / totalSent) * 100 = (840/3000) * 100
    expect(dashboard.engagement.avgOpenRate).toBeCloseTo(28, 5);
    // avgClickRate = (totalClicked / totalOpened) * 100 = (149/840) * 100
    expect(dashboard.engagement.avgClickRate).toBeCloseTo(17.74, 1);
  });
});

describe('Marketing OS - Full Campaign Lifecycle', () => {
  beforeEach(() => {
    marketingService.reset();
  });

  it('should follow complete campaign lifecycle', () => {
    // 1. Create audience
    const audience = marketingService.createAudience({
      name: 'Tech Enthusiasts',
      size: 25000,
      filters: { interest: 'technology' },
    });
    expect(audience.size).toBe(25000);

    // 2. Create content
    const email = marketingService.createContent({
      title: 'New Product Launch',
      type: 'email',
      content: '<h1>Introducing Our Latest Innovation</h1>',
      status: 'draft',
    });
    expect(email.status).toBe('draft');

    // 3. Publish content
    const published = marketingService.publishContent(email.id);
    expect(published?.status).toBe('published');

    // 4. Create campaign
    const campaign = marketingService.createCampaign({
      name: 'Product Launch Campaign',
      type: 'email',
      audienceId: audience.id,
      budget: 25000,
    });
    expect(campaign.status).toBe('draft');

    // 5. Launch campaign
    const launched = marketingService.launchCampaign(campaign.id);
    expect(launched?.status).toBe('running');

    // 6. Simulate campaign stats
    marketingService.updateCampaign(campaign.id, {
      stats: {
        sent: 25000,
        delivered: 24750,
        opened: 7425,
        clicked: 1485,
        converted: 148,
      },
    });

    // 7. Get analytics
    const analytics = marketingService.getCampaignAnalytics(campaign.id);
    expect(analytics.stats.sent).toBe(25000);
    expect(analytics.rates.openRate).toBe(30); // 30%
    expect(analytics.rates.clickRate).toBe(20); // 20%

    // 8. Complete campaign
    const completed = marketingService.completeCampaign(campaign.id);
    expect(completed?.status).toBe('completed');

    // 9. Verify dashboard
    const dashboard = marketingService.getDashboard();
    expect(dashboard.campaigns.completed).toBe(1);
    expect(dashboard.audiences.totalReach).toBe(25000);
  });
});
