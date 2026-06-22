// ============================================================================
// SUTAR Exploration Engine - Market Segment Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import type { MarketSegment, SegmentQuery } from '../types/index.js';

export class SegmentService {
  private segments: MarketSegment[] = [];

  constructor() {
    this.initializeSampleData();
  }

  /**
   * Initialize sample market segments
   */
  private initializeSampleData(): void {
    const sampleSegments: MarketSegment[] = [
      {
        id: uuidv4(),
        name: 'Tech Startups',
        description: 'Early-stage technology companies focused on rapid growth and product-market fit.',
        size: 50000,
        growth: 25,
        demographics: {
          employeeCount: '1-50',
          funding: 'Seed to Series A',
          age: '< 5 years',
          verticals: ['SaaS', 'FinTech', 'HealthTech'],
        },
        behaviors: [
          'Agile product development',
          'Data-driven decision making',
          'Rapid experimentation',
          'Remote-first culture',
        ],
        needs: [
          'Fast time-to-market',
          'Scalable infrastructure',
          'Cost-effective solutions',
          'Flexible pricing',
        ],
        painPoints: [
          'Limited budget for enterprise tools',
          'Technical debt accumulation',
          'Talent acquisition challenges',
          'Scaling infrastructure',
        ],
        willingnessToPay: { min: 500, max: 5000 },
        accessibility: 'easy',
        competition: 8,
        trends: ['No-code adoption', 'Remote work', 'AI integration'],
        opportunities: ['Starter plans', 'Startup accelerators', 'Technical support'],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'Mid-Market Enterprises',
        description: 'Established companies with 50-500 employees seeking operational efficiency.',
        size: 150000,
        growth: 12,
        demographics: {
          employeeCount: '50-500',
          revenue: '$10M-$100M',
          industries: ['Retail', 'Manufacturing', 'Services'],
        },
        behaviors: [
          'Process optimization',
          'Department-level decision making',
          'ROI-focused purchasing',
          'Longer sales cycles',
        ],
        needs: [
          'Integration with existing systems',
          'Enterprise-grade security',
          'Scalability for growth',
          'Dedicated support',
        ],
        painPoints: [
          'Legacy system modernization',
          'Siloed data and processes',
          'Change management',
          'Compliance requirements',
        ],
        willingnessToPay: { min: 5000, max: 50000 },
        accessibility: 'moderate',
        competition: 6,
        trends: ['Digital transformation', 'Cloud migration', 'Automation'],
        opportunities: ['Integration services', 'Managed services', 'Consulting'],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'Large Enterprises',
        description: 'Corporations with 500+ employees with complex organizational structures.',
        size: 50000,
        growth: 5,
        demographics: {
          employeeCount: '500+',
          revenue: '$100M+',
          industries: ['Financial Services', 'Healthcare', 'Government'],
        },
        behaviors: [
          'Committee-based decisions',
          'Long procurement cycles',
          'Vendor consolidation',
          'Customization requirements',
        ],
        needs: [
          'Enterprise security and compliance',
          'Custom integrations',
          'White-glove support',
          'SLAs and guarantees',
        ],
        painPoints: [
          'Complex approval processes',
          'Stakeholder alignment',
          'Legacy technology debt',
          'Vendor lock-in concerns',
        ],
        willingnessToPay: { min: 50000, max: 500000 },
        accessibility: 'difficult',
        competition: 4,
        trends: ['AI/ML adoption', 'Cloud-native', 'Zero trust security'],
        opportunities: ['Strategic partnerships', 'Professional services', 'Platform expansion'],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'Solopreneurs & Freelancers',
        description: 'Individual practitioners and small consultants running their own businesses.',
        size: 100000,
        growth: 35,
        demographics: {
          employeeCount: '1',
          income: '$30K-$200K',
          verticals: ['Consulting', 'Creative', 'E-commerce'],
        },
        behaviors: [
          'Self-service purchasing',
          'Mobile-first work style',
          'Multi-tasking',
          'Price-sensitive',
        ],
        needs: [
          'Affordable tools',
          'Easy to learn',
          'All-in-one solutions',
          'Mobile access',
        ],
        painPoints: [
          'Time management',
          'Client acquisition',
          'Administrative overhead',
          'Cash flow management',
        ],
        willingnessToPay: { min: 50, max: 500 },
        accessibility: 'easy',
        competition: 10,
        trends: ['Creator economy', 'Gig economy', 'Side businesses'],
        opportunities: ['Freemium models', 'Bundle deals', 'Community features'],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'E-commerce Businesses',
        description: 'Online retailers ranging from small shops to large marketplaces.',
        size: 2000000,
        growth: 18,
        demographics: {
          employeeCount: '1-200',
          revenue: '$100K-$50M',
          platforms: ['Shopify', 'WooCommerce', 'Custom'],
        },
        behaviors: [
          'Seasonal purchasing patterns',
          'Performance marketing focus',
          'Customer acquisition driven',
          'Inventory sensitive',
        ],
        needs: [
          'Payment processing',
          'Shipping and logistics',
          'Customer retention tools',
          'Analytics and reporting',
        ],
        painPoints: [
          'Customer acquisition costs',
          'Cart abandonment',
          'Returns management',
          'Competition from marketplaces',
        ],
        willingnessToPay: { min: 100, max: 10000 },
        accessibility: 'easy',
        competition: 9,
        trends: ['Social commerce', 'Subscription models', 'D2C brands'],
        opportunities: ['Integration marketplaces', 'Shipping solutions', 'Retention tools'],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'Healthcare Providers',
        description: 'Hospitals, clinics, and healthcare practices seeking digital solutions.',
        size: 800000,
        growth: 15,
        demographics: {
          employeeCount: '5-10000',
          types: ['Hospitals', 'Clinics', 'Private practices'],
          specialties: ['Primary care', 'Specialty', 'Dental'],
        },
        behaviors: [
          'Compliance-first mindset',
          'Long sales cycles',
          'Referral-based growth',
          'Outcome-focused',
        ],
        needs: [
          'HIPAA compliance',
          'EHR integration',
          'Patient engagement',
          'Telehealth capabilities',
        ],
        painPoints: [
          'Regulatory compliance',
          'Interoperability',
          'Staff training',
          'Patient data security',
        ],
        willingnessToPay: { min: 1000, max: 100000 },
        accessibility: 'moderate',
        competition: 5,
        trends: ['Telehealth', 'Value-based care', 'Patient portals'],
        opportunities: ['EHR integration', 'Compliance tools', 'Patient engagement'],
        metadata: {},
      },
    ];

    this.segments = sampleSegments;
  }

