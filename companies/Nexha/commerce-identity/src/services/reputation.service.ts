/**
 * Reputation Service
 *
 * Centralizes rating submission, weighted aggregation, and the auto
 * scoring pipeline that derives delivery / quality / payment / response
 * scores from completed deals. Outputs are persisted on the Supplier and
 * Buyer records and forwarded to SUTAR OS trust layer (port 4251).
 */

import { Rating, IRating, RatingType, RatingSubject, RatingSource } from '../models/rating.model';
import { Supplier } from '../models/supplier.model';
import { Buyer } from '../models/buyer.model';
import { generateRatingId } from '../utils/id-generator';
import { logger } from '../config/logger';

const DEFAULT_LOOKBACK_DAYS = 90;
const WEIGHTS: Record<RatingType, number> = {
  overall: 0.30,
  delivery: 0.25,
  quality: 0.30,
  payment: 0.25,
  communication: 0.10,
};

export interface RatingSubmissionInput {
  type: RatingType;
  subjectCorpId: string;
  raterCorpId: string;
  raterRole: 'buyer' | 'supplier' | 'system';
  dealId?: string;
  score: number;                 // 1-5
  feedback?: string;
  source?: RatingSource;
  weight?: number;
  metadata?: Record<string, unknown>;
}

export interface ReputationSummary {
  corpId: string;
  subject: RatingSubject;
  overallScore: number;          // 0-100
  breakdown: Record<RatingType, { average: number; count: number; weighted: number }>;
  recentTrend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
}

export interface AutoScoreInputs {
  corpId: string;
  onTimeDeliveryRate: number;    // 0-1
  qualityAcceptanceRate: number; // 0-1
  onTimePaymentRate: number;     // 0-1
  responseRate: number;          // 0-1
  sampleSize: number;
}

export class ReputationService {
  /**
   * Submit a manual rating. One rating per (rater, subject, dealId) is allowed.
   * The aggregation is re-run on the subject's record inside the same call.
   */
  static async submit(input: RatingSubmissionInput): Promise<IRating> {
    if (input.score < 1 || input.score > 5) {
      throw new Error('score must be between 1 and 5');
    }
    if (input.raterCorpId === input.subjectCorpId) {
      throw new Error('Cannot rate yourself');
    }

    const ratingId = generateRatingId();
    const subject = await this.resolveSubject(input.subjectCorpId);
    if (!subject) throw new Error(`Unknown corpId: ${input.subjectCorpId} — must be registered as supplier or buyer first`);
    const source: RatingSource = input.source || (input.raterRole === 'system' ? 'system' : input.raterRole);

    const rating = await Rating.create({
      ratingId,
      type: input.type,
      subject,
      subjectCorpId: input.subjectCorpId,
      raterCorpId: input.raterCorpId,
      raterRole: input.raterRole,
      dealId: input.dealId,
      score: input.score,
      feedback: input.feedback,
      source,
      weight: input.weight ?? 1.0,
      metadata: input.metadata || {},
    });

    await this.reaggregate(input.subjectCorpId, subject);
    await this.maybePushToSutar(input.subjectCorpId, subject).catch((err) =>
      logger.warn('SUTAR trust sync skipped', { err: err.message })
    );
    return rating;
  }

