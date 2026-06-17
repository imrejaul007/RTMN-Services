'use client'

import Link from 'next/link'
import {
  DollarSign,
  Calendar,
  Users,
  MoreHorizontal,
  ChevronRight,
  Clock,
} from 'lucide-react'
import clsx from 'clsx'

interface Deal {
  id: string
  title: string
  value: number
  contact: string
  company: string
  stage: string
  probability: number
  expectedClose: string
  daysInStage: number
}

interface DealCardProps {
  deal: Deal
  compact?: boolean
}

const stageColors: Record<string, string> = {
  discovery: 'bg-gray-400',
  qualification: 'bg-blue-400',
  proposal: 'bg-purple-400',
  negotiation: 'bg-amber-400',
  closed_won: 'bg-green-400',
  closed_lost: 'bg-red-400',
}

export default function DealCard({ deal, compact = false }: DealCardProps) {
  if (compact) {
    return (
      <Link
        href={`/deals/${deal.id}`}
        className="block bg-white rounded-lg p-4 border border-gray-100 hover:border-crm-200 hover:shadow-sm transition-all"
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-gray-900 text-sm line-clamp-1">{deal.title}</h4>
          <span className="text-sm font-semibold text-gray-900 ml-2">
            ${deal.value.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{deal.company}</span>
          <span className="text-xs text-gray-400">{deal.daysInStage}d</span>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/deals/${deal.id}`}
      className="block bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-crm-200 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={clsx('w-2.5 h-2.5 rounded-full', stageColors[deal.stage])} />
          <span className="text-xs text-gray-500 uppercase tracking-wider capitalize">
            {deal.stage.replace('_', ' ')}
          </span>
        </div>
        <button className="p-1 hover:bg-gray-100 rounded">
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Title and Company */}
      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{deal.title}</h3>
      <p className="text-sm text-gray-500 mb-4">{deal.company}</p>

      {/* Value and Probability */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            ${deal.value.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">Deal value</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-700">{deal.probability}%</span>
            <span className="text-xs text-gray-400">probability</span>
          </div>
        </div>
      </div>

      {/* Probability Bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className={clsx('h-full rounded-full', stageColors[deal.stage])}
          style={{ width: `${deal.probability}%` }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Users className="w-3 h-3" />
          <span>{deal.contact}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{deal.daysInStage}d in stage</span>
        </div>
      </div>

      {/* Expected Close */}
      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
        <Calendar className="w-3 h-3" />
        <span>Expected: {deal.expectedClose}</span>
      </div>
    </Link>
  )
}
