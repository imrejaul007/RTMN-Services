/**
 * Crunchbase Actor - API Version
 * Uses Crunchbase API for company, funding, and people data
 *
 * Setup:
 * 1. Sign up at https://crunchbase.com/
 * 2. Get API key from https://crunchbase.com/browse/v4/api-explorer/
 * 3. Set CRUNCHBASE_API_KEY environment variable
 *
 * Free tier: Limited queries
 * Paid: Full access
 *
 * Alternative free sources:
 * - OpenCorporates (https://opencorporates.com/) - company data
 * - PitchBook (paid)
 * - CB Insights (paid)
 */

import { Actor, ActorOutput, fetchUrl } from '@hojai/actor-runtime';

const CB_API = 'https://api.crunchbase.com/api/v4';

export interface CompanyInfo {
  name: string;
  permalink: string;
  shortDescription?: string;
  description?: string;
  foundedOn?: string;
  closedOn?: string;
  legalType?: string;
  locationIdentifiers: string[];
  headquarters?: string;
  city?: string;
  country?: string;
  website?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  email?: string;
  phone?: string;
  funding?: {
    totalRaised?: number;
    fundingType?: string;
    rounds?: number;
  };
  headcount?: string;
  stockSymbol?: string;
  stockExchange?: string;
}

export interface FundingRound {
  id: string;
  type: string;
  announcedOn?: string;
  raisedAmount?: number;
  raisedCurrencyCode?: string;
  valuation?: number;
  valuationCurrencyCode?: string;
  leadInvestors?: string[];
  investors?: string[];
  numInvestors?: number;
}

export interface PeopleInfo {
  name: string;
  permalink: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  company?: string;
  location?: string;
  bio?: string;
  linkedin?: string;
  twitter?: string;
}

export class CrunchbaseActor extends Actor {
  private apiKey?: string;
  private readonly API_URL = 'https://api.crunchbase.com/api/v4';

  constructor(apiKey?: string) {
    super({
      id: 'crunchbase',
      name: 'Crunchbase API Actor',
      description: 'Company, funding, and people data from Crunchbase API',
      version: '2.0.0',
      capabilities: ['companies', 'funding', 'people', 'acquisitions', 'api-based'],
      rateLimit: { requests: 60, window: 60000 },
    });
    this.apiKey = apiKey || process.env.CRUNCHBASE_API_KEY;
  }

  private async cbRequest(endpoint: string, postBody?: any): Promise<any> {
    if (!this.apiKey) {
      throw new Error(
        'Crunchbase API key required. Set CRUNCHBASE_API_KEY env var. ' +
        'Get a key at https://crunchbase.com/browse/v4/api-explorer/'
      );
    }

    const url = `${this.API_URL}${endpoint}`;
    const options: any = {
      headers: {
        'X-cb-user-key': this.apiKey,
        'Accept': 'application/json',
        ...(postBody ? { 'Content-Type': 'application/json' } : {}),
      },
      signal: AbortSignal.timeout(30000),
    };
    if (postBody) options.body = JSON.stringify(postBody);

    const response = await fetch(url, options);
    const text = await response.text();
    return JSON.parse(text);
  }

  async scrape(input: any): Promise<ActorOutput> {
    try {
      const action = input.action || 'get_company';

      switch (action) {
        case 'get_company':
          return await this.getCompany(input.params);
        case 'search_companies':
          return await this.searchCompanies(input.params);
        case 'get_funding':
          return await this.getFunding(input.params);
        case 'get_people':
          return await this.getPeople(input.params);
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('API key')) {
        return {
          success: false,
          error: err.message + '. Use free alternatives: OpenCorporates, PitchBook API, or CB Insights.',
        };
      }
      return { success: false, error: err.message };
    }
  }