  /**
   * Recompute the subject's reputation scores from the underlying ratings.
   * Persists the result on the Supplier or Buyer document.
   */
  static async reaggregate(corpId: string, subject: RatingSubject): Promise<void> {
    const since = new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const ratings = await Rating.find({
      subjectCorpId: corpId,
      createdAt: { $gte: since },
    });

    if (ratings.length === 0) return;

    const breakdown: Record<RatingType, { sumWeighted: number; sumWeight: number; count: number }> = {
      overall: { sumWeighted: 0, sumWeight: 0, count: 0 },
      delivery: { sumWeighted: 0, sumWeight: 0, count: 0 },
      quality: { sumWeighted: 0, sumWeight: 0, count: 0 },
      payment: { sumWeighted: 0, sumWeight: 0, count: 0 },
      communication: { sumWeighted: 0, sumWeight: 0, count: 0 },
    };

    for (const r of ratings) {
      breakdown[r.type].sumWeighted += r.score * r.weight;
      breakdown[r.type].sumWeight += r.weight;
      breakdown[r.type].count += 1;
    }

    // Compute the overall score as a weighted blend of per-type averages.
    // Each type contributes its normalized score * its weight.
    // When only a subset of types have ratings, their weights are renormalized
    // so the overall score is still on a 0-100 scale.
    const totalWeight = (Object.entries(breakdown) as Array<[RatingType, typeof breakdown.delivery]>)
      .filter(([, agg]) => agg.count > 0)
      .reduce((acc, [type, agg]) => acc + WEIGHTS[type], 0);

    const overallPct =
      totalWeight === 0 ? 0 :
      (Object.entries(breakdown) as Array<[RatingType, typeof breakdown.delivery]>).reduce(
        (acc, [type, agg]) => {
          if (agg.count === 0) return acc;
          const avg = agg.sumWeighted / agg.sumWeight;          // 1-5
          const normalized = (avg - 1) * 25;                    // 0-100
          return acc + normalized * WEIGHTS[type];
        },
        0
      ) / totalWeight * 100;

    const overallScore = Math.round(Math.max(0, Math.min(100, overallPct)));
    const toPct = (agg: { sumWeighted: number; sumWeight: number }) =>
      agg.sumWeight === 0 ? 0 : Math.round(((agg.sumWeighted / agg.sumWeight - 1) * 25));

    if (subject === 'supplier') {
      await Supplier.updateOne(
        { corpId },
        {
          $set: {
            'reputation.overallScore': overallScore,
            'reputation.deliveryScore': toPct(breakdown.delivery),
            'reputation.qualityScore': toPct(breakdown.quality),
            'reputation.responseScore': toPct(breakdown.communication),
            'reputation.totalRatings': ratings.length,
          },
        }
      );
    } else {
      await Buyer.updateOne(
        { corpId },
        {
          $set: {
            'stats.paymentScore': toPct(breakdown.payment),
            'stats.responseScore': toPct(breakdown.communication),
          },
        }
      );
    }
  }

  /**
   * Build a public-facing reputation summary for a corpId.
   */
  static async getSummary(corpId: string): Promise<ReputationSummary | null> {
    const subject = await this.resolveSubject(corpId);
    if (!subject) return null;
    const since = new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const ratings = await Rating.find({ subjectCorpId: corpId, createdAt: { $gte: since } });
    if (ratings.length === 0) return null;

    const breakdown = {} as ReputationSummary['breakdown'];
    const types: RatingType[] = ['overall', 'delivery', 'quality', 'payment', 'communication'];
    for (const t of types) {
      const subset = ratings.filter((r) => r.type === t);
      if (subset.length === 0) {
        breakdown[t] = { average: 0, count: 0, weighted: 0 };
        continue;
      }
      const weightedSum = subset.reduce((a, r) => a + r.score * r.weight, 0);
      const weightSum = subset.reduce((a, r) => a + r.weight, 0);
      breakdown[t] = {
        average: Number((weightedSum / weightSum).toFixed(2)),
        count: subset.length,
        weighted: Math.round((weightedSum / weightSum - 1) * 25),
      };
    }

    const overallScore =
      subject === 'supplier'
        ? (await Supplier.findOne({ corpId }))?.reputation.overallScore || 0
        : Math.round((breakdown.payment.weighted + breakdown.communication.weighted) / 2);

    return {
      corpId,
      subject: subject!,       // safe: null case handled above
      overallScore,
      breakdown,
      recentTrend: this.computeTrend(ratings),
      lastUpdated: new Date(),
    };
  }

