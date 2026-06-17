/**
 * BuzzLocal Routes - Local Discovery & Community Buzz
 * Handles local business discovery, reviews, and community posts
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AxomProfile, axomProfileStore, BuzzContent } from '../models/AxomProfile';
import { logger } from '../index';

const router = Router();

// Buzz types
type BuzzType = 'post' | 'review' | 'event' | 'offer' | 'poll';

// Create a buzz post
router.post('/posts', async (req: Request, res: Response) => {
  try {
    const { profileId, content, type, mediaUrls, location } = req.body;

    if (!profileId || !content || !type) {
      return res.status(400).json({ error: 'Missing required fields: profileId, content, type' });
    }

    const buzzContent: BuzzContent = {
      contentId: uuidv4(),
      type,
      content,
      mediaUrls: mediaUrls || [],
      createdAt: new Date(),
      engagementMetrics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0
      }
    };

    const profile = axomProfileStore.get(profileId);
    if (profile) {
      profile.buzzContent.unshift(buzzContent);
      profile.stats.postsCount += 1;
      profile.updatedAt = new Date();
      axomProfileStore.set(profileId, profile);
    }

    logger.info(`Buzz post created: ${buzzContent.contentId}`, { profileId, type });

    res.status(201).json({
      success: true,
      data: buzzContent
    });
  } catch (error) {
    logger.error('Error creating buzz post:', error);
    res.status(500).json({ error: 'Failed to create buzz post' });
  }
});

// Get buzz feed for location
router.get('/feed', async (req: Request, res: Response) => {
  try {
    const { areaId, type, limit = 20, offset = 0 } = req.query;

    const feed: Array<{ content: BuzzContent; profileId: string; profileName: string }> = [];

    axomProfileStore.forEach((profile) => {
      if (!areaId || profile.primaryLocation.areaId === areaId) {
        profile.buzzContent.forEach((content) => {
          if (!type || content.type === type) {
            feed.push({
              content,
              profileId: profile.profileId,
              profileName: profile.displayName
            });
          }
        });
      }
    });

    // Sort by engagement and date
    feed.sort((a, b) => {
      const aScore = a.content.engagementMetrics.likes + a.content.engagementMetrics.comments * 2;
      const bScore = b.content.engagementMetrics.likes + b.content.engagementMetrics.comments * 2;
      return bScore - aScore;
    });

    const paginatedFeed = feed.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: paginatedFeed,
      pagination: {
        total: feed.length,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching buzz feed:', error);
    res.status(500).json({ error: 'Failed to fetch buzz feed' });
  }
});

// Engage with buzz content (like, comment, share)
router.post('/engage/:contentId', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { action, profileId } = req.body;

    const validActions = ['like', 'unlike', 'comment', 'share', 'save'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
    }

    let updated = false;
    axomProfileStore.forEach((profile) => {
      const content = profile.buzzContent.find((c) => c.contentId === contentId);
      if (content) {
        switch (action) {
          case 'like':
            content.engagementMetrics.likes += 1;
            break;
          case 'unlike':
            content.engagementMetrics.likes = Math.max(0, content.engagementMetrics.likes - 1);
            break;
          case 'comment':
            content.engagementMetrics.comments += 1;
            break;
          case 'share':
            content.engagementMetrics.shares += 1;
            break;
          case 'save':
            content.engagementMetrics.saves += 1;
            break;
        }
        content.engagementMetrics.views += 1; // Engagement implies viewing
        profile.stats.engagementRate = calculateEngagementRate(profile);
        updated = true;
      }
    });

    if (!updated) {
      return res.status(404).json({ error: 'Content not found' });
    }

    logger.info(`Buzz engagement: ${action} on ${contentId}`, { profileId });

    res.json({
      success: true,
      message: `Content ${action} successful`
    });
  } catch (error) {
    logger.error('Error engaging with buzz:', error);
    res.status(500).json({ error: 'Failed to engage with content' });
  }
});

// Get trending buzz in area
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { areaId, timeframe = '24h' } = req.query;

    const trending: Array<{ content: BuzzContent; profileId: string; trendScore: number }> = [];

    const cutoffTime = getCutoffTime(timeframe as string);

    axomProfileStore.forEach((profile) => {
      if (!areaId || profile.primaryLocation.areaId === areaId) {
        profile.buzzContent.forEach((content) => {
          if (content.createdAt >= cutoffTime) {
            const trendScore = calculateTrendScore(content);
            trending.push({ content, profileId: profile.profileId, trendScore });
          }
        });
      }
    });

    // Sort by trend score
    trending.sort((a, b) => b.trendScore - a.trendScore);
    const topTrending = trending.slice(0, 10);

    res.json({
      success: true,
      data: topTrending,
      timeframe
    });
  } catch (error) {
    logger.error('Error fetching trending buzz:', error);
    res.status(500).json({ error: 'Failed to fetch trending buzz' });
  }
});

// Get local businesses in area
router.get('/businesses', async (req: Request, res: Response) => {
  try {
    const { areaId, businessType, limit = 20 } = req.query;

    const businesses: Array<{
      businessId: string;
      name: string;
      type: string;
      connectedMembers: number;
      recentBuzz: number;
    }> = [];

    axomProfileStore.forEach((profile) => {
      if (!areaId || profile.primaryLocation.areaId === areaId) {
        profile.connectedBusinesses.forEach((biz) => {
          if (!businessType || biz.businessType === businessType) {
            businesses.push({
              businessId: biz.businessId,
              name: biz.businessName,
              type: biz.businessType,
              connectedMembers: 0, // Would be aggregated
              recentBuzz: biz.engagementStats.postsAbout
            });
          }
        });
      }
    });

    res.json({
      success: true,
      data: businesses.slice(0, Number(limit))
    });
  } catch (error) {
    logger.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// Helper functions
function calculateEngagementRate(profile: AxomProfile): number {
  const totalEngagement =
    profile.buzzContent.reduce((sum, c) => sum + c.engagementMetrics.likes + c.engagementMetrics.comments, 0);
  return profile.stats.postsCount > 0 ? (totalEngagement / profile.stats.postsCount) * 100 : 0;
}

function calculateTrendScore(content: BuzzContent): number {
  const metrics = content.engagementMetrics;
  const recency = Math.max(0, 1 - (Date.now() - content.createdAt.getTime()) / (24 * 60 * 60 * 1000));
  return metrics.likes * 1 + metrics.comments * 2 + metrics.shares * 3 + metrics.views * 0.1 + recency * 10;
}

function getCutoffTime(timeframe: string): Date {
  const now = new Date();
  switch (timeframe) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

export default router;
