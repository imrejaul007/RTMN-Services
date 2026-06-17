import { Workflow, IWorkflow } from '../models/Workflow';
import { SearchFilters, Industry, WorkflowCategory } from '../types';

export class SearchService {
  /**
   * Search workflows with filters
   */
  async searchWorkflows(
    filters: SearchFilters
  ): Promise<{ workflows: IWorkflow[]; total: number }> {
    const query: Record<string, unknown> = {};

    // Industry filter
    if (filters.industry) {
      query.industry = filters.industry;
    }

    // Category filter
    if (filters.category) {
      query.category = filters.category;
    }

    // Featured filter
    if (filters.featured !== undefined) {
      query.isFeatured = filters.featured;
    }

    // Minimum rating filter (applied after fetch due to virtual)
    // Text search
    let workflowQuery = Workflow.find(query);

    if (filters.query) {
      workflowQuery = workflowQuery.or([
        { name: { $regex: filters.query, $options: 'i' } },
        { description: { $regex: filters.query, $options: 'i' } },
        { tags: { $in: [new RegExp(filters.query, 'i')] } },
      ]);
    }

    // Sorting
    switch (filters.sortBy) {
      case 'installs':
        workflowQuery = workflowQuery.sort({ installs: -1 });
        break;
      case 'rating':
        workflowQuery = workflowQuery.sort({ installs: -1 }); // Rating is virtual, sort by installs as proxy
        break;
      case 'newest':
      default:
        workflowQuery = workflowQuery.sort({ createdAt: -1 });
        break;
    }

    const workflows = await workflowQuery.exec();

    // Filter by minimum rating
    let filtered = workflows;
    if (filters.minRating !== undefined) {
      filtered = workflows.filter((w) => {
        const avgRating = this.calculateAverageRating(w.reviews);
        return avgRating >= filters.minRating!;
      });
    }

    return { workflows: filtered, total: filtered.length };
  }

  /**
   * Get featured workflows
   */
  async getFeatured(limit: number = 10): Promise<IWorkflow[]> {
    return Workflow.find({ isFeatured: true })
      .sort({ installs: -1 })
      .limit(limit);
  }

  /**
   * Get popular workflows (by installs)
   */
  async getPopular(limit: number = 10): Promise<IWorkflow[]> {
    return Workflow.find()
      .sort({ installs: -1 })
      .limit(limit);
  }

  /**
   * Get workflows by industry
   */
  async getByIndustry(industry: Industry): Promise<IWorkflow[]> {
    return Workflow.find({ industry }).sort({ installs: -1 });
  }

  /**
   * Get workflows by category
   */
  async getByCategory(category: WorkflowCategory): Promise<IWorkflow[]> {
    return Workflow.find({ category }).sort({ installs: -1 });
  }

  /**
   * Get related workflows (same industry or category)
   */
  async getRelated(
    workflowId: string,
    limit: number = 5
  ): Promise<IWorkflow[]> {
    const workflow = await Workflow.findOne({ workflowId });
    if (!workflow) return [];

    return Workflow.find({
      $and: [
        { workflowId: { $ne: workflowId } },
        { $or: [{ industry: workflow.industry }, { category: workflow.category }] },
      ],
    })
      .sort({ installs: -1 })
      .limit(limit);
  }

  /**
   * Get all categories with counts
   */
  async getCategoriesWithCounts(): Promise<
    Array<{ category: string; count: number }>
  > {
    const results = await Workflow.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return results.map((r) => ({ category: r._id, count: r.count }));
  }

  /**
   * Get all industries with counts
   */
  async getIndustriesWithCounts(): Promise<
    Array<{ industry: string; count: number }>
  > {
    const results = await Workflow.aggregate([
      { $group: { _id: '$industry', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return results.map((r) => ({ industry: r._id, count: r.count }));
  }

  /**
   * Calculate average rating
   */
  private calculateAverageRating(reviews: Array<{ rating: number }>): number {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / reviews.length;
  }
}

export const searchService = new SearchService();
