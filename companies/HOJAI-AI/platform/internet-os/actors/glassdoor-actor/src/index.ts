/**
 * Glassdoor Actor
 * Extract company reviews, salaries, interviews, and ratings from Glassdoor
 */

// @ts-ignore - Using compiled output
import { Actor, ActorOutput, fetchUrl, parseHtml } from '../../actor-runtime/dist/index.js';
import type { CheerioAPI } from 'cheerio';

// Cheerio element type
type CheerioElement = ReturnType<CheerioAPI>[number];

export interface GlassdoorConfig {
  id: 'glassdoor';
  name: 'Glassdoor Actor';
  description: 'Extract company reviews, salaries, interviews, and ratings from Glassdoor';
  version: '1.0.0';
  capabilities: ['reviews', 'salaries', 'interviews', 'ratings'];
  rateLimit: { requests: number; window: number };
}

export interface CompanyOverview {
  name: string;
  overallRating?: number;
  cultureAndValues?: number;
  diversityAndInclusion?: number;
  seniorLeadership?: number;
  workLifeBalance?: number;
  careerOpportunities?: number;
  benefits?: number;
  approvedBy?: string;
  headquarters?: string;
  industry?: string;
  revenue?: string;
  competitors?: string[];
  description?: string;
  website?: string;
  founded?: string;
  employees?: string;
  logo?: string;
}

export interface Review {
  id?: string;
  author?: string;
  jobTitle?: string;
  location?: string;
  date?: string;
  overallRating?: number;
  recommend?: string;
  ceoApproval?: string;
  businessOutlook?: string;
  title?: string;
  pros?: string;
  cons?: string;
  helpfullVotes?: number;
}

export interface Salary {
  id?: string;
  jobTitle?: string;
  basePay?: number;
  totalPay?: number;
  additionalPay?: string;
  location?: string;
  employer?: string;
  datePosted?: string;
  payPeriod?: string;
  isInternationalJobTitle?: boolean;
}

export interface Interview {
  id?: string;
  jobTitle?: string;
  company?: string;
  date?: string;
  difficulty?: string;
  experience?: string;
  offer?: string;
  questions?: string[];
  duration?: string;
  source?: string;
}

// Action types
export type GlassdoorAction = 'search_company' | 'get_company_overview' | 'get_salaries' | 'get_interviews';

export interface GlassdoorInput {
  action: GlassdoorAction;
  companyName?: string;
  companyId?: string;
  location?: string;
  maxResults?: number;
}

export class GlassdoorActor extends Actor {
  private readonly BASE_URL = 'https://www.glassdoor.com';

  constructor() {
    super({
      id: 'glassdoor',
      name: 'Glassdoor Actor',
      description: 'Extract company reviews, salaries, interviews, and ratings from Glassdoor',
      version: '1.0.0',
      capabilities: ['reviews', 'salaries', 'interviews', 'ratings'],
      rateLimit: { requests: 10, window: 60000 },
    });
  }

  async scrape(input: GlassdoorInput): Promise<ActorOutput> {
    const { action, companyName, companyId, maxResults = 10 } = input;

    try {
      switch (action) {
        case 'search_company':
          if (!companyName) throw new Error('companyName is required for search_company');
          return await this.searchCompany(companyName, maxResults);

        case 'get_company_overview':
          if (!companyId) throw new Error('companyId is required for get_company_overview');
          return await this.getCompanyOverview(companyId);

        case 'get_salaries':
          if (!companyId) throw new Error('companyId is required for get_salaries');
          return await this.getSalaries(companyId, maxResults);

        case 'get_interviews':
          if (!companyId) throw new Error('companyId is required for get_interviews');
          return await this.getInterviews(companyId, maxResults);

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
      };
    }
  }

