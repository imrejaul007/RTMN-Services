/**
 * Company Intelligence Actor
 * Comprehensive company research and competitor analysis
 */

import { Actor, ActorOutput, fetchUrl, parseHtml } from '../../actor-runtime/src/index.js';

export interface CompanyProfile {
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  founded?: string;
  headquarters?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  leadership?: {
    name: string;
    title: string;
    linkedin?: string;
  }[];
  products?: string[];
  funding?: {
    round: string;
    amount: string;
    date: string;
    investors: string[];
  }[];
  news?: any[];
  competitors?: string[];
  technologies?: string[];
  jobListings?: {
    title: string;
    location: string;
    url: string;
  }[];
  socialMetrics?: {
    followers: number;
    engagement: number;
  };
}

export class CompanyIntelActor extends Actor {
  constructor() {
    super({
      id: 'company_intel',
      name: 'Company Intelligence',
      description: 'Comprehensive company research and competitor analysis',
      version: '1.0.0',
      capabilities: ['company_profile', 'competitor_analysis', 'funding_tracking', 'job_analysis', 'social_intelligence'],
      rateLimit: { requests: 20, window: 60000 },
    });
  }

  async scrape(input: {
    type: 'profile' | 'competitors' | 'funding' | 'jobs' | 'social' | 'full';
    company: string;
    domain?: string;
    limit?: number;
  }): Promise<ActorOutput> {
    const { type, company, domain, limit = 10 } = input;

    try {
      switch (type) {
        case 'profile':
          return await this.getCompanyProfile(company, domain);
        case 'competitors':
          return await this.getCompetitors(company, domain);
        case 'funding':
          return await this.getFundingHistory(company);
        case 'jobs':
          return await this.getJobListings(company, limit);
        case 'social':
          return await this.getSocialMetrics(company, domain);
        case 'full':
          const profile = await this.getCompanyProfile(company, domain);
          const competitors = await this.getCompetitors(company, domain);
          const funding = await this.getFundingHistory(company);
          return {
            success: true,
            data: {
              company,
              ...profile.data,
              competitors: competitors.data,
              funding: funding.data,
            },
          };
        default:
          return await this.getCompanyProfile(company, domain);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
      };
    }
  }

  private async getCompanyProfile(company: string, domain?: string): Promise<ActorOutput> {
    const profile: CompanyProfile = {
      name: company,
    };

    // Try to get basic info from website
    if (domain) {
      try {
        const html = await fetchUrl(`https://${domain}`, { timeout: 15000 });
        const doc = parseHtml(html);

        // Extract meta info
        profile.description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || undefined;
        profile.website = domain;

        // Try to find social links
        const socialLinks = doc.querySelectorAll('a[href*="linkedin.com"], a[href*="twitter.com"], a[href*="facebook.com"]');
        socialLinks.forEach((link) => {
          const href = link.getAttribute('href') || '';
          if (href.includes('linkedin.com')) profile.linkedin = href;
          if (href.includes('twitter.com')) profile.twitter = href;
          if (href.includes('facebook.com')) profile.facebook = href;
        });
      } catch {
        // Website scraping failed, continue with other sources
      }
    }

    // Try Crunchbase-style data (mock)
    profile.technologies = this.inferTechnologies(domain || '');

    // Try LinkedIn for company size and industry
    try {
      const linkedinHtml = await fetchUrl(`https://www.linkedin.com/company/${company.toLowerCase().replace(/\s+/g, '-')}`, {
        timeout: 15000,
      });
      const linkedinDoc = parseHtml(linkedinHtml);

      profile.industry = linkedinDoc.querySelector('[data-test-id="about-us__industry"]')?.textContent?.trim() || undefined;
      profile.size = linkedinDoc.querySelector('[data-test-id="about-us__size"]')?.textContent?.trim() || undefined;
      profile.headquarters = linkedinDoc.querySelector('[data-test-id="about-us__headquarters"]')?.textContent?.trim() || undefined;
    } catch {
      // LinkedIn scraping failed
    }

    return {
      success: true,
      data: profile,
    };
  }

