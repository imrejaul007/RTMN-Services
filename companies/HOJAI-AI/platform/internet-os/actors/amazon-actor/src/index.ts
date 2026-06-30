/**
 * Amazon Actor
 * Extract products, pricing, reviews, and search from Amazon
 */

// @ts-ignore - Using compiled output
import { Actor, ActorOutput, fetchUrl, parseHtml } from '../../actor-runtime/dist/index.js';
import type { CheerioAPI } from 'cheerio';

export interface AmazonConfig {
  id: 'amazon';
  name: 'Amazon Actor';
  description: 'Extract products, pricing, reviews, and search from Amazon';
  version: '1.0.0';
  capabilities: ['products', 'pricing', 'reviews', 'search'];
  rateLimit: { requests: number; window: number };
}

export interface ProductResult {
  asin: string;
  title: string;
  price: {
    current: string;
    currency: string;
    original?: string;
    discount?: number;
  };
  rating: {
    average: number;
    count: number;
  };
  images: string[];
  description: string;
  features: string[];
  specifications: Record<string, string>;
  availability: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  primeEligible: boolean;
  url: string;
}

export interface SearchResult {
  query: string;
  totalResults: number;
  products: SearchProduct[];
  searchUrl: string;
}

export interface SearchProduct {
  asin: string;
  title: string;
  price: string;
  originalPrice?: string;
  rating: number;
  reviewsCount: number;
  image: string;
  url: string;
  badge?: string;
  primeEligible: boolean;
}

export interface ReviewResult {
  asin: string;
  productTitle: string;
  averageRating: number;
  totalReviews: number;
  positiveReviews: number;
  criticalReviews: number;
  reviews: Review[];
  pagination: {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  author: string;
  date: string;
  verified: boolean;
  helpful: number;
  variant?: string;
}

export interface PricingResult {
  asin: string;
  title: string;
  currentPrice: string;
  originalPrice?: string;
  currency: string;
  discount?: number;
  availability: string;
  priceHistory: {
    price: string;
    date: string;
  }[];
  url: string;
}

export interface AmazonScrapeInput {
  action: 'search_products' | 'get_product' | 'get_reviews' | 'get_pricing';
  query?: string;
  asin?: string;
  domain?: string;
  maxResults?: number;
  page?: number;
  sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
}

export class AmazonActor extends Actor {
  private readonly DEFAULT_DOMAIN = 'www.amazon.com';
  private readonly DOMAIN_MAP: Record<string, string> = {
    'us': 'www.amazon.com',
    'uk': 'www.amazon.co.uk',
    'de': 'www.amazon.de',
    'fr': 'www.amazon.fr',
    'it': 'www.amazon.it',
    'es': 'www.amazon.es',
    'in': 'www.amazon.in',
    'jp': 'www.amazon.co.jp',
    'ca': 'www.amazon.ca',
    'au': 'www.amazon.com.au',
  };

  constructor() {
    super({
      id: 'amazon',
      name: 'Amazon Actor',
      description: 'Extract products, pricing, reviews, and search from Amazon',
      version: '1.0.0',
      capabilities: ['products', 'pricing', 'reviews', 'search'],
      rateLimit: { requests: 20, window: 60000 },
    });
  }

