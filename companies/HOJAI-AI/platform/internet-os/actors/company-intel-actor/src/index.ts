/**
 * Company Intelligence Actor - Multi-Source Aggregator
 * Combines data from multiple free APIs:
 * - Clearbit (free tier: 50k calls/mo)
 * - OpenCorporates (free basic)
 * - LinkedIn via Proxycurl
 * - Levels.fyi (salaries)
 *
 * Setup:
 * - CLEARBIT_API_KEY (optional, free tier available)
 * - Uses free sources by default
 */

import { Actor, ActorOutput, fetchUrl } from '@hojai/actor-runtime';

const CLEARBIT_API = 'https://company.clearbit.com/v2';
const OPENCORPORATES = 'https://api.opencorporates.com/v0.1';

export interface CompanyProfile {
  name: string;
  domain: string;
  description?: string;
  founded?: string;
  location?: string;
  country?: string;
  logo?: string;
  linkedin?: {
    handle?: string;
    employees?: number;
  };
  twitter?: {
    handle?: string;
    followers?: number;
  };
  crunchbase?: {
    handle?: string;
    funding?: number;
  };
  metrics?: {
    employees?: number;
    revenue?: string;
    raised?: number;
  };
  tech?: string[];
  category?: string;
}

export interface CompetitorAnalysis {
  company: string;
  competitors: {
    name: string;
    domain: string;
    description?: string;
    funding?: number;
  }[];
  marketPosition?: string;
}

export class CompanyIntelActor extends Actor {
  private clearbitKey?: string;

  constructor(clearbitKey?: string) {
    super({
      id: 'company-intel',
      name: 'Company Intelligence Actor',
      description: 'Comprehensive company research from multiple free sources',
      version: '2.0.0',
      capabilities: ['company_profile', 'competitor_analysis', 'people', 'funding', 'aggregated'],
      rateLimit: { requests: 50, window: 60000 },
    });
    this.clearbitKey = clearbitKey || process.env.CLEARBIT_API_KEY;
  }

  async scrape(input: any): Promise<ActorOutput> {
    try {
      const action = input.action || 'enrich';

      switch (action) {
        case 'enrich':
          return await this.enrichCompany(input.params);
        case 'search':
          return await this.searchCompanies(input.params);
        case 'competitors':
          return await this.analyzeCompetitors(input.params);
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Enrich company by domain or name
   */
  private async enrichCompany(params: {
    domain?: string;
    name?: string;
    includeLinkedin?: boolean;
  }): Promise<ActorOutput> {
    if (!params.domain && !params.name) {
      return { success: false, error: 'domain or name is required' };
    }

    // Try Clearbit first (best data)
    if (this.clearbitKey && params.domain) {
      try {
        const profile = await this.enrichClearbit(params.domain);
        return {
          success: true,
          data: profile,
          metadata: {
            scrapedAt: new Date().toISOString(),
            source: 'clearbit',
            itemsFound: 1,
            duration: 0,
          },
        };
      } catch {
        // Fall through to free sources
      }
    }

    // Free: try OpenCorporates
    if (params.name) {
      try {
        const profile = await this.enrichOpenCorporates(params.name);
        if (profile) {
          return {
            success: true,
            data: profile,
            metadata: {
              scrapedAt: new Date().toISOString(),
              source: 'opencorporates',
              itemsFound: 1,
              duration: 0,
            },
          };
        }
      } catch {
        // Fall through
      }
    }

    // Fallback: scrape company website
    if (params.domain) {
      try {
        const profile = await this.enrichWebsite(params.domain);
        return {
          success: true,
          data: profile,
          metadata: {
            scrapedAt: new Date().toISOString(),
            source: 'website-analysis',
            itemsFound: 1,
            duration: 0,
          },
        };
      } catch {
        // Last resort: return partial data
      }
    }

    return {
      success: false,
      error: 'Could not enrich company. Try providing a domain or set CLEARBIT_API_KEY.',
    };
  }

  private async enrichClearbit(domain: string): Promise<CompanyProfile> {
    const response = await fetchUrl(`${CLEARBIT_API}/companies/find?domain=${domain}`, {
      headers: {
        Authorization: `Bearer ${this.clearbitKey}`,
        Accept: 'application/json',
      },
      timeout: 15000,
    });

    const data = JSON.parse(response);

    return {
      name: data.name || '',
      domain: data.domain || domain,
      description: data.description,
      founded: data.founded_year?.toString(),
      location: data.geo?.city,
      country: data.geo?.country,
      logo: data.logo,
      linkedin: {
        handle: data.linkedin?.handle,
        employees: data.metrics?.employees,
      },
      twitter: {
        handle: data.twitter?.handle,
        followers: data.twitter?.followers,
      },
      crunchbase: {
        handle: data.crunchbase?.handle,
        funding: data.metrics?.raised,
      },
      metrics: {
        employees: data.metrics?.employees,
        revenue: data.metrics?.annualRevenue,
        raised: data.metrics?.raised,
      },
      tech: data.tech || [],
      category: data.category?.industry,
    };
  }

  private async enrichOpenCorporates(query: string): Promise<CompanyProfile | null> {
    const response = await fetchUrl(
      `${OPENCORPORATES}/companies/search?q=${encodeURIComponent(query)}&per_page=1`,
      { timeout: 15000 }
    );

    const data = JSON.parse(response);
    const company = data.results?.companies?.[0]?.company;

    if (!company) return null;

    return {
      name: company.name || query,
      domain: '',
      description: company.current_status,
      founded: company.incorporation_date,
      location: company.registered_address,
      category: company.company_type,
    };
  }

  private async enrichWebsite(domain: string): Promise<CompanyProfile> {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;

    try {
      const html = await fetchUrl(url, { timeout: 15000 });

      // Extract from meta tags
      const nameMatch = html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i)?.[1] ||
                       html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

      const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] ||
                       html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1];

      const logoMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1];

      const twitterMatch = html.match(/twitter:site[^>]+content="@([^"]+)"/i)?.[1];
      const linkedinMatch = html.match(/linkedin\.com\/company\/([^\/\s"']+)/i)?.[1];

      return {
        name: nameMatch?.trim() || domain,
        domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        description: descMatch?.trim(),
        logo: logoMatch,
        linkedin: linkedinMatch ? { handle: linkedinMatch } : undefined,
        twitter: twitterMatch ? { handle: twitterMatch } : undefined,
      };
    } catch {
      return {
        name: domain,
        domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      };
    }
  }

  /**
   * Search for companies by name
   */
  private async searchCompanies(params: {
    query: string;
    limit?: number;
  }): Promise<ActorOutput> {
    if (!params.query) {
      return { success: false, error: 'query is required' };
    }

    const limit = Math.min(params.limit || 25, 100);
    const companies: CompanyProfile[] = [];

    // Try Clearbit
    if (this.clearbitKey) {
      try {
        const response = await fetchUrl(
          `${CLEARBIT_API}/companies/search?query=${encodeURIComponent(params.query)}&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${this.clearbitKey}`,
              Accept: 'application/json',
            },
            timeout: 15000,
          }
        );

        const data = JSON.parse(response);
        for (const c of data.results || []) {
          companies.push({
            name: c.name,
            domain: c.domain,
            description: c.description,
            location: c.geo?.city,
            country: c.geo?.country,
            metrics: { employees: c.metrics?.employees },
            category: c.category?.industry,
          });
        }
      } catch {
        // Fall through to OpenCorporates
      }
    }

