'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, GripVertical, MoreHorizontal, DollarSign, Calendar, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const stages = [
  {
    id: 'discovery',
    name: 'Discovery',
    color: 'bg-gray-400',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  {
    id: 'qualification',
    name: 'Qualification',
    color: 'bg-blue-400',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'proposal',
    name: 'Proposal',
    color: 'bg-purple-400',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    id: 'negotiation',
    name: 'Negotiation',
    color: 'bg-amber-400',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    id: 'closed_won',
    name: 'Closed Won',
    color: 'bg-green-400',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
]

const deals = [
  {
    id: '1',
    title: 'Enterprise License - Acme Corp',
    value: 85000,
    contact: 'Sarah Johnson',
    company: 'TechStart Inc',
    stage: 'proposal',
    probability: 60,
    expectedClose: '2026-06-30',
    daysInStage: 5,
  },
  {
    id: '2',
    title: 'Annual Subscription - Global Retail',
    value: 120000,
    contact: 'Emily Davis',
    company: 'Global Retail Corp',
    stage: 'negotiation',
    probability: 80,
    expectedClose: '2026-06-25',
    daysInStage: 8,
  },
  {
    id: '3',
    title: 'Starter Package - StartupXYZ',
    value: 15000,
    contact: 'James Wilson',
    company: 'StartupXYZ',
    stage: 'qualification',
    probability: 30,
    expectedClose: '2026-07-15',
    daysInStage: 3,
  },
  {
    id: '4',
    title: 'Pro Plan - TechInnovate',
    value: 45000,
    contact: 'David Kim',
    company: 'TechInnovate',
    stage: 'discovery',
    probability: 20,
    expectedClose: '2026-08-01',
    daysInStage: 12,
  },
  {
    id: '5',
    title: 'Enterprise Suite - Enterprise Solutions',
    value: 200000,
    contact: 'Michael Chen',
    company: 'Enterprise Solutions',
    stage: 'closed_won',
    probability: 100,
    expectedClose: '2026-06-10',
    daysInStage: 0,
  },
  {
    id: '6',
    title: 'Professional Services',
    value: 35000,
    contact: 'Lisa Thompson',
    company: 'StartupIO',
    stage: 'proposal',
    probability: 50,
    expectedClose: '2026-07-01',
    daysInStage: 4,
  },
  {
    id: '7',
    title: 'Support Contract Renewal',
    value: 18000,
    contact: 'David Kim',
    company: 'TechInnovate',
    stage: 'negotiation',
    probability: 85,
    expectedClose: '2026-06-20',
    daysInStage: 6,
  },
  {
    id: '8',
    title: 'Basic Plan - NewClient',
    value: 8000,
    contact: 'Robert Martinez',
    company: 'InnovateTech',
    stage: 'discovery',
    probability: 15,
    expectedClose: '2026-08-15',
    daysInStage: 2,
  },
]

export default function Pipeline() {
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  const getDealsByStage = (stageId: string) =>
    deals.filter((deal) => deal.stage === stageId)

  const getStageStats = (stageId: string) => {
    const stageDeals = getDealsByStage(stageId)
    const value = stageDeals.reduce((sum, deal) => sum + deal.value, 0)
    return { count: stageDeals.length, value }
  }

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDeal(dealId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    setDragOverStage(stageId)
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    if (draggedDeal) {
      // In a real app, this would update the deal's stage via API
      console.log(`Moved deal ${draggedDeal} to stage ${stageId}`)
    }
    setDraggedDeal(null)
    setDragOverStage(null)
  }

  const handleDragEnd = () => {
    setDraggedDeal(null)
    setDragOverStage(null)
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-max">
        {stages.map((stage) => {
          const stats = getStageStats(stage.id)
          const stageDeals = getDealsByStage(stage.id)
          const isDragOver = dragOverStage === stage.id

          return (
            <div
              key={stage.id}
              className={clsx(
                'w-72 rounded-xl border-2 transition-colors',
                isDragOver ? stage.borderColor : 'border-transparent'
              )}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Stage Header */}
              <div className={clsx('p-3 rounded-t-xl', stage.bgColor)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={clsx('w-2.5 h-2.5 rounded-full', stage.color)} />
                    <h3 className="font-semibold text-gray-900 text-sm">{stage.name}</h3>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {stats.count}
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  ${(stats.value / 1000).toFixed(0)}K
                </p>
              </div>

              {/* Deals Container */}
              <div className="bg-gray-50 rounded-b-xl p-2 min-h-[400px] space-y-2">
                {stageDeals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className={clsx(
                      'block bg-white rounded-lg p-3 border border-gray-100 hover:border-crm-200 hover:shadow-md transition-all cursor-grab',
                      draggedDeal === deal.id && 'opacity-50'
                    )}
                    draggable
                    onDragStart={(e) => handleDragStart(e, deal.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-1 text-gray-400">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">{deal.daysInStage}d</span>
                        <button className="p-0.5 hover:bg-gray-100 rounded">
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                      {deal.title}
                    </h4>
                    <p className="text-xs text-gray-500 mb-2">{deal.company}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        ${deal.value.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {deal.probability}%
                      </span>
                    </div>
                    <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full', stage.color)}
                        style={{ width: `${deal.probability}%` }}
                      />
                    </div>
                  </Link>
                ))}

                {stageDeals.length === 0 && (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-400">No deals</p>
                  </div>
                )}

                {/* Add Deal Button */}
                <button className="w-full flex items-center justify-center gap-1 p-2 text-sm text-gray-500 hover:text-crm-600 hover:bg-white rounded-lg border border-dashed border-gray-200 hover:border-crm-200 transition-colors">
                  <Plus className="w-4 h-4" />
                  Add Deal
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
