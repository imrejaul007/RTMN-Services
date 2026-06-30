/**
 * Justdial Actor
 * Local business search for India
 */

import { Actor, ActorOutput, fetchUrl, parseHtml } from '../../actor-runtime/src/index';

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
    const $ = parseHtml(html);

    const cards = $('.store-list, .srch_bx, .jdl');

    cards.slice(0, limit).each((_, card) => {
      const name = $(card).find('.store-name, .lng_cont_name').text().trim();
      const address = $(card).find('.address, .cont_fl_addr').text().trim();
      const phone = $(card).find('.telnum').text().trim();
      const rating = $(card).find('.green-box, .rating').text().trim();
      const votes = $(card).find('.votes').text().trim();

      if (name) {
        businesses.push({
          name,
          address,
          phone: phone?.replace(/[^0-9]/g, ''),
          rating: rating ? parseFloat(rating) : null,
          votes: votes ? parseInt(votes.replace(/[^0-9]/g, '')) : 0,
          url: $(card).find('a').attr('href'),
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
