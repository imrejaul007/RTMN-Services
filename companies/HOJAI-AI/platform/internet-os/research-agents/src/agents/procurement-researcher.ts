/**
 * Procurement Researcher Agent
 *
 * Discovers and vets potential suppliers
 * Uses: Google Maps + LinkedIn + Glassdoor + skills
 */

import { ResearchAgent, ResearchAgentConfig, ResearchReport } from '../base/research-agent.js';

export interface ProcurementResearchInput {
  category: string;
  city?: string;
  minRating?: number;
  requireCertifications?: string[];
  budget?: number;
}

export interface SupplierLead {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  certifications?: string[];
  score?: number;
}

export class ProcurementResearcher extends ResearchAgent {
  constructor(config?: Partial<ResearchAgentConfig>) {
    const defaultConfig: ResearchAgentConfig = {
      name: 'Procurement Researcher',
      type: 'procurement',
      skills: ['supplier-discovery'],
      actors: ['google-maps', 'linkedin', 'glassdoor'],
      schedule: { frequency: 'daily', time: '09:00' },
      deliveryChannels: ['memory-os', 'webhook'],
      memoryPartition: 'procurement-research',
    };
    super({ ...defaultConfig, ...config } as ResearchAgentConfig);
  }

  async generateReport(input: ProcurementResearchInput): Promise<ResearchReport> {
    const reportId = `procurement-${Date.now()}`;
    const generatedAt = new Date().toISOString();

    const data: any = {};
    const insights: string[] = [];
    const recommendations: string[] = [];
    const alerts: string[] = [];

    const minRating = input.minRating || 3.5;

    // Step 1: Find suppliers via Google Maps
    if (input.city) {
      const businesses = await this.callActor('google-maps', 'search', {
        keyword: `${input.category} supplier`,
        city: input.city,
        limit: 30,
      });

      // Score and filter suppliers
      const suppliers: SupplierLead[] = businesses.map((b: any) => {
        let score = 50;
        if (b.rating >= 4) score += 20;
        else if (b.rating >= minRating) score += 10;
        if (b.reviews > 50) score += 15;
        else if (b.reviews > 10) score += 5;
        if (b.website) score += 5;
        if (b.phone) score += 5;

        return {
          name: b.name,
          address: b.address,
          phone: b.phone,
          website: b.website,
          rating: b.rating,
          reviews: b.reviews,
          category: input.category,
          score,
        };
      });

      // Filter by minimum rating
      data.suppliers = suppliers
        .filter(s => (s.rating || 0) >= minRating)
        .sort((a, b) => (b.score || 0) - (a.score || 0));

      insights.push(`Found ${data.suppliers.length} qualified ${input.category} suppliers`);

      if (data.suppliers.length > 0) {
        const topSupplier = data.suppliers[0];
        insights.push(`Top supplier: ${topSupplier.name} (score: ${topSupplier.score}, rating: ${topSupplier.rating})`);
      }

      if (data.suppliers.length < 3) {
        alerts.push(`Low supplier count (${data.suppliers.length}). Consider expanding search criteria.`);
      }
    }

    const summary = `Procurement research for ${input.category}${input.city ? ` in ${input.city}` : ''}. ` +
      `Found ${data.suppliers?.length || 0} qualified suppliers with minimum rating ${minRating}.`;

    recommendations.push('Contact top 3 suppliers for quotes');
    recommendations.push('Verify certifications before engagement');
    recommendations.push('Compare pricing using pricing intelligence tools');

    return {
      agentName: this.config.name,
      agentType: this.config.type,
      reportId,
      generatedAt,
      duration: 0,
      data,
      summary,
      insights,
      recommendations,
      alerts,
    };
  }
}

export default ProcurementResearcher;