  /**
   * List segments with optional filters
   */
  list(query: SegmentQuery): { segments: MarketSegment[]; total: number } {
    let filtered = [...this.segments];

    // Apply filters
    if (query.industry) {
      const industryLower = query.industry.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(industryLower) ||
        s.description.toLowerCase().includes(industryLower) ||
        JSON.stringify(s.demographics).toLowerCase().includes(industryLower)
      );
    }

    if (query.region) {
      // For now, region is not stored in segments, so this is a placeholder
      // In a real implementation, you would filter by region
    }

    if (query.minSize !== undefined) {
      filtered = filtered.filter(s => (s.size || 0) >= query.minSize!);
    }

    if (query.minGrowth !== undefined) {
      filtered = filtered.filter(s => (s.growth || 0) >= query.minGrowth!);
    }

    // Sort by growth (highest first)
    filtered.sort((a, b) => (b.growth || 0) - (a.growth || 0));

    const total = filtered.length;

    // Apply limit
    const limit = query.limit || 10;
    filtered = filtered.slice(0, limit);

    return { segments: filtered, total };
  }

  /**
   * Get segment by ID
   */
  get(id: string): MarketSegment | undefined {
    return this.segments.find(s => s.id === id);
  }

  /**
   * Get segment by name
   */
  getByName(name: string): MarketSegment | undefined {
    return this.segments.find(s =>
      s.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * Create a new segment
   */
  create(segment: Omit<MarketSegment, 'id'>): MarketSegment {
    const newSegment: MarketSegment = {
      ...segment,
      id: uuidv4(),
    };

    this.segments.unshift(newSegment);
    return newSegment;
  }

  /**
   * Update a segment
   */
  update(id: string, updates: Partial<MarketSegment>): MarketSegment | undefined {
    const index = this.segments.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    this.segments[index] = {
      ...this.segments[index],
      ...updates,
      id,
    };

    return this.segments[index];
  }

  /**
   * Get high-growth segments
   */
  getHighGrowth(limit: number = 5): MarketSegment[] {
    return [...this.segments]
      .filter(s => (s.growth || 0) > 15)
      .sort((a, b) => (b.growth || 0) - (a.growth || 0))
      .slice(0, limit);
  }

  /**
   * Get underserved segments (high opportunity)
   */
  getUnderserved(limit: number = 5): MarketSegment[] {
    return [...this.segments]
      .filter(s => s.competition <= 6 && (s.accessibility === 'easy' || s.accessibility === 'moderate'))
      .sort((a, b) => (b.size || 0) - (a.size || 0))
      .slice(0, limit);
  }

  /**
   * Get segment summary
   */
  getSummary(): {
    total: number;
    avgGrowth: number;
    avgCompetition: number;
    segmentsByAccessibility: Record<string, number>;
    topGrowingSegments: string[];
  } {
    const segmentsByAccessibility: Record<string, number> = {};
    let totalCompetition = 0;

    for (const segment of this.segments) {
      segmentsByAccessibility[segment.accessibility] =
        (segmentsByAccessibility[segment.accessibility] || 0) + 1;
      totalCompetition += segment.competition;
    }

    const topGrowing = [...this.segments]
      .sort((a, b) => (b.growth || 0) - (a.growth || 0))
      .slice(0, 3)
      .map(s => s.name);

    return {
      total: this.segments.length,
      avgGrowth: this.segments.reduce((sum, s) => sum + (s.growth || 0), 0) / this.segments.length,
      avgCompetition: totalCompetition / this.segments.length,
      segmentsByAccessibility,
      topGrowingSegments: topGrowing,
    };
  }

  /**
   * Match segments to a product/service
   */
  matchToSegments(criteria: {
    budget?: { min: number; max: number };
    features?: string[];
    industry?: string;
  }): MarketSegment[] {
    let matched = [...this.segments];

    if (criteria.budget) {
      matched = matched.filter(s =>
        s.willingnessToPay &&
        s.willingnessToPay.min <= criteria.budget!.max &&
        s.willingnessToPay.max >= criteria.budget!.min
      );
    }

    if (criteria.industry) {
      const industryLower = criteria.industry.toLowerCase();
      matched = matched.filter(s =>
        s.name.toLowerCase().includes(industryLower) ||
        s.description.toLowerCase().includes(industryLower)
      );
    }

    // Score and sort by match quality
    return matched.sort((a, b) => {
      const aScore = this.calculateMatchScore(a, criteria);
      const bScore = this.calculateMatchScore(b, criteria);
      return bScore - aScore;
    });
  }

  /**
   * Calculate match score for a segment
   */
  private calculateMatchScore(segment: MarketSegment, criteria: {
    budget?: { min: number; max: number };
    features?: string[];
    industry?: string;
  }): number {
    let score = 50; // Base score

    // Budget overlap
    if (criteria.budget && segment.willingnessToPay) {
      const overlap = Math.min(criteria.budget.max, segment.willingnessToPay.max) -
        Math.max(criteria.budget.min, segment.willingnessToPay.min);
      if (overlap > 0) {
        score += 25;
      }
    }

    // Low competition bonus
    if (segment.competition <= 5) {
      score += 15;
    } else if (segment.competition <= 7) {
      score += 10;
    }

    // Easy accessibility bonus
    if (segment.accessibility === 'easy') {
      score += 10;
    }

    return Math.min(100, score);
  }
}