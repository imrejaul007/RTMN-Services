/**
 * Industry AI Client
 * Connects to 28 industry verticals
 */

export const INDUSTRY_URLS: Record<string, string> = {
  healthcare: process.env.INDUSTRY_HEALTHCARE_URL || 'http://localhost:3001',
  legal: process.env.INDUSTRY_LEGAL_URL || 'http://localhost:3002',
  finance: process.env.INDUSTRY_FINANCE_URL || 'http://localhost:3003',
  realestate: process.env.INDUSTRY_RE_URL || 'http://localhost:3004',
  hospitality: process.env.INDUSTRY_HOSPITALITY_URL || 'http://localhost:3005',
  restaurant: process.env.INDUSTRY_RESTAURANT_URL || 'http://localhost:3006',
  fleet: process.env.INDUSTRY_FLEET_URL || 'http://localhost:3007',
  education: process.env.INDUSTRY_EDUCATION_URL || 'http://localhost:3008',
  retail: process.env.INDUSTRY_RETAIL_URL || 'http://localhost:3009',
  manufacturing: process.env.INDUSTRY_MANUFACTURING_URL || 'http://localhost:3010',
  logistics: process.env.INDUSTRY_LOGISTICS_URL || 'http://localhost:3011',
  automotive: process.env.INDUSTRY_AUTOMOTIVE_URL || 'http://localhost:3012',
  telecom: process.env.INDUSTRY_TELECOM_URL || 'http://localhost:3013',
  insurance: process.env.INDUSTRY_INSURANCE_URL || 'http://localhost:3014',
  agriculture: process.env.INDUSTRY_AGRICULTURE_URL || 'http://localhost:3015',
  construction: process.env.INDUSTRY_CONSTRUCTION_URL || 'http://localhost:3016',
  energy: process.env.INDUSTRY_ENERGY_URL || 'http://localhost:3017',
  media: process.env.INDUSTRY_MEDIA_URL || 'http://localhost:3018',
  travel: process.env.INDUSTRY_TRAVEL_URL || 'http://localhost:3019',
  fitness: process.env.INDUSTRY_FITNESS_URL || 'http://localhost:3020',
  beauty: process.env.INDUSTRY_BEAUTY_URL || 'http://localhost:3021',
  petcare: process.env.INDUSTRY_PETCARE_URL || 'http://localhost:3022',
  home: process.env.INDUSTRY_HOME_URL || 'http://localhost:3023',
  events: process.env.INDUSTRY_EVENTS_URL || 'http://localhost:3024',
  nonprofit: process.env.INDUSTRY_NONPROFIT_URL || 'http://localhost:3025',
  government: process.env.INDUSTRY_GOVERNMENT_URL || 'http://localhost:3026',
  banking: process.env.INDUSTRY_BANKING_URL || 'http://localhost:3027',
  investment: process.env.INDUSTRY_INVESTMENT_URL || 'http://localhost:3028',
};

export const INDUSTRY_VERTICALS = [
  'healthcare',
  'legal',
  'finance',
  'realestate',
  'hospitality',
  'restaurant',
  'fleet',
  'education',
  'retail',
  'manufacturing',
  'logistics',
  'automotive',
  'telecom',
  'insurance',
  'agriculture',
  'construction',
  'energy',
  'media',
  'travel',
  'fitness',
  'beauty',
  'petcare',
  'home',
  'events',
  'nonprofit',
  'government',
  'banking',
  'investment',
] as const;

export type IndustryVertical = typeof INDUSTRY_VERTICALS[number];

export interface IndustryAnalysis {
  vertical: string;
  data: any;
  insights: string[];
  recommendations?: string[];
  confidence: number;
  timestamp: string;
}

export interface IndustryContext {
  vertical: string;
  overview: string;
  keyMetrics: Record<string, any>;
  trends: string[];
  bestPractices: string[];
  regulations?: string[];
  commonUseCases: string[];
}