  /**
   * Search for companies on Glassdoor
   */
  async searchCompany(query: string, maxResults: number = 10): Promise<ActorOutput> {
    try {
      const searchUrl = `${this.BASE_URL}/Search.htm?keyword=${encodeURIComponent(query)}`;
      const html = await fetchUrl(searchUrl, { timeout: 30000 });

      const companies = this.parseSearchResults(html, maxResults);

      return {
        success: true,
        data: {
          query,
          results: companies,
          totalResults: companies.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  }

  /**
   * Get company overview including ratings
   */
  async getCompanyOverview(companyId: string): Promise<ActorOutput> {
    try {
      const overviewUrl = `${this.BASE_URL}/Overview/Working-at-${companyId}-EI_IE${companyId}.htm`;
      const html = await fetchUrl(overviewUrl, { timeout: 30000 });

      const overview = this.parseCompanyOverview(html, companyId);

      return {
        success: true,
        data: overview,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get company overview',
      };
    }
  }

  /**
   * Get salary information for a company
   */
  async getSalaries(companyId: string, maxResults: number = 10): Promise<ActorOutput> {
    try {
      const salariesUrl = `${this.BASE_URL}/Salary/Working-at-${companyId}-EI_IE${companyId}.htm`;
      const html = await fetchUrl(salariesUrl, { timeout: 30000 });

      const salaries = this.parseSalaries(html, maxResults);

      return {
        success: true,
        data: {
          companyId,
          salaries,
          totalSalaries: salaries.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get salaries',
      };
    }
  }

  /**
   * Get interview questions for a company
   */
  async getInterviews(companyId: string, maxResults: number = 10): Promise<ActorOutput> {
    try {
      const interviewsUrl = `${this.BASE_URL}/Interview/Working-at-${companyId}-EI_IE${companyId}.htm`;
      const html = await fetchUrl(interviewsUrl, { timeout: 30000 });

      const interviews = this.parseInterviews(html, maxResults);

      return {
        success: true,
        data: {
          companyId,
          interviews,
          totalInterviews: interviews.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get interviews',
      };
    }
  }

  private parseSearchResults(html: string, maxResults: number): Array<{ id: string; name: string; industry?: string; location?: string; rating?: number }> {
    const results: Array<{ id: string; name: string; industry?: string; location?: string; rating?: number }> = [];

    try {
      const $ = parseHtml(html);

      // Parse company search results from JSON data
      const scriptMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s);
      if (scriptMatch) {
        try {
          const stateMatch = scriptMatch[1].match(/"employers":\s*\[(.*?)\]/s);
          if (stateMatch) {
            const employers = JSON.parse(`[${stateMatch[1]}]`);
            for (const emp of employers.slice(0, maxResults)) {
              results.push({
                id: emp.id?.toString() || '',
                name: emp.name || emp.employerName || '',
                industry: emp.industry,
                location: emp.headline || emp.location,
                rating: emp.avgRating || emp.overallRating,
              });
            }
          }
        } catch {
          // Fallback parsing
        }
      }

      // Alternative: Parse from HTML structure
      if (results.length === 0) {
        const companyLinks = $('a[href*="/Overview/Working-at"]').slice(0, maxResults);

        companyLinks.each((_: number, link: CheerioElement) => {
          const href = $(link).attr('href') || '';
          const idMatch = href.match(/EI_IE(\d+)/);
          const id = idMatch ? idMatch[1] : '';
          const name = $(link).text().trim();

          if (name && id) {
            results.push({ id, name });
          }
        });
      }
    } catch {
      // Return empty results on parse error
    }

    return results.slice(0, maxResults);
  }

  private parseCompanyOverview(html: string, companyId: string): CompanyOverview {
    const overview: CompanyOverview = {
      name: '',
    };

    try {
      const $ = parseHtml(html);

      // Extract company name
      const nameEl = $('h1[data-test="employer-short-name"]').first();
      overview.name = nameEl.text().trim() || $('h1').first().text().trim() || '';

      // Extract ratings from JSON-LD
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
      if (jsonLdMatch) {
        try {
          const ldJson = JSON.parse(jsonLdMatch[1]);
          if (ldJson.aggregateRating) {
            overview.overallRating = ldJson.aggregateRating.ratingValue;
          }
        } catch {
          // Continue with HTML parsing
        }
      }

      // Extract rating bars
      const ratingBars = $('[data-test="rating-cell"]');
      ratingBars.each((_: number, bar: CheerioElement) => {
        const label = $(bar).find('.ratingCell__RatingLabel').text().trim().toLowerCase();
        const valueEl = $(bar).find('.ratingCell__RatingValue');
        const value = parseFloat(valueEl.text().trim());

        if (label.includes('culture') || label.includes('values')) {
          overview.cultureAndValues = value;
        } else if (label.includes('diversity')) {
          overview.diversityAndInclusion = value;
        } else if (label.includes('senior') || label.includes('leadership')) {
          overview.seniorLeadership = value;
        } else if (label.includes('work') || label.includes('life')) {
          overview.workLifeBalance = value;
        } else if (label.includes('career') || label.includes('opportunit')) {
          overview.careerOpportunities = value;
        } else if (label.includes('benefit')) {
          overview.benefits = value;
        }
      });

      // Extract description
      const descEl = $('[data-test="employer-description"]').first();
      overview.description = descEl.text().trim() || $('p').first().text().trim();

      // Extract metadata from lists
      const metaItems = $('ul[data-test="employer-details"] li');
      metaItems.each((_: number, item: CheerioElement) => {
        const text = $(item).text().trim();
        if (text.includes('Headquarters:')) {
          overview.headquarters = text.replace('Headquarters:', '').trim();
        } else if (text.includes('Founded:')) {
          overview.founded = text.replace('Founded:', '').trim();
        } else if (text.includes('Revenue:')) {
          overview.revenue = text.replace('Revenue:', '').trim();
        } else if (text.includes('Industry:')) {
          overview.industry = text.replace('Industry:', '').trim();
        } else if (text.includes('Company Size:') || text.includes('Employees:')) {
          overview.employees = text.replace('Company Size:', '').replace('Employees:', '').trim();
        }
      });

      // Extract logo
      const logoEl = $('[data-test="employer-logo"] img');
      overview.logo = logoEl.attr('src') || logoEl.attr('data-src') || '';

      // Extract website
      const websiteEl = $('a[data-test="employer-website"]');
      overview.website = websiteEl.attr('href') || '';

    } catch {
      // Return partial data on parse error
    }

    return overview;
  }

  private parseSalaries(html: string, maxResults: number): Salary[] {
    const salaries: Salary[] = [];

    try {
      const $ = parseHtml(html);

      // Parse salary cards
      const salaryCards = $('[data-test="salary-list-item"]').slice(0, maxResults);

      salaryCards.each((_: number, card: CheerioElement) => {
        const jobTitleEl = $(card).find('[data-test="salary-job-title"]');
        const payEl = $(card).find('[data-test="salary-pay-range"]');
        const locationEl = $(card).find('[data-test="salary-location"]');
        const dateEl = $(card).find('[data-test="salary-date-posted"]');

        const jobTitle = jobTitleEl.text().trim();
        const payText = payEl.text().trim();
        const payMatch = payText.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?/g);

        if (jobTitle) {
          salaries.push({
            jobTitle,
            basePay: payMatch ? this.parsePay(payMatch[0]) : undefined,
            totalPay: payMatch && payMatch.length > 1 ? this.parsePay(payMatch[1]) : undefined,
            location: locationEl.text().trim(),
            datePosted: dateEl.text().trim(),
          });
        }
      });

      // Alternative parsing from JSON data
      if (salaries.length === 0) {
        const scriptMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s);
        if (scriptMatch) {
          try {
            const stateMatch = scriptMatch[1].match(/"salaries":\s*\[(.*?)\]/s);
            if (stateMatch) {
              const parsedSalaries = JSON.parse(`[{${stateMatch[1]}}]`);
              for (const sal of parsedSalaries.slice(0, maxResults)) {
                salaries.push({
                  jobTitle: sal.jobTitle || sal.title,
                  basePay: sal.basePay || sal.pay,
                  location: sal.location,
                  datePosted: sal.datePosted || sal.publishedAt,
                });
              }
            }
          } catch {
            // Continue
          }
        }
      }
    } catch {
      // Return partial data
    }

    return salaries.slice(0, maxResults);
  }

  private parseInterviews(html: string, maxResults: number): Interview[] {
    const interviews: Interview[] = [];

    try {
      const $ = parseHtml(html);

      // Parse interview cards
      const interviewCards = $('[data-test="interview-list-item"]').slice(0, maxResults);

      interviewCards.each((_: number, card: CheerioElement) => {
        const jobTitleEl = $(card).find('[data-test="interview-job-title"]');
        const dateEl = $(card).find('[data-test="interview-date"]');
        const difficultyEl = $(card).find('[data-test="interview-difficulty"]');
        const experienceEl = $(card).find('[data-test="interview-experience"]');
        const questionsEl = $(card).find('[data-test="interview-questions"]');

        const jobTitle = jobTitleEl.text().trim();

        if (jobTitle) {
          interviews.push({
            jobTitle,
            date: dateEl.text().trim(),
            difficulty: difficultyEl.text().trim(),
            experience: experienceEl.text().trim(),
            questions: questionsEl.text().trim().split(/[.?]\s+/).filter(Boolean),
          });
        }
      });

      // Alternative parsing
      if (interviews.length === 0) {
        const scriptMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s);
        if (scriptMatch) {
          try {
            const stateMatch = scriptMatch[1].match(/"interviews":\s*\[(.*?)\]/s);
            if (stateMatch) {
              const parsedInterviews = JSON.parse(`[{${stateMatch[1]}}]`);
              for (const int of parsedInterviews.slice(0, maxResults)) {
                interviews.push({
                  jobTitle: int.jobTitle || int.position,
                  date: int.date || int.createdAt,
                  difficulty: int.difficulty,
                  experience: int.experience || int.candidateExperience,
                  questions: int.questions || int.interviewQuestions,
                });
              }
            }
          } catch {
            // Continue
          }
        }
      }
    } catch {
      // Return partial data
    }

    return interviews.slice(0, maxResults);
  }

  private parsePay(payText: string): number {
    const cleaned = payText.replace(/[$,]/g, '');
    return parseInt(cleaned) || 0;
  }

  async validate(input: any): Promise<boolean> {
    if (!input || typeof input !== 'object') return false;

    const { action } = input;

    switch (action) {
      case 'search_company':
        return !!(input.companyName && typeof input.companyName === 'string');
      case 'get_company_overview':
        return !!(input.companyId && typeof input.companyId === 'string');
      case 'get_salaries':
        return !!(input.companyId && typeof input.companyId === 'string');
      case 'get_interviews':
        return !!(input.companyId && typeof input.companyId === 'string');
      default:
        return false;
    }
  }
}

export default new GlassdoorActor();
