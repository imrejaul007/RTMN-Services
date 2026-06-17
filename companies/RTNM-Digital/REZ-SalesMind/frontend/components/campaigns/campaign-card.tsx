'use client'

import { Button } from '@/components/ui/button'
import { Mail, MessageSquare, Share2, Play, Pause, MoreVertical, TrendingUp, Users, ArrowUpRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Campaign {
  id: string
  name: string
  type: 'email' | 'sms' | 'whatsapp' | 'multi-channel'
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed'
  channels: string[]
  stats: {
    total: number
    sent: number
    delivered: number
    opened: number
    clicked: number
    replied: number
    converted: number
  }
  scheduledStart?: string
  scheduledEnd?: string
}

interface CampaignCardProps {
  campaign: Campaign
  onSelect: () => void
  onStatusChange: (id: string, status: 'paused' | 'running') => void
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  running: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
}

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  whatsapp: <Share2 className="h-4 w-4" />,
  linkedin: <Share2 className="h-4 w-4" />,
}

export function CampaignCard({ campaign, onSelect, onStatusChange }: CampaignCardProps) {
  const openRate = campaign.stats.delivered > 0
    ? Math.round((campaign.stats.opened / campaign.stats.delivered) * 100)
    : 0

  const clickRate = campaign.stats.opened > 0
    ? Math.round((campaign.stats.clicked / campaign.stats.opened) * 100)
    : 0

  return (
    <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{campaign.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[campaign.status]}`}>
              {campaign.status}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {campaign.channels.map((ch) => (
                <span key={ch} className="flex items-center">
                  {channelIcons[ch]}
                </span>
              ))}
            </div>
            <span>•</span>
            <span>{campaign.stats.total > 0 ? `${campaign.stats.total} recipients` : 'Scheduled'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {campaign.status === 'running' && (
            <Button variant="ghost" size="icon" onClick={() => onStatusChange(campaign.id, 'paused')}>
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {campaign.status === 'paused' && (
            <Button variant="ghost" size="icon" onClick={() => onStatusChange(campaign.id, 'running')}>
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onSelect}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {campaign.stats.total > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{campaign.stats.sent.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{openRate}%</p>
              <p className="text-xs text-muted-foreground">Open Rate</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Delivery Progress</span>
              <span>{Math.round((campaign.stats.delivered / campaign.stats.total) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${(campaign.stats.delivered / campaign.stats.total) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 border-t">
            <div className="text-center">
              <p className="font-semibold text-sm">{campaign.stats.opened}</p>
              <p className="text-xs text-muted-foreground">Opened</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">{campaign.stats.clicked}</p>
              <p className="text-xs text-muted-foreground">Clicked</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">{campaign.stats.replied}</p>
              <p className="text-xs text-muted-foreground">Replied</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm text-green-600">{campaign.stats.converted}</p>
              <p className="text-xs text-muted-foreground">Converted</p>
            </div>
          </div>
        </div>
      )}

      {campaign.scheduledStart && (
        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          <p>Scheduled: {formatDate(campaign.scheduledStart)} - {formatDate(campaign.scheduledEnd || '')}</p>
        </div>
      )}
    </div>
  )
}
