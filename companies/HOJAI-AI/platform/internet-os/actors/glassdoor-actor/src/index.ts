/**
 * Glassdoor Actor - Levels.fyi API Version
 * Uses Levels.fyi for company salary data (free public API)
 *
 * Setup: No API key needed for basic access!
 *
 * Data available:
 * - Company salaries by role, level, location
 * - Company reviews and ratings
 * - Interview questions
 * - Job listings
 *
 * Note: Glassdoor scraping is blocked. Using Levels.fyi as the legal alternative.
 */

import { Actor, ActorOutput, fetchUrl } from '@hojai/actor-runtime';

const LEVELS_API = 'https://www.levels.fyi';
const LEVELS_GRAPHQL = 'https://graphql.levels.fyi';

export interface SalaryData {
  id: string;
  company: string;
  jobTitle: string;
  level: string;
  location: string;
  baseSalary: number;
  totalCompensation?: number;
  yearsExperience: number;
  education?: string;
  gender?: string;
  race?: string;
  bonuses?: {
    bonus?: number;
    stock?: number;
    profitSharing?: number;
  };
  tags?: string[];
}

export interface CompanyOverview {
  name: string;
  description?: string;
  website?: string;
  headquarters?: string;
  industry?: string;
  founded?: number;
  size?: string;
  revenue?: string;
  ratings?: {
    overall?: number;
    culture?: number;
    workLife?: number;
    compensation?: number;
    growth?: number;
    opportunity?: number;
    safety?: number;
    values?: number;
  };
  employeeCount?: string;
}

export class GlassdoorActor extends Actor {
  constructor() {
    super({
      id: 'glassway',
      name: 'Company Salary & Review Actor',
      description: 'Extract company salaries, reviews, and ratings via Levels.fyi API',
      version: '2.0.0',
      capabilities: ['salaries', 'companies', 'reviews', 'interviews', 'api-based'],
      rateLimit: { requests: 60, window: 60000 },
    });
  }

  private async gqlRequest(query: string, variables: Record<string, any> = {}): Promise<any> {
    const response = await fetch(LEVELS_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }
    return response.json();
  }

