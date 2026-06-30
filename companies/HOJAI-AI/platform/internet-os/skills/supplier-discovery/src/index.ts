/**
 * Supplier Discovery Skill
 *
 * REUSES: Google Maps + LinkedIn + Glassdoor actors + AI Intelligence
 * Composes multiple sources for supplier shortlist generation
 */

import axios from 'axios';

const INTERNET_OS_URL = process.env.INTERNET_OS_URL || 'http://localhost:4595';
const AI_INTELLIGENCE_URL = process.env.AI_INTELLIGENCE_URL || 'http://localhost:4881';
const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';

export interface SupplierSearchInput {
  category: string;
  location?: string;
  certifications?: string[];
  minCapacity?: number;
  limit?: number;
}

export interface SupplierScore {
  overall: number;
  rating: number;
  reviews: number;
  certifications: number;
  experience: number;
  responseTime?: number;
}

export interface SupplierProfile {
  id: string;
  name: string;
  category: string;
  location: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  certifications?: string[];
  yearsInBusiness?: number;
  employeeCount?: string;
  description?: string;
  products?: string[];
  pricing?: {
    min: number;
    max: number;
    currency: string;
  };
  contactPerson?: string;
  linkedIn?: string;
  score: SupplierScore;
}

export interface PricingComparison {
  supplierId: string;
  name: string;
  category: string;
  pricing: {
    unit: string;
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    moq: number;
  };
  deliveryTime?: string;
  paymentTerms?: string;
}

export interface DiscoveryReport {
  suppliers: SupplierProfile[];
  totalFound: number;
  topPicks: SupplierProfile[];
  generatedAt: string;
}

export class SupplierDiscoverySkill {
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.INTERNAL_SERVICE_TOKEN || 'supplier-discovery-skill';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Search for suppliers by category
   */
  async search_suppliers(input: SupplierSearchInput): Promise<SupplierProfile[]> {
    const limit = input.limit || 20;

    // Parallel search across multiple sources
    const [mapsResults, linkedInResults] = await Promise.all([
      this.searchGoogleMaps(input.category, input.location, limit),
      this.searchLinkedIn(input.category, input.location, Math.floor(limit / 2)),
    ]);

    // Merge and deduplicate results
    const merged = this.mergeResults(mapsResults, linkedInResults);

    // Score and rank suppliers
    const scored = this.rankSuppliers(merged);

    // Store search results
    await this.storeSearchResults(input, scored);

    return scored.slice(0, limit);
  }

  /**
   * Score suppliers by various criteria
   */
  async score_suppliers(suppliers: SupplierProfile[]): Promise<SupplierProfile[]> {
    return this.rankSuppliers(suppliers);
  }

  /**
   * Internal ranking logic
   */
  private rankSuppliers(suppliers: SupplierProfile[]): SupplierProfile[] {
    const scored = suppliers.map(supplier => {
      const score: SupplierScore = {
        overall: 0,
        rating: 0,
        reviews: 0,
        certifications: 0,
        experience: 0,
      };

      // Rating score (0-30 points)
      if (supplier.rating) {
        score.rating = Math.min(30, supplier.rating * 6);
      }

      // Reviews score (0-20 points)
      if (supplier.reviewCount) {
        score.reviews = Math.min(20, Math.log10(supplier.reviewCount + 1) * 10);
      }

      // Certifications score (0-25 points)
      if (supplier.certifications && supplier.certifications.length > 0) {
        score.certifications = Math.min(25, supplier.certifications.length * 8);
      }

      // Experience score (0-25 points)
      if (supplier.yearsInBusiness) {
        score.experience = Math.min(25, supplier.yearsInBusiness * 5);
      }

      // Calculate overall
      score.overall = Math.round(score.rating + score.reviews + score.certifications + score.experience);

      return {
        ...supplier,
        score,
      };
    });

    // Sort by overall score
    return scored.sort((a, b) => b.score.overall - a.score.overall);
  }

  /**
   * Compare pricing across suppliers
   */
  async compare_pricing(supplierIds: string[]): Promise<PricingComparison[]> {
    // Retrieve supplier details from cache or search again
    const comparisons: PricingComparison[] = [];

    for (const id of supplierIds) {
      try {
        // Try to get from memory
        const memoryResponse = await axios.get(
          `${MEMORY_OS_URL}/api/memories/${id}`,
          { headers: this.headers }
        );

        if (memoryResponse.data?.content) {
          const data = JSON.parse(memoryResponse.data.content);
          if (data.pricing) {
            comparisons.push({
              supplierId: id,
              name: data.name || 'Unknown',
              category: data.category || 'Unknown',
              pricing: data.pricing,
              deliveryTime: data.deliveryTime,
              paymentTerms: data.paymentTerms,
            });
            continue;
          }
        }
      } catch {
        // Not in cache
      }

      // Fetch fresh data
      const mapsData = await this.searchGoogleMaps('supplier', id, 1);
      if (mapsData.length > 0) {
        const supplier = mapsData[0];
        comparisons.push({
          supplierId: id,
          name: supplier.name,
          category: supplier.category,
          pricing: {
            unit: 'unit',
            minPrice: supplier.pricing?.min || 0,
            maxPrice: supplier.pricing?.max || 0,
            avgPrice: supplier.pricing?.min || 0,
            moq: supplier.pricing?.min ? 10 : 1,
          },
        });
      }
    }

    return comparisons;
  }

