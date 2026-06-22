/**
 * GENIE Memory Review Service - Business Logic
 */
import axios from 'axios';
import { MemoryReview, MemoryPattern, MemoryInsight, ScheduledReview } from '../models/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('memory-review');
const MEMORY_SERVICE_URL = process.env.GENIE_MEMORY_SERVICE_URL || 'http://localhost:4703';

export class MemoryReviewService {
  /**
   * Generate a daily memory review for a user
   */
  async generateDailyReview(tenantId: string, userId: string): Promise<IMemoryReview> {
    const startTime = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get memories from today
    let todayMemories: any[] = [];
    let memoryCount = 0;
    try {
      const response = await axios.get(`${MEMORY_SERVICE_URL}/api/memories/stats`, {
        headers: { 'X-Tenant-Id': tenantId, 'X-User-Id': userId },
        timeout: 5000,
      });
      memoryCount = response.data?.data?.total_memories || 0;
    } catch (e) { /* Service might not be running */ }

    // Get recent memories
    try {
      const timelineRes = await axios.get(`${MEMORY_SERVICE_URL}/api/memories/timeline`, {
        headers: { 'X-Tenant-Id': tenantId, 'X-User-Id': userId },
        params: { limit: 20 },
        timeout: 5000,
      });
      todayMemories = timelineRes.data?.data || [];
    } catch (e) { /* Service might not be running */ }

    // Generate review summary using patterns
    const summary = this.generateSummary(todayMemories);
    const keyMemories = todayMemories.slice(0, 5).map((m: any) => m.content?.substring(0, 100) || '');
    const learnedPreferences = this.extractPreferences(todayMemories);
    const insights = this.generateInsights(todayMemories);
    const engagementScore = this.calculateEngagementScore(todayMemories);

    const review = await MemoryReview.create({
      tenant_id: tenantId,
      user_id: userId,
      review_type: 'daily',
      date: today,
      summary,
      key_memories: keyMemories,
      learned_preferences: learnedPreferences,
      insights,
      engagement_score: engagementScore,
      memory_count_start: memoryCount - todayMemories.length,
      memory_count_end: memoryCount,
      duration_minutes: Math.round((Date.now() - startTime) / 60000),
      status: 'completed',
      completed_at: new Date(),
    });

    // Generate patterns
    await this.detectPatterns(tenantId, userId, todayMemories);

    // Generate insights
    await this.generateInsightsDocument(tenantId, userId, todayMemories);

    logger.info('daily_review_generated', { tenantId, userId, memoryCount: todayMemories.length });
    return review;
  }

  private generateSummary(memories: any[]): string {
    if (memories.length === 0) return "No significant memories recorded today. A quiet day to reflect on.";

    const categories = memories.reduce((acc: Record<string, number>, m: any) => {
      const cat = m.category || 'other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

    return `Today you engaged most with ${topCategory?.[0] || 'general'} topics. ` +
      `You created ${memories.length} memory ${memories.length === 1 ? 'entry' : 'entries'}. ` +
      `Keep building your personal knowledge base!`;
  }

  private extractPreferences(memories: any[]): string[] {
    const preferences: string[] = [];
    const tags = memories.flatMap((m: any) => m.tags || []);
    const tagCounts: Record<string, number> = {};
    tags.forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    topTags.forEach(([tag]) => preferences.push(`You seem interested in ${tag}`));
    return preferences;
  }

  private generateInsights(memories: any[]): string[] {
    const insights: string[] = [];
    if (memories.length > 5) insights.push("You've been very active today!");
    if (memories.some((m: any) => m.category === 'social')) insights.push("Strong social engagement detected.");
    if (memories.some((m: any) => m.category === 'work')) insights.push("Work-related activities noted.");
    if (memories.some((m: any) => m.importance === 'high')) insights.push("Important moments captured today.");
    return insights;
  }

  private calculateEngagementScore(memories: any[]): number {
    let score = 30; // Base score
    score += Math.min(30, memories.length * 3);
    score += memories.filter((m: any) => m.importance === 'high').length * 10;
    score += memories.filter((m: any) => m.recall_count > 0).length * 5;
    return Math.min(100, score);
  }

  private async detectPatterns(tenantId: string, userId: string, memories: any[]): Promise<void> {
    // Look for recurring topics
    const tagCounts: Record<string, number> = {};
    memories.forEach((m: any) => (m.tags || []).forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));

    for (const [tag, count] of Object.entries(tagCounts)) {
      if (count >= 2) {
        await MemoryPattern.findOneAndUpdate(
          { tenant_id: tenantId, user_id: userId, description: `Recurring interest in ${tag}` },
          { tenant_id: tenantId, user_id: userId, pattern_type: 'recurring', description: `Recurring interest in ${tag}`, evidence: [tag], frequency: count, first_seen: new Date(), last_seen: new Date(), confidence: Math.min(1, count / 5) },
          { upsert: true, new: true }
        );
      }
    }
  }

  private async generateInsightsDocument(tenantId: string, userId: string, memories: any[]): Promise<void> {
    if (memories.length === 0) return;

    // Growth insight
    await MemoryInsight.create({
      tenant_id: tenantId, user_id: userId, insight_type: 'growth',
      title: 'Daily Learning',
      description: `You captured ${memories.length} memory ${memories.length === 1 ? 'entry' : 'entries'} today.`,
      evidence: memories.slice(0, 3).map((m: any) => m.content?.substring(0, 100) || ''),
    });
  }

  /**
   * Generate monthly review
   */
  async generateMonthlyReview(tenantId: string, userId: string): Promise<IMemoryReview> {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(1);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const reviews = await MemoryReview.find({
      tenant_id: tenantId,
      user_id: userId,
      review_type: { $in: ['daily', 'weekly'] },
      date: { $gte: monthAgo, $lte: today },
    });

    const totalMemories = reviews.reduce((sum, r) => sum + (r.memory_count_end - r.memory_count_start), 0);
    const avgEngagement = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.engagement_score, 0) / reviews.length
      : 0;

    const summary = `This month you created ${totalMemories} new memories across ${reviews.length} review sessions. ` +
      `Your average engagement was ${avgEngagement.toFixed(0)}%. ` +
      `You completed ${reviews.filter(r => r.status === 'completed').length} reviews. ` +
      (avgEngagement > 60 ? "Excellent consistency!" : "Keep building your memory habits!");

    return MemoryReview.create({
      tenant_id: tenantId,
      user_id: userId,
      review_type: 'monthly',
      date: today,
      summary,
      key_memories: reviews.slice(-14).flatMap(r => r.key_memories.slice(0, 2)).slice(0, 10),
      insights: reviews.flatMap(r => r.insights).filter((v, i, a) => a.indexOf(v) === i).slice(0, 10),
      engagement_score: avgEngagement,
      memory_count_start: reviews[0]?.memory_count_start || 0,
      memory_count_end: reviews[reviews.length - 1]?.memory_count_end || totalMemories,
      duration_minutes: 30,
      status: 'completed',
      completed_at: new Date(),
    });
  }

