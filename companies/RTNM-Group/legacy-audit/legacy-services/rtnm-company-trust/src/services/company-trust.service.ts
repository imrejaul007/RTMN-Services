import { CompanyTrust, TrustHistory, ICompanyTrust, ITrustHistory } from '../models/company-trust.model';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface TrustScores {
  overallScore?: number;
  paymentScore?: number;
  fulfillmentScore?: number;
  disputeScore?: number;
  verificationScore?: number;
}

export interface TrustUpdateResult {
  success: boolean;
  companyTrust?: ICompanyTrust;
  historyEntry?: ITrustHistory;
  error?: string;
}

export class CompanyTrustService {
  /**
   * Get trust score for a company by corpId
   */
  async getTrust(corpId: string): Promise<ICompanyTrust | null> {
    try {
      logger.info(`Fetching trust score for corpId: ${corpId}`);
      const trust = await CompanyTrust.findOne({ corpId });

      if (!trust) {
        logger.warn(`No trust record found for corpId: ${corpId}`);
        return null;
      }

      logger.info(`Trust score retrieved for ${corpId}: ${trust.overallScore}`);
      return trust;
    } catch (error) {
      logger.error(`Error fetching trust for ${corpId}:`, error);
      throw error;
    }
  }

  /**
   * Get all company trust scores
   */
  async getAllTrustScores(options?: {
    limit?: number;
    skip?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
 }): Promise<ICompanyTrust[]> {
    try {
      const {
        limit = 100,
        skip = 0,
        sortBy = 'overallScore',
        sortOrder = 'desc',
      } = options || {};

      logger.info(`Fetching all trust scores with limit: ${limit}`);

      const trustScores = await CompanyTrust.find()
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit);

      return trustScores;
    } catch (error) {
      logger.error('Error fetching all trust scores:', error);
      throw error;
    }
  }

  /**
   * Update trust scores for a company
   */
  async updateTrust(
    corpId: string,
    scores: TrustScores,
    triggeredBy: string = 'system',
    reason: string = 'Manual update'
  ): Promise<TrustUpdateResult> {
    try {
      logger.info(`Updating trust scores for corpId: ${corpId}`);

      // Get current trust or create new
      let companyTrust = await CompanyTrust.findOne({ corpId });
 const previousScores = companyTrust ? {
        overallScore: companyTrust.overallScore,
        paymentScore: companyTrust.paymentScore,
        fulfillmentScore: companyTrust.fulfillmentScore,
        disputeScore: companyTrust.disputeScore,
        verificationScore: companyTrust.verificationScore,
      } : null;

      // Calculate new overall score if not provided
      const newOverallScore = scores.overallScore ?? this.calculateOverallScore(scores);

      // Determine trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (previousScores && previousScores.overallScore !== undefined) {
        const diff = newOverallScore - previousScores.overallScore;
        if (diff > 2) trend = 'up';
        else if (diff < -2) trend = 'down';
      }

      // Determine risk level
      const riskLevel = this.calculateRiskLevel(newOverallScore);

      if (companyTrust) {
        // Update existing
        companyTrust.set({
          ...scores,
          overallScore: newOverallScore,
          trend,
          riskLevel,
          updatedAt: new Date(),
        });
        await companyTrust.save();
      } else {
        // Create new record
        companyTrust = new CompanyTrust({
          corpId,
          companyName: scores.companyName || corpId,
          overallScore: newOverallScore,
          paymentScore: scores.paymentScore ?? config.trust.defaultScore,
          fulfillmentScore: scores.fulfillmentScore ?? config.trust.defaultScore,
          disputeScore: scores.disputeScore ?? config.trust.defaultScore,
          verificationScore: scores.verificationScore ?? config.trust.defaultScore,
          trend,
          riskLevel,
        });
        await companyTrust.save();
      }

      // Create history entry
      const historyEntry = new TrustHistory({
        corpId,
        overallScore: newOverallScore,
        paymentScore: scores.paymentScore ?? config.trust.defaultScore,
        fulfillmentScore: scores.fulfillmentScore ?? config.trust.defaultScore,
        disputeScore: scores.disputeScore ?? config.trust.defaultScore,
        verificationScore: scores.verificationScore ?? config.trust.defaultScore,
        reason,
        triggeredBy,
        recordedAt: new Date(),
      });
      await historyEntry.save();

      logger.info(`Trust scores updated for ${corpId}: overall=${newOverallScore}, trend=${trend}`);

      return {
        success: true,
        companyTrust,
        historyEntry,
      };
    } catch (error) {
      logger.error(`Error updating trust for ${corpId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get trust history for a company
   */
  async getTrustHistory(
    corpId: string,
    options?: {
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ITrustHistory[]> {
    try {
      const { limit = 100, skip = 0, startDate, endDate } = options || {};

      logger.info(`Fetching trust history for corpId: ${corpId}`);

      const query: Record<string, unknown> = { corpId };

      if (startDate || endDate) {
        query.recordedAt = {};
        if (startDate) query.recordedAt.$gte = startDate;
        if (endDate) query.recordedAt.$lte = endDate;
      }

      const history = await TrustHistory.find(query)
        .sort({ recordedAt: -1 })
        .skip(skip)
        .limit(limit);

      logger.info(`Retrieved ${history.length} history entries for ${corpId}`);
      return history;
    } catch (error) {
      logger.error(`Error fetching trust history for ${corpId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate overall score from individual scores
   */
  private calculateOverallScore(scores: TrustScores): number {
    const weights = {
      paymentScore: 0.3,
      fulfillmentScore: 0.3,
      disputeScore: 0.25,
      verificationScore: 0.15,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    if (scores.paymentScore !== undefined) {
      weightedSum += scores.paymentScore * weights.paymentScore;
      totalWeight += weights.paymentScore;
    }
    if (scores.fulfillmentScore !== undefined) {
      weightedSum += scores.fulfillmentScore * weights.fulfillmentScore;
      totalWeight += weights.fulfillmentScore;
    }
    if (scores.disputeScore !== undefined) {
      weightedSum += scores.disputeScore * weights.disputeScore;
      totalWeight += weights.disputeScore;
    }
    if (scores.verificationScore !== undefined) {
      weightedSum += scores.verificationScore * weights.verificationScore;
      totalWeight += weights.verificationScore;
    }

    if (totalWeight === 0) {
      return config.trust.defaultScore;
    }

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Calculate risk level based on overall score
   */
  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'low';
    if (score >= 40) return 'medium';
    return 'high';
  }

  /**
   * Record a transaction for a company
   */
  async recordTransaction(corpId: string): Promise<void> {
    try {
      const companyTrust = await CompanyTrust.findOne({ corpId });
      if (companyTrust) {
        companyTrust.transactionCount += 1;
        companyTrust.lastTransactionAt = new Date();
        await companyTrust.save();
        logger.info(`Transaction recorded for ${corpId}: total=${companyTrust.transactionCount}`);
      }
    } catch (error) {
      logger.error(`Error recording transaction for ${corpId}:`, error);
 }
  }

  /**
   * Add a badge to a company
   */
  async addBadge(corpId: string, badge: string): Promise<boolean> {
    try {
      const companyTrust = await CompanyTrust.findOne({ corpId });
      if (companyTrust && !companyTrust.badges.includes(badge)) {
        companyTrust.badges.push(badge);
        await companyTrust.save();
        logger.info(`Badge "${badge}" added to ${corpId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error adding badge to ${corpId}:`, error);
      return false;
    }
  }

  /**
   * Get trust leaderboard
   */
  async getLeaderboard(limit: number = 10): Promise<ICompanyTrust[]> {
    try {
      return await CompanyTrust.find()
        .sort({ overallScore: -1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get companies by risk level
   */
  async getByRiskLevel(riskLevel: 'low' | 'medium' | 'high'): Promise<ICompanyTrust[]> {
    try {
      return await CompanyTrust.find({ riskLevel })
        .sort({ overallScore: -1 });
    } catch (error) {
      logger.error(`Error fetching companies by risk level ${riskLevel}:`, error);
      throw error;
    }
  }
}

export const companyTrustService = new CompanyTrustService();