  /**
   * Auto-pipeline: derive reputation scores from operational metrics
   * (delivery performance, payment reliability, etc.) and persist as
   * a system-sourced `overall` rating.
   */
  static async runAutoScoring(inputs: AutoScoreInputs): Promise<void> {
    if (inputs.sampleSize <= 0) return;
    const subject = await this.resolveSubject(inputs.corpId);
    if (subject !== 'supplier') {
      logger.info('Auto-scoring currently only updates suppliers', { corpId: inputs.corpId });
      return;
    }

    const score5Star = (
      delivery: number,
      quality: number,
      payment: number,
      response: number
    ): number => {
      // 1-5 mapping: 0% rates map to 1, 100% rates map to 5
      const blended =
        delivery * 0.30 + quality * 0.35 + payment * 0.20 + response * 0.15;
      return Math.max(1, Math.min(5, 1 + blended * 4));
    };

    const overall = score5Star(
      inputs.onTimeDeliveryRate,
      inputs.qualityAcceptanceRate,
      inputs.onTimePaymentRate,
      inputs.responseRate
    );

    // Persist the auto-rating. The aggregator will re-merge with any
    // existing manual ratings on the next reaggregate() call.
    const ratingId = generateRatingId();
    await Rating.create({
      ratingId,
      type: 'overall',
      subject: 'supplier',
      subjectCorpId: inputs.corpId,
      raterCorpId: 'system',
      raterRole: 'system',
      score: Number(overall.toFixed(2)),
      source: 'auto_pipeline',
      weight: 0.7,                          // auto-ratings are weighted lower
      metadata: {
        onTimeDeliveryRate: inputs.onTimeDeliveryRate,
        qualityAcceptanceRate: inputs.qualityAcceptanceRate,
        onTimePaymentRate: inputs.onTimePaymentRate,
        responseRate: inputs.responseRate,
        sampleSize: inputs.sampleSize,
      },
    });

    await this.reaggregate(inputs.corpId, 'supplier');
  }

  static async listRatings(
    subjectCorpId: string,
    options: { type?: RatingType; limit?: number; skip?: number } = {}
  ): Promise<{ ratings: IRating[]; total: number }> {
    const query: Record<string, unknown> = { subjectCorpId };
    if (options.type) query.type = options.type;
    const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 100) : 20;
    const skip = options.skip && options.skip >= 0 ? options.skip : 0;
    const [ratings, total] = await Promise.all([
      Rating.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Rating.countDocuments(query),
    ]);
    return { ratings, total };
  }

  // -- internals --

  private static async resolveSubject(corpId: string): Promise<RatingSubject | null> {
    if (corpId === 'system') return 'supplier';
    const supplier = await Supplier.exists({ corpId });
    if (supplier) return 'supplier';
    const buyer = await Buyer.exists({ corpId });
    if (buyer) return 'buyer';
    return null;
  }

  private static computeTrend(ratings: IRating[]): 'improving' | 'stable' | 'declining' {
    if (ratings.length < 4) return 'stable';
    const sorted = [...ratings].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const half = Math.floor(sorted.length / 2);
    const first = sorted.slice(0, half);
    const second = sorted.slice(half);
    const avg = (xs: IRating[]) => xs.reduce((a, r) => a + r.score, 0) / xs.length;
    const delta = avg(second) - avg(first);
    if (delta > 0.25) return 'improving';
    if (delta < -0.25) return 'declining';
    return 'stable';
  }

  /**
   * Forward a reputation change to the SUTAR OS trust layer. Wired
   * through the bridge service; failures are non-fatal.
   */
  private static async maybePushToSutar(corpId: string, subject: RatingSubject): Promise<void> {
    const url = process.env.SUTAR_REPUTATION_URL;
    if (!url) return;
    try {
      const summary = await this.getSummary(corpId);
      if (!summary) return;
      await fetch(`${url}/trust/sync`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
        body: JSON.stringify({ corpId, subject, overallScore: summary.overallScore, breakdown: summary.breakdown }),
      });
    } catch (err) {
      logger.warn('SUTAR trust push failed', { corpId, err: (err as Error).message });
    }
  }
}
