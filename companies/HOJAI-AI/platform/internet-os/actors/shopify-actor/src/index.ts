// @ts-nocheck
/**
 * Shopify Actor
 * Extract products, collections, and pricing from Shopify stores
 */

import { Actor, ActorOutput, fetchUrl } from '@hojai/actor-runtime';
import * as cheerio from 'cheerio';

export interface ShopifyConfig {
  id: 'shopify';
  name: 'Shopify Store Actor';
  description: 'Extract products, collections, pricing, and inventory from Shopify stores';
  version: '1.0.0';
  capabilities: ['products', 'collections', 'pricing', 'inventory'];
  rateLimit: { requests: number; window: number };
}

export interface ProductVariant {
  id: string;
  title: string;
  price: string;
  compareAtPrice?: string;
  sku?: string;
  inventory?: number;
  inventoryPolicy?: string;
  weight?: string;
  weightUnit?: string;
  options: Record<string, string>;
  image?: string;
  available: boolean;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string[];
  price: string;
  compareAtPrice?: string;
  currency: string;
  images: string[];
  variants: ProductVariant[];
  inventory: number;
  sku?: string;
  url: string;
  collections?: string[];
  createdAt?: string;
  updatedAt?: string;
  available: boolean;
}

export interface Collection {
  id: string;
  handle: string;
  title: string;
  description: string;
  image?: string;
  url: string;
  productCount: number;
  products?: Product[];
}

export interface PricingHistory {
  productId: string;
  productHandle: string;
  title: string;
  currentPrice: string;
  compareAtPrice?: string;
  currency: string;
  url: string;
  priceChanges: {
    price: string;
    date: string;
  }[];
  discountPercentage?: number;
}

export interface ShopifyScrapeInput {
  action: 'search_products' | 'get_product' | 'get_collections' | 'get_pricing';
  storeUrl: string;
  query?: string;
  handle?: string;
  collectionHandle?: string;
  maxProducts?: number;
  trackPricing?: boolean;
}

export class ShopifyActor extends Actor {
  constructor() {
    super({
      id: 'shopify',
      name: 'Shopify Store Actor',
      description: 'Extract products, collections, pricing, and inventory from Shopify stores',
      version: '1.0.0',
      capabilities: ['products', 'collections', 'pricing', 'inventory'],
      rateLimit: { requests: 20, window: 60000 },
    });
  }

  async scrape(input: ShopifyScrapeInput): Promise<ActorOutput> {
    const { action, storeUrl, maxProducts = 50 } = input;

    try {
      // Normalize store URL
      const baseUrl = this.normalizeStoreUrl(storeUrl);

      switch (action) {
        case 'search_products':
          return await this.searchProducts(baseUrl, input.query || '', maxProducts);
        case 'get_product':
          return await this.getProduct(baseUrl, input.handle || '');
        case 'get_collections':
          return await this.getCollections(baseUrl, input.collectionHandle, maxProducts);
        case 'get_pricing':
          return await this.getPricing(baseUrl, input.handle, input.trackPricing ?? true);
        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
      };
    }
  }

  async validate(input: any): Promise<boolean> {
    if (!input || typeof input !== 'object') return false;
    if (!input.storeUrl || typeof input.storeUrl !== 'string') return false;
    if (!input.action || !['search_products', 'get_product', 'get_collections', 'get_pricing'].includes(input.action)) {
      return false;
    }
    return true;
  }

  /**
   * Normalize store URL to ensure proper format
   */
  private normalizeStoreUrl(url: string): string {
    let normalized = url.trim();
    if (!normalized.startsWith('http')) {
      normalized = `https://${normalized}`;
    }
    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');
    return normalized;
  }

