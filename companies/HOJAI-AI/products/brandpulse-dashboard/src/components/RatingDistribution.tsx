import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface RatingDistributionProps {
  distribution: Record<number, number>;
  average: number;
}

export function RatingDistribution({ distribution, average }: RatingDistributionProps) {
  const data = [
    { rating: 1, count: distribution[1] || 0, color: '#ef4444' },
    { rating: 2, count: distribution[2] || 0, color: '#f97316' },
    { rating: 3, count: distribution[3] || 0, color: '#f59e0b' },
    { rating: 4, count: distribution[4] || 0, color: '#84cc16' },
    { rating: 5, count: distribution[5] || 0, color: '#10b981' },
  ];

  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Rating Distribution</h3>
          <p className="mt-1 text-sm text-gray-500">{total} total reviews</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">{average.toFixed(1)}</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`h-4 w-4 ${
                  star <= Math.round(average) ? 'text-yellow-400' : 'text-gray-300'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis
              type="category"
              dataKey="rating"
              tick={{ fontSize: 14, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              width={30}
              tickFormatter={(v) => `${v}★`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [value, 'Reviews']}
              labelFormatter={(label) => `${label} Star${label !== 1 ? 's' : ''}`}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