  async scrape(input: any): Promise<ActorOutput> {
    try {
      const action = input.action || 'search_salaries';

      switch (action) {
        case 'search_salaries':
          return await this.searchSalaries(input.params);
        case 'get_company':
          return await this.getCompany(input.params);
        case 'get_interviews':
          return await this.getInterviews(input.params);
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
   * Search salaries by company, role, or keyword
   */
  private async searchSalaries(params: {
    company?: string;
    jobTitle?: string;
    location?: string;
    limit?: number;
  }): Promise<ActorOutput> {
    const limit = Math.min(params.limit || 25, 100);

    const query = `
      query SearchSalaries($company: String, $title: String, $location: String, $limit: Int) {
        searchSalary(company: $company, title: $title, location: $location, limit: $limit) {
          results {
            id
            company {
              name
              logoUrl
            }
            title
            level
            location
            baseSalary
            totalCompensation
            yearsExperience
            education
            gender
            race
            bonus
            stock
            profitSharing
            tags
          }
          count
        }
      }
    `;

    try {
      const data = await this.gqlRequest(query, {
        company: params.company,
        title: params.jobTitle,
        location: params.location,
        limit,
      });

      const salaries: SalaryData[] = (data.data?.searchSalary?.results || []).map((s: any) => ({
        id: s.id,
        company: s.company?.name || '',
        jobTitle: s.title || '',
        level: s.level || '',
        location: s.location || '',
        baseSalary: s.baseSalary || 0,
        totalCompensation: s.totalCompensation,
        yearsExperience: s.yearsExperience || 0,
        education: s.education,
        gender: s.gender,
        race: s.race,
        bonuses: {
          bonus: s.bonus,
          stock: s.stock,
          profitSharing: s.profitSharing,
        },
        tags: s.tags || [],
      }));

      return {
        success: true,
        data: {
          salaries,
          count: data.data?.searchSalary?.count || salaries.length,
          filters: { company: params.company, jobTitle: params.jobTitle, location: params.location },
        },
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'levels-fyi-api',
          itemsFound: salaries.length,
          duration: 0,
        },
      };
    } catch {
      // Fallback: try scraping the public page
      return await this.searchSalariesFallback(params);
    }
  }

  /**
   * Fallback: scrape the public website
   */
  private async searchSalariesFallback(params: {
    company?: string;
    jobTitle?: string;
    location?: string;
    limit?: number;
  }): Promise<ActorOutput> {
    let url = `${LEVELS_API}/Salaries?`;
    if (params.company) url += `&cName=${encodeURIComponent(params.company)}`;
    if (params.jobTitle) url += `&k=${encodeURIComponent(params.jobTitle)}`;
    if (params.location) url += `&l=${encodeURIComponent(params.location)}`;

    try {
      const html = await fetchUrl(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (HOJAI InternetOS bot)' },
        timeout: 15000,
      });

      // Parse salary cards from the HTML
      const salaries = this.parseSalaryCards(html, params.limit || 25);

      return {
        success: salaries.length > 0,
        data: { salaries, count: salaries.length, fallback: true },
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'levels-fyi-web',
          itemsFound: salaries.length,
          duration: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Levels.fyi unavailable: ${(error as Error).message}`,
      };
    }
  }

  private parseSalaryCards(html: string, limit: number): SalaryData[] {
    // Simple regex-based extraction for salary cards
    const salaries: SalaryData[] = [];
    const cardRegex = /data-salary-id="([^"]+)"/g;
    let match;

    while ((match = cardRegex.exec(html)) && salaries.length < limit) {
      const id = match[1];
      // Try to extract salary info from surrounding context
      const start = Math.max(0, match.index - 500);
      const end = Math.min(html.length, match.index + 500);
      const ctx = html.slice(start, end);

      const companyMatch = ctx.match(/company[^>]*>([^<]+)/);
      const titleMatch = ctx.match(/(?:title|role)[^>]*>([^<]+)/);
      const salaryMatch = ctx.match(/\$[\d,]+/);

      if (salaryMatch) {
        salaries.push({
          id,
          company: companyMatch?.[1]?.trim() || '',
          jobTitle: titleMatch?.[1]?.trim() || '',
          level: '',
          location: '',
          baseSalary: parseInt(salaryMatch[0].replace(/[$,]/g, '')),
          yearsExperience: 0,
        });
      }
    }

    return salaries;
  }

  /**
   * Get company overview
   */
  private async getCompany(params: { company: string }): Promise<ActorOutput> {
    if (!params.company) {
      return { success: false, error: 'company is required' };
    }

    const query = `
      query GetCompany($name: String!) {
        company(name: $name) {
          name
          description
          website
          headquarters
          industry
          founded
          size
          revenue
          ratings {
            overall
            culture
            workLife
            compensation
            growth
            opportunity
          }
        }
      }
    `;

    try {
      const data = await this.gqlRequest(query, { name: params.company });

      if (!data.data?.company) {
        return { success: false, error: `Company not found: ${params.company}` };
      }

      const c = data.data.company;
      const overview: CompanyOverview = {
        name: c.name,
        description: c.description,
        website: c.website,
        headquarters: c.headquarters,
        industry: c.industry,
        founded: c.founded,
        size: c.size,
        revenue: c.revenue,
        ratings: c.ratings,
      };

      return {
        success: true,
        data: overview,
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'levels-fyi-api',
          itemsFound: 1,
          duration: 0,
        },
      };
    } catch {
      return {
        success: false,
        error: 'Levels.fyi GraphQL API unavailable. Try the public website.',
      };
    }
  }

  /**
   * Get interview questions for a company/role
   */
  private async getInterviews(params: {
    company?: string;
    jobTitle?: string;
    limit?: number;
  }): Promise<ActorOutput> {
    const limit = Math.min(params.limit || 25, 100);

    // Try scraping interview page
    let url = `${LEVELS_API}/Interview`;
    if (params.company) url += `?cName=${encodeURIComponent(params.company)}`;

    try {
      const html = await fetchUrl(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (HOJAI InternetOS bot)' },
        timeout: 15000,
      });

      // Parse interview Q&A from HTML
      const interviews: any[] = [];
      const qRegex = /<span[^>]*class="[^"]*question[^"]*"[^>]*>([^<]+)/g;
      let match;

      while ((match = qRegex.exec(html)) && interviews.length < limit) {
        interviews.push({
          question: match[1].trim(),
          company: params.company,
          jobTitle: params.jobTitle,
        });
      }

      return {
        success: interviews.length > 0,
        data: { interviews, count: interviews.length },
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'levels-fyi-web',
          itemsFound: interviews.length,
          duration: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch interviews: ${(error as Error).message}`,
      };
    }
  }

  async validate(input: any): Promise<boolean> {
    return !!(input?.params?.company || input?.params?.jobTitle || input?.params?.query);
  }
}

export default GlassdoorActor;