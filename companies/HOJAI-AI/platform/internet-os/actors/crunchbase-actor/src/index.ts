/**
 * Crunchbase Actor
 * Extract company, funding, and people information from Crunchbase
 */

// @ts-ignore - Using compiled output
import { Actor, ActorOutput, fetchUrl, parseHtml } from '../../actor-runtime/dist/index.js';
import type { CheerioAPI } from 'cheerio';

export interface CrunchbaseConfig {
  id: 'crunchbase';
  name: 'Crunchbase Actor';
  description: 'Extract company, funding, and people information from Crunchbase';
  version: '1.0.0';
  capabilities: ['companies', 'funding', 'people', 'acquisitions'];
  rateLimit: { requests: number; window: number };
}

export interface CompanyInfo {
  name?: string;
  permalink?: string;
  description?: string;
  shortDescription?: string;
  founded?: string;
  headquarters?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  Crunchbase?: string;
  categories?: string[];
  tags?: string[];
  employeeCount?: string;
  totalFunding?: string;
  totalFundingAmount?: number;
  numberOfFundingRounds?: number;
  lastFundingType?: string;
  lastFundingAmount?: string;
  lastFundingDate?: string;
  stockSymbol?: string;
  stockExchange?: string;
  ipoStatus?: string;
  numExits?: number;
  acquiredBy?: string;
  acquiredDate?: string;
  acquisitionPrice?: string;
  status?: string;
  fundingRounds?: FundingRound[];
}

export interface FundingRound {
  type?: string;
  date?: string;
  amount?: string;
  amountRaw?: number;
  currency?: string;
  stage?: string;
  investors?: string[];
  leadInvestors?: string[];
  newsUrl?: string;
}

export interface PersonInfo {
  name?: string;
  permalink?: string;
  title?: string;
  organization?: string;
  organizationPermalink?: string;
  bio?: string;
  image?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  location?: string;
  birthYear?: number;
  affiliations?: string[];
}

export class CrunchbaseActor extends Actor {
  constructor() {
    super({
      id: 'crunchbase',
      name: 'Crunchbase Actor',
      description: 'Extract company, funding, and people information from Crunchbase',
      version: '1.0.0',
      capabilities: ['companies', 'funding', 'people', 'acquisitions'],
      rateLimit: { requests: 10, window: 60000 },
    });
  }