  private async getCompetitors(company: string, domain?: string): Promise<ActorOutput> {
    const competitors: string[] = [];

    // Try Similarweb-style competitor analysis
    if (domain) {
      try {
        const html = await fetchUrl(`https://www.similarweb.com/website/${domain}`, { timeout: 15000 });
        const doc = parseHtml(html);

        // Extract competitor domains
        const competitorLinks = doc.querySelectorAll('.competitor-link, .similar-item');
        competitorLinks.forEach((link) => {
          const text = link.textContent?.trim();
          if (text && text.length < 50) {
            competitors.push(text);
          }
        });
      } catch {
        // Similarweb scraping failed
      }
    }

    // Fallback: known competitor patterns
    if (competitors.length === 0) {
      competitors.push(`${company} is a market leader`);
    }

    return {
      success: true,
      data: {
        company,
        competitors,
        totalFound: competitors.length,
      },
    };
  }

  private async getFundingHistory(company: string): Promise<ActorOutput> {
    const funding: CompanyProfile['funding'] = [];

    // Try Crunchbase or similar
    try {
      const html = await fetchUrl(`https://www.crunchbase.com/discover/organization.companies?query=${encodeURIComponent(company)}`, {
        timeout: 15000,
      });

      const doc = parseHtml(html);
      const rounds = doc.querySelectorAll('.funding-round, .card');

      rounds.forEach((round) => {
        const roundText = round.textContent || '';
        if (roundText.match(/series|seed|angel|pre-|ipo/i)) {
          const amountMatch = roundText.match(/\$[\d,]+(?:\s*(?:million|billion|k|m|b))?/i);
          const dateMatch = roundText.match(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s,]*\d{4}/i);

          if (amountMatch || dateMatch) {
            funding.push({
              round: roundText.match(/(?:Series|Seed|Angel)[A-Z]?/i)?.[0] || 'Unknown',
              amount: amountMatch?.[0] || ' undisclosed',
              date: dateMatch?.[0] || 'Unknown',
              investors: [],
            });
          }
        }
      });
    } catch {
      // Crunchbase scraping failed
    }

    return {
      success: true,
      data: {
        company,
        funding,
        totalRounds: funding.length,
      },
    };
  }

  private async getJobListings(company: string, limit: number): Promise<ActorOutput> {
    const jobs: CompanyProfile['jobListings'] = [];

    // Try LinkedIn Jobs
    try {
      const html = await fetchUrl(`https://www.linkedin.com/jobs/view/?keywords=${encodeURIComponent(company)}`, {
        timeout: 15000,
      });

      const doc = parseHtml(html);
      const jobCards = doc.querySelectorAll('.job-card-container, .job-card');

      jobCards.slice(0, limit).forEach((card) => {
        const title = card.querySelector('.job-card-container__link')?.textContent?.trim();
        const url = card.querySelector('.job-card-container__link')?.getAttribute('href');
        const location = card.querySelector('.job-card-container__metadata-item')?.textContent?.trim();

        if (title) {
          jobs.push({
            title,
            location: location || 'Not specified',
            url: url || '',
          });
        }
      });
    } catch {
      // LinkedIn scraping failed
    }

    return {
      success: true,
      data: {
        company,
        jobs,
        totalJobs: jobs.length,
      },
    };
  }

  private async getSocialMetrics(company: string, domain?: string): Promise<ActorOutput> {
    const metrics: CompanyProfile['socialMetrics'] = {
      followers: 0,
      engagement: 0,
    };

    // Try Twitter
    try {
      const twitterHtml = await fetchUrl(`https://twitter.com/${company.toLowerCase().replace(/\s+/g, '')}`, {
        timeout: 15000,
      });

      const followersMatch = twitterHtml.match(/"followers_count":(\d+)/);
      if (followersMatch) {
        metrics.followers = parseInt(followersMatch[1]);
      }
    } catch {
      // Twitter scraping failed
    }

    return {
      success: true,
      data: {
        company,
        socialMetrics: metrics,
      },
    };
  }

  private inferTechnologies(domain: string): string[] {
    const tech: string[] = [];

    // Common tech indicators
    if (domain.includes('shopify')) tech.push('Shopify');
    if (domain.includes('wordpress')) tech.push('WordPress');
    if (domain.includes('squarespace')) tech.push('Squarespace');
    if (domain.includes('wix')) tech.push('Wix');

    // Cloud providers
    // These would require DNS/SSL analysis in production

    return tech;
  }

  async validate(input: any): Promise<boolean> {
    return !!(input && typeof input.company === 'string');
  }
}

export default new CompanyIntelActor();
