/**
 * Amazon Actor - Product Advertising API (PA-API) Version
 * Uses Amazon's official PA-API (requires Amazon Associates account)
 *
 * Setup:
 * 1. Join Amazon Associates: https://affiliate-program.amazon.com/
 * 2. Get API access: https://webservices.amazon.com/paapi5/documentation/
 * 3. Get your Access Key + Secret Key + Associate Tag
 *
 * Required env vars:
 * - AMAZON_ACCESS_KEY
 * - AMAZON_SECRET_KEY
 * - AMAZON_ASSOCIATE_TAG (e.g., "myaffiliat-20")
 * - AMAZON_REGION (e.g., "us-east-1")
 *
 * PA-API requires AWS Signature V4 signing. For simplicity, this
 * implementation uses the Node.js fetch API with manual signing.
 */

import { Actor, ActorOutput, fetchUrl } from '@hojai/actor-runtime';
import { createHash, createHmac } from 'crypto';

export interface AmazonProduct {
  asin: string;
  title: string;
  brand?: string;
  price?: string;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  url?: string;
  image?: string;
  availability?: string;
  prime?: boolean;
  features?: string[];
  categories?: string[];
}

export class AmazonApiActor extends Actor {
  private accessKey?: string;
  private secretKey?: string;
  private associateTag?: string;
  private region: string = 'us-east-1';
  private readonly HOST = 'webservices.amazon.com';
  private readonly SERVICE = 'ProductAdvertisingAPI';

  constructor(config?: {
    accessKey?: string;
    secretKey?: string;
    associateTag?: string;
    region?: string;
  }) {
    super({
      id: 'amazon-api',
      name: 'Amazon PA-API Actor',
      description: 'Official Amazon Product Advertising API access',
      version: '1.0.0',
      capabilities: ['products', 'pricing', 'reviews', 'search', 'api-based'],
      rateLimit: { requests: 10, window: 1000 }, // PA-API: 1 req/sec sustained
    });

    this.accessKey = config?.accessKey || process.env.AMAZON_ACCESS_KEY;
    this.secretKey = config?.secretKey || process.env.AMAZON_SECRET_KEY;
    this.associateTag = config?.associateTag || process.env.AMAZON_ASSOCIATE_TAG;
    this.region = config?.region || process.env.AMAZON_REGION || 'us-east-1';
  }

  async scrape(input: any): Promise<ActorOutput> {
    try {
      const action = input.action || 'search_products';

      switch (action) {
        case 'search_products':
          return await this.searchProducts(input.params);
        case 'get_product':
          return await this.getProduct(input.params);
        case 'get_products':
          return await this.getProducts(input.params);
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Search for products by keyword
   */
  private async searchProducts(params: {
    keywords: string;
    limit?: number;
    searchIndex?: string;
  }): Promise<ActorOutput> {
    if (!params.keywords) {
      return { success: false, error: 'keywords is required' };
    }

    const xml = this.buildSearchItemsRequest({
      Keywords: params.keywords,
      SearchIndex: params.searchIndex || 'All',
      ItemCount: Math.min(params.limit || 10, 10),
    });

    const data = await this.paApiRequest('SearchItems', xml);
    const products = this.parseProducts(data);

    return {
      success: true,
      data: products,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'amazon-pa-api',
        itemsFound: products.length,
        duration: 0,
      },
    };
  }

  /**
   * Get single product by ASIN
   */
  private async getProduct(params: { asin: string }): Promise<ActorOutput> {
    if (!params.asin) {
      return { success: false, error: 'asin is required' };
    }

    const xml = this.buildGetItemsRequest([params.asin]);
    const data = await this.paApiRequest('GetItems', xml);
    const products = this.parseProducts(data);

    return {
      success: true,
      data: products[0] || null,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'amazon-pa-api',
        itemsFound: products.length,
        duration: 0,
      },
    };
  }

  /**
   * Get multiple products by ASIN
   */
  private async getProducts(params: { asins: string[] }): Promise<ActorOutput> {
    if (!params.asins || params.asins.length === 0) {
      return { success: false, error: 'asins array is required' };
    }

    const xml = this.buildGetItemsRequest(params.asins.slice(0, 10));
    const data = await this.paApiRequest('GetItems', xml);
    const products = this.parseProducts(data);

    return {
      success: true,
      data: products,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'amazon-pa-api',
        itemsFound: products.length,
        duration: 0,
      },
    };
  }

  /**
   * Make signed PA-API request
   */
  private async paApiRequest(operation: string, body: string): Promise<any> {
    if (!this.accessKey || !this.secretKey || !this.associateTag) {
      throw new Error(
        'Amazon PA-API credentials required. Set AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, ' +
        'AMAZON_ASSOCIATE_TAG env vars. Get them at https://webservices.amazon.com/paapi5/'
      );
    }

    const url = `https://${this.HOST}/paapi5/${operation.toLowerCase()}`;
    const headers = this.signRequest(operation, body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/xml; charset=utf-8',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`PA-API returned ${response.status}: ${await response.text()}`);
    }

    const responseText = await response.text();
    return responseText;

    return response;
  }

  /**
   * AWS Signature V4 signing for PA-API
   */
  private signRequest(operation: string, body: string): Record<string, string> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const payloadHash = createHash('sha256').update(body).digest('hex');

