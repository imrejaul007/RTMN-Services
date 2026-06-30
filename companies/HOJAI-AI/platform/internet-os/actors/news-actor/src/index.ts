/**
 * News Actor
 * News extraction and monitoring
 */

import { Actor, ActorOutput, fetchUrl, parseHtml } from '../../actor-runtime/src/index.js';

export class NewsActor extends Actor {
  constructor() {
    super({
      id: 'news',
      name: 'News Scraper',
      description: 'Extract news articles, trends, and sentiment from various sources',
      version: '1.0.0',
      capabilities: ['search', 'trending', 'company_news', 'industry_news', 'sentiment'],
      rateLimit: { requests: 30, window: 60000 },
    });
  }

  async scrape(input: {
    type: 'search' | 'trending' | 'company' | 'industry';
    query?: string;
    sources?: string[];
    dateRange?: string;
    limit?: number;
  }): Promise<ActorOutput> {
    const { type, query, sources, dateRange = '7d', limit = 20 } = input;

    try {
      switch (type) {
        case 'search':
          return await this.searchNews(query!, { sources, dateRange, limit });
        case 'trending':
          return await this.getTrending({ limit });
        case 'company':
          return await this.getCompanyNews(query!, { sources, dateRange, limit });
        case 'industry':
          return await this.getIndustryNews(query!, { sources, dateRange, limit });
        default:
          return await this.searchNews(query!, { sources, dateRange, limit });
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
      };
    }
  }

  private async searchNews(
    query: string,
    options: { sources?: string[]; dateRange?: string; limit?: number }
  ): Promise<ActorOutput> {
    const { sources, dateRange = '7d', limit = 20 } = options;

    // Try Google News
    const googleNewsUrl = `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const html = await fetchUrl(googleNewsUrl, { timeout: 30000 });

    const articles = this.parseNewsArticles(html, limit);

    // Filter by sources if specified
    let filteredArticles = articles;
    if (sources && sources.length > 0) {
      filteredArticles = articles.filter((a) =>
        sources.some((s) => a.source?.toLowerCase().includes(s.toLowerCase()))
      );
    }

    // Add sentiment analysis
    const analyzedArticles = await this.analyzeSentiment(filteredArticles);

    return {
      success: true,
      data: {
        query,
        articles: analyzedArticles,
        totalFound: analyzedArticles.length,
      },
    };
  }

  private async getTrending(options: { limit?: number }): Promise<ActorOutput> {
    const { limit = 10 } = options;

    const html = await fetchUrl('https://news.google.com/?hl=en-IN&gl=IN&ceid=IN:en', {
      timeout: 30000,
    });

    const articles = this.parseNewsArticles(html, limit);

    return {
      success: true,
      data: {
        articles,
        totalFound: articles.length,
      },
    };
  }

  private async getCompanyNews(
    company: string,
    options: { sources?: string[]; dateRange?: string; limit?: number }
  ): Promise<ActorOutput> {
    const { sources, dateRange = '30d', limit = 20 } = options;

    // Search for company name
    const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(company)}+${encodeURIComponent('company OR stock OR launch')}&hl=en-IN&gl=IN&ceid=IN:en`;
    const html = await fetchUrl(searchUrl, { timeout: 30000 });

    let articles = this.parseNewsArticles(html, limit);

    // Add financial context
    const enrichedArticles = articles.map((article) => ({
      ...article,
      companyRelevance: this.calculateRelevance(article.title + article.summary, company),
    }));

    // Sort by relevance
    enrichedArticles.sort((a, b) => b.companyRelevance - a.companyRelevance);

    return {
      success: true,
      data: {
        company,
        articles: enrichedArticles,
        totalFound: enrichedArticles.length,
      },
    };
  }

  private async getIndustryNews(
    industry: string,
    options: { sources?: string[]; dateRange?: string; limit?: number }
  ): Promise<ActorOutput> {
    const { sources, dateRange = '7d', limit = 20 } = options;

    const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(industry)}+${encodeURIComponent('industry OR market OR trends')}&hl=en-IN&gl=IN&ceid=IN:en`;
    const html = await fetchUrl(searchUrl, { timeout: 30000 });

    let articles = this.parseNewsArticles(html, limit);

    // Categorize articles
    const categorized = this.categorizeArticles(articles);

    return {
      success: true,
      data: {
        industry,
        categorized,
        totalFound: articles.length,
      },
    };
  }

  private parseNewsArticles(html: string, limit: number): any[] {
    const articles: any[] = [];
    const doc = parseHtml(html);

    const articleEls = doc.querySelectorAll('article');

    articleEls.slice(0, limit).forEach((el) => {
      const title = el.querySelector('h3, h4')?.textContent?.trim();
      const link = el.querySelector('a')?.getAttribute('href');
      const source = el.querySelector('.wEwyRc, .VNVAW, .source')?.textContent?.trim();
      const time = el.querySelector('.UBbYof, .WW6dff, time')?.textContent?.trim();
      const image = el.querySelector('img')?.getAttribute('src');

      if (title) {
        articles.push({
          title,
          url: link ? `https://news.google.com${link}` : null,
          source,
          publishedAt: time,
          image,
        });
      }
    });

    return articles;
  }

  private async analyzeSentiment(articles: any[]): Promise<any[]> {
    // Simple keyword-based sentiment
    return articles.map((article) => {
      const text = `${article.title} ${article.summary || ''}`.toLowerCase();

      const positive = ['growth', 'profit', 'success', 'launch', 'innovation', 'award', 'partnership', 'positive', 'increase', 'rise'];
      const negative = ['loss', 'layoff', 'scam', 'fraud', 'lawsuit', 'decline', 'decrease', 'crisis', 'negative', 'fall'];

      let score = 0;
      positive.forEach((w) => { if (text.includes(w)) score += 1; });
      negative.forEach((w) => { if (text.includes(w)) score -= 1; });

      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (score > 0) sentiment = 'positive';
      if (score < 0) sentiment = 'negative';

      return {
        ...article,
        sentiment,
        sentimentScore: score,
      };
    });
  }

  private calculateRelevance(text: string, company: string): number {
    let score = 0;
    const lower = text.toLowerCase();
    const companyLower = company.toLowerCase();

    // Direct mentions
    if (lower.includes(companyLower)) score += 10;

    // Related terms
    const related = ['company', 'firm', 'inc', 'ltd', 'stock', 'market', 'business'];
    related.forEach((term) => {
      if (lower.includes(term)) score += 2;
    });

    return score;
  }

  private categorizeArticles(articles: any[]): Record<string, any[]> {
    const categories: Record<string, any[]> = {
      funding: [],
      product: [],
      leadership: [],
      regulatory: [],
      market: [],
      other: [],
    };

    articles.forEach((article) => {
      const text = (article.title + ' ' + (article.summary || '')).toLowerCase();

      if (text.match(/funding|raised|investor|series|ipo|investment/)) {
        categories.funding.push(article);
      } else if (text.match(/launch|product|feature|update|release/)) {
        categories.product.push(article);
      } else if (text.match(/ceo|founder|appointment|executive|leadership/)) {
        categories.leadership.push(article);
      } else if (text.match(/regulator|government|policy|law|compliance/)) {
        categories.regulatory.push(article);
      } else if (text.match(/market|revenue|profit|growth|industry/)) {
        categories.market.push(article);
      } else {
        categories.other.push(article);
      }
    });

    return categories;
  }

  async validate(input: any): Promise<boolean> {
    return !!(input && input.type);
  }
}

export default new NewsActor();
