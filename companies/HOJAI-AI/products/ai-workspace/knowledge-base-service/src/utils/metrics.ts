/**
 * Prometheus metrics for Knowledge Base Service
 */

import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'kb_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});
register.registerMetric(httpRequestDuration);

// Article metrics
const articlesCreated = new client.Counter({
  name: 'kb_articles_created_total',
  help: 'Total number of articles created',
  labelNames: ['status'],
});
register.registerMetric(articlesCreated);

const articleViews = new client.Counter({
  name: 'kb_article_views_total',
  help: 'Total number of article views',
});
register.registerMetric(articleViews);

const articleSearches = new client.Counter({
  name: 'kb_article_searches_total',
  help: 'Total number of article searches',
});
register.registerMetric(articleSearches);

const articleFeedback = new client.Counter({
  name: 'kb_article_feedback_total',
  help: 'Total number of article feedback votes',
  labelNames: ['type'],
});
register.registerMetric(articleFeedback);

// Category metrics
const categoriesCreated = new client.Counter({
  name: 'kb_categories_created_total',
  help: 'Total number of categories created',
});
register.registerMetric(categoriesCreated);

// Active articles gauge
const activeArticles = new client.Gauge({
  name: 'kb_active_articles',
  help: 'Number of active articles',
  labelNames: ['status'],
});
register.registerMetric(activeArticles);

// Export metrics utilities
export const kbMetrics = {
  register,
  recordRequestDuration: (path: string, durationMs: number) => {
    httpRequestDuration.observe({ method: 'GET', path, status_code: '200' }, durationMs / 1000);
  },
  incrementArticlesCreated: (status: string) => {
    articlesCreated.inc({ status });
  },
  incrementArticleViews: () => {
    articleViews.inc();
  },
  incrementArticleSearches: () => {
    articleSearches.inc();
  },
  incrementArticleFeedback: (type: 'helpful' | 'not_helpful') => {
    articleFeedback.inc({ type });
  },
  incrementCategoriesCreated: () => {
    categoriesCreated.inc();
  },
  setActiveArticles: (status: string, count: number) => {
    activeArticles.set({ status }, count);
  },
};

export default kbMetrics;