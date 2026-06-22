/**
 * Article Service - Business logic for article operations
 */

import { v4 as uuidv4 } from 'uuid';
import { Article, IArticle, ArticleStatus, ArticleVisibility } from '../models/Article';
import { Category } from '../models/Category';
import { Tag } from '../models/Tag';
import logger from 'utils/logger.js';

export interface CreateArticleInput {
  title: string;
  content: string;
  summary?: string;
  status?: ArticleStatus;
  visibility?: ArticleVisibility;
  categoryId: string;
  tags?: string[];
  authorId: string;
  authorName: string;
  authorEmail: string;
  attachments?: Array<{ name: string; url: string; type: string; size: number }>;
  relatedArticles?: string[];
  metadata?: Record<string, unknown>;
}

export interface ArticleFilter {
  status?: ArticleStatus;
  visibility?: ArticleVisibility;
  categoryId?: string;
  tags?: string[];
  authorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SearchOptions {
  query: string;
  filters?: ArticleFilter;
  page?: number;
  limit?: number;
}

export class ArticleService {
  /**
   * Create a new article
   */
  async createArticle(input: CreateArticleInput): Promise<IArticle> {
    const slug = this.generateSlug(input.title);

    const articleData: Partial<IArticle> = {
      articleId: `KB-${uuidv4().slice(0, 8).toUpperCase()}`,
      title: input.title,
      slug,
      content: input.content,
      summary: input.summary || '',
      status: input.status || ArticleStatus.DRAFT,
      visibility: input.visibility || ArticleVisibility.PUBLIC,
      categoryId: input.categoryId,
      tags: input.tags || [],
      authorId: input.authorId,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      attachments: input.attachments || [],
      relatedArticles: input.relatedArticles || [],
      metadata: input.metadata || {},
    };

    if (input.status === ArticleStatus.PUBLISHED) {
      articleData.publishedAt = new Date();
    }

    const article = new Article(articleData);
    await article.save();

    // Update category article count
    await Category.findOneAndUpdate(
      { categoryId: input.categoryId },
      { $inc: { articleCount: 1 } }
    );

    // Update tag usage counts
    if (input.tags && input.tags.length > 0) {
      await Tag.updateMany(
        { name: { $in: input.tags } },
        { $inc: { usageCount: 1 } }
      );
    }

    logger.info('Article created', { articleId: article.articleId, slug });
    return article;
  }

  /**
   * Get article by ID
   */
  async getArticleById(articleId: string): Promise<IArticle | null> {
    return Article.findOne({ articleId }).exec();
  }

  /**
   * Get article by slug
   */
  async getArticleBySlug(slug: string): Promise<IArticle | null> {
    const article = await Article.findOne({ slug }).exec();
    if (article) {
      // Increment views
      await Article.findOneAndUpdate(
        { articleId: article.articleId },
        { $inc: { views: 1 } }
      );
    }
    return article;
  }

  /**
   * Get articles with filters and pagination
   */
  async getArticles(
    filter: ArticleFilter,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ articles: IArticle[]; total: number; page: number; totalPages: number }> {
    const query: Record<string, unknown> = {};

    if (filter.status) query.status = filter.status;
    if (filter.visibility) query.visibility = filter.visibility;
    if (filter.categoryId) query.categoryId = filter.categoryId;
    if (filter.tags && filter.tags.length > 0) query.tags = { $in: filter.tags };
    if (filter.authorId) query.authorId = filter.authorId;
    if (filter.dateFrom || filter.dateTo) {
      query.createdAt = {};
      if (filter.dateFrom) (query.createdAt as Record<string, Date>).$gte = filter.dateFrom;
      if (filter.dateTo) (query.createdAt as Record<string, Date>).$lte = filter.dateTo;
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;
    const [articles, total] = await Promise.all([
      Article.find(query).sort(sort).skip(skip).limit(limit).exec(),
      Article.countDocuments(query).exec(),
    ]);

    return {
      articles,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Search articles
   */
  async searchArticles(options: SearchOptions): Promise<{ articles: IArticle[]; total: number }> {
    const query: Record<string, unknown> = {
      status: ArticleStatus.PUBLISHED,
      $text: { $search: options.query },
    };

    if (options.filters) {
      if (options.filters.categoryId) query.categoryId = options.filters.categoryId;
      if (options.filters.tags && options.filters.tags.length > 0) query.tags = { $in: options.filters.tags };
    }

    const articles = await Article.find(query, {
      score: { $meta: 'textScore' },
    })
      .sort({ score: { $meta: 'textScore' } })
      .limit(options.limit || 20)
      .exec();

    return { articles, total: articles.length };
  }

  /**
   * Update article
   */
  async updateArticle(articleId: string, updates: Partial<IArticle>): Promise<IArticle | null> {
    const article = await Article.findOne({ articleId }).exec();
    if (!article) return null;

    // If publishing for the first time
    if (updates.status === ArticleStatus.PUBLISHED && article.status !== ArticleStatus.PUBLISHED) {
      updates.publishedAt = new Date();
    }

    const updated = await Article.findOneAndUpdate(
      { articleId },
      { $set: updates },
      { new: true }
    ).exec();

    if (updated) {
      logger.info('Article updated', { articleId, updates: Object.keys(updates) });
    }
    return updated;
  }

  /**
   * Delete article
   */
  async deleteArticle(articleId: string): Promise<boolean> {
    const article = await Article.findOneAndDelete({ articleId }).exec();
    if (article) {
      // Update category article count
      await Category.findOneAndUpdate(
        { categoryId: article.categoryId },
        { $inc: { articleCount: -1 } }
      );
      logger.info('Article deleted', { articleId });
      return true;
    }
    return false;
  }

  /**
   * Record article feedback
   */
  async recordFeedback(articleId: string, isHelpful: boolean): Promise<IArticle | null> {
    const update = isHelpful ? { $inc: { helpful: 1 } } : { $inc: { notHelpful: 1 } };
    return Article.findOneAndUpdate({ articleId }, update, { new: true }).exec();
  }

  /**
   * Get popular articles
   */
  async getPopularArticles(limit = 10): Promise<IArticle[]> {
    return Article.find({ status: ArticleStatus.PUBLISHED })
      .sort({ views: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get related articles
   */
  async getRelatedArticles(articleId: string, limit = 5): Promise<IArticle[]> {
    const article = await Article.findOne({ articleId }).exec();
    if (!article || article.tags.length === 0) return [];

    return Article.find({
      articleId: { $ne: articleId },
      status: ArticleStatus.PUBLISHED,
      tags: { $in: article.tags },
    })
      .sort({ views: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Generate URL-friendly slug
   */
  private generateSlug(title: string): string {
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);

    // Check for duplicate slug
    const existing = Article.findOne({ slug }).exec();
    if (existing) {
      slug += `-${Date.now().toString(36)}`;
    }

    return slug;
  }
}

export const articleService = new ArticleService();
export default articleService;