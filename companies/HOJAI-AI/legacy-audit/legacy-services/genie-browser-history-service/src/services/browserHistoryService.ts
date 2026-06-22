/**
 * GENIE Browser History Service - Business Logic
 */
import { BrowserVisit, BrowsingPattern, BrowsingInsight, IBrowserVisit } from '../models/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('browser-history');

const CATEGORY_PATTERNS: Record<string, string[]> = {
  shopping: ['amazon', 'flipkart', 'myntra', 'shopify', 'ebay', 'walmart', 'target', 'costco'],
  news: ['news', 'times', 'guardian', 'bbc', 'cnn', 'reuters', 'ndtv', 'hindu'],
  social: ['facebook', 'twitter', 'instagram', 'linkedin', 'reddit', 'tiktok', 'snapchat'],
  video: ['youtube', 'netflix', 'prime', 'hotstar', 'disney', 'twitch'],
  travel: ['booking', 'airbnb', 'makemytrip', 'goibibo', 'expedia', 'trivago'],
  food: ['swiggy', 'zomato', 'ubereats', 'doordash', 'grubhub'],
  finance: ['bank', 'finance', 'money', 'invest', 'stock', 'crypto', 'coinbase'],
  tech: ['github', 'stackoverflow', 'dev.to', 'medium', 'hashnode', 'producthunt'],
  health: ['health', 'medical', 'clinic', 'hospital', 'pharma'],
};

const PRODUCT_PATTERNS = [
  /\/product\//i, /\/p\//i, /\/item\//i, /\/dp\//i, /\/pd\//i,
  /add-to-cart/i, /buy-now/i, /price:/i,
];

export class BrowserHistoryService {
  async addVisits(tenantId: string, userId: string, visits: Array<{ url: string; title?: string; visit_time?: string; time_spent_seconds?: number }>, browser: string, deviceType: string): Promise<IBrowserVisit[]> {
    const results: IBrowserVisit[] = [];
    for (const v of visits) {
      const url = new URL(v.url);
      const domain = url.hostname.replace('www.', '');
      const category = this.categorize(domain);
      const isProduct = PRODUCT_PATTERNS.some(p => p.test(v.url));

      let visit = await BrowserVisit.findOne({ tenant_id: tenantId, linked_user_id: userId, domain });
      if (visit) {
        visit.visit_count += 1;
        visit.time_spent_seconds += v.time_spent_seconds || 0;
        visit.last_visit = new Date(v.visit_time || Date.now());
        if (v.title && !visit.title) visit.title = v.title;
        if (isProduct) visit.is_product_page = true;
        await visit.save();
      } else {
        visit = await BrowserVisit.create({
          tenant_id: tenantId, linked_user_id: userId, url: v.url, domain, title: v.title,
          category, time_spent_seconds: v.time_spent_seconds || 0, visit_count: 1,
          first_visit: new Date(v.visit_time || Date.now()), last_visit: new Date(v.visit_time || Date.now()),
          is_product_page: isProduct,
        });
      }
      results.push(visit);
    }
    logger.info('visits_added', { tenantId, userId, count: results.length });
    return results;
  }

