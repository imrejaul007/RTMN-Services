/**
 * Justdial Actor
 * Local business search for India
 */

import { Actor, ActorOutput, fetchUrl, parseHtml } from '../actor-runtime';

export class JustdialActor extends Actor {
  constructor() {
    super({
      id: 'justdial',
      name: 'Justdial India Scraper',
      description: 'Search local businesses, services, and contacts in India',
      version: '1.0.0',
      capabilities: ['business_search', 'phone_numbers', 'addresses', 'reviews', 'local_seo'],
      rateLimit: { requests: 10, window: 60000 },
    });
  }

  async scrape(input: {
    query: string;
    location?: string;
    limit?: number;
  }): Promise<ActorOutput> {
    const { query, location = 'Bangalore', limit = 20 } = input;

    try {
      const searchUrl = `https://www.justdial.com/${encodeURIComponent(location)}/${encodeURIComponent(query)}`;
      const html = await fetchUrl(searchUrl, { timeout: 30000 });

      const businesses = this.parseSearchResults(html, limit);

      return {
        success: true,
        data: {
          query,
          location,
          businesses,
          totalFound: businesses.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
      };
    }
  }

  private parseSearchResults(html: string, limit: number): any[] {
    const businesses: any[] = [];
    const doc = parseHtml(html);

    const cards = doc.querySelectorAll('.store-list, .srch_bx, .jdl');

    cards.slice(0, limit).forEach((card) => {
      const name = card.querySelector('.store-name, .lng_cont_name')?.textContent?.trim();
      const address = card.querySelector('.address, .cont_fl_addr')?.textContent?.trim();
      const phone = card.querySelector('.telnum')?.textContent?.trim();
      const rating = card.querySelector('.green-box, .rating')?.textContent?.trim();
      const votes = card.querySelector('.votes')?.textContent?.trim();

      if (name) {
        businesses.push({
          name,
          address,
          phone: phone?.replace(/[^0-9]/g, ''),
          rating: rating ? parseFloat(rating) : null,
          votes: votes ? parseInt(votes.replace(/[^0-9]/g, '')) : 0,
          url: card.querySelector('a')?.getAttribute('href'),
        });
      }
    });

    return businesses;
  }

  async validate(input: any): Promise<boolean> {
    return !!(input && typeof input.query === 'string');
  }
}

export default new JustdialActor();
