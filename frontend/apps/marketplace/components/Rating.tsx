'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/api';

interface RatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (value: number) => void;
}

export default function Rating({
  value,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
}: RatingProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, index) => {
        const isFilled = index < Math.floor(value);
        const isHalf = !isFilled && index < value;

        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(index)}
            className={cn(
              'relative',
              interactive && 'cursor-pointer hover:scale-110 transition-transform'
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                'text-gray-300',
                (isFilled || isHalf) && 'fill-yellow-400 text-yellow-400'
              )}
            />
            {isHalf && (
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star className={cn(sizeClasses[size], 'fill-yellow-400 text-yellow-400')} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface RatingSummaryProps {
  rating: number;
  reviewCount: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingSummary({ rating, reviewCount, size = 'md' }: RatingSummaryProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
  };

  const barSizes = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className={cn('font-bold', sizeClasses[size])}>{rating.toFixed(1)}</span>
        <Rating value={rating} size={size === 'lg' ? 'md' : 'sm'} />
      </div>
      <span className="text-sm text-gray-500">({reviewCount.toLocaleString()} reviews)</span>
    </div>
  );
}