  /**
   * Generate weekly review
   */
  async generateWeeklyReview(tenantId: string, userId: string): Promise<IMemoryReview> {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const reviews = await MemoryReview.find({
      tenant_id: tenantId, user_id: userId, review_type: 'daily', date: { $gte: weekAgo, $lte: today },
    });

    const totalMemories = reviews.reduce((sum, r) => sum + (r.memory_count_end - r.memory_count_start), 0);
    const avgEngagement = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.engagement_score, 0) / reviews.length : 0;

    const summary = `This week you created ${totalMemories} new memories across ${reviews.length} active days. ` +
      `Your average engagement was ${avgEngagement.toFixed(0)}%. ` +
      (avgEngagement > 60 ? "You're building great habits!" : "Try to engage more daily!");

    return MemoryReview.create({
      tenant_id: tenantId, user_id: userId, review_type: 'weekly', date: today,
      summary, key_memories: reviews.slice(-7).flatMap(r => r.key_memories.slice(0, 2)),
      insights: reviews.flatMap(r => r.insights).slice(0, 5),
      engagement_score: avgEngagement,
      memory_count_start: reviews[0]?.memory_count_start || 0,
      memory_count_end: reviews[reviews.length - 1]?.memory_count_end || totalMemories,
      duration_minutes: 15, status: 'completed', completed_at: new Date(),
    });
  }

  /**
   * Schedule a review
   */
  async scheduleReview(tenantId: string, userId: string, reviewType: 'daily' | 'weekly' | 'monthly', time: string, days?: number[]): Promise<IScheduledReview> {
    const nextRun = this.calculateNextRun(reviewType, time, days);

    return ScheduledReview.findOneAndUpdate(
      { tenant_id: tenantId, user_id: userId, review_type: reviewType },
      { tenant_id: tenantId, user_id: userId, review_type: reviewType, scheduled_time: time, scheduled_days: days, is_active: true, next_run: nextRun },
      { upsert: true, new: true }
    );
  }

  private calculateNextRun(type: string, time: string, days?: number[]): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);

    if (next < new Date()) next.setDate(next.getDate() + 1);

    if (type === 'weekly' && days?.length) {
      while (!days.includes(next.getDay())) next.setDate(next.getDate() + 1);
    }
    if (type === 'monthly') {
      next.setDate(1);
      if (next < new Date()) next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  /**
   * Get pending reviews for scheduler
   */
  async getPendingReviews(): Promise<IScheduledReview[]> {
    return ScheduledReview.find({ is_active: true, next_run: { $lte: new Date() } });
  }

  /**
   * Get user's review history
   */
  async getReviews(tenantId: string, userId: string, type?: string, limit: number = 30): Promise<IMemoryReview[]> {
    const query: Record<string, unknown> = { tenant_id: tenantId, user_id: userId };
    if (type) query.review_type = type;
    return MemoryReview.find(query).sort({ date: -1 }).limit(limit);
  }

  /**
   * Get patterns
   */
  async getPatterns(tenantId: string, userId: string): Promise<IMemoryPattern[]> {
    return MemoryPattern.find({ tenant_id: tenantId, user_id: userId }).sort({ last_seen: -1 });
  }

  /**
   * Get insights
   */
  async getInsights(tenantId: string, userId: string, type?: string): Promise<IMemoryInsight[]> {
    const query: Record<string, unknown> = { tenant_id: tenantId, user_id: userId };
    if (type) query.insight_type = type;
    return MemoryInsight.find(query).sort({ generated_at: -1 }).limit(20);
  }
}

let instance: MemoryReviewService | null = null;
export function getMemoryReviewService(): MemoryReviewService {
  if (!instance) instance = new MemoryReviewService();
  return instance;
}
