// ============================================================================
// SUTAR Exploration Engine - Competitor Discovery Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import type { Competitor, CompetitorQuery, CompetitorOffering, Activity } from '../types/index.js';

export class CompetitorService {
  private competitors: Competitor[] = [];

  constructor() {
    this.initializeSampleData();
  }

  /**
   * Initialize sample competitors
   */
  private initializeSampleData(): void {
    const sampleCompetitors: Competitor[] = [
      {
        id: uuidv4(),
        name: 'TechFlow Solutions',
        description: 'Enterprise workflow automation platform with AI capabilities.',
        website: 'https://techflow.example.com',
        marketShare: 18.5,
        strength: ['Strong enterprise presence', 'Advanced AI features', 'Excellent integrations'],
        weaknesses: ['Complex pricing', 'Steep learning curve', 'Limited SMB focus'],
        offerings: [
          {
            name: 'TechFlow Pro',
            category: 'Workflow Automation',
            price: 299,
            features: ['AI automation', 'Custom workflows', 'API access', 'Analytics'],
            rating: 4.5,
          },
          {
            name: 'TechFlow Teams',
            category: 'Collaboration',
            price: 149,
            features: ['Team workspaces', 'Shared dashboards', 'Real-time collaboration'],
            rating: 4.2,
          },
        ],
        pricing: 'Tiered per user/month',
        targetSegments: ['Enterprise', 'Mid-market', 'SaaS companies'],
        recentActivity: [
          {
            type: 'product_launch',
            description: 'Launched AI-powered workflow suggestions',
            date: '2026-05-15',
            impact: 'high',
          },
          {
            type: 'funding',
            description: 'Raised $50M Series C',
            date: '2026-04-20',
            impact: 'high',
          },
        ],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'AutomateIQ',
        description: 'No-code automation platform targeting small businesses.',
        website: 'https://automateiq.example.com',
        marketShare: 12.3,
        strength: ['Easy to use', 'Affordable pricing', 'Quick setup'],
        weaknesses: ['Limited customization', 'Basic AI features', 'Small team size'],
        offerings: [
          {
            name: 'AutomateIQ Starter',
            category: 'Automation',
            price: 49,
            features: ['Basic automations', 'Templates', 'Email support'],
            rating: 4.0,
          },
          {
            name: 'AutomateIQ Pro',
            category: 'Automation',
            price: 129,
            features: ['Advanced automations', 'Custom logic', 'Priority support'],
            rating: 4.3,
          },
        ],
        pricing: 'Per workspace/month',
        targetSegments: ['Small business', 'Solopreneurs', 'Startups'],
        recentActivity: [
          {
            type: 'partnership',
            description: 'Partnered with Zapier for extended integrations',
            date: '2026-05-01',
            impact: 'medium',
          },
        ],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'DataStream Corp',
        description: 'Data pipeline and analytics platform for data-driven organizations.',
        website: 'https://datastream.example.com',
        marketShare: 22.1,
        strength: ['Robust data infrastructure', 'Real-time processing', 'Strong partnerships'],
        weaknesses: ['Complex setup', 'Expensive', 'Steep learning curve'],
        offerings: [
          {
            name: 'DataStream Enterprise',
            category: 'Data Platform',
            price: 999,
            features: ['Real-time analytics', 'Data warehousing', 'ML integration'],
            rating: 4.6,
          },
        ],
        pricing: 'Per data volume/month',
        targetSegments: ['Enterprise', 'Data teams', 'Analytics departments'],
        recentActivity: [
          {
            type: 'expansion',
            description: 'Expanded to APAC region',
            date: '2026-03-15',
            impact: 'high',
          },
          {
            type: 'product_launch',
            description: 'Launched DataStream AI assistant',
            date: '2026-02-20',
            impact: 'medium',
          },
        ],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'NexGen Platform',
        description: 'All-in-one business management suite for growing companies.',
        website: 'https://nexgen.example.com',
        marketShare: 15.8,
        strength: ['Comprehensive features', 'Good UX', 'Mobile app'],
        weaknesses: ['May be overkill for small teams', 'Integration limitations', 'Performance issues'],
        offerings: [
          {
            name: 'NexGen Essentials',
            category: 'Business Suite',
            price: 79,
            features: ['Project management', 'CRM', 'Invoicing'],
            rating: 4.1,
          },
          {
            name: 'NexGen Premium',
            category: 'Business Suite',
            price: 199,
            features: ['All Essentials features', 'Advanced analytics', 'Custom workflows'],
            rating: 4.4,
          },
        ],
        pricing: 'Per user/month',
        targetSegments: ['Small business', 'Agencies', 'Consultants'],
        recentActivity: [
          {
            type: 'pricing_change',
            description: 'Reduced pricing by 20% for annual subscriptions',
            date: '2026-04-10',
            impact: 'medium',
          },
        ],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'CloudNative Inc',
        description: 'Cloud-native development platform with DevOps tools.',
        website: 'https://cloudnative.example.com',
        marketShare: 9.7,
        strength: ['Modern architecture', 'Kubernetes support', 'Developer focus'],
        weaknesses: ['Requires technical expertise', 'Limited enterprise features', 'Newer to market'],
        offerings: [
          {
            name: 'CloudNative Platform',
            category: 'DevOps',
            price: 249,
            features: ['CI/CD pipelines', 'Container orchestration', 'Monitoring'],
            rating: 4.3,
          },
        ],
        pricing: 'Per environment/month',
        targetSegments: ['Developers', 'Startups', 'Tech companies'],
        recentActivity: [
          {
            type: 'product_launch',
            description: 'Launched managed Kubernetes service',
            date: '2026-05-20',
            impact: 'high',
          },
          {
            type: 'funding',
            description: 'Raised $30M Series B',
            date: '2026-03-01',
            impact: 'medium',
          },
        ],
        metadata: {},
      },
    ];

    this.competitors = sampleCompetitors;
  }