  private async getCompany(params: { name?: string; permalink?: string }): Promise<ActorOutput> {
    const identifier = params.permalink || params.name;
    if (!identifier) {
      return { success: false, error: 'name or permalink is required' };
    }

    const slug = identifier.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const data = await this.cbRequest(`/entities/v4/organizations/${slug}?card_ids=fields`);
    const org = data.cards?.fields;

    const company: CompanyInfo = {
      name: org?.name || identifier,
      permalink: slug,
      shortDescription: org?.short_description,
      description: org?.full_description,
      foundedOn: org?.founded_on,
      closedOn: org?.closed_on,
      legalType: org?.legal_type,
      locationIdentifiers: org?.location_identifiers || [],
      headquarters: org?.city_name || org?.region_name,
      city: org?.city_name,
      country: org?.country_code,
      website: org?.website,
      facebook: org?.facebook,
      linkedin: org?.linkedin,
      twitter: org?.twitter,
      email: org?.contact_email,
      phone: org?.phone_number,
      headcount: org?.num_employees_enum,
      stockSymbol: org?.stock_symbol,
      stockExchange: org?.stock_exchange_mic,
    };

    return {
      success: true,
      data: company,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'crunchbase-api',
        itemsFound: 1,
        duration: 0,
      },
    };
  }

  private async searchCompanies(params: { query?: string; limit?: number; after?: string }): Promise<ActorOutput> {
    const limit = Math.min(params.limit || 25, 100);

    const body = {
      query: {
        type: 'Organization',
        ...(params.query ? { term: params.query } : {}),
      },
      field_ids: ['name', 'permalink', 'short_description', 'founded_on', 'location_identifiers', 'website'],
      order: [{ field_id: 'founded_on', sort: 'desc' }],
      limit,
      ...(params.after ? { after: params.after } : {}),
    };

    const data = await this.cbRequest('/queries/v2/search', body);

    const companies = (data.entities || []).map((e: any) => ({
      name: e.properties?.name,
      permalink: e.properties?.permalink,
      shortDescription: e.properties?.short_description,
      foundedOn: e.properties?.founded_on,
      location: e.properties?.location_identifiers?.[0],
      website: e.properties?.website?.value,
    }));

    return {
      success: true,
      data: {
        companies,
        count: companies.length,
        after: data.paging?.next_page_token,
      },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'crunchbase-api',
        itemsFound: companies.length,
        duration: 0,
      },
    };
  }

  private async getFunding(params: { name?: string; permalink?: string }): Promise<ActorOutput> {
    const identifier = params.permalink || params.name;
    if (!identifier) {
      return { success: false, error: 'name or permalink is required' };
    }

    const slug = identifier.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const data = await this.cbRequest(`/entities/v4/funding-rounds?filter.organizations.identifier=${slug}`);

    const rounds: FundingRound[] = (data.entities || []).map((r: any) => ({
      id: r.properties?.identifier || r.uuid,
      type: r.properties?.funding_type,
      announcedOn: r.properties?.announced_on,
      raisedAmount: r.properties?.raised_amount_value_usd,
      raisedCurrencyCode: 'USD',
      valuation: r.properties?.valuation_on_round,
      valuationCurrencyCode: 'USD',
      leadInvestors: r.properties?.lead_investor_uuids,
      investors: r.properties?.investor_uuids,
      numInvestors: r.properties?.num_investors,
    }));

    return {
      success: true,
      data: { rounds, company: slug, totalRaised: rounds.reduce((sum, r) => sum + (r.raisedAmount || 0), 0) },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'crunchbase-api',
        itemsFound: rounds.length,
        duration: 0,
      },
    };
  }

  private async getPeople(params: { query?: string; company?: string; limit?: number }): Promise<ActorOutput> {
    const limit = Math.min(params.limit || 25, 100);

    const body = {
      query: {
        type: 'Person',
        ...(params.query ? { term: params.query } : {}),
        ...(params.company ? { term: params.company } : {}),
      },
      field_ids: ['name', 'permalink', 'title', 'organization_name', 'location_identifiers'],
      order: [{ field_id: 'created_at', sort: 'desc' }],
      limit,
    };

    const data = await this.cbRequest('/queries/v2/search', body);

    const people: PeopleInfo[] = (data.entities || []).map((p: any) => ({
      name: p.properties?.name,
      permalink: p.properties?.permalink,
      title: p.properties?.title,
      company: p.properties?.organization_name,
      location: p.properties?.location_identifiers?.[0],
    }));

    return {
      success: true,
      data: { people, count: people.length },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'crunchbase-api',
        itemsFound: people.length,
        duration: 0,
      },
    };
  }

  async validate(input: any): Promise<boolean> {
    return !!(input?.params?.name || input?.params?.permalink || input?.params?.query);
  }
}

export default CrunchbaseActor;