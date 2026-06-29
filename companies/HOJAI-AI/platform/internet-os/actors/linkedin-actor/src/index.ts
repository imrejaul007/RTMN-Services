/**
 * LinkedIn Actor
 * Extract company and professional information from LinkedIn
 */

import { Actor, ActorOutput, fetchUrl, parseHtml } from '../actor-runtime';

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
    const doc = parseHtml(html);

    // Extract company data from JSON-LD or page content
    const companyData = {
      name: doc.querySelector('h1')?.textContent?.trim(),
      tagline: doc.querySelector('.org-top-card-summary__tagline')?.textContent?.trim(),
      industry: doc.querySelector('[data-test-id="about-us__industry"]')?.textContent?.trim(),
      size: doc.querySelector('[data-test-id="about-us__size"]')?.textContent?.trim(),
      headquarters: doc.querySelector('[data-test-id="about-us__headquarters"]')?.textContent?.trim(),
      founded: doc.querySelector('[data-test-id="about-us__founded"]')?.textContent?.trim(),
      description: doc.querySelector('.org-about-us-organization-description__text')?.textContent?.trim(),
      website: doc.querySelector('.org-about-us-organization-description__website a')?.getAttribute('href'),
      linkedinUrl: companyUrl,
    };

    return {
      success: true,
      data: companyData,
    };
  }

  private async scrapeProfile(profileUrl: string): Promise<ActorOutput> {
    const html = await fetchUrl(profileUrl, { timeout: 30000 });
    const doc = parseHtml(html);

    const profileData = {
      name: doc.querySelector('.pv-top-card-section__name')?.textContent?.trim(),
      headline: doc.querySelector('.pv-top-card-section__headline')?.textContent?.trim(),
      location: doc.querySelector('.pv-top-card-section__location')?.textContent?.trim(),
      currentPosition: doc.querySelector('.pv-top-card-section__current-position')?.textContent?.trim(),
      education: this.parseEducation(doc),
      experience: this.parseExperience(doc),
      connections: doc.querySelector('.pv-top-card-section__connections')?.textContent?.trim(),
    };

    return {
      success: true,
      data: profileData,
    };
  }

  private parseEducation(doc: Document): any[] {
    const education: any[] = [];
    const eduSection = doc.querySelectorAll('.education-section .pv-profile-section__list-item');

    eduSection.forEach((item) => {
      education.push({
        school: item.querySelector('.pv-entity__school-name')?.textContent?.trim(),
        degree: item.querySelector('.pv-entity__degree-name')?.textContent?.trim(),
        field: item.querySelector('.pv-entity__fos')?.textContent?.trim(),
        duration: item.querySelector('.pv-entity__date-range span:last-child')?.textContent?.trim(),
      });
    });

    return education;
  }

  private parseExperience(doc: Document): any[] {
    const experience: any[] = [];
    const expSection = doc.querySelectorAll('.experience-section .pv-profile-section__list-item');

    expSection.forEach((item) => {
      experience.push({
        title: item.querySelector('h3')?.textContent?.trim(),
        company: item.querySelector('.pv-entity__subtitle')?.textContent?.trim(),
        duration: item.querySelector('.pv-entity__date-range span:last-child')?.textContent?.trim(),
        location: item.querySelector('.pv-entity__location')?.textContent?.trim(),
        description: item.querySelector('.pv-entity__description')?.textContent?.trim(),
      });
    });

    return experience;
  }

  private async searchJobs(query: string, limit: number): Promise<ActorOutput> {
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}`;
    const html = await fetchUrl(searchUrl, { timeout: 30000 });
    const doc = parseHtml(html);

    const jobs: any[] = [];
    const jobCards = doc.querySelectorAll('.jobs-search-results__list-item');

    jobCards.slice(0, limit).forEach((card) => {
      jobs.push({
        title: card.querySelector('.job-card-container__link')?.textContent?.trim(),
        company: card.querySelector('.job-card-container__company-name')?.textContent?.trim(),
        location: card.querySelector('.job-card-container__metadata-item')?.textContent?.trim(),
        posted: card.querySelector('.job-card-container__listed-time')?.textContent?.trim(),
        url: card.querySelector('.job-card-container__link')?.getAttribute('href'),
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
    const doc = parseHtml(html);

    const results: any[] = [];
    const cards = doc.querySelectorAll('.search-result');

    cards.slice(0, limit).forEach((card) => {
      const type = card.querySelector('.search-result-type')?.textContent?.trim();
      results.push({
        type,
        title: card.querySelector('.search-result__title')?.textContent?.trim(),
        subtitle: card.querySelector('.search-result__subtitle')?.textContent?.trim(),
        url: card.querySelector('.search-result__a')?.getAttribute('href'),
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