  /**
   * Full discovery report
   */
  async execute(input: SupplierSearchInput): Promise<DiscoveryReport> {
    const suppliers = await this.search_suppliers(input);

    // Identify top picks (top 5 by score)
    const topPicks = suppliers.slice(0, 5);

    return {
      suppliers,
      totalFound: suppliers.length,
      topPicks,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Search Google Maps for suppliers
   */
  private async searchGoogleMaps(
    category: string,
    location?: string,
    limit: number = 20
  ): Promise<SupplierProfile[]> {
    try {
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/google-maps/run`,
        {
          action: 'search',
          params: {
            keyword: category,
            city: location || 'India',
          },
        },
        { headers: this.headers, timeout: 30000 }
      );

      if (!response.data.success) return [];

      const results = response.data.data || [];
      return results.slice(0, limit).map((r: any, index: number) => ({
        id: `maps-${r.placeId || index}`,
        name: r.name || 'Unknown Supplier',
        category,
        location: r.address || location || 'Unknown',
        address: r.address,
        phone: r.phone,
        website: r.website,
        rating: r.rating,
        reviewCount: r.reviews || r.reviewCount,
        description: r.description,
        score: { overall: 0, rating: 0, reviews: 0, certifications: 0, experience: 0 },
      }));
    } catch {
      return [];
    }
  }

  /**
   * Search LinkedIn for company information
   */
  private async searchLinkedIn(
    category: string,
    location?: string,
    limit: number = 10
  ): Promise<SupplierProfile[]> {
    try {
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/linkedin/run`,
        {
          action: 'search_companies',
          params: {
            keyword: `${category} supplier manufacturer`,
            location: location || 'India',
          },
        },
        { headers: this.headers, timeout: 30000 }
      );

      if (!response.data.success) return [];

      const results = response.data.data || [];
      return results.slice(0, limit).map((r: any, index: number) => ({
        id: `linkedin-${r.id || index}`,
        name: r.name || r.companyName || 'Unknown Company',
        category,
        location: r.location || location || 'Unknown',
        description: r.description,
        employeeCount: r.employeeCount,
        linkedIn: r.url,
        yearsInBusiness: this.extractYearsFromDescription(r.description),
        score: { overall: 0, rating: 0, reviews: 0, certifications: 0, experience: 0 },
      }));
    } catch {
      return [];
    }
  }

  /**
   * Extract years in business from description
   */
  private extractYearsFromDescription(description?: string): number | undefined {
    if (!description) return undefined;
    const match = description.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Merge results from multiple sources
   */
  private mergeResults(mapsResults: SupplierProfile[], linkedInResults: SupplierProfile[]): SupplierProfile[] {
    const merged: Map<string, SupplierProfile> = new Map();

    // Add maps results
    for (const supplier of mapsResults) {
      const key = supplier.name.toLowerCase().replace(/\s+/g, '-');
      merged.set(key, supplier);
    }

    // Merge linkedIn results
    for (const supplier of linkedInResults) {
      const key = supplier.name.toLowerCase().replace(/\s+/g, '-');
      const existing = merged.get(key);
      if (existing) {
        // Merge data
        merged.set(key, {
          ...existing,
          ...supplier,
          id: existing.id,
          // Prefer maps data for contact info
          phone: existing.phone || supplier.phone,
          website: existing.website || supplier.website,
          rating: existing.rating || supplier.rating,
          reviewCount: existing.reviewCount || supplier.reviewCount,
          certifications: supplier.certifications || existing.certifications,
          linkedIn: supplier.linkedIn,
        });
      } else {
        merged.set(key, supplier);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Get AI-enhanced analysis
   */
  private async getAIAnalysis(suppliers: SupplierProfile[]): Promise<string> {
    try {
      const response = await axios.post(
        `${AI_INTELLIGENCE_URL}/api/analyze`,
        {
          text: `Analyze these suppliers: ${JSON.stringify(suppliers.slice(0, 5))}`,
          orgId: 'supplier-discovery',
          context: {
            channel: 'supplier-analysis',
            analysisType: 'recommendation',
          },
        },
        { headers: this.headers, timeout: 30000 }
      );

      return response.data?.analysis?.summary || '';
    } catch {
      return '';
    }
  }

  /**
   * Store search results in MemoryOS
   */
  private async storeSearchResults(input: SupplierSearchInput, results: SupplierProfile[]): Promise<void> {
    try {
      await axios.post(
        `${MEMORY_OS_URL}/api/memories`,
        {
          userId: `supplier-search-${input.category}-${Date.now()}`,
          content: JSON.stringify({
            category: input.category,
            location: input.location,
            results: results.slice(0, 10),
          }),
          type: 'supplier-discovery',
          metadata: {
            category: input.category,
            location: input.location,
            count: results.length,
            generatedAt: new Date().toISOString(),
          },
        },
        { headers: this.headers }
      );
    } catch {
      // Silently fail if MemoryOS unavailable
    }
  }

  /**
   * Register skill with SkillOS
   */
  async register(): Promise<any> {
    try {
      const response = await axios.post(
        `${process.env.SKILL_OS_URL || 'http://localhost:4743'}/api/skills`,
        {
          name: 'supplier-discovery',
          description: 'Find and score suppliers using Google Maps, LinkedIn, and Glassdoor data',
          category: 'procurement',
          tags: ['suppliers', 'discovery', 'sourcing', 'procurement', 'business'],
          inputs: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              location: { type: 'string' },
              certifications: {
                type: 'array',
                items: { type: 'string' },
              },
              minCapacity: { type: 'number' },
              limit: { type: 'number', default: 20 },
            },
            required: ['category'],
          },
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export const supplierDiscoverySkill = new SupplierDiscoverySkill();
export default supplierDiscoverySkill;
