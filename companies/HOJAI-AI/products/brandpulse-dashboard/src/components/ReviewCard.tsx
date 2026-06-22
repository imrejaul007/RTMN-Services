import { clsx } from 'clsx';
import { Star, ThumbsUp, ExternalLink, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Review } from '../types';

interface ReviewCardProps {
  review: Review;
  onModerate?: (id: string, status: string) => void;
}

export function ReviewCard({ review, onModerate }: ReviewCardProps) {
  const sentimentConfig = {
    positive: { bg: 'bg-green-50', text: 'text-green-700' },
    neutral: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
    negative: { bg: 'bg-red-50', text: 'text-red-700' },
  };

  const sourceConfig: Record<string, string> = {
    google: 'Google',
    yelp: 'Yelp',
    tripadvisor: 'TripAdvisor',
    facebook: 'Facebook',
    direct: 'Direct',
    internal: 'Internal',
  };

  const config = sentimentConfig[review.sentiment.label];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-medium">
            {review.author.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">{review.author.name}</p>
            <p className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(review.publishedAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {review.author.isVerified && (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              <CheckCircle className="h-3 w-3" />
              Verified
            </span>
          )}
          <span className="text-sm text-gray-500">{sourceConfig[review.source] || review.source}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={clsx(
                'h-4 w-4',
                star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              )}
            />
          ))}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
          {review.sentiment.label}
        </span>
      </div>

      {review.title && <p className="mt-3 font-medium text-gray-900">{review.title}</p>}
      <p className="mt-2 text-sm text-gray-600">{review.content}</p>

      {review.sentiment.aspects && review.sentiment.aspects.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.sentiment.aspects.map((aspect: any, i: number) => (
            <span
              key={i}
              className={clsx(
                'rounded-full px-2 py-0.5 text-xs',
                aspect.score > 0 ? 'bg-green-100 text-green-700' : aspect.score < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              )}
            >
              {aspect.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ThumbsUp className="h-4 w-4" />
            <span>{review.engagement?.helpful || 0}</span>
          </button>
          {review.sourceUrl && (
            <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
              View Original <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {review.responses && review.responses.length > 0 && (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">
            {review.responses.length} Response{review.responses.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {onModerate && review.moderation?.status === 'pending' && (
        <div className="mt-3 flex gap-2 border-t pt-3">
          <button onClick={() => onModerate(review.id, 'approved')} className="flex-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">Approve</button>
          <button onClick={() => onModerate(review.id, 'rejected')} className="flex-1 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">Reject</button>
        </div>
      )}
    </div>
  );
}
