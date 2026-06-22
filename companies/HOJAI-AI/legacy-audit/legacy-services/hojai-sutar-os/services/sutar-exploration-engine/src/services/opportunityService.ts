// ============================================================================
// SUTAR Exploration Engine - Opportunity Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import type { Opportunity, OpportunityQuery, OpportunityType } from '../types/index.js';

export class OpportunityService {
  private opportunities: Opportunity[] = [];

  constructor() {
    // Initialize with some sample opportunities
    this.initializeSampleData();
  }

  /**
   * Initialize sample opportunities
   */
  private initializeSampleData(): void {
    const sampleOpportunities: Opportunity[] = [
      {
        id: uuidv4(),
        title: 'AI-Powered Personalization Platform',
        description: 'Build an AI-driven personalization engine for e-commerce businesses to increase conversion rates and customer engagement.',
        type: 'product_extension',
        priority: 'high',
        score: 92,
        marketSize: 15000000000,
        growthPotential: 35,
        competition: 6,
        barriers: ['Technical expertise', 'Data infrastructure', 'Initial training data'],
        requirements: ['Machine learning team', 'Data pipeline', 'Integration APIs'],
        timeline: '6-12 months',
        estimatedValue: 5000000,
        risks: ['Data privacy regulations', 'Competition from tech giants', 'Model accuracy'],
        recommendations: ['Start with MVP for single vertical', 'Partner with data providers', 'Focus on measurable ROI'],
        timestamp: new Date().toISOString(),
        source: 'market_analysis',
        relatedTrends: ['AI adoption', 'E-commerce growth', 'Personalization demand'],
        metadata: {},
      },
      {
        id: uuidv4(),
        title: 'Sustainable Packaging Solutions',
        description: 'Develop eco-friendly packaging alternatives for small businesses with subscription model.',
        type: 'market_entry',
        priority: 'high',
        score: 88,
        marketSize: 8500000000,
        growthPotential: 28,
        competition: 4,
        barriers: ['Supply chain setup', 'Cost competitive pricing', 'Material sourcing'],
        requirements: ['Manufacturing partnerships', 'Logistics network', 'Sustainability certifications'],
        timeline: '12-18 months',
        estimatedValue: 3000000,
        risks: ['Material costs', 'Scale challenges', 'Greenwashing perception'],
        recommendations: ['B2B focus initially', 'Carbon neutral certification', 'Transparent supply chain'],
        timestamp: new Date().toISOString(),
        source: 'trend_analysis',
        relatedTrends: ['Sustainability focus', 'ESG requirements', 'Consumer awareness'],
        metadata: {},
      },
      {
        id: uuidv4(),
        title: 'Remote Team Collaboration Tools',
        description: 'Create integrated collaboration suite for distributed teams with async-first features.',
        type: 'product_extension',
        priority: 'medium',
        score: 78,
        marketSize: 45000000000,
        growthPotential: 22,
        competition: 8,
        barriers: ['Market saturation', 'Feature differentiation', 'User acquisition'],
        requirements: ['Real-time infrastructure', 'Cross-platform support', 'Enterprise security'],
        timeline: '9-15 months',
        estimatedValue: 8000000,
        risks: ['Slack/Teams dominance', 'Price sensitivity', 'Feature creep'],
        recommendations: ['Focus on async workflows', 'Integrate with existing tools', 'Niche vertical focus'],
        timestamp: new Date().toISOString(),
        source: 'competitor_analysis',
        relatedTrends: ['Remote work', 'Hybrid teams', 'Digital collaboration'],
        metadata: {},
      },
      {
        id: uuidv4(),
        title: 'Healthcare Data Interoperability',
        description: 'Build middleware solution for healthcare data exchange between disparate systems.',
        type: 'market_entry',
        priority: 'high',
        score: 85,
        marketSize: 3200000000,
        growthPotential: 45,
        competition: 3,
        barriers: ['HIPAA compliance', 'Legacy system integration', 'Healthcare expertise'],
        requirements: ['Security certifications', 'HL7/FHIR expertise', 'Healthcare partnerships'],
        timeline: '18-24 months',
        estimatedValue: 12000000,
        risks: ['Regulatory changes', 'Long sales cycles', 'Technical complexity'],
        recommendations: ['Target hospital networks first', 'Partner with EHR vendors', 'Focus on data quality'],
        timestamp: new Date().toISOString(),
        source: 'gap_analysis',
        relatedTrends: ['Digital health', 'Interoperability mandates', 'Value-based care'],
        metadata: {},
      },
      {
        id: uuidv4(),
        title: 'Developer Experience Platform',
        description: 'Unified platform for developer tooling, documentation, and API management.',
        type: 'product_extension',
        priority: 'medium',
        score: 72,
        marketSize: 12000000000,
        growthPotential: 30,
        competition: 7,
        barriers: ['Tooling integration', 'Developer trust', 'Performance requirements'],
        requirements: ['Strong DX team', 'API infrastructure', 'Documentation system'],
        timeline: '6-9 months',
        estimatedValue: 4000000,
        risks: ['Fragmented market', 'Tool fatigue', 'Open source competition'],
        recommendations: ['Start with API documentation', 'Build community', 'Offer freemium model'],
        timestamp: new Date().toISOString(),
        source: 'market_analysis',
        relatedTrends: ['API economy', 'Developer-centric products', 'Low-code adoption'],
        metadata: {},
      },
    ];

    this.opportunities = sampleOpportunities;
  }

