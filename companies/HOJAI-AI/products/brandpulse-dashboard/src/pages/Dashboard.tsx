import { useState } from 'react';
import {
  MessageSquare,
  Star,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { SentimentChart } from '../components/SentimentChart';
import { RatingDistribution } from '../components/RatingDistribution';
import { AspectAnalysis } from '../components/AspectAnalysis';
import { AlertList } from '../components/AlertList';
import { ReviewCard } from '../components/ReviewCard';
import {
  useBrandData,
  useSentimentTrend,
  useRatings,
  useAspects,
  useAlerts,
  useReviews,
} from '../hooks/useBrandData';

interface DashboardProps {
  brandId: string;
}

export function Dashboard({ brandId }: DashboardProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  const { brand, loading: brandLoading, refresh: refreshBrand } = useBrandData(brandId);
  const { trend, loading: trendLoading } = useSentimentTrend(brandId, period);
  const { ratings } = useRatings(brandId);
  const { aspects } = useAspects(brandId);
  const { alerts, acknowledge, resolve } = useAlerts(brandId);
  const { reviews, loading: reviewsLoading, loadMore } = useReviews(brandId, 5);

  if (brandLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-gray-500">Brand not found</p>
          <p className="mt-2 text-sm text-gray-400">
            Try generating demo data first:
            <br />
            <code className="bg-gray-100 px-2 py-1 rounded">curl -X POST localhost:4770/api/v1/demo/generate</code>
          </p>
        </div>
      </div>
    );
  }

  const getSentimentVariant = () => {
    if (brand.stats.sentimentScore > 0.2) return 'positive';
    if (brand.stats.sentimentScore < -0.2) return 'negative';
    return 'neutral';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
                <span className="text-lg font-bold text-white">BP</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{brand.name}</h1>
                <p className="text-sm text-gray-500 capitalize">{brand.industry || 'General'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => refreshBrand()}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Reviews"
            value={brand.stats.totalReviews.toLocaleString()}
            icon={MessageSquare}
            subtitle="All time"
          />
          <StatsCard
            title="Average Rating"
            value={brand.stats.averageRating.toFixed(1)}
            icon={Star}
            subtitle="out of 5"
          />
          <StatsCard
            title="Sentiment Score"
            value={`${(brand.stats.sentimentScore * 100).toFixed(0)}%`}
            icon={TrendingUp}
            variant={getSentimentVariant()}
            subtitle={brand.stats.sentimentScore > 0 ? 'Positive' : brand.stats.sentimentScore < 0 ? 'Negative' : 'Neutral'}
          />
          <StatsCard
            title="Active Alerts"
            value={alerts.filter((a) => a.status === 'active').length}
            icon={AlertTriangle}
            variant={alerts.some((a) => a.severity === 'critical') ? 'negative' : 'default'}
          />
        </div>

        {/* Sentiment Trend */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Analytics</h2>
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              {(['day', 'week', 'month'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    period === p
                      ? 'bg-brand-100 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p === 'day' ? '30D' : p === 'week' ? '12W' : '12M'}
                </button>
              ))}
            </div>
          </div>
          {trendLoading ? (
            <div className="h-80 rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-center">
              <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            </div>
          ) : trend?.data.length ? (
            <SentimentChart data={trend.data} period={period} />
          ) : (
            <div className="h-80 rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-center">
              <p className="text-gray-500">No sentiment data available</p>
            </div>
          )}
        </div>

        {/* Charts Grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {ratings && <RatingDistribution distribution={ratings.distribution} average={ratings.average} />}
          {aspects && <AspectAnalysis aspects={aspects.aspects} />}
        </div>

        {/* Sentiment Breakdown */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-600 font-medium">Positive</p>
            <p className="mt-1 text-2xl font-bold text-green-700">
              {brand.stats.positivePercent.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-600 font-medium">Neutral</p>
            <p className="mt-1 text-2xl font-bold text-yellow-700">
              {brand.stats.neutralPercent.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600 font-medium">Negative</p>
            <p className="mt-1 text-2xl font-bold text-red-700">
              {brand.stats.negativePercent.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Alerts */}
        <div className="mt-6">
          <AlertList alerts={alerts} onAcknowledge={acknowledge} onResolve={resolve} />
        </div>

        {/* Recent Reviews */}
        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Reviews</h2>
          <div className="space-y-4">
            {reviewsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                <p className="text-gray-500">No reviews yet</p>
              </div>
            ) : (
              <>
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
                {reviews.length < 100 && (
                  <button
                    onClick={loadMore}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Load More Reviews
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
