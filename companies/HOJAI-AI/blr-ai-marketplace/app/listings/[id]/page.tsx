'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getListing, getListingReviews, recordView, recordInstall, createCheckoutSession } from '@/lib/api';
import type { Listing, Review } from '@/types';

const CATEGORY_ICONS: Record<string, string> = {
  'ai-employee': '👔',
  'agent': '🤖',
  'ai-team': '👥',
  'skill': '⚡',
  'twin': '🔄',
  'department-os': '🏢',
  'industry-os': '🏭',
  'business-capability-pack': '📦',
  'company-blueprint': '🏗️',
  'workflow': '🔧',
  'widget': '🧩',
  'integration': '🔌',
  'analytics': '📊',
  'knowledge-pack': '📚',
  'starter-kit': '🚀',
};

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`text-lg ${star <= rating ? 'text-amber-400' : 'text-slate-300'}`}
          >
            ★
          </span>
        ))}
      </div>
      <span className="font-semibold text-slate-900">{rating.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-slate-500">({count} reviews)</span>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-semibold text-slate-900">{review.reviewerName}</div>
          <div className="text-sm text-slate-500">
            {new Date(review.createdAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>
      {review.title && (
        <h4 className="font-semibold text-slate-900 mb-2">{review.title}</h4>
      )}
      {review.body && (
        <p className="text-slate-600 mb-4">{review.body}</p>
      )}
      {review.dimensions && (
        <div className="flex flex-wrap gap-4">
          {review.dimensions.easeOfUse && (
            <div className="text-sm">
              <span className="text-slate-500">Ease of Use:</span>{' '}
              <span className="font-medium text-slate-900">{review.dimensions.easeOfUse}/5</span>
            </div>
          )}
          {review.dimensions.documentation && (
            <div className="text-sm">
              <span className="text-slate-500">Documentation:</span>{' '}
              <span className="font-medium text-slate-900">{review.dimensions.documentation}/5</span>
            </div>
          )}
          {review.dimensions.support && (
            <div className="text-sm">
              <span className="text-slate-500">Support:</span>{' '}
              <span className="font-medium text-slate-900">{review.dimensions.support}/5</span>
            </div>
          )}
          {review.dimensions.valueForMoney && (
            <div className="text-sm">
              <span className="text-slate-500">Value:</span>{' '}
              <span className="font-medium text-slate-900">{review.dimensions.valueForMoney}/5</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [listingRes, reviewsRes] = await Promise.all([
          getListing(id),
          getListingReviews(id),
        ]);
        setListing(listingRes);
        setReviews(reviewsRes.reviews || []);

        // Record view
        recordView(id).catch(console.error);
      } catch (err) {
        console.error('Failed to fetch listing:', err);
        setError('Failed to load listing');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handlePurchase = async () => {
    if (!listing) return;

    setPurchasing(true);
    try {
      const result = await createCheckoutSession(
        listing.listingId,
        undefined,
        `${window.location.origin}/success`,
        window.location.href
      );

      // Redirect to Stripe checkout
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      console.error('Purchase failed:', err);
      alert(err.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleInstall = async () => {
    try {
      await recordInstall(id);
      alert('Install recorded! In production, this would provision the asset to your workspace.');
    } catch (err) {
      console.error('Install failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-600">Loading listing...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Listing not found</h2>
        <p className="text-slate-600 mb-6">{error}</p>
        <Link href="/listings" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Browse Listings
        </Link>
      </div>
    );
  }

  const icon = CATEGORY_ICONS[listing.category] || '📦';
  const price = listing.price ? `₹${(listing.price / 100).toLocaleString('en-IN')}` : 'Free';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        <span>/</span>
        <Link href="/listings" className="hover:text-blue-600">Listings</Link>
        <span>/</span>
        <span className="text-slate-900">{listing.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="flex items-start gap-6 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-4xl">
                {icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                    {listing.category}
                  </span>
                  {listing.status === 'PUBLISHED' && (
                    <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      Published
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{listing.title}</h1>
                <p className="text-slate-600">by {listing.publisherName}</p>
              </div>
            </div>

            {listing.rating && (
              <div className="mb-6">
                <StarRating rating={listing.rating} count={listing.reviewCount} />
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{listing.viewCount || 0}</div>
                <div className="text-sm text-slate-500">Views</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{listing.installCount || 0}</div>
                <div className="text-sm text-slate-500">Installs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{reviews.length}</div>
                <div className="text-sm text-slate-500">Reviews</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Description</h2>
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-600 whitespace-pre-wrap">{listing.description}</p>
            </div>
          </div>

          {/* Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {listing.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-lg">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Reviews</h2>
            {reviews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-slate-600">No reviews yet. Be the first to review!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.slice(0, 5).map(review => (
                  <ReviewCard key={review.reviewId} review={review} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Purchase */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-24">
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-slate-900">{price}</div>
              {listing.pricingModel !== 'free' && listing.pricingModel !== 'one-time' && (
                <div className="text-slate-500">per {listing.pricingModel.replace('-', ' ')}</div>
              )}
              {listing.pricingModel === 'one-time' && (
                <div className="text-slate-500">one-time purchase</div>
              )}
            </div>

            {listing.pricingModel === 'free' ? (
              <button
                onClick={handleInstall}
                className="w-full py-4 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
              >
                Install Free
              </button>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="w-full py-4 text-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {purchasing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Buy Now</>
                )}
              </button>
            )}

            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Instant access after purchase
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Secure payment via Stripe
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                30-day money-back guarantee
              </div>
            </div>

            {/* Pricing Model Info */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
              <h4 className="font-semibold text-slate-900 mb-2">Pricing Model</h4>
              <p className="text-sm text-slate-600">
                {listing.pricingModel === 'free' && 'This asset is free to use.'}
                {listing.pricingModel === 'one-time' && 'Pay once, own forever.'}
                {listing.pricingModel === 'subscription' && 'Billed monthly. Cancel anytime.'}
                {listing.pricingModel === 'usage-based' && 'Pay for what you use.'}
                {listing.pricingModel === 'quote-only' && 'Contact seller for pricing.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