  /**
   * List opportunities with optional filters
   */
  list(query: OpportunityQuery): { opportunities: Opportunity[]; total: number } {
    let filtered = [...this.opportunities];

    // Apply filters
    if (query.type) {
      filtered = filtered.filter(o => o.type === query.type);
    }

    if (query.priority) {
      filtered = filtered.filter(o => o.priority === query.priority);
    }

    if (query.minScore !== undefined) {
      filtered = filtered.filter(o => o.score >= query.minScore!);
    }

    const total = filtered.length;

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    filtered = filtered.slice(offset, offset + limit);

    return { opportunities: filtered, total };
  }

  /**
   * Get opportunity by ID
   */
  get(id: string): Opportunity | undefined {
    return this.opportunities.find(o => o.id === id);
  }

  /**
   * Create a new opportunity
   */
  create(opportunity: Omit<Opportunity, 'id' | 'timestamp'>): Opportunity {
    const newOpportunity: Opportunity = {
      ...opportunity,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };

    this.opportunities.unshift(newOpportunity);
    return newOpportunity;
  }

  /**
   * Update an existing opportunity
   */
  update(id: string, updates: Partial<Opportunity>): Opportunity | undefined {
    const index = this.opportunities.findIndex(o => o.id === id);
    if (index === -1) return undefined;

    this.opportunities[index] = {
      ...this.opportunities[index],
      ...updates,
      id, // Ensure ID is not changed
      timestamp: new Date().toISOString(), // Update timestamp
    };

    return this.opportunities[index];
  }

  /**
   * Delete an opportunity
   */
  delete(id: string): boolean {
    const index = this.opportunities.findIndex(o => o.id === id);
    if (index === -1) return false;

    this.opportunities.splice(index, 1);
    return true;
  }

  /**
   * Get opportunities by type
   */
  getByType(type: OpportunityType): Opportunity[] {
    return this.opportunities.filter(o => o.type === type);
  }

  /**
   * Get top opportunities by score
   */
  getTop(limit: number = 10): Opportunity[] {
    return [...this.opportunities]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Generate new opportunities based on market analysis
   */
  generateOpportunities(context: {
    industry?: string;
    trends?: string[];
    gaps?: string[];
  }): Opportunity[] {
    // Simulate opportunity generation based on context
    const newOpportunities: Partial<Opportunity>[] = [
      {
        title: `${context.industry || 'Technology'} Process Automation`,
        description: `Automate repetitive processes in the ${context.industry || 'technology'} sector using modern workflow tools.`,
        type: 'process_improvement',
        priority: 'medium',
        score: 75,
        growthPotential: 25,
        barriers: ['Change management', 'Integration complexity'],
        requirements: ['Process mapping', 'Automation tools', 'Training'],
        risks: ['User adoption', 'Technical debt'],
        recommendations: ['Start with pilot team', 'Measure time savings'],
        source: 'generation',
        relatedTrends: context.trends,
        metadata: { generated: true },
      },
      {
        title: `${context.industry || 'Technology'} Analytics Dashboard`,
        description: `Build real-time analytics for ${context.industry || 'technology'} companies to track key metrics and KPIs.`,
        type: 'feature_addition',
        priority: 'medium',
        score: 70,
        growthPotential: 20,
        barriers: ['Data quality', 'Performance at scale'],
        requirements: ['Data pipeline', 'Visualization library', 'User research'],
        risks: ['Insight accuracy', 'Complexity creep'],
        recommendations: ['Focus on actionable insights', 'Mobile-first design'],
        source: 'generation',
        relatedTrends: context.trends,
        metadata: { generated: true },
      },
    ];

    return newOpportunities.map(o => this.create({
      ...o,
      competition: Math.floor(Math.random() * 10) + 1,
      barriers: o.barriers || [],
      requirements: o.requirements || [],
      risks: o.risks || [],
      recommendations: o.recommendations || [],
    } as Opportunity));
  }
}