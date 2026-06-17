'use client'

import clsx from 'clsx'

interface LeadScoreBreakdown {
  engagement: number
  firmographics: number
  demographics: number
  intent: number
}

interface LeadScoreProps {
  score: number
  breakdown?: LeadScoreBreakdown
  compact?: boolean
}

export default function LeadScore({ score, breakdown, compact = false }: LeadScoreProps) {
  const getScoreColor = (scoreValue: number) => {
    if (scoreValue >= 80) return 'text-red-500'
    if (scoreValue >= 60) return 'text-amber-500'
    if (scoreValue >= 40) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getScoreBgColor = (scoreValue: number) => {
    if (scoreValue >= 80) return 'bg-red-50'
    if (scoreValue >= 60) return 'bg-amber-50'
    if (scoreValue >= 40) return 'bg-yellow-50'
    return 'bg-green-50'
  }

  const getScoreLabel = (scoreValue: number) => {
    if (scoreValue >= 80) return 'Hot'
    if (scoreValue >= 60) return 'Warm'
    if (scoreValue >= 40) return 'Cool'
    return 'Cold'
  }

  const colorClass = getScoreColor(score)
  const bgColorClass = getScoreBgColor(score)
  const label = getScoreLabel(score)

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="#e5e7eb"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke={score >= 80 ? '#ef4444' : score >= 60 ? '#f59e0b' : '#22c55e'}
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${(score / 100) * 126} 126`}
              strokeLinecap="round"
            />
          </svg>
          <span className={clsx('absolute inset-0 flex items-center justify-center text-xs font-bold', colorClass)}>
            {score}
          </span>
        </div>
        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', bgColorClass, colorClass)}>
          {label}
        </span>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Score Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">Lead Score</span>
        <span className={clsx('text-lg font-bold', colorClass)}>{score}</span>
      </div>

      {/* Progress Bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className={clsx('h-full rounded-full transition-all', colorClass.replace('text-', 'bg-'))}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Label */}
      <div className="flex items-center justify-between">
        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', bgColorClass, colorClass)}>
          {label}
        </span>
        <span className="text-xs text-gray-400">out of 100</span>
      </div>

      {/* Breakdown */}
      {breakdown && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Score Breakdown</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Engagement</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(breakdown.engagement / 40) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-4 text-right">
                  {breakdown.engagement}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Firmographics</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(breakdown.firmographics / 30) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-4 text-right">
                  {breakdown.firmographics}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Demographics</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${(breakdown.demographics / 20) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-4 text-right">
                  {breakdown.demographics}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Intent</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${(breakdown.intent / 10) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-4 text-right">
                  {breakdown.intent}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
