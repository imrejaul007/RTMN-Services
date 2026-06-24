/**
 * @hojai/marketplace SDK
 *
 * Client for the BLR AI Marketplace (BAM). Wraps 8 backend services into a
 * single ergonomic TypeScript client.
 *
 * @example
 * ```ts
 * import { Marketplace } from '@hojai/marketplace';
 *
 * const bam = new Marketplace({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // Browse public listings
 * const { items } = await bam.listings.search({ category: 'agent', sort: 'rating' });
 *
 * // Read & write reviews
 * await bam.reviews.addOrUpdate(items[0].listingId, { rating: 5, title: 'Great' });
 *
 * // Universal search
 * const results = await bam.discover.search({ q: 'negotiation agent' });
 *
 * // Compare candidates head-to-head
 * const winner = await bam.evaluate.compare({
 *   criteria: [{ id: 'price', direction: 'lower' }, { id: 'rating', direction: 'higher' }],
 *   candidates: [{ id: 'a', values: { price: 99, rating: 4.8 } }, { id: 'b', values: { price: 149, rating: 4.9 } }],
 * });
 *
 * // Compute ROI before subscribing
 * const roi = await bam.roi.quick({ upfrontCost: 50000, monthlyGain: 8000, months: 12 });
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { ListingsClient } from './listings.js';
import { ReviewsClient } from './reviews.js';
import { DiscoverClient } from './discover.js';
import { ExploreClient } from './explore.js';
import { EvaluateClient } from './evaluate.js';
import { ReputationClient } from './reputation.js';
import { RoiClient } from './roi.js';
import { FounderClient } from './founder.js';
import { TwinsClient } from './twins.js';

export type { HojaiConfig } from './foundation-config.js';
export { resolveConfig } from './foundation-config.js';
export { ListingsClient } from './listings.js';
export { ReviewsClient } from './reviews.js';
export { DiscoverClient } from './discover.js';
export { ExploreClient } from './explore.js';
export { EvaluateClient } from './evaluate.js';
export { ReputationClient } from './reputation.js';
export { RoiClient } from './roi.js';
export { FounderClient } from './founder.js';
export { TwinsClient } from './twins.js';

export type {
  Listing,
  ListingCategory,
  ListingStatus,
  ListingVisibility,
  PricingModel,
  CreateListingRequest,
  SearchListingsRequest,
  SearchListingsResult,
} from './listings.js';

export type {
  Review,
  ReviewDimensions,
  AddOrUpdateReviewRequest,
  AddOrUpdateReviewResult,
  ListReviewsRequest,
  ListReviewsResult,
} from './reviews.js';

export type {
  DiscoveryKind,
  IndexDocument,
  SearchRequest,
  SearchHit,
  SearchResult,
  IndexInfo,
} from './discover.js';

export type {
  Journey,
  JourneyStep,
  JourneySession,
} from './explore.js';

export type {
  Evaluation,
  EvaluationCriterion,
  EvaluationCandidate,
  CreateEvaluationRequest,
  CompareRequest,
  CompareResult,
} from './evaluate.js';

export type {
  EntityKind,
  ReputationEntity,
  ReputationScore,
  CreateEntityRequest,
  AddScoreRequest,
  LeaderboardEntry,
} from './reputation.js';

export type {
  RoiInputs,
  RoiResult,
  RoiCalculation,
  CreateCalculationRequest,
  CompareRoiRequest,
  CompareRoiResult,
  QuickRoiRequest,
  RoiTemplate,
} from './roi.js';

export type {
  Founder,
  FounderKpi,
  Playbook,
  PlaybookRun,
  CreateFounderRequest,
} from './founder.js';

export type {
  TwinCategory,
  TwinListing,
  TwinPurchase,
  TwinInstall,
} from './twins.js';

/**
 * Main BAM Marketplace client (facade)
 *
 * Provides a unified interface to all 8 BAM backend services.
 */
export class Marketplace {
  public readonly listings: ListingsClient;
  public readonly reviews: ReviewsClient;
  public readonly discover: DiscoverClient;
  public readonly explore: ExploreClient;
  public readonly evaluate: EvaluateClient;
  public readonly reputation: ReputationClient;
  public readonly roi: RoiClient;
  public readonly founder: FounderClient;
  public readonly twins: TwinsClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    this.config = resolveConfig(config);
    this.listings = new ListingsClient(this.config);
    this.reviews = new ReviewsClient(this.config);
    this.discover = new DiscoverClient(this.config);
    this.explore = new ExploreClient(this.config);
    this.evaluate = new EvaluateClient(this.config);
    this.reputation = new ReputationClient(this.config);
    this.roi = new RoiClient(this.config);
    this.founder = new FounderClient(this.config);
    this.twins = new TwinsClient(this.config);
  }
}

export default Marketplace;
