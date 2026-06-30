/**
 * Lead Generation Skill
 *
 * REUSES: InternetOS actors + TwinOS + SkillOS
 * Composes Google Maps → LinkedIn → Email extraction into qualified leads
 */

import axios from 'axios';

const INTERNET_OS_URL = process.env.INTERNET_OS_URL || 'http://localhost:4595';
const TWIN_OS_URL = process.env.TWIN_OS_URL || 'http://localhost:4705';

export interface LeadGenerationInput {
  industry?: string;        // e.g. "salons", "restaurants", "dentists"
  keyword: string;          // Search term
  city: string;             // e.g. "Dubai", "Bangalore"
  limit?: number;           // Max leads
  enrichWithLinkedIn?: boolean;
  extractEmails?: boolean;
}

export interface QualifiedLead {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  linkedinProfile?: string;
  emails?: string[];
  source: string;
  twinId?: string;
}

export class LeadGenerationSkill {
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.INTERNAL_SERVICE_TOKEN || 'lead-gen-skill';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Execute lead generation skill
   */
  async execute(input: LeadGenerationInput): Promise<{
    success: boolean;
    leads: QualifiedLead[];
    count: number;
    duration: number;
  }> {
    const startTime = Date.now();

    try {
      // Step 1: Search Google Maps for businesses
      const businesses = await this.searchGoogleMaps(input);

      // Step 2: Extract emails from websites (if enabled)
      const leads: QualifiedLead[] = [];
      for (const business of businesses.slice(0, input.limit || 50)) {
        const lead: QualifiedLead = {
          ...business,
          source: 'google-maps',
          emails: [],
        };

        // Register as twin
        try {
          const twinResponse = await axios.post(
            `${TWIN_OS_URL}/api/twins`,
            {
              type: 'company',
              name: business.name,
              attributes: {
                address: business.address,
                phone: business.phone,
                rating: business.rating,
                category: business.category,
                city: input.city,
                source: 'lead-gen-skill',
                scrapedAt: new Date().toISOString(),
              },
            },
            { headers: this.headers }
          );
          lead.twinId = twinResponse.data.id;
        } catch (error) {
          console.warn(`Failed to register twin for ${business.name}:`, error);
        }

        leads.push(lead);
      }

      return {
        success: true,
        leads,
        count: leads.length,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Lead generation failed:', error);
      return {
        success: false,
        leads: [],
        count: 0,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Search Google Maps for businesses
   */
  private async searchGoogleMaps(input: LeadGenerationInput): Promise<QualifiedLead[]> {
    try {
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/google-maps/run`,
        {
          action: 'search',
          params: {
            keyword: input.industry || input.keyword,
            city: input.city,
          },
        },
        { headers: this.headers }
      );

      if (!response.data.success) {
        return [];
      }

      const businesses = response.data.data || [];
      return businesses.map((b: any) => ({
        name: b.name || '',
        address: b.address,
        phone: b.phone,
        website: b.website,
        rating: b.rating,
        reviews: b.reviews,
        category: b.category,
        source: 'google-maps',
        emails: [],
      }));
    } catch (error) {
      console.error('Google Maps search failed:', error);
      return [];
    }
  }

  /**
   * Score lead quality
   */
  scoreLead(lead: QualifiedLead): number {
    let score = 50; // base score

    if (lead.website) score += 10;
    if (lead.phone) score += 5;
    if (lead.rating && lead.rating >= 4) score += 10;
    if (lead.reviews && lead.reviews > 50) score += 10;
    if (lead.emails && lead.emails.length > 0) score += 15;

    return Math.min(100, score);
  }

  /**
   * Register skill in SkillOS (reuses existing service)
   */
  async register(): Promise<any> {
    try {
      const response = await axios.post(
        `${process.env.SKILL_OS_URL || 'http://localhost:4743'}/api/skills`,
        {
          name: 'lead-generation',
          description: 'Generate qualified leads from Google Maps and enrich with emails',
          category: 'lead-generation',
          tags: ['sales', 'leads', 'business', 'google-maps'],
          inputs: {
            type: 'object',
            properties: {
              industry: { type: 'string' },
              keyword: { type: 'string' },
              city: { type: 'string' },
              limit: { type: 'number' },
            },
            required: ['keyword', 'city'],
          },
          outputs: {
            type: 'object',
            properties: {
              leads: { type: 'array' },
              count: { type: 'number' },
            },
          },
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to register skill:', error);
      throw error;
    }
  }
}

export const leadGenerationSkill = new LeadGenerationSkill();
export default leadGenerationSkill;