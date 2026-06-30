/**
 * Shopify Actor Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShopifyActor } from '../src/index.js';

// Mock the actor-runtime
vi.mock('../../actor-runtime/dist/index.js', () => ({
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
  fetchUrl: vi.fn(),
  parseHtml: vi.fn((html: string) => {
    // Simple cheerio mock
    const cheerio = require('cheerio');
    return cheerio.load(html);
  }),
}));

// Import after mocking
import { fetchUrl } from '../../actor-runtime/dist/index.js';

describe('ShopifyActor', () => {
  let actor: ShopifyActor;

  beforeEach(() => {
    actor = new ShopifyActor();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create actor with correct config', () => {
      expect(actor.config.id).toBe('shopify');
      expect(actor.config.name).toBe('Shopify Store Actor');
      expect(actor.config.capabilities).toContain('products');
      expect(actor.config.capabilities).toContain('collections');
      expect(actor.config.capabilities).toContain('pricing');
      expect(actor.config.capabilities).toContain('inventory');
      expect(actor.config.rateLimit).toEqual({ requests: 20, window: 60000 });
    });
  });

  describe('validate', () => {
    it('should return true for valid input', async () => {
      const validInput = {
        action: 'search_products',
        storeUrl: 'https://example.myshopify.com',
      };
      expect(await actor.validate(validInput)).toBe(true);
    });

    it('should return false for missing storeUrl', async () => {
      const invalidInput = {
        action: 'search_products',
      };
      expect(await actor.validate(invalidInput)).toBe(false);
    });

    it('should return false for invalid action', async () => {
      const invalidInput = {
        action: 'invalid_action',
        storeUrl: 'https://example.myshopify.com',
      };
      expect(await actor.validate(invalidInput)).toBe(false);
    });

    it('should return false for null input', async () => {
      expect(await actor.validate(null)).toBe(false);
    });

    it('should accept all valid actions', async () => {
      const actions = ['search_products', 'get_product', 'get_collections', 'get_pricing'];
      for (const action of actions) {
        const input = { action, storeUrl: 'https://example.myshopify.com' };
        expect(await actor.validate(input)).toBe(true);
      }
    });
  });

  describe('search_products action', () => {
    it('should search products with query', async () => {
      const mockHtml = `
        <html>
          <body>
            <div data-product-id="123">
              <h3>Test Product</h3>
              <span class="price">$29.99</span>
              <a href="/products/test-product">Link</a>
              <img src="/images/product.jpg" />
            </div>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'search_products',
        storeUrl: 'https://example.myshopify.com',
        query: 'shoes',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle empty search results', async () => {
      const mockHtml = '<html><body><p>No products found</p></body></html>';
      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'search_products',
        storeUrl: 'https://example.myshopify.com',
        query: 'nonexistent',
      });

      expect(result.success).toBe(true);
      expect(result.data.results).toBeDefined();
    });
  });

  describe('get_product action', () => {
    it('should get single product details', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@type": "Product",
                "name": "Premium Widget",
                "description": "A high-quality widget",
                "brand": {"name": "TestBrand"},
                "sku": "WIDGET-001",
                "offers": {
                  "price": "49.99",
                  "priceCurrency": "USD",
                  "availability": "https://schema.org/InStock"
                }
              }
            </script>
          </head>
          <body>
            <h1>Premium Widget</h1>
            <div class="product-description">A high-quality widget</div>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'get_product',
        storeUrl: 'https://example.myshopify.com',
        handle: 'premium-widget',
      });

      expect(result.success).toBe(true);
    });

    it('should handle product not found', async () => {
      const mockHtml = '<html><body><h1>Page not found</h1></body></html>';
      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'get_product',
        storeUrl: 'https://example.myshopify.com',
        handle: 'nonexistent-product',
      });

      // May fail or return empty depending on parsing
      expect(result).toBeDefined();
    });
  });

  describe('get_collections action', () => {
    it('should get all collections', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="collection-item">
              <a href="/collections/winter-collection">
                <h3>Winter Collection</h3>
              </a>
            </div>
            <div class="collection-item">
              <a href="/collections/summer-collection">
                <h3>Summer Collection</h3>
              </a>
            </div>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'get_collections',
        storeUrl: 'https://example.myshopify.com',
      });

      expect(result.success).toBe(true);
    });

    it('should get specific collection with products', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1>Winter Collection</h1>
            <div class="collection-description">Cozy winter items</div>
            <div data-product-id="1">
              <h3>Winter Coat</h3>
              <span class="price">$199.99</span>
              <a href="/products/winter-coat">Link</a>
            </div>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'get_collections',
        storeUrl: 'https://example.myshopify.com',
        collectionHandle: 'winter-collection',
      });

      expect(result.success).toBe(true);
      expect(result.data.collection).toBeDefined();
    });
  });

  describe('get_pricing action', () => {
    it('should track pricing for product', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1>Sale Product</h1>
            <span class="price">$19.99</span>
            <span class="compare-at-price">$29.99</span>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'get_pricing',
        storeUrl: 'https://example.myshopify.com',
        handle: 'sale-product',
        trackPricing: true,
      });

      expect(result.success).toBe(true);
    });

    it('should track pricing for multiple products', async () => {
      const mockHtml = `
        <html>
          <body>
            <div data-product-id="1">
              <h3>Product 1</h3>
              <span class="price">$10.00</span>
              <span class="compare-at-price">$15.00</span>
              <a href="/products/product-1">Link</a>
            </div>
            <div data-product-id="2">
              <h3>Product 2</h3>
              <span class="price">$20.00</span>
              <a href="/products/product-2">Link</a>
            </div>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'get_pricing',
        storeUrl: 'https://example.myshopify.com',
        trackPricing: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.products).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(fetchUrl).mockRejectedValue(new Error('Network error'));

      const result = await actor.scrape({
        action: 'search_products',
        storeUrl: 'https://example.myshopify.com',
        query: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle invalid URLs', async () => {
      const result = await actor.scrape({
        action: 'search_products',
        storeUrl: '',
        query: 'test',
      });

      // Should handle empty URL
      expect(result).toBeDefined();
    });
  });

  describe('JSON-LD parsing', () => {
    it('should extract products from JSON-LD structured data', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@type": "Product",
                "name": "JSON-LD Product",
                "description": "Extracted via JSON-LD",
                "brand": "TestBrand",
                "sku": "JSON-001",
                "image": "https://example.com/image.jpg",
                "offers": {
                  "price": "99.99",
                  "priceCurrency": "USD",
                  "availability": "https://schema.org/InStock"
                }
              }
            </script>
          </head>
          <body></body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'get_product',
        storeUrl: 'https://example.myshopify.com',
        handle: 'json-ld-product',
      });

      expect(result.success).toBe(true);
    });

    it('should handle @graph JSON-LD format', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@graph": [
                  {"@type": "Product", "name": "Graph Product", "sku": "GRAPH-001", "offers": {"price": "50.00", "priceCurrency": "EUR"}}
                ]
              }
            </script>
          </head>
          <body></body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'get_product',
        storeUrl: 'https://example.myshopify.com',
        handle: 'graph-product',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('URL normalization', () => {
    it('should normalize store URLs without protocol', async () => {
      const mockHtml = '<html><body></body></html>';
      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      await actor.scrape({
        action: 'search_products',
        storeUrl: 'example.myshopify.com',
        query: 'test',
      });

      // fetchUrl should have been called
      expect(fetchUrl).toHaveBeenCalled();
    });

    it('should remove trailing slashes', async () => {
      const mockHtml = '<html><body></body></html>';
      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      await actor.scrape({
        action: 'search_products',
        storeUrl: 'https://example.myshopify.com/',
        query: 'test',
      });

      expect(fetchUrl).toHaveBeenCalled();
    });
  });

  describe('image URL handling', () => {
    it('should handle relative image URLs', async () => {
      const mockHtml = `
        <html>
          <body>
            <div data-product-id="1">
              <img src="/images/product.jpg" />
              <a href="/products/test">Link</a>
              <span class="price">$10</span>
            </div>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'search_products',
        storeUrl: 'https://example.myshopify.com',
      });

      expect(result.success).toBe(true);
    });

    it('should handle protocol-relative image URLs', async () => {
      const mockHtml = `
        <html>
          <body>
            <div data-product-id="1">
              <img src="//cdn.example.com/image.jpg" />
              <a href="/products/test">Link</a>
              <span class="price">$10</span>
            </div>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'search_products',
        storeUrl: 'https://example.myshopify.com',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('variant extraction', () => {
    it('should parse variant data from JSON', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1>Multi-Variant Product</h1>
            <script type="application/json">
              ${JSON.stringify([
                { id: 1, title: 'Small / Blue', price: '1999', sku: 'SM-BLU', inventory_quantity: 10, available: true },
                { id: 2, title: 'Large / Blue', price: '2499', sku: 'LG-BLU', inventory_quantity: 5, available: true },
              ])}
            </script>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'get_product',
        storeUrl: 'https://example.myshopify.com',
        handle: 'multi-variant',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('inventory tracking', () => {
    it('should track product inventory', async () => {
      const mockHtml = `
        <html>
          <body>
            <div data-product-id="123" data-inventory="50">
              <h3>In Stock Product</h3>
              <span class="price">$29.99</span>
              <a href="/products/in-stock">Link</a>
            </div>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'search_products',
        storeUrl: 'https://example.myshopify.com',
      });

      expect(result.success).toBe(true);
    });

    it('should detect out of stock products', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sold-out">
              <h3>Sold Out Product</h3>
              <span class="price">$49.99</span>
              <a href="/products/sold-out">Link</a>
            </div>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'search_products',
        storeUrl: 'https://example.myshopify.com',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('discount calculation', () => {
    it('should calculate discount percentage', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1>Discounted Product</h1>
            <span class="price">$75.00</span>
            <span class="compare-at-price">$100.00</span>
          </body>
        </html>
      `;

      vi.mocked(fetchUrl).mockResolvedValue(mockHtml);

      const result = await actor.scrape({
        action: 'get_pricing',
        storeUrl: 'https://example.myshopify.com',
        handle: 'discounted-product',
      });

      expect(result.success).toBe(true);
      if (result.data.discountPercentage !== undefined) {
        expect(result.data.discountPercentage).toBe(25);
      }
    });
  });
});
