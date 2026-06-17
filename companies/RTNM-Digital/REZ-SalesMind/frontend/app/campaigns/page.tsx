'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CampaignCard } from '@/components/campaigns/campaign-card'
import { CreateCampaignModal } from '@/components/campaigns/create-campaign-modal'
import { CampaignAnalytics } from '@/components/campaigns/campaign-analytics'
import {
  Plus,
  Mail,
  MessageSquare,
  Share2,
  Filter,
  TrendingUp,
  Pause,
  Play,
  MoreVertical
} from 'lucide-react'

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

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setTimeout(() => {
      setCampaigns([
        {
          id: '1',
          name: 'Q2 Enterprise Outreach',
          type: 'multi-channel',
          status: 'running',
          channels: ['email', 'sms'],
          stats: { total: 1500, sent: 1450, delivered: 1410, opened: 635, clicked: 159, replied: 95, converted: 19 },
          scheduledStart: '2026-06-01',
          scheduledEnd: '2026-06-30'
        },
        {
          id: '2',
          name: 'SMB Product Launch',
          type: 'email',
          status: 'scheduled',
          channels: ['email'],
          stats: { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0 },
          scheduledStart: '2026-06-20',
          scheduledEnd: '2026-07-20'
        },
        {
          id: '3',
          name: 'WhatsApp Follow-up Series',
          type: 'whatsapp',
          status: 'paused',
          channels: ['whatsapp'],
          stats: { total: 300, sent: 180, delivered: 175, opened: 170, clicked: 45, replied: 38, converted: 8 },
        },
        {
          id: '4',
          name: 'LinkedIn Engagement',
          type: 'multi-channel',
          status: 'completed',
          channels: ['email', 'linkedin'],
          stats: { total: 500, sent: 500, delivered: 485, opened: 220, clicked: 65, replied: 42, converted: 12 },
        },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const filteredCampaigns = campaigns.filter(c => {
    if (filter === 'all') return true
    return c.status === filter
  })

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />
      case 'sms': return <MessageSquare className="h-4 w-4" />
      case 'whatsapp': return <Share2 className="h-4 w-4" />
      case 'linkedin': return <Share2 className="h-4 w-4" />
      default: return null
    }
  }

  const handleStatusChange = (campaignId: string, newStatus: 'paused' | 'running') => {
    setCampaigns(campaigns.map(c =>
      c.id === campaignId ? { ...c, status: newStatus } : c
    ))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Management</h1>
          <p className="text-muted-foreground">
            Create and manage multi-channel outreach campaigns
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Active Campaigns</div>
          <div className="text-2xl font-bold mt-1">{campaigns.filter(c => c.status === 'running').length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total Sent</div>
          <div className="text-2xl font-bold mt-1">
            {campaigns.reduce((sum, c) => sum + c.stats.sent, 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Avg. Open Rate</div>
          <div className="text-2xl font-bold mt-1">42.3%</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Conversions</div>
          <div className="text-2xl font-bold mt-1">
            {campaigns.reduce((sum, c) => sum + c.stats.converted, 0)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'running' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('running')}
        >
          Running
        </Button>
        <Button
          variant={filter === 'paused' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('paused')}
        >
          Paused
        </Button>
        <Button
          variant={filter === 'scheduled' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('scheduled')}
        >
          Scheduled
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Completed
        </Button>
      </div>

      {/* Campaign List */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredCampaigns.map(campaign => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onSelect={() => setSelectedCampaign(campaign)}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {/* Campaign Analytics Modal */}
      {selectedCampaign && (
        <CampaignAnalytics
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(newCampaign) => {
            setCampaigns([...campaigns, { ...newCampaign, id: String(campaigns.length + 1) }])
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}