  async scrape(input: AmazonScrapeInput): Promise<ActorOutput> {
    try {
      const domain = this.normalizeDomain(input.domain || 'us');

      switch (input.action) {
        case 'search_products':
          return await this.searchProducts(input.query || '', domain, input.maxResults || 20);
        case 'get_product':
          return await this.getProduct(input.asin || '', domain);
        case 'get_reviews':
          return await this.getReviews(
            input.asin || '',
            domain,
            input.page || 1,
            input.sortBy || 'recent',
            input.maxResults || 10
          );
        case 'get_pricing':
          return await this.getPricing(input.asin || '', domain);
        default:
          return {
            success: false,
            error: `Unknown action: ${input.action}`,
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
    if (!input.action) return false;

    const validActions = ['search_products', 'get_product', 'get_reviews', 'get_pricing'];
    if (!validActions.includes(input.action)) return false;

    switch (input.action) {
      case 'search_products':
        return typeof input.query === 'string' && input.query.length > 0;
      case 'get_product':
      case 'get_reviews':
      case 'get_pricing':
        return typeof input.asin === 'string' && input.asin.length > 0;
      default:
        return false;
    }
  }

  /**
   * Normalize domain to full Amazon URL
   */
  private normalizeDomain(domain: string): string {
    const normalized = domain.toLowerCase().trim();
    if (normalized.startsWith('www.amazon.')) {
      return normalized;
    }
    return this.DOMAIN_MAP[normalized] || this.DEFAULT_DOMAIN;
  }

  /**
   * Build Amazon URL
   */
  private buildUrl(path: string, domain: string): string {
    return `https://${domain}${path}`;
  }

  /**
   * Search for products on Amazon
   */
  private async searchProducts(query: string, domain: string, maxResults: number): Promise<ActorOutput> {
    const searchUrl = this.buildUrl(`/s?k=${encodeURIComponent(query)}`, domain);
    const html = await fetchUrl(searchUrl, { timeout: 30000 });

    const products = this.parseSearchResults(html, domain, maxResults);

    // Get total results count
    const $ = parseHtml(html);
    const totalText = $('[data-component="s-search-result"]').attr('data-uuid') || '';
    const resultCount = $('.s-result-list .s-result-item').length;

    return {
      success: true,
      data: {
        query,
        totalResults: resultCount,
        products,
        searchUrl,
      } as SearchResult,
    };
  }

  /**
   * Get single product details
   */
  private async getProduct(asin: string, domain: string): Promise<ActorOutput> {
    const productUrl = this.buildUrl(`/dp/${asin}`, domain);
    const html = await fetchUrl(productUrl, { timeout: 30000 });

    const product = this.parseProductPage(html, asin, domain, productUrl);

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
   * Get product reviews
   */
  private async getReviews(
    asin: string,
    domain: string,
    page: number,
    sortBy: string,
    maxResults: number
  ): Promise<ActorOutput> {
    const sortParam = this.getSortParam(sortBy);
    const reviewsUrl = this.buildUrl(
      `/product-reviews/${asin}/?sortBy=${sortParam}&pageNumber=${page}`,
      domain
    );
    const html = await fetchUrl(reviewsUrl, { timeout: 30000 });

    const reviews = this.parseReviews(html, asin);
    const productInfo = this.parseReviewProductInfo(html, asin);

    return {
      success: true,
      data: {
        ...productInfo,
        reviews: reviews.slice(0, maxResults),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(reviews.length / maxResults) || 1,
          hasNextPage: reviews.length > maxResults,
        },
      } as ReviewResult,
    };
  }

  /**
   * Track pricing for a product
   */
  private async getPricing(asin: string, domain: string): Promise<ActorOutput> {
    const productUrl = this.buildUrl(`/dp/${asin}`, domain);
    const html = await fetchUrl(productUrl, { timeout: 30000 });

    const pricing = this.parsePricingData(html, asin, domain, productUrl);

    return {
      success: true,
      data: pricing,
    };
  }

  /**
   * Parse search results from HTML
   */
  private parseSearchResults(html: string, domain: string, maxResults: number): SearchProduct[] {
    const $ = parseHtml(html);
    const products: SearchProduct[] = [];

    // Try to find product items using multiple selectors
    const selectors = [
      '[data-component="s-search-result"]',
      '.s-result-item',
      '[data-uuid]',
      '.sg-col-inner',
    ];

    let productItems: any[] = [];
    for (const selector of selectors) {
      productItems = $(selector).toArray();
      if (productItems.length > 0) break;
    }

    $(productItems.slice(0, maxResults).join('')).each((_index: number, el: any) => {
      const $el = $(el);

      // Extract ASIN from data attributes or URL
      const dataAsin = $el.attr('data-asin') || '';
      if (!dataAsin || dataAsin.length !== 10) return;

      // Title - try multiple selectors
      const titleSelectors = ['h2 a span', '.a-size-medium', '[class*="title"]', '.a-text-normal'];
      let title = '';
      for (const sel of titleSelectors) {
        title = $el.find(sel).first().text().trim();
        if (title) break;
      }
      if (!title) return;

      // Price
      const priceSelectors = ['.a-price .a-offscreen', '.a-price-whole', '[class*="price"]'];
      let price = '';
      for (const sel of priceSelectors) {
        price = $el.find(sel).first().text().trim();
        if (price) break;
      }

      // Original price (struck through)
      const originalPrice = $el.find('.a-text-price .a-offscreen, [class*="was-price"]').first().text().trim() || undefined;

      // Rating
      const ratingText = $el.find('.a-icon-alt, [aria-label*="out of"]').first().text().trim();
      const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

      // Reviews count
      const reviewsText = $el.find('.a-size-base.s-underline-text, [aria-label*="stars"]').first().text().trim();
      const reviewsMatch = reviewsText.replace(/[(),]/g, '').match(/\d+/);
      const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[0]) : 0;

      // Image
      const imageEl = $el.find('img').first();
      const image = imageEl.attr('src') || imageEl.attr('data-a-dynamic-image') || '';

      // URL
      let url = $el.find('h2 a').attr('href') || '';
      url = url.startsWith('/') ? this.buildUrl(url.split('?')[0], domain) : url;

      // Badge (Best Seller, etc.)
      const badgeEl = $el.find('[class*="badge"]').first();
      const badge = badgeEl.text().trim() || undefined;

      // Prime eligibility
      const primeEligible = $el.find('[class*="prime"]').length > 0;

      products.push({
        asin: dataAsin,
        title,
        price,
        originalPrice,
        rating,
        reviewsCount,
        image,
        url,
        badge,
        primeEligible,
      });
    });

    return products;
  }

  /**
   * Parse product page
   */
  private parseProductPage(html: string, asin: string, domain: string, productUrl: string): ProductResult | null {
    const $ = parseHtml(html);

    // Try JSON-LD first
    let productData = this.extractJsonLdProduct(html, asin, domain, productUrl);
    if (productData) return productData;

    // Fallback to HTML parsing
    // Title
    const titleSelectors = ['#productTitle', '#title', 'h1[itemprop="name"]', '.product-title'];
    let title = '';
    for (const sel of titleSelectors) {
      title = $(sel).first().text().trim();
      if (title) break;
    }
    if (!title) return null;

    // Price
    const price = this.extractPrice($);

    // Rating
    const ratingText = $('[#acrPopover, .a-icon-alt]').first().attr('title') ||
                       $('[class*="rating"]').first().text();
    const ratingMatch = ratingText?.match(/(\d+\.?\d*)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    // Reviews count
    const reviewsText = $('#acrCustomerReviewText, [class*="review-count"]').first().text();
    const reviewsMatch = reviewsText?.match(/[\d,]+/);
    const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[0].replace(/,/g, '')) : 0;

    // Images
    const images = this.extractProductImages($, domain);

    // Description
    const description = $('#productDescription, [data-feature-name="description"], #feature-bullets').first().text().trim();

    // Features
    const features: string[] = [];
    $('#feature-bullets li, [class*="feature"] li').each((_i: number, el: any) => {
      const text = $(el).text().trim();
      if (text && !text.includes('›')) {
        features.push(text);
      }
    });

    // Specifications
    const specifications: Record<string, string> = {};
    $('#productDetails_techSpec_section_1 tr, [class*="spec"] tr').each((_i: number, el: any) => {
      const $el = $(el);
      const key = $el.find('th, .label').first().text().trim();
      const value = $el.find('td, .value').first().text().trim();
      if (key && value) {
        specifications[key] = value;
      }
    });

    // Availability
    const availability = this.extractAvailability($);

    // Brand
    const brand = $('#bylineInfo, [class*="brand"]').first().text().trim() || undefined;

    // Category breadcrumb
    const categorySelectors = ['[class*="breadcrumb"] a', '#wayfinding-breadcrumbs_feature_div a'];
    let category = '';
    let subcategory = '';
    const categoryEls: string[] = [];
    for (const sel of categorySelectors) {
      $(sel).each((_i: number, el: any) => {
        categoryEls.push($(el).text().trim());
      });
      if (categoryEls.length > 0) break;
    }
    category = categoryEls[0] || '';
    subcategory = categoryEls[1] || '';

    // Prime eligibility
    const primeEligible = html.includes('prime') || $('[class*="prime"]').length > 0;

    return {
      asin,
      title,
      price,
      rating: { average: rating, count: reviewsCount },
      images,
      description,
      features,
      specifications,
      availability,
      brand,
      category,
      subcategory,
      primeEligible,
      url: productUrl,
    };
  }

  /**
   * Extract JSON-LD product data
   */
  private extractJsonLdProduct(html: string, asin: string, domain: string, productUrl: string): ProductResult | null {
    const $ = parseHtml(html);
    let product: ProductResult | null = null;

    $('script[type="application/ld+json"]').each((_index: number, el: any) => {
      try {
        const content = $(el).html();
        if (!content) return;

        const data = JSON.parse(content);
        const productData = this.findProductInJsonLd(data);

        if (productData) {
          const offers = Array.isArray(productData.offers)
            ? productData.offers[0]
            : productData.offers;

          const currentPrice = offers?.price?.toString() || '';
          const originalPrice = offers?.priceSpecification?.previousPrice?.toString();

          product = {
            asin,
            title: productData.name || '',
            price: {
              current: currentPrice,
              currency: offers?.priceCurrency || 'USD',
              original: originalPrice,
              discount: originalPrice && currentPrice
                ? Math.round(((parseFloat(originalPrice) - parseFloat(currentPrice)) / parseFloat(originalPrice)) * 100)
                : undefined,
            },
            rating: {
              average: parseFloat(productData.aggregateRating?.ratingValue) || 0,
              count: parseInt(productData.aggregateRating?.reviewCount) || 0,
            },
            images: this.normalizeImages(
              Array.isArray(productData.image) ? productData.image : [productData.image],
              domain
            ),
            description: productData.description || '',
            features: productData.features || [],
            specifications: {},
            availability: offers?.availability || 'In Stock',
            brand: productData.brand?.name || productData.brand,
            category: productData.category?.split('>')[0]?.trim(),
            subcategory: productData.category?.split('>')[1]?.trim(),
            primeEligible: productData.offers?.shippingDetails?.hasPreorderDeliveryDuty || false,
            url: productUrl,
          };
          return false; // break
        }
      } catch {
        // Skip invalid JSON-LD
      }
    });

    return product;
  }

  /**
   * Find product in JSON-LD nested structure
   */
  private findProductInJsonLd(data: any): any {
    if (!data) return null;

    if (data['@type'] === 'Product') return data;
    if (Array.isArray(data)) {
      for (const item of data) {
        const found = this.findProductInJsonLd(item);
        if (found) return found;
      }
    }
    if (data['@graph']) {
      const found = data['@graph'].find((g: any) => g['@type'] === 'Product');
      if (found) return found;
    }

    return null;
  }

  /**
   * Parse reviews from HTML
   */
  private parseReviews(html: string, asin: string): Review[] {
    const $ = parseHtml(html);
    const reviews: Review[] = [];

    // Try multiple selectors for review containers
    const reviewSelectors = [
      '[data-hook="review"]',
      '.review',
      '[class*="review-"]',
    ];

    let reviewItems: any[] = [];
    for (const selector of reviewSelectors) {
      reviewItems = $(selector).toArray();
      if (reviewItems.length > 0) break;
    }

    $(reviewItems.join('')).each((index: number, el: any) => {
      const $el = $(el);

      // Review ID
      const id = $el.attr('id') || $el.attr('data-hook') || `review-${index}`;

      // Rating
      const ratingText = $el.find('[class*="rating"]').first().attr('title') ||
                         $el.find('[data-hook="review-star-rating"]').attr('title') || '';
      const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

      // Title
      const title = $el.find('[data-hook="review-title"], [class*="title"]').first().text().trim();

      // Body
      const body = $el.find('[data-hook="review-body"], [class*="body"]').first().text().trim();

      // Author
      const author = $el.find('[class*="author"], [class*="profile"]').first().text().trim() ||
                     $el.find('a[class*="profile"]').first().text().trim();

      // Date
      const date = $el.find('[data-hook="review-date"], [class*="date"]').first().text().trim();

      // Verified purchase
      const verified = $el.find('[class*="verified"]').length > 0 ||
                       $el.find('[data-hook="avp-badge"]').length > 0;

      // Helpful count
      const helpfulText = $el.find('[class*="helpful"]').first().text().trim();
      const helpfulMatch = helpfulText.match(/\d+/);
      const helpful = helpfulMatch ? parseInt(helpfulMatch[0]) : 0;

      // Variant (size, color, etc.)
      const variant = $el.find('[class*="variation"]').first().text().trim() || undefined;

      if (title || body) {
        reviews.push({
          id,
          rating,
          title,
          body,
          author,
          date,
          verified,
          helpful,
          variant,
        });
      }
    });

    return reviews;
  }

  /**
   * Parse review product info (title, rating summary)
   */
  private parseReviewProductInfo(html: string, asin: string): { asin: string; productTitle: string; averageRating: number; totalReviews: number; positiveReviews: number; criticalReviews: number } {
    const $ = parseHtml(html);

    const productTitle = $('#productTitle, [data-hook="product-link"]').first().text().trim() || asin;

    const avgRatingText = $('[data-hook="rating-out-of"], .a-icon-alt').first().attr('title') || '';
    const avgRatingMatch = avgRatingText.match(/(\d+\.?\d*)/);
    const averageRating = avgRatingMatch ? parseFloat(avgRatingMatch[1]) : 0;

    const totalText = $('[data-hook="total-review-count"], #acrCustomerReviewText').first().text();
    const totalMatch = totalText.match(/[\d,]+/);
    const totalReviews = totalMatch ? parseInt(totalMatch[0].replace(/,/g, '')) : 0;

    // Count positive vs critical reviews from histogram
    let positiveReviews = 0;
    let criticalReviews = 0;
    $('[class*="histogram"] [class*="star"]').each((i: number, el: any) => {
      const countText = $(el).find('[class*="count"]').text().trim();
      const count = parseInt(countText.replace(/,/g, '')) || 0;
      if (i >= 3) criticalReviews += count; // 1-3 stars
      else positiveReviews += count; // 4-5 stars
    });

    return {
      asin,
      productTitle,
      averageRating,
      totalReviews,
      positiveReviews,
      criticalReviews,
    };
  }

  /**
   * Parse pricing data
   */
  private parsePricingData(html: string, asin: string, domain: string, productUrl: string): PricingResult {
    const $ = parseHtml(html);

    const title = $('#productTitle, #title').first().text().trim() || asin;
    const { current, currency, original } = this.extractPriceWithCurrency($);

    let discount: number | undefined;
    if (original && current) {
      const currentNum = parseFloat(current.replace(/[^0-9.]/g, ''));
      const originalNum = parseFloat(original.replace(/[^0-9.]/g, ''));
      if (originalNum > currentNum) {
        discount = Math.round(((originalNum - currentNum) / originalNum) * 100);
      }
    }

    const availability = this.extractAvailability($);

    return {
      asin,
      title,
      currentPrice: current,
      originalPrice: original,
      currency,
      discount,
      availability,
      priceHistory: [{ price: current || original || 'N/A', date: new Date().toISOString() }],
      url: productUrl,
    };
  }

  /**
   * Extract price with currency
   */
  private extractPrice($: CheerioAPI): { current: string; currency: string; original?: string; discount?: number } {
    // Current price
    const currentSelectors = [
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#priceblock_saleprice',
      '.a-price .a-offscreen',
      '[data-a-color="price"] .a-offscreen',
      '.apexPriceToPay .a-offscreen',
    ];
    let current = '';
    for (const sel of currentSelectors) {
      current = $(sel).first().text().trim();
      if (current) break;
    }

    // Original price
    const originalSelectors = [
      '.a-text-price .a-offscreen',
      '[class*="was-price"]',
      '#priceblock_ourprice_lbl',
    ];
    let original = '';
    for (const sel of originalSelectors) {
      original = $(sel).first().text().trim();
      if (original) break;
    }

    // Currency detection
    let currency = 'USD';
    const currencyMatch = current.match(/[₹$£€¥]/);
    if (currencyMatch) {
      const currencyMap: Record<string, string> = {
        '₹': 'INR',
        '$': 'USD',
        '£': 'GBP',
        '€': 'EUR',
        '¥': 'JPY',
      };
      currency = currencyMap[currencyMatch[0]] || 'USD';
    }

    // Calculate discount
    let discount: number | undefined;
    if (original && current) {
      const currentNum = parseFloat(current.replace(/[^0-9.]/g, ''));
      const originalNum = parseFloat(original.replace(/[^0-9.]/g, ''));
      if (originalNum > currentNum && originalNum > 0) {
        discount = Math.round(((originalNum - currentNum) / originalNum) * 100);
      }
    }

    return { current, currency, original: original || undefined, discount };
  }

  /**
   * Extract price with currency (returns object form)
   */
  private extractPriceWithCurrency($: CheerioAPI): { current: string; currency: string; original?: string } {
    return this.extractPrice($);
  }

  /**
   * Extract availability
   */
  private extractAvailability($: CheerioAPI): string {
    const availabilitySelectors = [
      '#availability span',
      '[data-hook="availability-message"]',
      '.a-section .a-spacing-none .a-color-state',
      '#outOfStock',
    ];
    for (const sel of availabilitySelectors) {
      const text = $(sel).first().text().trim();
      if (text) return text;
    }
    return 'Available';
  }

  /**
   * Extract product images
   */
  private extractProductImages($: CheerioAPI, domain: string): string[] {
    const images: string[] = [];

    // Image gallery
    const imageSelectors = [
      '#altImages img',
      '#imgTagWrapperId img',
      '#main-image',
      '[data-hook="main-image"]',
      '.a-dynamic-image',
    ];

    for (const sel of imageSelectors) {
      $(sel).each((_i: number, el: any) => {
        let src = $(el).attr('src') || '';
        if (src && !images.includes(src)) {
          images.push(this.normalizeImageUrl(src, domain));
        }
      });
      if (images.length > 0) break;
    }

    // OG image
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && !images.includes(ogImage)) {
      images.push(ogImage);
    }

    return images;
  }

  /**
   * Normalize images
   */
  private normalizeImages(images: (string | undefined)[], domain: string): string[] {
    return images
      .filter((img): img is string => !!img)
      .map((img) => this.normalizeImageUrl(img, domain));
  }

  /**
   * Normalize single image URL
   */
  private normalizeImageUrl(url: string, domain: string): string {
    if (!url) return '';

    // Already absolute URL
    if (url.startsWith('http')) return url;

    // Protocol-relative URL
    if (url.startsWith('//')) return `https:${url}`;

    // Relative URL
    if (domain) {
      try {
        return new URL(url, `https://${domain}`).href;
      } catch {
        return `https://${domain}${url}`;
      }
    }

    return url;
  }

  /**
   * Get sort parameter for reviews
   */
  private getSortParam(sortBy: string): string {
    const sortMap: Record<string, string> = {
      recent: 'recent',
      helpful: 'helpful',
      rating_high: 'reviewer_rankings_high',
      rating_low: 'reviewer_rankings_low',
    };
    return sortMap[sortBy] || 'recent';
  }
}

export default new AmazonActor();
