import { clsx } from 'clsx';
import type { Aspect } from '../types';

interface AspectAnalysisProps {
  aspects: Aspect[];
}

export function AspectAnalysis({ aspects }: AspectAnalysisProps) {
  const maxMentions = Math.max(...aspects.map((a) => a.mentions));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-medium text-gray-900">Aspect Analysis</h3>
      <p className="mt-1 text-sm text-gray-500">What customers are talking about</p>
      <div className="mt-4 space-y-4">
        {aspects.length === 0 ? (
          <p className="text-sm text-gray-500">No aspect data available</p>
        ) : (
          aspects.map((aspect) => (
            <div key={aspect.name}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {aspect.name.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{aspect.mentions} mentions</span>
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      aspect.score > 0.2
                        ? 'bg-green-100 text-green-700'
                        : aspect.score < -0.2
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    )}
                  >
                    {aspect.score > 0 ? '+' : ''}
                    {(aspect.score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-500',
                    aspect.score > 0.2
                      ? 'bg-green-500'
                      : aspect.score < -0.2
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                  )}
                  style={{ width: `${(aspect.mentions / maxMentions) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
