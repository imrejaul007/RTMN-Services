/**
 * REZ Atlas Connector
 * Integration with REZ Atlas for B2B intelligence
 */

import { Connector } from '@hojai/connectors';

export interface AtlasSearchParams {
  query: string;
  filters?: {
    industry?: string[];
    company_size?: string[];
    location?: string[];
    technology?: string[];
    funding?: string[];
  };
  limit?: number;
  offset?: number;
}

export interface AtlasCompany {
  id: string;
  name: string;
  domain: string;
  description?: string;
  industry: string[];
  size: string;
  location: string;
  founded?: number;
  linkedin?: string;
  twitter?: string;
  technologies: string[];
  funding?: {
    round: string;
    amount: string;
    date: string;
  }[];
  contacts?: {
    name: string;
    title: string;
    linkedin?: string;
    email?: string;
  }[];
  signals?: {
    type: string;
    value: string;
    date: string;
  }[];
}

export interface AtlasIntelligence {
  company: AtlasCompany;
  competitors: AtlasCompany[];
  news: any[];
  jobListings: any[];
  fundingHistory: any[];
}

export class REZAtlasConnector extends Connector {
  constructor() {
    super({
      id: 'rez_atlas',
      name: 'REZ Atlas',
      description: 'B2B company intelligence and prospect research',
      version: '1.0.0',
      auth: {
        type: 'api_key',
        key: process.env.REZ_ATLAS_API_KEY,
      },
    });
  }

  async search(params: AtlasSearchParams): Promise<AtlasCompany[]> {
    const response = await this.request('POST', '/api/atlas/search', {
      query: params.query,
      filters: params.filters,
      limit: params.limit || 20,
      offset: params.offset || 0,
    });

    return response.companies || [];
  }

  async getCompany(domain: string): Promise<AtlasCompany | null> {
    const response = await this.request('GET', `/api/atlas/company/${encodeURIComponent(domain)}`);
    return response.company || null;
  }

  async enrichCompany(company: { name?: string; domain?: string; email?: string }): Promise<AtlasCompany> {
    const response = await this.request('POST', '/api/atlas/enrich', company);
    return response.company;
  }

  async getIntelligence(domain: string): Promise<AtlasIntelligence> {
    const response = await this.request('GET', `/api/atlas/intelligence/${encodeURIComponent(domain)}`);
    return response;
  }

  async getCompetitors(domain: string): Promise<AtlasCompany[]> {
    const response = await this.request('GET', `/api/atlas/competitors/${encodeURIComponent(domain)}`);
    return response.companies || [];
  }

  async getContacts(domain: string): Promise<AtlasCompany['contacts']> {
    const response = await this.request('GET', `/api/atlas/contacts/${encodeURIComponent(domain)}`);
    return response.contacts || [];
  }

  async getNews(domain: string, limit = 20): Promise<any[]> {
    const response = await this.request('GET', `/api/atlas/news/${encodeURIComponent(domain)}?limit=${limit}`);
    return response.articles || [];
  }

  async getFundingHistory(domain: string): Promise<any[]> {
    const response = await this.request('GET', `/api/atlas/funding/${encodeURIComponent(domain)}`);
    return response.funding || [];
  }

  async getJobListings(domain: string): Promise<any[]> {
    const response = await this.request('GET', `/api/atlas/jobs/${encodeURIComponent(domain)}`);
    return response.jobs || [];
  }

  // Prospect research - combine all signals
  async researchProspect(params: {
    company?: string;
    domain?: string;
    contact_email?: string;
  }): Promise<{
    company: AtlasCompany;
    intelligence: AtlasIntelligence;
    recommendation: string;
    outreach_templates: string[];
  }> {
    // Enrich company data
    const company = await this.enrichCompany(params);

    // Get full intelligence
    const intelligence = await this.getIntelligence(company.domain);

    // Generate recommendation
    const signals = intelligence.company.signals || [];
    const hasFunding = signals.some(s => s.type === 'funding');
    const hasHiring = signals.some(s => s.type === 'hiring');
    const hasNews = intelligence.news.length > 0;

    let recommendation = 'standard';
    if (hasFunding && hasHiring) recommendation = 'hot';
    if (hasNews) recommendation = 'engaged';

    // Generate outreach templates
    const templates = this.generateOutreachTemplates(company, intelligence);

    return {
      company,
      intelligence,
      recommendation,
      outreach_templates: templates,
    };
  }

  private generateOutreachTemplates(company: AtlasCompany, intelligence: AtlasIntelligence): string[] {
    const templates: string[] = [];
    const name = company.name;

    // Funding-based template
    if (company.funding && company.funding.length > 0) {
      const latest = company.funding[0];
      templates.push(`Hi, I noticed ${name} recently raised ${latest.amount} in ${latest.round} funding. Congrats on the milestone! We're helping similar companies optimize their growth stack...`);
    }

    // Hiring-based template
    if (intelligence.jobListings.length > 0) {
      const jobs = intelligence.jobListings.slice(0, 3).map((j: any) => j.title).join(', ');
      templates.push(`Hi, I see ${name} is growing your team - particularly hiring for ${jobs}. We've helped companies scale their operations during rapid growth phases...`);
    }

    // News-based template
    if (intelligence.news.length > 0) {
      const latestNews = intelligence.news[0];
      templates.push(`Hi, saw your recent news about ${latestNews.title}. Fascinating direction for ${name}. Would love to share how we're helping similar companies in the ${company.industry[0]} space...`);
    }

    // Standard template
    templates.push(`Hi, I came across ${name} and was impressed by your work in ${company.industry.join(', ')}. Would love to explore if there's a fit for a quick chat...`);

    return templates;
  }
}

export default new REZAtlasConnector();
