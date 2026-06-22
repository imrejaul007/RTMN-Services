import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentInstance, AgentSubscription, AgentReview } from '../models';

export class MarketplaceService {
  // ============ AGENT CRUD ============

  /**
   * Create a new agent
   */
  async createAgent(data: {
    name: string;
    description: string;
    industry: string;
    category: string;
    vendorId: string;
    vendorName: string;
    slug?: string;
    [key: string]: any;
  }): Promise<Agent> {
    const slug = data.slug || this.generateSlug(data.name);

    const agent = new Agent({
      agentId: uuidv4(),
      slug,
      ...data,
      status: 'draft',
      metrics: {
        totalInstalls: 0,
        activeInstances: 0,
        totalConversations: 0,
        avgResponseTime: 0,
        successRate: 0,
        rating: 0,
        reviewCount: 0
      }
    });

    await agent.save();
    return agent;
  }

  /**
   * Get agent by ID
   */
  async getAgentById(agentId: string): Promise<Agent | null> {
    return Agent.findOne({ agentId });
  }

  /**
   * Get agent by slug
   */
  async getAgentBySlug(slug: string): Promise<Agent | null> {
    return Agent.findOne({ slug: slug.toLowerCase() });
  }

  /**
   * Search agents
   */
  async searchAgents(filters: {
    query?: string;
    industry?: string;
    category?: string;
    tags?: string[];
    pricingModel?: string;
    tier?: string;
    featured?: boolean;
    trending?: boolean;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ agents: Agent[]; total: number }> {
    const {
      query,
      industry,
      category,
      tags,
      pricingModel,
      featured,
      trending,
      status = 'published',
      limit = 20,
      offset = 0
    } = filters;

    const searchQuery: any = { status };

    if (industry) searchQuery.industry = industry;
    if (category) searchQuery.category = category;
    if (tags?.length) searchQuery.tags = { $all: tags };
    if (pricingModel) searchQuery.pricingModel = pricingModel;
    if (featured !== undefined) searchQuery.featured = featured;
    if (trending !== undefined) searchQuery.trending = trending;

    let agents;
    let total;

    if (query) {
      const queryResults = await Agent.find(
        { ...searchQuery, $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' }, 'metrics.rating': -1 })
        .skip(offset)
        .limit(limit);

      agents = queryResults;
      total = await Agent.countDocuments({
        ...searchQuery,
        $text: { $search: query }
      });
    } else {
      [agents, total] = await Promise.all([
        Agent.find(searchQuery)
          .sort({ featured: -1, trending: -1, 'metrics.rating': -1, createdAt: -1 })
          .skip(offset)
          .limit(limit),
        Agent.countDocuments(searchQuery)
      ]);
    }

    return { agents, total };
  }

  /**
   * Update agent
   */
  async updateAgent(
    agentId: string,
    updates: Partial<Agent>
  ): Promise<Agent | null> {
    return Agent.findOneAndUpdate(
      { agentId },
      { $set: updates },
      { new: true }
    );
  }

  /**
   * Delete agent
   */
  async deleteAgent(agentId: string): Promise<boolean> {
    const result = await Agent.deleteOne({ agentId });
    return result.deletedCount > 0;
  }

  /**
   * Publish agent
   */
  async publishAgent(agentId: string): Promise<Agent | null> {
    return Agent.findOneAndUpdate(
      { agentId },
      {
        $set: {
          status: 'published',
          publishedAt: new Date()
        }
      },
      { new: true }
    );
  }

  /**
   * Archive agent
   */
  async archiveAgent(agentId: string): Promise<Agent | null> {
    return Agent.findOneAndUpdate(
      { agentId },
      { $set: { status: 'archived' } },
      { new: true }
    );
  }

  // ============ AGENT INSTANCES ============

  /**
   * Install agent for tenant
   */
  async installAgent(
    agentId: string,
    tenantId: string,
    userId: string,
    config: Record<string, any> = {},
    tier: string = 'starter'
  ): Promise<AgentInstance> {
    const instance = new AgentInstance({
      instanceId: uuidv4(),
      agentId,
      tenantId,
      userId,
      config,
      status: 'active',
      tier,
      usage: {
        conversations: 0,
        messages: 0,
        apiCalls: 0,
        storage: 0
      }
    });

    await instance.save();

    // Increment install count
    await Agent.findOneAndUpdate(
      { agentId },
      { $inc: { 'metrics.totalInstalls': 1, 'metrics.activeInstances': 1 } }
    );

    return instance;
  }

  /**
   * Get instance by ID
   */
  async getInstance(instanceId: string): Promise<AgentInstance | null> {
    return AgentInstance.findOne({ instanceId });
  }

  /**
   * Get instances by tenant
   */
  async getInstancesByTenant(
    tenantId: string,
    options: { status?: string; limit?: number; offset?: number } = {}
  ): Promise<{ instances: AgentInstance[]; total: number }> {
    const { status, limit = 50, offset = 0 } = options;
    const query: any = { tenantId };
    if (status) query.status = status;

    const [instances, total] = await Promise.all([
      AgentInstance.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      AgentInstance.countDocuments(query)
    ]);

    return { instances, total };
  }

  /**
   * Update instance config
   */
  async updateInstance(
    instanceId: string,
    updates: Partial<{
      name: string;
      config: Record<string, any>;
      status: string;
      tier: string;
    }>
  ): Promise<AgentInstance | null> {
    return AgentInstance.findOneAndUpdate(
      { instanceId },
      { $set: updates },
      { new: true }
    );
  }

  /**
   * Uninstall agent instance
   */
  async uninstallAgent(instanceId: string): Promise<boolean> {
    const instance = await AgentInstance.findOne({ instanceId });
    if (!instance) return false;

    await AgentInstance.deleteOne({ instanceId });

    // Decrement active instances
    await Agent.findOneAndUpdate(
      { agentId: instance.agentId },
      { $inc: { 'metrics.activeInstances': -1 } }
    );

    return true;
  }

  /**
   * Track usage
   */
  async trackUsage(
    instanceId: string,
    type: 'conversations' | 'messages' | 'apiCalls'
  ): Promise<void> {
    const instance = await AgentInstance.findOneAndUpdate(
      { instanceId },
      { $inc: { [`usage.${type}`]: 1 } },
      { new: true }
    );

    if (instance) {
      await Agent.findOneAndUpdate(
        { agentId: instance.agentId },
        { $inc: { 'metrics.totalConversations': type === 'conversations' ? 1 : 0 } }
      );
    }
  }

  // ============ REVIEWS ============

  /**
   * Add review
   */
  async addReview(data: {
    agentId: string;
    userId: string;
    tenantId: string;
    rating: number;
    title?: string;
    comment?: string;
    pros?: string[];
    cons?: string[];
  }): Promise<AgentReview> {
    const review = new AgentReview({
      reviewId: uuidv4(),
      ...data
    });

    await review.save();

    // Update agent rating
    const stats = await AgentReview.getAverageRating(data.agentId);
    await Agent.findOneAndUpdate(
      { agentId: data.agentId },
      {
        $set: {
          'metrics.rating': stats.avgRating,
          'metrics.reviewCount': stats.count
        }
      }
    );

    return review;
  }

  /**
   * Get reviews for agent
   */
  async getReviews(
    agentId: string,
    options: { limit?: number; offset?: number; sort?: string } = {}
  ): Promise<{ reviews: AgentReview[]; total: number }> {
    const { limit = 20, offset = 0, sort = '-createdAt' } = options;

    const [reviews, total] = await Promise.all([
      AgentReview.find({ agentId }).sort(sort).skip(offset).limit(limit),
      AgentReview.countDocuments({ agentId })
    ]);

    return { reviews, total };
  }

  /**
   * Mark review helpful
   */
  async markReviewHelpful(reviewId: string): Promise<void> {
    await AgentReview.findOneAndUpdate(
      { reviewId },
      { $inc: { helpful: 1 } }
    );
  }

  // ============ ANALYTICS ============

  /**
   * Get marketplace stats
   */
  async getMarketplaceStats(): Promise<{
    totalAgents: number;
    totalInstalls: number;
    totalConversations: number;
    byIndustry: Record<string, number>;
    byCategory: Record<string, number>;
    topRated: Agent[];
    trending: Agent[];
    featured: Agent[];
  }> {
    const [
      totalAgents,
      installStats,
      conversationStats,
      industryStats,
      categoryStats,
      topRated,
      trending,
      featured
    ] = await Promise.all([
      Agent.countDocuments({ status: 'published' }),
      Agent.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: null, total: { $sum: '$metrics.totalInstalls' } } }
      ]),
      Agent.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: null, total: { $sum: '$metrics.totalConversations' } } }
      ]),
      Agent.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$industry', count: { $sum: 1 } } }
      ]),
      Agent.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Agent.find({ status: 'published' })
        .sort({ 'metrics.rating': -1 })
        .limit(10)
        .select('agentId name slug icon tagline metrics'),
      Agent.find({ status: 'published', trending: true })
        .sort({ 'metrics.totalInstalls': -1 })
        .limit(10)
        .select('agentId name slug icon tagline metrics'),
      Agent.find({ status: 'published', featured: true })
        .limit(10)
        .select('agentId name slug icon tagline metrics')
    ]);

    const byIndustry: Record<string, number> = {};
    industryStats.forEach((s) => { byIndustry[s._id] = s.count; });

    const byCategory: Record<string, number> = {};
    categoryStats.forEach((s) => { byCategory[s._id] = s.count; });

    return {
      totalAgents,
      totalInstalls: installStats[0]?.total || 0,
      totalConversations: conversationStats[0]?.total || 0,
      byIndustry,
      byCategory,
      topRated: topRated as any,
      trending: trending as any,
      featured: featured as any
    };
  }

  /**
   * Get vendor stats
   */
  async getVendorStats(vendorId: string): Promise<{
    totalAgents: number;
    publishedAgents: number;
    totalInstalls: number;
    totalReviews: number;
    avgRating: number;
    revenue: number;
  }> {
    const agents = await Agent.find({ vendorId });

    const published = agents.filter((a) => a.status === 'published');
    const totalInstalls = published.reduce((sum, a) => sum + ((a.metrics as any)?.totalInstalls || 0), 0);
    const totalReviews = published.reduce((sum, a) => sum + ((a.metrics as any)?.reviewCount || 0), 0);
    const avgRating = published.length > 0
      ? published.reduce((sum, a) => sum + ((a.metrics as any)?.rating || 0), 0) / published.length
      : 0;

    return {
      totalAgents: agents.length,
      publishedAgents: published.length,
      totalInstalls,
      totalReviews,
      avgRating,
      revenue: totalInstalls * 100 // Simplified calculation
    };
  }

  // ============ HELPERS ============

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }
}

export const marketplaceService = new MarketplaceService();
