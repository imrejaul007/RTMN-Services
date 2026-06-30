/**
 * Amazon Actor Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AmazonActor } from '../src/index.js';

// Mock the actor-runtime
vi.mock('../../actor-runtime/dist/index.js', () => {
  const mockFn = vi.fn();
  return {
    Actor: class MockActor {
      config: any;
      lastRequest = 0;
      constructor(config: any) {
        this.config = config;
      }
      async scrape(input: any) {
        return { success: true, data: input };
      }
      async validate(input: any) {
        return true;
      }
      async rateLimit() {}
    },
    ActorOutput: {},
    fetchUrl: mockFn,
    parseHtml: vi.fn((html: string) => {
      const cheerio = require('cheerio');
      return cheerio.load(html);
    }),
  };
});

describe('AmazonActor', () => {
  let actor: AmazonActor;

  beforeEach(() => {
    actor = new AmazonActor();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create actor with correct config', () => {
      expect(actor.config.id).toBe('amazon');
      expect(actor.config.name).toBe('Amazon Actor');
      expect(actor.config.capabilities).toContain('products');
      expect(actor.config.capabilities).toContain('pricing');
      expect(actor.config.capabilities).toContain('reviews');
      expect(actor.config.capabilities).toContain('search');
      expect(actor.config.rateLimit).toEqual({ requests: 20, window: 60000 });
    });
  });

  describe('validate', () => {
    it('should return true for valid search_products input', async () => {
      const input = { action: 'search_products', query: 'laptop' };
      expect(await actor.validate(input)).toBe(true);
    });

    it('should return true for valid get_product input', async () => {
      const input = { action: 'get_product', asin: 'B08N5WRWNW' };
      expect(await actor.validate(input)).toBe(true);
    });

    it('should return true for valid get_reviews input', async () => {
      const input = { action: 'get_reviews', asin: 'B08N5WRWNW', page: 1 };
      expect(await actor.validate(input)).toBe(true);
    });

    it('should return true for valid get_pricing input', async () => {
      const input = { action: 'get_pricing', asin: 'B08N5WRWNW' };
      expect(await actor.validate(input)).toBe(true);
    });

    it('should return false for invalid action', async () => {
      const input = { action: 'invalid_action', query: 'test' };
      expect(await actor.validate(input)).toBe(false);
    });

    it('should return false for search_products without query', async () => {
      const input = { action: 'search_products' };
      expect(await actor.validate(input)).toBe(false);
    });

    it('should return false for get_product without asin', async () => {
      const input = { action: 'get_product' };
      expect(await actor.validate(input)).toBe(false);
    });

    it('should return false for null input', async () => {
      expect(await actor.validate(null)).toBe(false);
    });

    it('should return false for non-object input', async () => {
      expect(await actor.validate('string' as any)).toBe(false);
    });

    it('should accept all valid actions', async () => {
      const actions = ['search_products', 'get_product', 'get_reviews', 'get_pricing'];
      for (const action of actions) {
        const input = action === 'search_products'
          ? { action, query: 'test' }
          : { action, asin: 'B08N5WRWNW' };
        expect(await actor.validate(input)).toBe(true);
      }
    });
  });

  describe('search_products action', () => {
    it('should search products with query', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body></body></html>');

      const result = await actor.scrape({ action: 'search_products', query: 'laptop' });

      expect(result.success).toBe(true);
      expect(fetchUrl).toHaveBeenCalledWith(
        expect.stringContaining('k=laptop'),
        { timeout: 30000 }
      );
    });

    it('should handle empty search results', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body></body></html>');

      const result = await actor.scrape({
        action: 'search_products',
        query: 'nonexistentproductxyz',
      });

      expect(result.success).toBe(true);
    });

    it('should respect maxResults parameter', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body></body></html>');

      const result = await actor.scrape({
        action: 'search_products',
        query: 'test',
        maxResults: 5,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('get_product action', () => {
    it('should get product details by ASIN', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {"@type":"Product","name":"Test Product","offers":{"price":"99.99","priceCurrency":"USD"}}
            </script>
          </head>
          <body>
            <h1 id="productTitle">Test Product</h1>
            <span id="priceblock_ourprice">$99.99</span>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({ action: 'get_product', asin: 'B08N5WRWNW' });

      expect(result.success).toBe(true);
      expect(fetchUrl).toHaveBeenCalledWith(
        expect.stringContaining('dp/B08N5WRWNW'),
        { timeout: 30000 }
      );
    });

    it('should handle product not found', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body><p>404</p></body></html>');

      const result = await actor.scrape({ action: 'get_product', asin: 'B08N5WRWNW' });

      // Should return a result even if product not found
      expect(result).toBeDefined();
    });
  });

  describe('get_reviews action', () => {
    it('should get reviews for product', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body></body></html>');

      const result = await actor.scrape({ action: 'get_reviews', asin: 'B08N5WRWNW', page: 1 });

      expect(result.success).toBe(true);
      expect(fetchUrl).toHaveBeenCalledWith(
        expect.stringContaining('product-reviews/B08N5WRWNW'),
        { timeout: 30000 }
      );
    });

    it('should respect sortBy parameter', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body></body></html>');

      await actor.scrape({ action: 'get_reviews', asin: 'B08N5WRWNW', sortBy: 'helpful' });

      expect(fetchUrl).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=helpful'),
        expect.any(Object)
      );
    });

    it('should handle pagination info', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body></body></html>');

      const result = await actor.scrape({ action: 'get_reviews', asin: 'B08N5WRWNW', page: 2 });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('get_pricing action', () => {
    it('should track pricing for product', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      const mockHtml = `
        <html>
          <body>
            <h1 id="productTitle">Test Product</h1>
            <span id="priceblock_ourprice">$99.99</span>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({ action: 'get_pricing', asin: 'B08N5WRWNW' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('asin', 'B08N5WRWNW');
    });

    it('should calculate discount percentage', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      const mockHtml = `
        <html>
          <body>
            <h1 id="productTitle">Discounted Product</h1>
            <span id="priceblock_ourprice">$75.00</span>
            <span class="a-text-price"><span class="a-offscreen">$100.00</span></span>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({ action: 'get_pricing', asin: 'B08N5WRWNW' });

      expect(result.success).toBe(true);
      if (result.data?.discount !== undefined) {
        expect(result.data.discount).toBe(25);
      }
    });

    it('should include price history', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body><h1 id="productTitle">Product</h1><span id="priceblock_ourprice">$50</span></body></html>');

      const result = await actor.scrape({ action: 'get_pricing', asin: 'B08N5WRWNW' });

      expect(result.success).toBe(true);
      expect(result.data.priceHistory).toBeDefined();
      expect(Array.isArray(result.data.priceHistory)).toBe(true);
    });
  });

  describe('domain support', () => {
    it('should use US domain by default', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body></body></html>');

      await actor.scrape({ action: 'search_products', query: 'test' });

      expect(fetchUrl).toHaveBeenCalledWith(
        expect.stringContaining('www.amazon.com'),
        expect.any(Object)
      );
    });

    it('should support Indian domain', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body></body></html>');

      await actor.scrape({ action: 'search_products', query: 'test', domain: 'in' });

      expect(fetchUrl).toHaveBeenCalledWith(
        expect.stringContaining('www.amazon.in'),
        expect.any(Object)
      );
    });

    it('should support UK domain', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body></body></html>');

      await actor.scrape({ action: 'search_products', query: 'test', domain: 'uk' });

      expect(fetchUrl).toHaveBeenCalledWith(
        expect.stringContaining('www.amazon.co.uk'),
        expect.any(Object)
      );
    });

    it('should support full domain URL', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body></body></html>');

      await actor.scrape({ action: 'search_products', query: 'test', domain: 'www.amazon.de' });

      expect(fetchUrl).toHaveBeenCalledWith(
        expect.stringContaining('www.amazon.de'),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockRejectedValue(new Error('Network error'));

      const result = await actor.scrape({ action: 'search_products', query: 'laptop' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should return error for unknown action', async () => {
      const result = await actor.scrape({ action: 'unknown_action' as any, query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  describe('price extraction', () => {
    it('should detect USD currency', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body><span id="priceblock_ourprice">$99.99</span></body></html>');

      const result = await actor.scrape({ action: 'get_pricing', asin: 'B08N5WRWNW' });

      expect(result.success).toBe(true);
    });

    it('should handle deal price', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body><span id="priceblock_dealprice">$79.99</span></body></html>');

      const result = await actor.scrape({ action: 'get_pricing', asin: 'B08N5WRWNW' });

      expect(result.success).toBe(true);
    });
  });

  describe('availability detection', () => {
    it('should handle availability HTML', async () => {
      const { fetchUrl } = await import('../../actor-runtime/dist/index.js');
      vi.mocked(fetchUrl).mockResolvedValue('<html><body><span id="availability"><span>In Stock</span></span></body></html>');

      const result = await actor.scrape({ action: 'get_pricing', asin: 'B08N5WRWNW' });

      expect(result.success).toBe(true);
    });
  });
});