  /**
   * List competitors with optional filters
   */
  list(query: CompetitorQuery): { competitors: Competitor[]; total: number } {
    let filtered = [...this.competitors];

    // Apply filters
    if (query.industry) {
      const industryLower = query.industry.toLowerCase();
      filtered = filtered.filter(c =>
        c.description.toLowerCase().includes(industryLower) ||
        c.offerings.some(o => o.category.toLowerCase().includes(industryLower))
      );
    }

    if (query.region) {
      filtered = filtered.filter(c =>
        c.recentActivity.some(a => a.description.toLowerCase().includes(query.region!.toLowerCase()))
      );
    }

    // Sort by market share (highest first)
    filtered.sort((a, b) => (b.marketShare || 0) - (a.marketShare || 0));

    const total = filtered.length;

    // Apply limit
    const limit = query.limit || 10;
    filtered = filtered.slice(0, limit);

    return { competitors: filtered, total };
  }

  /**
   * Get competitor by ID
   */
  get(id: string): Competitor | undefined {
    return this.competitors.find(c => c.id === id);
  }

  /**
   * Get competitor by name
   */
  getByName(name: string): Competitor | undefined {
    return this.competitors.find(c =>
      c.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * Create a new competitor entry
   */
  create(competitor: Omit<Competitor, 'id'>): Competitor {
    const newCompetitor: Competitor = {
      ...competitor,
      id: uuidv4(),
    };

    this.competitors.unshift(newCompetitor);
    return newCompetitor;
  }

  /**
   * Update competitor data
   */
  update(id: string, updates: Partial<Competitor>): Competitor | undefined {
    const index = this.competitors.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    this.competitors[index] = {
      ...this.competitors[index],
      ...updates,
      id,
    };

    return this.competitors[index];
  }

  /**
   * Add activity to competitor
   */
  addActivity(competitorId: string, activity: Omit<Activity, 'date'>): Activity | undefined {
    const competitor = this.get(competitorId);
    if (!competitor) return undefined;

    const newActivity: Activity = {
      ...activity,
      date: new Date().toISOString().split('T')[0],
    };

    competitor.recentActivity.unshift(newActivity);
    return newActivity;
  }

  /**
   * Get market overview
   */
  getMarketOverview(): {
    totalCompetitors: number;
    avgMarketShare: number;
    topCompetitors: { name: string; share: number }[];
    segmentsBreakdown: Record<string, number>;
  } {
    const topCompetitors = [...this.competitors]
      .sort((a, b) => (b.marketShare || 0) - (a.marketShare || 0))
      .slice(0, 3)
      .map(c => ({ name: c.name, share: c.marketShare || 0 }));

    const segmentsBreakdown: Record<string, number> = {};
    this.competitors.forEach(c => {
      c.targetSegments.forEach(segment => {
        segmentsBreakdown[segment] = (segmentsBreakdown[segment] || 0) + 1;
      });
    });

    return {
      totalCompetitors: this.competitors.length,
      avgMarketShare: this.competitors.reduce((sum, c) => sum + (c.marketShare || 0), 0) / this.competitors.length,
      topCompetitors,
      segmentsBreakdown,
    };
  }

  /**
   * Analyze competitive landscape
   */
  analyzeLandscape(): {
    competitionLevel: 'high' | 'medium' | 'low';
    opportunities: string[];
    threats: string[];
    gaps: string[];
  } {
    const avgShare = this.competitors.reduce((sum, c) => sum + (c.marketShare || 0), 0) / this.competitors.length;

    let competitionLevel: 'high' | 'medium' | 'low';
    if (avgShare < 10) {
      competitionLevel = 'high';
    } else if (avgShare < 20) {
      competitionLevel = 'medium';
    } else {
      competitionLevel = 'low';
    }

    const opportunities = [
      'Price optimization for cost-sensitive segments',
      'Better UX compared to complex enterprise solutions',
      'Focus on underserved SMB market',
      'Niche vertical specialization',
    ];

    const threats = [
      'Well-funded competitors with strong market presence',
      'Rapid technology changes requiring significant R&D',
      'Potential feature commoditization',
      'Talent acquisition challenges',
    ];

    const gaps = [
      'Limited offerings for solopreneurs',
      'Gap in mid-market pricing tier',
      'Underrepresented regional markets',
      'Lack of vertical-specific solutions',
    ];

    return { competitionLevel, opportunities, threats, gaps };
  }
}