  /**
   * Search for products on a Shopify store
   */
  private async searchProducts(
    baseUrl: string,
    query: string,
    maxProducts: number
  ): Promise<ActorOutput> {
    // Use Shopify's built-in search
    const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(query)}&type=product`;
    const html = await fetchUrl(searchUrl, { timeout: 30000 });

    const products = this.parseProductList(html, baseUrl, maxProducts);

    return {
      success: true,
      data: {
        query,
        results: products,
        totalResults: products.length,
        searchUrl,
      },
    };
  }

  /**
   * Get single product details
   */
  private async getProduct(baseUrl: string, handle: string): Promise<ActorOutput> {
    const productUrl = `${baseUrl}/products/${handle}`;
    const html = await fetchUrl(productUrl, { timeout: 30000 });

    const product = this.parseProductPage(html, baseUrl, handle);

    if (!product) {
      return {
        success: false,
        error: 'Product not found',
      };
    }

    return {
      success: true,
      data: {
        product,
        url: productUrl,
      },
    };
  }

  /**
   * Get collections from the store
   */
  private async getCollections(
    baseUrl: string,
    collectionHandle?: string,
    maxProducts: number = 50
  ): Promise<ActorOutput> {
    if (collectionHandle) {
      // Get specific collection
      const collectionUrl = `${baseUrl}/collections/${collectionHandle}`;
      const html = await fetchUrl(collectionUrl, { timeout: 30000 });

      const collection = this.parseCollectionPage(html, baseUrl, collectionHandle);
      const products = this.parseProductList(html, baseUrl, maxProducts);

      return {
        success: true,
        data: {
          collection: { ...collection, products },
          url: collectionUrl,
        },
      };
    }

    // Get all collections
    const collectionsUrl = `${baseUrl}/collections`;
    const html = await fetchUrl(collectionsUrl, { timeout: 30000 });

    const collections = this.parseCollectionsList(html, baseUrl);

    return {
      success: true,
      data: {
        collections,
        totalCollections: collections.length,
        url: collectionsUrl,
      },
    };
  }

  /**
   * Track pricing for products
   */
  private async getPricing(
    baseUrl: string,
    handle?: string,
    trackPricing: boolean = true
  ): Promise<ActorOutput> {
    if (handle) {
      // Get pricing for specific product
      const productUrl = `${baseUrl}/products/${handle}`;
      const html = await fetchUrl(productUrl, { timeout: 30000 });

      const pricing = this.parsePricingData(html, baseUrl, handle);

      return {
        success: true,
        data: pricing,
      };
    }

    // Get pricing from search page
    const searchUrl = `${baseUrl}/products`;
    const html = await fetchUrl(searchUrl, { timeout: 30000 });

    const $ = cheerio.load(html);
    const products = this.parseProductList(html, baseUrl, 50);

    const pricingHistory: PricingHistory[] = products.map((product: Product) => ({
      productId: product.id,
      productHandle: product.handle,
      title: product.title,
      currentPrice: product.price,
      compareAtPrice: product.compareAtPrice,
      currency: product.currency,
      url: product.url,
      priceChanges: product.compareAtPrice
        ? [{ price: product.price, date: new Date().toISOString() }]
        : [],
      discountPercentage: product.compareAtPrice
        ? Math.round(
            ((parseFloat(product.compareAtPrice.replace(/[^0-9.]/g, '')) -
              parseFloat(product.price.replace(/[^0-9.]/g, ''))) /
              parseFloat(product.compareAtPrice.replace(/[^0-9.]/g, ''))) *
              100
          )
        : undefined,
    }));

    return {
      success: true,
      data: {
        products: pricingHistory,
        totalProducts: pricingHistory.length,
        tracked: trackPricing,
      },
    };
  }

  /**
   * Parse product list from search results or collection page
   */
  private parseProductList(html: string, baseUrl: string, maxProducts: number): Product[] {
    const $ = cheerio.load(html);
    const products: Product[] = [];

    // Try to extract JSON-LD structured data first (most reliable)
    const jsonLdProducts = this.extractJsonLdProducts(html, baseUrl);
    if (jsonLdProducts.length > 0) {
      return jsonLdProducts.slice(0, maxProducts);
    }

    // Fallback: Parse from HTML
    const productCards = $('[data-product-id], .product-item, .product-card, .grid__item');

    productCards.each((_index: number, card: any) => {
      if (products.length >= maxProducts) return false;

      const product = this.extractProductFromCard($, card, baseUrl);
      if (product) {
        products.push(product);
      }
    });

    return products;
  }

  /**
   * Extract product data from JSON-LD structured data
   */
  private extractJsonLdProducts(html: string, baseUrl: string): Product[] {
    const $ = cheerio.load(html);
    const products: Product[] = [];

    $('script[type="application/ld+json"]').each((_index: number, el: any) => {
      try {
        const content = $(el).html();
        if (!content) return;

        const data = JSON.parse(content);

        // Handle array of structured data
        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
          if (item['@type'] === 'Product' || (Array.isArray(item['@graph']) && item['@graph'].some((g: any) => g['@type'] === 'Product'))) {
            const productData = item['@type'] === 'Product' ? item : item['@graph']?.find((g: any) => g['@type'] === 'Product');
            if (productData) {
              products.push(this.parseJsonLdProduct(productData, baseUrl));
            }
          }
        }
      } catch {
        // Skip invalid JSON-LD
      }
    });

    return products;
  }

  /**
   * Parse a JSON-LD Product into our Product format
   */
  private parseJsonLdProduct(data: any, baseUrl: string): Product {
    const offers = Array.isArray(data.offers) ? data.offers[0] : data.offers;

    return {
      id: data.sku || data.productID || '',
      handle: data.url?.split('/products/')[1] || '',
      title: data.name || '',
      description: data.description || '',
      vendor: data.brand?.name || data.brand || '',
      productType: data.category || '',
      tags: data.keywords?.split(',').map((k: string) => k.trim()) || [],
      price: offers?.price || '',
      compareAtPrice: offers?.priceSpecification?.previousPrice || undefined,
      currency: offers?.priceCurrency || 'USD',
      images: this.normalizeImages(Array.isArray(data.image) ? data.image : [data.image], baseUrl),
      variants: this.extractVariantsFromJsonLd(data),
      inventory: offers?.inventory || 0,
      sku: data.sku,
      url: data.url?.startsWith('http') ? data.url : `${baseUrl}${data.url}`,
      available: offers?.availability !== 'https://schema.org/OutOfStock',
    };
  }

  /**
   * Extract variants from JSON-LD data
   */
  private extractVariantsFromJsonLd(data: any): ProductVariant[] {
    const variants: ProductVariant[] = [];

    if (data.hasOwnProperty('offers')) {
      const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
      offers.forEach((offer: any, index: number) => {
        variants.push({
          id: offer.sku || `variant-${index}`,
          title: offer.name || 'Default',
          price: offer.price || '',
          compareAtPrice: offer.priceSpecification?.previousPrice,
          sku: offer.sku,
          inventory: offer.inventory || 0,
          options: {},
          available: offer.availability !== 'https://schema.org/OutOfStock',
        });
      });
    }

    return variants;
  }

  /**
   * Extract product from a card element
   */
  private extractProductFromCard($: any, card: any, baseUrl: string): Product | null {
    const $card = $(card);

    // Try various selectors
    const titleEl = $card.find('[data-product-title], .product-item__title, h3, .title').first();
    const priceEl = $card.find('[data-product-price], .price, .product-item__price').first();
    const imageEl = $card.find('img').first();
    const linkEl = $card.find('a').first();

    const title = titleEl.text().trim();
    if (!title) return null;

    const link = linkEl.attr('href') || '';
    const handle = link.replace('/products/', '').split('?')[0];
    const priceText = priceEl.text().trim();
    const image = imageEl.attr('src') || imageEl.attr('data-src') || '';

    // Extract inventory
    const inventoryText = $card.find('[data-inventory], .inventory').text().trim();
    const inventory = inventoryText ? parseInt(inventoryText.match(/\d+/)?.[0] || '0') : 0;

    // Extract compare at price
    const compareAtEl = $card.find('.compare-at-price, .was-price, [data-compare-at-price]');
    const compareAtPrice = compareAtEl.text().trim() || undefined;

    return {
      id: $card.attr('data-product-id') || handle,
      handle,
      title,
      description: '',
      vendor: '',
      productType: '',
      tags: [],
      price: priceText,
      compareAtPrice,
      currency: 'USD',
      images: image ? [this.normalizeImageUrl(image, baseUrl)] : [],
      variants: [],
      inventory,
      url: link.startsWith('http') ? link : `${baseUrl}${link}`,
      available: !inventoryText.toLowerCase().includes('out of stock'),
    };
  }

  /**
   * Parse full product page
   */
  private parseProductPage(html: string, baseUrl: string, handle: string): Product | null {
    const $ = cheerio.load(html);

    // Try JSON-LD first
    const jsonLdProducts = this.extractJsonLdProducts(html, baseUrl);
    if (jsonLdProducts.length > 0) {
      return jsonLdProducts[0];
    }

    // Fallback: Parse from HTML
    const title = $('h1, [data-product-title], .product-title').first().text().trim();
    if (!title) return null;

    const description = this.extractProductDescription($);
    const price = this.extractPrice($);
    const compareAtPrice = this.extractCompareAtPrice($);
    const images = this.extractProductImages($, baseUrl);
    const variants = this.extractProductVariants($);
    const vendor = $('[data-product-vendor], .vendor').first().text().trim();
    const productType = $('[data-product-type], .type').first().text().trim();
    const tags = this.extractTags($);

    return {
      id: $('[data-product-id]').attr('data-product-id') || handle,
      handle,
      title,
      description,
      vendor,
      productType,
      tags,
      price,
      compareAtPrice,
      currency: 'USD',
      images,
      variants,
      inventory: this.extractTotalInventory(variants),
      sku: variants[0]?.sku || $('[data-variant-sku]').attr('data-variant-sku') || undefined,
      url: `${baseUrl}/products/${handle}`,
      available: variants.some((v: ProductVariant) => v.available) || price !== '',
    };
  }

  /**
   * Extract product description
   */
  private extractProductDescription($: any): string {
    // Try various selectors
    const selectors = [
      '[data-product-description]',
      '.product-description',
      '.product-details__content',
      '#product-description',
      '.description',
      '[itemprop="description"]',
    ];

    for (const selector of selectors) {
      const el = $(selector).first();
      if (el.length > 0) {
        return el.text().trim();
      }
    }

    return '';
  }

  /**
   * Extract price from product page
   */
  private extractPrice($: any): string {
    const selectors = [
      '[data-product-price]',
      '.price__current',
      '.product-price',
      '.current-price',
      '[itemprop="price"]',
      '.price',
    ];

    for (const selector of selectors) {
      const el = $(selector).first();
      if (el.length > 0) {
        return el.text().trim();
      }
    }

    return '';
  }

  /**
   * Extract compare at price
   */
  private extractCompareAtPrice($: any): string | undefined {
    const selectors = [
      '[data-compare-at-price]',
      '.compare-at-price',
      '.was-price',
      '.price__compare',
    ];

    for (const selector of selectors) {
      const el = $(selector).first();
      if (el.length > 0) {
        const text = el.text().trim();
        if (text) return text;
      }
    }

    return undefined;
  }

  /**
   * Extract product images
   */
  private extractProductImages($: any, baseUrl: string): string[] {
    const images: string[] = [];

    // Gallery images
    $('[data-image-id], .product__media img, .product-image img').each((_: any, imgEl: any) => {
      const src = $(img).attr('src') || $(img).attr('data-src') || '';
      if (src) {
        images.push(this.normalizeImageUrl(src, baseUrl));
      }
    });

    // OG image
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && !images.includes(ogImage)) {
      images.push(this.normalizeImageUrl(ogImage, baseUrl));
    }

    return images;
  }

  /**
   * Extract product variants
   */
  private extractProductVariants($: any): ProductVariant[] {
    const variants: ProductVariant[] = [];

    // Try to find variant data in script tags
    const scriptContent = $('script[type="application/json"]').html();
    if (scriptContent) {
      try {
        const variantData = JSON.parse(scriptContent);
        if (Array.isArray(variantData)) {
          for (const variant of variantData) {
            if (variant.id) {
              variants.push({
                id: String(variant.id),
                title: variant.title || 'Default',
                price: variant.price ? (parseInt(variant.price) / 100).toFixed(2) : '',
                compareAtPrice: variant.compare_at_price
                  ? (parseInt(variant.compare_at_price) / 100).toFixed(2)
                  : undefined,
                sku: variant.sku,
                inventory: variant.inventory_quantity || 0,
                inventoryPolicy: variant.inventory_policy,
                weight: variant.weight?.toString(),
                weightUnit: variant.weight_unit,
                options: variant.options?.reduce((acc: Record<string, string>, opt: any, i: number) => {
                  acc[opt.name || `option${i}`] = variant[`option${i + 1}`] || '';
                  return acc;
                }, {}) || {},
                image: variant.featured_image?.src
                  ? this.normalizeImageUrl(variant.featured_image.src, '')
                  : undefined,
                available: variant.available ?? true,
              });
            }
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Fallback: parse from DOM
    if (variants.length === 0) {
      $('[data-variant-id], .variant, .product-variant').each((_: any, varEl: any) => {
        const priceEl = varEl.find('.price, [data-price]').first();
        const price = priceEl.text().trim();

        if (price) {
          variants.push({
            id: varEl.attr('data-variant-id') || `variant-${variants.length}`,
            title: varEl.find('.title, .option-value').first().text().trim() || 'Default',
            price,
            sku: varEl.find('[data-sku]').attr('data-sku'),
            inventory: parseInt(varEl.find('[data-inventory]').attr('data-inventory') || '0'),
            options: {},
            available: !varEl.hasClass('sold-out') && !varEl.hasClass('unavailable'),
          });
        }
      });
    }

    return variants;
  }

  /**
   * Extract total inventory from variants
   */
  private extractTotalInventory(variants: ProductVariant[]): number {
    if (variants.length === 0) return 0;
    return variants.reduce((sum, v) => sum + (v.inventory || 0), 0);
  }

  /**
   * Extract product tags
   */
  private extractTags($: any): string[] {
    const tags: string[] = [];

    $('[data-product-tags], .product-tags a, .tags a, .tag').each((_: any, tag: any) => {
      const text = $(tag).text().trim();
      if (text && !tags.includes(text)) {
        tags.push(text);
      }
    });

    return tags;
  }

  /**
   * Parse collection page
   */
  private parseCollectionPage(html: string, baseUrl: string, handle: string): Collection {
    const $ = cheerio.load(html);

    const title = $('h1, [data-collection-title], .collection-title').first().text().trim() || handle;
    const description = $('[data-collection-description], .collection-description').first().text().trim();
    const imageEl = $('[data-collection-image], .collection-image img').first();
    const image = imageEl.attr('src') || imageEl.attr('data-src') || '';
    const productCount = $('[data-product-count], .product-count').text().match(/\d+/)?.[0] || '0';

    return {
      id: handle,
      handle,
      title,
      description,
      image: image ? this.normalizeImageUrl(image, baseUrl) : undefined,
      url: `${baseUrl}/collections/${handle}`,
      productCount: parseInt(productCount),
    };
  }

  /**
   * Parse collections list page
   */
  private parseCollectionsList(html: string, baseUrl: string): Collection[] {
    const $ = cheerio.load(html);
    const collections: Collection[] = [];

    $('[data-collection-id], .collection-item, .collection-card, .grid__item').each((_index: number, item: any) => {
      const $item = $(item);
      const linkEl = $item.find('a').first();
      const titleEl = $item.find('h3, h2, .title').first();
      const imageEl = $item.find('img').first();

      const link = linkEl.attr('href') || '';
      const handle = link.replace('/collections/', '').split('?')[0];
      const title = titleEl.text().trim() || handle;
      const image = imageEl.attr('src') || imageEl.attr('data-src') || '';

      if (handle && title) {
        collections.push({
          id: handle,
          handle,
          title,
          description: '',
          image: image ? this.normalizeImageUrl(image, baseUrl) : undefined,
          url: link.startsWith('http') ? link : `${baseUrl}${link}`,
          productCount: 0,
        });
      }
    });

    return collections;
  }

  /**
   * Parse pricing data from product page
   */
  private parsePricingData(html: string, baseUrl: string, handle: string): PricingHistory {
    const $ = cheerio.load(html);

    const title = $('h1, [data-product-title]').first().text().trim() || handle;
    const price = this.extractPrice($);
    const compareAtPrice = this.extractCompareAtPrice($);
    const currency = $('[data-currency], .currency').first().text().trim() || 'USD';

    // Calculate discount percentage
    let discountPercentage: number | undefined;
    if (compareAtPrice) {
      const current = parseFloat(price.replace(/[^0-9.]/g, ''));
      const original = parseFloat(compareAtPrice.replace(/[^0-9.]/g, ''));
      if (original > 0) {
        discountPercentage = Math.round(((original - current) / original) * 100);
      }
    }

    return {
      productId: handle,
      productHandle: handle,
      title,
      currentPrice: price,
      compareAtPrice,
      currency,
      url: `${baseUrl}/products/${handle}`,
      priceChanges: [{ price, date: new Date().toISOString() }],
      discountPercentage,
    };
  }

  /**
   * Normalize image URLs
   */
  private normalizeImages(images: (string | undefined)[], baseUrl: string): string[] {
    return images
      .filter((img): img is string => !!img)
      .map((img) => this.normalizeImageUrl(img, baseUrl));
  }

  /**
   * Normalize single image URL
   */
  private normalizeImageUrl(url: string, baseUrl: string): string {
    if (!url) return '';

    // Already absolute URL
    if (url.startsWith('http')) return url;

    // Protocol-relative URL
    if (url.startsWith('//')) return `https:${url}`;

    // Relative URL
    if (baseUrl) {
      try {
        return new URL(url, baseUrl).href;
      } catch {
        return `${baseUrl}${url}`;
      }
    }

    return url;
  }
}

export default new ShopifyActor();
