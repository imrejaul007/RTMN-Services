'use client'

import { Button } from '@/components/ui/button'
import { X, TrendingUp, TrendingDown, Mail, Users, ArrowUpRight } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { formatDate } from '@/lib/utils'

interface CampaignAnalyticsProps {
  campaign: any
  onClose: () => void
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

export function CampaignAnalytics({ campaign, onClose }: CampaignAnalyticsProps) {
  const channelData = campaign.channels.map((ch: string, i: number) => ({
    name: ch,
    value: Math.floor(campaign.stats.sent / campaign.channels.length),
    color: COLORS[i % COLORS.length]
  }))

  const funnelData = [
    { stage: 'Sent', count: campaign.stats.sent },
    { stage: 'Delivered', count: campaign.stats.delivered },
    { stage: 'Opened', count: campaign.stats.opened },
    { stage: 'Clicked', count: campaign.stats.clicked },
    { stage: 'Converted', count: campaign.stats.converted },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">{campaign.name}</h2>
            <p className="text-sm text-muted-foreground">Campaign Analytics</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Key Metrics */}
          <div className="space-y-4">
            <h3 className="font-semibold">Key Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border">
                <p className="text-3xl font-bold">{campaign.stats.sent.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-3xl font-bold">
                  {campaign.stats.delivered > 0
                    ? Math.round((campaign.stats.delivered / campaign.stats.sent) * 100)
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold">
                    {campaign.stats.delivered > 0
                      ? Math.round((campaign.stats.opened / campaign.stats.delivered) * 100)
                      : 0}%
                  </p>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold">{campaign.stats.converted}</p>
                  <ArrowUpRight className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">Conversions</p>
              </div>
            </div>
          </div>

          {/* Channel Breakdown */}
          <div className="space-y-4">
            <h3 className="font-semibold">Channel Breakdown</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {channelData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4">
              {channelData.map((entry: any) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm capitalize">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Funnel */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-semibold">Conversion Funnel</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}
