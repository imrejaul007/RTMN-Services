/**
 * LinkedIn Integration - Prospect enrichment & company data
 */

import axios from 'axios';

const LINKEDIN_CONFIG = {
  accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
  companyToken: process.env.LINKEDIN_COMPANY_TOKEN || '',
};

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  company?: string;
  position?: string;
  location?: string;
  profileUrl: string;
  connections?: number;
  industry?: string;
}

export interface LinkedInCompany {
  id: string;
  name: string;
  tagline?: string;
  industry?: string;
  size?: string;
  headquarters?: string;
  description?: string;
  website?: string;
  founded?: number;
  specialties?: string[];
}

export interface LinkedInPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  likes: number;
  comments: number;
  postedAt: Date;
}

export class LinkedInClient {
  private client = axios.create({
    baseURL: 'https://api.linkedin.com/v2',
    headers: {
      Authorization: `Bearer ${LINKEDIN_CONFIG.accessToken}`,
      'LinkedIn-Version': '202304',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    timeout: 5000,
  });

  private v201904Client = axios.create({
    baseURL: 'https://api.linkedin.com/v201904',
    headers: {
      Authorization: `Bearer ${LINKEDIN_CONFIG.accessToken}`,
      'LinkedIn-Version': '202304',
    },
    timeout: 5000,
  });

  async getProfile(email?: string, name?: string): Promise<LinkedInProfile | null> {
    try {
      if (email) {
        const response = await this.client.get('/emailAddress', {
          params: { q: 'emailAddress', email },
        });
        const personId = response.data.id;
        if (personId) {
          return this.getProfileById(personId);
        }
      }
      return null;
    } catch (error) {
      console.error('LinkedIn profile lookup failed:', error);
      return this.getMockProfile(name);
    }
  }

  async getProfileById(profileId: string): Promise<LinkedInProfile | null> {
    try {
      const response = await this.client.get(`/people/${profileId}`, {
        params: { projection: '(id,firstName,lastName,headline,positions,location)' },
      });

      return {
        id: response.data.id,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        headline: response.data.headline,
        position: response.data.positions?.values?.[0]?.title,
        company: response.data.positions?.values?.[0]?.company?.name,
        location: response.data.location,
        profileUrl: `https://linkedin.com/in/${profileId}`,
      };
    } catch (error) {
      return null;
    }
  }

  async getCompany(companyName: string): Promise<LinkedInCompany | null> {
    try {
      const response = await this.client.get('/organizations', {
        params: { q: 'search', search: companyName },
      });

      const company = response.data.elements?.[0];
      if (!company) return null;

      return {
        id: company.id,
        name: company.localizedName,
        industry: company.industry,
        size: company.staffCountRange,
        website: company.website,
        specialties: company.specialties,
      };
    } catch (error) {
      console.error('LinkedIn company lookup failed:', error);
      return this.getMockCompany(companyName);
    }
  }

  async enrichLead(leadData: { email?: string; name?: string; company?: string }): Promise<{
    profile?: LinkedInProfile;
    company?: LinkedInCompany;
    insights: string[];
  }> {
    const insights: string[] = [];
    let company: LinkedInCompany | null = null;

    const profile = await this.getProfile(leadData.email, leadData.name);
    if (profile) {
      insights.push(`${profile.firstName} is currently: ${profile.headline}`);
      if (profile.connections && profile.connections > 500) {
        insights.push('Well-connected professional (500+ connections)');
      }
    }

    if (leadData.company) {
      company = await this.getCompany(leadData.company);
      if (company) {
        if (company.size) insights.push(`Company size: ${company.size}`);
      }
    }

    return { profile: profile || undefined, company: company || undefined, insights };
  }

  private getMockProfile(name?: string): LinkedInProfile {
    return {
      id: 'mock_' + Date.now(),
      firstName: name?.split(' ')[0] || 'John',
      lastName: name?.split(' ').slice(1).join(' ') || 'Doe',
      headline: 'Sales Professional',
      profileUrl: 'https://linkedin.com/in/prospect',
    };
  }

  private getMockCompany(name: string): LinkedInCompany {
    return {
      id: 'mock_company',
      name,
      industry: 'Technology',
      size: '51-200',
      website: `https://${name.toLowerCase().replace(/\s/g, '')}.com`,
    };
  }
}