  private categorize(domain: string): string {
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      if (patterns.some(p => domain.includes(p))) return category;
    }
    return 'other';
  }

  async getPatterns(tenantId: string, userId: string, startDate: Date, endDate: Date): Promise<IBrowsingPattern[]> {
    return BrowsingPattern.find({ tenant_id: tenantId, linked_user_id: userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: -1 });
  }

  async generateDailyPattern(tenantId: string, userId: string, date: Date): Promise<IBrowsingPattern> {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);

    const visits = await BrowserVisit.find({ tenant_id: tenantId, linked_user_id: userId, last_visit: { $gte: start, $lte: end } });

    const domainStats: Record<string, { count: number; minutes: number }> = {};
    const categoryStats: Record<string, number> = {};
    const searchQueries: string[] = [];
    let productPages = 0;

    for (const v of visits) {
      domainStats[v.domain] = { count: (domainStats[v.domain]?.count || 0) + v.visit_count, minutes: (domainStats[v.domain]?.minutes || 0) + Math.round(v.time_spent_seconds / 60) };
      if (v.category && v.category !== 'other') categoryStats[v.category] = (categoryStats[v.category] || 0) + v.visit_count;
      if (v.search_query) searchQueries.push(v.search_query);
      if (v.is_product_page) productPages++;
    }

    const topDomains = Object.entries(domainStats).map(([domain, stats]) => ({ domain, ...stats })).sort((a, b) => b.count - a.count).slice(0, 10);
    const topCategories = Object.entries(categoryStats).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    const shoppingIntent = this.calculateShoppingIntent(visits);

    const pattern = await BrowsingPattern.findOneAndUpdate(
      { tenant_id: tenantId, linked_user_id: userId, date: start },
      { tenant_id: tenantId, linked_user_id: userId, date: start, total_visits: visits.length, total_time_minutes: Math.round(visits.reduce((a, v) => a + v.time_spent_seconds, 0) / 60), top_domains: topDomains, top_categories: topCategories, search_queries: [...new Set(searchQueries)], product_pages_visited: productPages, shopping_intent_score: shoppingIntent },
      { upsert: true, new: true }
    );

    logger.info('pattern_generated', { tenantId, userId, date: start.toISOString(), visits: visits.length });
    return pattern;
  }

  private calculateShoppingIntent(visits: IBrowserVisit[]): number {
    const shoppingVisits = visits.filter(v => v.category === 'shopping' || v.is_product_page).length;
    return Math.min(1, shoppingVisits / Math.max(1, visits.length));
  }

  async generateInsights(tenantId: string, userId: string): Promise<IBrowsingInsight[]> {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const patterns = await BrowsingPattern.find({ tenant_id: tenantId, linked_user_id: userId, date: { $gte: thirtyDaysAgo } });
    const insights: IBrowsingInsight[] = [];

    // Interest insights
    const categoryCounts: Record<string, number> = {};
    patterns.forEach(p => p.top_categories.forEach(c => { categoryCounts[c.category] = (categoryCounts[c.category] || 0) + c.count; }));
    const topInterest = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
    if (topInterest) {
      insights.push(await BrowsingInsight.create({
        tenant_id: tenantId, linked_user_id: userId, type: 'interest',
        title: `You're interested in ${topInterest[0]}`,
        description: `Based on your browsing, ${topInterest[0]} is your top interest area.`,
        confidence: Math.min(1, topInterest[1] / 100),
        evidence_domains: patterns.filter(p => p.top_categories.some(c => c.category === topInterest[0])).flatMap(p => p.top_domains.map(d => d.domain)).slice(0, 5),
      }));
    }

    // Shopping intent
    const avgShopping = patterns.reduce((a, p) => a + p.shopping_intent_score, 0) / Math.max(1, patterns.length);
    if (avgShopping > 0.2) {
      insights.push(await BrowsingInsight.create({
        tenant_id: tenantId, linked_user_id: userId, type: 'shopping',
        title: 'Active shopping behavior detected',
        description: `You've shown consistent shopping intent over the past 30 days.`,
        confidence: avgShopping,
        evidence_domains: patterns.flatMap(p => p.top_domains.filter(d => ['amazon', 'flipkart', 'myntra'].some(s => d.domain.includes(s))).map(d => d.domain)).slice(0, 5),
      }));
    }

    logger.info('insights_generated', { tenantId, userId, count: insights.length });
    return insights;
  }

  async getInsights(tenantId: string, userId: string, types?: string[]): Promise<IBrowsingInsight[]> {
    const query: Record<string, unknown> = { tenant_id: tenantId, linked_user_id: userId };
    if (types?.length) query.type = { $in: types };
    return BrowsingInsight.find(query).sort({ generated_at: -1 }).limit(20);
  }

  async searchVisits(tenantId: string, userId: string, query: string, limit: number = 50): Promise<IBrowserVisit[]> {
    return BrowserVisit.find({
      tenant_id: tenantId, linked_user_id: userId,
      $or: [{ url: { $regex: query, $options: 'i' } }, { title: { $regex: query, $options: 'i' } }],
    }).sort({ last_visit: -1 }).limit(limit);
  }
}

let instance: BrowserHistoryService | null = null;
export function getBrowserHistoryService(): BrowserHistoryService {
  if (!instance) instance = new BrowserHistoryService();
  return instance;
}
