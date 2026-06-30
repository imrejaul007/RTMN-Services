/**
 * LinkedIn Actor
 * Extract company and professional information from LinkedIn
 */

// @ts-ignore - Using local actor-runtime
import { Actor, ActorOutput, fetchUrl, parseHtml } from '../../actor-runtime/dist/index.js';
import type { CheerioAPI } from 'cheerio';

export class LinkedInActor extends Actor {
  constructor() {
    super({
      id: 'linkedin',
      name: 'LinkedIn Scraper',
      description: 'Extract company info, employee data, and job listings from LinkedIn',
      version: '1.0.0',
      capabilities: ['company_search', 'employee_search', 'job_search', 'profile_scrape'],
      rateLimit: { requests: 5, window: 60000 },
    });
  }

  async scrape(input: {
    type: 'company' | 'profile' | 'jobs' | 'search';
    query?: string;
    url?: string;
    limit?: number;
  }): Promise<ActorOutput> {
    const { type, query, url, limit = 10 } = input;

    try {
      switch (type) {
        case 'company':
          return await this.scrapeCompany(url!);
        case 'profile':
          return await this.scrapeProfile(url!);
        case 'jobs':
          return await this.searchJobs(query!, limit);
        case 'search':
        default:
          return await this.search(query!, limit);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
      };
    }
  }

  private async scrapeCompany(companyUrl: string): Promise<ActorOutput> {
    const html = await fetchUrl(companyUrl, { timeout: 30000 });
    const $ = parseHtml(html);

    // Extract company data from JSON-LD or page content
    const companyData = {
      name: $('h1').first().text().trim(),
      tagline: $('.org-top-card-summary__tagline').text().trim(),
      industry: $('[data-test-id="about-us__industry"]').text().trim(),
      size: $('[data-test-id="about-us__size"]').text().trim(),
      headquarters: $('[data-test-id="about-us__headquarters"]').text().trim(),
      founded: $('[data-test-id="about-us__founded"]').text().trim(),
      description: $('.org-about-us-organization-description__text').text().trim(),
      website: $('.org-about-us-organization-description__website a').attr('href'),
      linkedinUrl: companyUrl,
    };

    return {
      success: true,
      data: companyData,
    };
  }

  private async scrapeProfile(profileUrl: string): Promise<ActorOutput> {
    const html = await fetchUrl(profileUrl, { timeout: 30000 });
    const $ = parseHtml(html);

    const profileData = {
      name: $('.pv-top-card-section__name').text().trim(),
      headline: $('.pv-top-card-section__headline').text().trim(),
      location: $('.pv-top-card-section__location').text().trim(),
      currentPosition: $('.pv-top-card-section__current-position').text().trim(),
      education: this.parseEducation($),
      experience: this.parseExperience($),
      connections: $('.pv-top-card-section__connections').text().trim(),
    };

    return {
      success: true,
      data: profileData,
    };
  }

  private parseEducation($: CheerioAPI): any[] {
    const education: any[] = [];
    const eduSection = $('.education-section .pv-profile-section__list-item');

    eduSection.each((_, item) => {
      education.push({
        school: $(item).find('.pv-entity__school-name').text().trim(),
        degree: $(item).find('.pv-entity__degree-name').text().trim(),
        field: $(item).find('.pv-entity__fos').text().trim(),
        duration: $(item).find('.pv-entity__date-range span:last-child').text().trim(),
      });
    });

    return education;
  }

  private parseExperience($: CheerioAPI): any[] {
    const experience: any[] = [];
    const expSection = $('.experience-section .pv-profile-section__list-item');

    expSection.each((_, item) => {
      experience.push({
        title: $(item).find('h3').text().trim(),
        company: $(item).find('.pv-entity__subtitle').text().trim(),
        duration: $(item).find('.pv-entity__date-range span:last-child').text().trim(),
        location: $(item).find('.pv-entity__location').text().trim(),
        description: $(item).find('.pv-entity__description').text().trim(),
      });
    });

    return experience;
  }

  private async searchJobs(query: string, limit: number): Promise<ActorOutput> {
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}`;
    const html = await fetchUrl(searchUrl, { timeout: 30000 });
    const $ = parseHtml(html);

    const jobs: any[] = [];
    const jobCards = $('.jobs-search-results__list-item');

    jobCards.slice(0, limit).each((_, card) => {
      jobs.push({
        title: $(card).find('.job-card-container__link').text().trim(),
        company: $(card).find('.job-card-container__company-name').text().trim(),
        location: $(card).find('.job-card-container__metadata-item').text().trim(),
        posted: $(card).find('.job-card-container__listed-time').text().trim(),
        url: $(card).find('.job-card-container__link').attr('href'),
      });
    });

    return {
      success: true,
      data: {
        query,
        jobs,
        totalJobs: jobs.length,
      },
    };
  }

  private async search(query: string, limit: number): Promise<ActorOutput> {
    const searchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`;
    const html = await fetchUrl(searchUrl, { timeout: 30000 });
    const $ = parseHtml(html);

    const results: any[] = [];
    const cards = $('.search-result');

    cards.slice(0, limit).each((_, card) => {
      const type = $(card).find('.search-result-type').text().trim();
      results.push({
        type,
        title: $(card).find('.search-result__title').text().trim(),
        subtitle: $(card).find('.search-result__subtitle').text().trim(),
        url: $(card).find('.search-result__a').attr('href'),
      });
    });

    return {
      success: true,
      data: {
        query,
        results,
        totalResults: results.length,
      },
    };
  }

  async validate(input: any): Promise<boolean> {
    return !!(input && (input.query || input.url));
  }
}

export default new LinkedInActor();