    const canonicalHeaders =
      `content-type:application/xml; charset=utf-8\n` +
      `host:${this.HOST}\n` +
      `x-amz-date:${amzDate}\n` +
      `x-amz-target:${this.SERVICE}.${operation}Version20180808\n`;

    const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';

    const canonicalRequest = [
      'POST',
      `/paapi5/${operation.toLowerCase()}`,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/${this.SERVICE}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // Derive signing key
    const kDate = createHmac('sha256', `AWS4${this.secretKey}`).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update(this.region).digest();
    const kService = createHmac('sha256', kRegion).update(this.SERVICE).digest();
    const kSigning = createHmac('sha256', kService).update('aws4_request').digest();

    const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    return {
      'Authorization': `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Target': `${this.SERVICE}.${operation}Version20180808`,
    };
  }

  /**
   * Build SearchItems XML request body
   */
  private buildSearchItemsRequest(params: {
    Keywords: string;
    SearchIndex: string;
    ItemCount: number;
  }): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<SearchItemsRequest>
  <PartnerTag>${this.associateTag}</PartnerTag>
  <PartnerType>Associates</PartnerType>
  <Keywords>${this.escapeXml(params.Keywords)}</Keywords>
  <SearchIndex>${params.SearchIndex}</SearchIndex>
  <ItemCount>${params.ItemCount}</ItemCount>
  <Resources>
    <Resource>ItemInfo.Title</Resource>
    <Resource>ItemInfo.Features</Resource>
    <Resource>ItemInfo.ProductInfo</Resource>
    <Resource>Offers.Listings.Price</Resource>
    <Resource>Offers.Listings.DeliveryInfo.IsPrimeEligible</Resource>
    <Resource>Images.Primary.Medium</Resource>
    <Resource>CustomerReviews.Count</Resource>
    <Resource>CustomerReviews.StarRating</Resource>
  </Resources>
</SearchItemsRequest>`;
  }

  /**
   * Build GetItems XML request body
   */
  private buildGetItemsRequest(asins: string[]): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<GetItemsRequest>
  <PartnerTag>${this.associateTag}</PartnerTag>
  <PartnerType>Associates</PartnerType>
  <ItemIds>
    ${asins.map(a => `<ItemId>${this.escapeXml(a)}</ItemId>`).join('\n    ')}
  </ItemIds>
  <Resources>
    <Resource>ItemInfo.Title</Resource>
    <Resource>ItemInfo.Features</Resource>
    <Resource>ItemInfo.ProductInfo</Resource>
    <Resource>Offers.Listings.Price</Resource>
    <Resource>Offers.Listings.DeliveryInfo.IsPrimeEligible</Resource>
    <Resource>Images.Primary.Medium</Resource>
    <Resource>CustomerReviews.Count</Resource>
    <Resource>CustomerReviews.StarRating</Resource>
  </Resources>
</GetItemsRequest>`;
  }

  /**
   * Parse XML response from PA-API
   */
  private parseProducts(xml: string): AmazonProduct[] {
    const products: AmazonProduct[] = [];

    // Simple regex-based XML parsing (production should use fast-xml-parser)
    const itemRegex = /<Item>([\s\S]*?)<\/Item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const product: AmazonProduct = {
        asin: this.extractXmlValue(itemXml, 'ASIN') || '',
        title: this.extractXmlValue(itemXml, 'Title') || '',
        brand: this.extractXmlValue(itemXml, 'Brand'),
        price: this.extractXmlValue(itemXml, 'DisplayAmount'),
        currency: this.extractXmlValue(itemXml, 'Currency'),
        rating: parseFloat(this.extractXmlValue(itemXml, 'StarRating') || '0'),
        reviewCount: parseInt(this.extractXmlValue(itemXml, 'Count') || '0'),
        url: this.extractXmlAttr(itemXml, 'DetailPageURL'),
        image: this.extractXmlValue(itemXml, 'PrimaryMedium') || this.extractXmlValue(itemXml, 'Medium'),
        availability: this.extractXmlValue(itemXml, 'Availability'),
        prime: this.extractXmlValue(itemXml, 'IsPrimeEligible') === 'true',
        features: this.extractXmlList(itemXml, 'Feature'),
        categories: this.extractXmlList(itemXml, 'DisplayName'),
      };
      if (product.asin) products.push(product);
    }

    return products;
  }

  private extractXmlValue(xml: string, tag: string): string | undefined {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
    const match = regex.exec(xml);
    return match ? match[1].trim() : undefined;
  }

  private extractXmlAttr(xml: string, tag: string): string | undefined {
    const regex = new RegExp(`<${tag}[^>]*?>([\\s\\S]*?)</${tag}>`);
    const match = regex.exec(xml);
    return match ? match[1].trim() : undefined;
  }

  private extractXmlList(xml: string, tag: string): string[] {
    const items: string[] = [];
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
    let match;
    while ((match = regex.exec(xml)) !== null) {
      items.push(match[1].trim());
    }
    return items;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async validate(input: any): Promise<boolean> {
    return !!(input?.params?.keywords || input?.params?.asin || input?.params?.asins);
  }
}

export default AmazonApiActor;