    // Fallback: OpenCorporates
    if (companies.length === 0) {
      try {
        const response = await fetchUrl(
          `${OPENCORPORATES}/companies/search?q=${encodeURIComponent(params.query)}&per_page=${limit}`,
          { timeout: 15000 }
        );

        const data = JSON.parse(response);
        for (const result of data.results?.companies || []) {
          const c = result.company;
          companies.push({
            name: c.name,
            domain: '',
            description: c.current_status,
            founded: c.incorporation_date,
            location: c.registered_address,
          });
        }
      } catch {
        // Nothing worked
      }
    }

    return {
      success: companies.length > 0,
      data: { companies, count: companies.length, query: params.query },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: companies.length > 0 ? (this.clearbitKey ? 'clearbit' : 'opencorporates') : 'none',
        itemsFound: companies.length,
        duration: 0,
      },
    };
  }

  /**
   * Analyze competitors
   */
  private async analyzeCompetitors(params: {
    company: string;
    limit?: number;
  }): Promise<ActorOutput> {
    if (!params.company) {
      return { success: false, error: 'company is required' };
    }

    // Enrich the company first
    const enrichResult = await this.enrichCompany({ name: params.company });
    if (!enrichResult.success) {
      return enrichResult;
    }

    const company = enrichResult.data as CompanyProfile;
    const limit = Math.min(params.limit || 10, 50);

    // Search for similar companies in same industry/location
    const searchResult = await this.searchCompanies({
      query: `${params.company} ${company.category || ''}`,
      limit,
    });

    const competitors = ((searchResult.data as any)?.companies || [])
      .filter((c: CompanyProfile) => c.name !== company.name)
      .slice(0, limit);

    return {
      success: true,
      data: {
        company: company.name,
        competitors,
        marketPosition: competitors.length > 0
          ? `${company.name} is a ${company.category || 'industry'} company competing with ${competitors.length} similar companies.`
          : `${company.name} is a standalone ${company.category || 'industry'} company.`,
      },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'aggregated',
        itemsFound: competitors.length + 1,
        duration: 0,
      },
    };
  }

  async validate(input: any): Promise<boolean> {
    return !!(input?.params?.domain || input?.params?.name || input?.params?.query);
  }
}

export default CompanyIntelActor;