  /**
   * Search for companies
   */
  async search_company(input: {
    query: string;
    maxResults?: number;
    type?: 'companies' | 'people' | 'organizations';
  }): Promise<ActorOutput> {
    const { query, maxResults = 10, type = 'companies' } = input;

    try {
      const searchUrl = `https://www.crunchbase.com/discover/search?query=${encodeURIComponent(query)}&type=${type}`;
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
   * Get detailed company information
   */
  async get_company(input: {
    permalink?: string;
    url?: string;
    includeFunding?: boolean;
    includePeople?: boolean;
  }): Promise<ActorOutput> {
    const { permalink, url, includeFunding = true, includePeople = false } = input;

    try {
      let companyUrl: string;
      if (url) {
        companyUrl = url;
      } else if (permalink) {
        companyUrl = `https://www.crunchbase.com/organization/${permalink}`;
      } else {
        return {
          success: false,
          error: 'Either permalink or url must be provided',
        };
      }

      const html = await fetchUrl(companyUrl, { timeout: 30000 });
      const company = this.parseCompanyPage(html, companyUrl);

      // Optionally get funding rounds
      if (includeFunding && company.permalink) {
        try {
          const fundingHtml = await fetchUrl(`${companyUrl}/funding_rounds`, { timeout: 30000 });
          company.fundingRounds = this.parseFundingRounds(fundingHtml);
        } catch {
          // Funding rounds are optional
        }
      }

      return {
        success: true,
        data: company,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get company info',
      };
    }
  }

  /**
   * Get funding rounds for a company
   */
  async get_funding(input: {
    permalink?: string;
    url?: string;
  }): Promise<ActorOutput> {
    const { permalink, url } = input;

    try {
      let fundingUrl: string;
      if (url) {
        fundingUrl = url.includes('funding') ? url : `${url}/funding_rounds`;
      } else if (permalink) {
        fundingUrl = `https://www.crunchbase.com/organization/${permalink}/funding_rounds`;
      } else {
        return {
          success: false,
          error: 'Either permalink or url must be provided',
        };
      }

      const html = await fetchUrl(fundingUrl, { timeout: 30000 });
      const fundingRounds = this.parseFundingRounds(html);

      return {
        success: true,
        data: {
          rounds: fundingRounds,
          totalRounds: fundingRounds.length,
          totalFunding: this.calculateTotalFunding(fundingRounds),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get funding info',
      };
    }
  }

  /**
   * Get founders and executives for a company
   */
  async get_people(input: {
    permalink?: string;
    url?: string;
    type?: 'founders' | 'executives' | 'all';
  }): Promise<ActorOutput> {
    const { permalink, url, type = 'all' } = input;

    try {
      let peopleUrl: string;
      if (url) {
        peopleUrl = url.includes('people') ? url : `${url}/people`;
      } else if (permalink) {
        peopleUrl = `https://www.crunchbase.com/organization/${permalink}/people`;
      } else {
        return {
          success: false,
          error: 'Either permalink or url must be provided',
        };
      }

      const html = await fetchUrl(peopleUrl, { timeout: 30000 });
      const people = this.parsePeople(html, type);

      return {
        success: true,
        data: {
          people,
          totalPeople: people.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get people info',
      };
    }
  }

  private parseSearchResults(html: string, maxResults: number): Partial<CompanyInfo>[] {
    const results: Partial<CompanyInfo>[] = [];

    try {
      const $ = parseHtml(html);

      // Try to find company cards
      const cards = $('[data-test="entity-card"], .profile-card, .search-result');

      cards.slice(0, maxResults).each((_, card) => {
        const name = $(card).find('[data-test="entity-title"], .entity-title, .title').text().trim();
        const description = $(card).find('[data-test="entity-description"], .description, .snippet').text().trim();
        const location = $(card).find('[data-test="entity-location"], .location, .geo').text().trim();
        const link = $(card).find('a').attr('href') || '';
        const permalinkMatch = link.match(/organization\/([^/?]+)/);

        if (name) {
          results.push({
            name,
            description,
            headquarters: location,
            permalink: permalinkMatch?.[1],
            website: link.startsWith('/') ? `https://www.crunchbase.com${link}` : link,
          });
        }
      });

      // Fallback: look for any links with organization pattern
      if (results.length === 0) {
        const orgLinks = $(`a[href*="/organization/"]`).slice(0, maxResults * 2);
        const seen = new Set<string>();

        orgLinks.each((_, el) => {
          const href = $(el).attr('href') || '';
          const permalinkMatch = href.match(/\/organization\/([^/?]+)/);
          if (permalinkMatch && !seen.has(permalinkMatch[1])) {
            seen.add(permalinkMatch[1]);
            results.push({
              name: $(el).text().trim() || permalinkMatch[1],
              permalink: permalinkMatch[1],
            });
          }
        });
      }
    } catch {
      // Return whatever we found
    }

    return results.slice(0, maxResults);
  }

  private parseCompanyPage(html: string, url: string): CompanyInfo {
    const info: CompanyInfo = {};

    try {
      const $ = parseHtml(html);

      // Extract permalink from URL
      const permalinkMatch = url.match(/\/organization\/([^/?]+)/);
      if (permalinkMatch) {
        info.permalink = permalinkMatch[1];
      }

      // Extract company name
      const titleMatch = html.match(/"name":"([^"]+)"/);
      if (titleMatch) {
        info.name = titleMatch[1];
      } else {
        info.name = $('h1, .company-name, .profile-name').first().text().trim();
      }

      // Extract description
      const descMatch = html.match(/"description":"((?:[^"\\]|\\.)*)"/s);
      if (descMatch) {
        info.description = descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }
      info.shortDescription = $('[data-test="description"], .description, .short-description').first().text().trim();

      // Extract location
      info.address = $('[data-test="address"], .address').first().text().trim();
      info.city = $('[data-test="city"], .city').first().text().trim();
      info.state = $('[data-test="state"], .state').first().text().trim();
      info.country = $('[data-test="country"], .country').first().text().trim();
      info.headquarters = [info.city, info.state, info.country].filter(Boolean).join(', ');

      // Extract founding info
      const foundedMatch = html.match(/"founded_on":"([^"]+)"/);
      if (foundedMatch) {
        info.founded = foundedMatch[1];
      }
      info.founded = $('[data-test="founded"], .founded').first().text().trim() || info.founded;

      // Extract contact info
      info.phone = $('[data-test="phone"], .phone').first().text().trim();
      info.email = $('[data-test="email"], .email').first().text().trim();
      info.website = $('a[href*="http"]:not([href*="crunchbase"])').first().attr('href');

      // Extract social links
      const twitterMatch = html.match(/"twitter":"([^"]+)"/);
      if (twitterMatch) info.twitter = twitterMatch[1];
      const linkedinMatch = html.match(/"linkedin":"([^"]+)"/);
      if (linkedinMatch) info.linkedin = linkedinMatch[1];
      const facebookMatch = html.match(/"facebook":"([^"]+)"/);
      if (facebookMatch) info.facebook = facebookMatch[1];

      // Extract social links from DOM
      info.twitter = $(`a[href*="twitter.com"]`).first().attr('href') || info.twitter;
      info.linkedin = $(`a[href*="linkedin.com"]`).first().attr('href') || info.linkedin;
      info.facebook = $(`a[href*="facebook.com"]`).first().attr('href') || info.facebook;

      // Extract categories/tags
      const categories = $('[data-test="categories"] a, .categories a, .industry-tags a');
      if (categories.length > 0) {
        info.categories = categories.map((_, el) => $(el).text().trim()).get();
      }
      const tags = $('[data-test="tags"] a, .tags a, .keywords a');
      if (tags.length > 0) {
        info.tags = tags.map((_, el) => $(el).text().trim()).get();
      }

      // Extract employee count
      const employeeMatch = html.match(/"number_of_employees":(\d+)/);
      if (employeeMatch) {
        info.employeeCount = employeeMatch[1];
      }
      const employeeRange = $('[data-test="employee_count"], .employee-count').first().text().trim();
      if (employeeRange) {
        info.employeeCount = employeeRange;
      }

      // Extract funding info
      const fundingMatch = html.match(/"total_funding_usd":(\d+)/);
      if (fundingMatch) {
        info.totalFundingAmount = parseInt(fundingMatch[1]);
        info.totalFunding = `$${this.formatMoney(info.totalFundingAmount)}`;
      }
      const totalFundingText = $('[data-test="total_funding"], .total-funding').first().text().trim();
      if (totalFundingText && !info.totalFunding) {
        info.totalFunding = totalFundingText;
      }

      const roundsMatch = html.match(/"number_of_funding_rounds":(\d+)/);
      if (roundsMatch) {
        info.numberOfFundingRounds = parseInt(roundsMatch[1]);
      }

      // Extract stock info
      const stockSymbolMatch = html.match(/"stock_symbol":"([^"]+)"/);
      if (stockSymbolMatch) {
        info.stockSymbol = stockSymbolMatch[1];
      }
      const exchangeMatch = html.match(/"stock_exchange":"([^"]+)"/);
      if (exchangeMatch) {
        info.stockExchange = exchangeMatch[1];
      }

      // Extract IPO/acquisition status
      const statusMatch = html.match(/"ipo_status":"([^"]+)"/);
      if (statusMatch) {
        info.ipoStatus = statusMatch[1];
      }
      info.status = $('[data-test="status"], .status').first().text().trim() || info.ipoStatus;

      // Extract acquisition info
      const acquiredByMatch = html.match(/"acquired_by":"([^"]+)"/);
      if (acquiredByMatch) {
        info.acquiredBy = acquiredByMatch[1];
      }
      const acquiredDateMatch = html.match(/"acquired_on":"([^"]+)"/);
      if (acquiredDateMatch) {
        info.acquiredDate = acquiredDateMatch[1];
      }
      const acquisitionPriceMatch = html.match(/"acquisition_price_usd":(\d+)/);
      if (acquisitionPriceMatch) {
        info.acquisitionPrice = `$${this.formatMoney(parseInt(acquisitionPriceMatch[1]))}`;
      }

    } catch {
      // Return whatever we have
    }

    return info;
  }

  private parseFundingRounds(html: string): FundingRound[] {
    const rounds: FundingRound[] = [];

    try {
      const $ = parseHtml(html);

      // Look for funding round cards
      const roundCards = $('[data-test="funding-round"], .funding-round, .card');

      roundCards.each((_, card) => {
        const type = $(card).find('[data-test="round-type"], .round-type, .type').text().trim();
        const date = $(card).find('[data-test="date"], .date, .funded-date').text().trim();
        const amountEl = $(card).find('[data-test="amount"], .amount, .raised');
        const amount = amountEl.text().trim();
        const investorsEl = $(card).find('[data-test="investors"], .investors, .lead-investors');
        const investors = investorsEl.text().trim().split(',').map(s => s.trim()).filter(Boolean);

        if (type || amount) {
          rounds.push({
            type,
            date,
            amount,
            stage: type,
            investors,
          });
        }
      });

      // Fallback: parse from HTML patterns
      if (rounds.length === 0) {
        // Try to find funding amounts in text
        const amountMatches = html.match(/\$[\d,.]+\s*(?:USD|usd)?/g);
        if (amountMatches) {
          rounds.push({
            amount: amountMatches[0],
            type: 'Unknown',
          });
        }
      }
    } catch {
      // Return empty array on parse error
    }

    return rounds;
  }

  private parsePeople(html: string, type: string): PersonInfo[] {
    const people: PersonInfo[] = [];

    try {
      const $ = parseHtml(html);

      // Look for person cards
      const personCards = $('[data-test="person-card"], .person-card, .profile-card');

      personCards.each((_, card) => {
        const name = $(card).find('[data-test="person-name"], .name, .person-name').text().trim();
        const title = $(card).find('[data-test="person-title"], .title, .job-title').text().trim();
        const org = $(card).find('[data-test="organization"], .organization, .company').text().trim();
        const link = $(card).find('a').attr('href') || '';
        const permalinkMatch = link.match(/person\/([^/?]+)/);
        const image = $(card).find('img').attr('src');

        if (name) {
          people.push({
            name,
            title,
            organization: org,
            permalink: permalinkMatch?.[1],
            image,
          });
        }
      });

      // Filter by type if specified
      if (type === 'founders') {
        // Filter for people marked as founders
        return people.filter(p =>
          p.title?.toLowerCase().includes('founder') ||
          p.title?.toLowerCase().includes('co-founder')
        );
      } else if (type === 'executives') {
        // Filter for executives
        return people.filter(p =>
          p.title && !p.title.toLowerCase().includes('founder') &&
          (p.title.toLowerCase().includes('ceo') ||
           p.title.toLowerCase().includes('cto') ||
           p.title.toLowerCase().includes('cfo') ||
           p.title.toLowerCase().includes('vp') ||
           p.title.toLowerCase().includes('director') ||
           p.title.toLowerCase().includes('head'))
        );
      }
    } catch {
      // Return whatever we found
    }

    return people;
  }

  private formatMoney(amount: number): string {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  }

  private calculateTotalFunding(rounds: FundingRound[]): string {
    const total = rounds.reduce((sum, round) => {
      if (round.amountRaw) {
        return sum + round.amountRaw;
      }
      // Try to parse amount string
      const match = round.amount?.match(/[\d,.]+/);
      if (match) {
        return sum + parseFloat(match[0].replace(/,/g, ''));
      }
      return sum;
    }, 0);

    return total > 0 ? `$${this.formatMoney(total)}` : 'Unknown';
  }

  async validate(input: any): Promise<boolean> {
    if (!input || typeof input !== 'object') return false;

    // For search - require query
    if ('query' in input) {
      const q = input.query;
      return typeof q === 'string' && q.trim().length > 0;
    }

    // For company/funding/people - require permalink or url
    if ('permalink' in input || 'url' in input) {
      return !!(input.permalink || input.url);
    }

    // If neither query nor permalink/url, require other valid action fields
    // get_trending-like actions would be added here

    return false;
  }
}

export default new CrunchbaseActor();