export interface IndustryReport {
  vertical: string;
  reportType: string;
  data: any;
  generatedAt: string;
  validUntil: string;
}

export class IndustryAIClient {
  private urls: Record<string, string>;

  constructor() {
    this.urls = INDUSTRY_URLS;
  }

  /**
   * Get URL for a specific vertical
   */
  private getUrl(vertical: string): string | null {
    const url = this.urls[vertical.toLowerCase()];
    if (!url) {
      console.warn(`No URL configured for vertical: ${vertical}`);
    }
    return url || null;
  }

  /**
   * Analyze data for a specific industry
   */
  async analyze(vertical: string, data: any): Promise<IndustryAnalysis | { error: string }> {
    const url = this.getUrl(vertical);
    if (!url) {
      return { error: `Unknown vertical: ${vertical}` };
    }

    try {
      const response = await fetch(`${url}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    } catch (error) {
      return {
        vertical,
        data: {},
        insights: [],
        confidence: 0,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Analysis service unavailable'
      };
    }
  }

  /**
   * Get industry-specific context
   */
  async getIndustryContext(vertical: string): Promise<IndustryContext | { error: string }> {
    const url = this.getUrl(vertical);
    if (!url) {
      return { error: `Unknown vertical: ${vertical}` };
    }

    try {
      const response = await fetch(`${url}/api/context`);
      if (!response.ok) {
        return { error: `Context not available: ${response.status}` };
      }
      return response.json();
    } catch (error) {
      return {
        vertical,
        overview: '',
        keyMetrics: {},
        trends: [],
        bestPractices: [],
        commonUseCases: [],
        error: error instanceof Error ? error.message : 'Context service unavailable'
      };
    }
  }

  /**
   * Generate industry report
   */
  async generateReport(vertical: string, reportType: string, params?: any): Promise<IndustryReport | { error: string }> {
    const url = this.getUrl(vertical);
    if (!url) {
      return { error: `Unknown vertical: ${vertical}` };
    }

    try {
      const response = await fetch(`${url}/api/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, ...params })
      });
      return response.json();
    } catch (error) {
      return {
        vertical,
        reportType,
        data: {},
        generatedAt: new Date().toISOString(),
        validUntil: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Report generation failed'
      };
    }
  }

  /**
   * Get industry insights
   */
  async getInsights(vertical: string, topic?: string): Promise<{ insights: string[]; error?: string }> {
    const url = this.getUrl(vertical);
    if (!url) {
      return { insights: [], error: `Unknown vertical: ${vertical}` };
    }

    try {
      const endpoint = topic
        ? `${url}/api/insights?topic=${encodeURIComponent(topic)}`
        : `${url}/api/insights`;
      const response = await fetch(endpoint);
      return response.json();
    } catch (error) {
      return { insights: [], error: error instanceof Error ? error.message : 'Insights unavailable' };
    }
  }

  /**
   * Get all available verticals
   */
  getAvailableVerticals(): string[] {
    return INDUSTRY_VERTICALS;
  }

  /**
   * Check if vertical is supported
   */
  isVerticalSupported(vertical: string): boolean {
    return INDUSTRY_VERTICALS.includes(vertical.toLowerCase() as IndustryVertical);
  }

  /**
   * Health check for all industry verticals
   */
  async healthCheck(): Promise<{
    healthy: Record<string, boolean>;
    total: number;
    available: number;
  }> {
    const results: Record<string, boolean> = {};
    let available = 0;

    for (const [vertical, url] of Object.entries(this.urls)) {
      try {
        const response = await fetch(`${url}/health`);
        results[vertical] = response.ok;
        if (response.ok) available++;
      } catch {
        results[vertical] = false;
      }
    }

    return {
      healthy: results,
      total: Object.keys(this.urls).length,
      available
    };
  }
}

export const industryAI = new IndustryAIClient();
export default industryAI;
