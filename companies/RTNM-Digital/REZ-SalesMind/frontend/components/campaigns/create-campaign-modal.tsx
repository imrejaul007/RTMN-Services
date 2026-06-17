'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Mail, MessageSquare, Share2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreateCampaignModalProps {
  onClose: () => void
  onCreate: (campaign: any) => void
}

const channelOptions = [
  { id: 'email', name: 'Email', icon: Mail, description: 'Send personalized emails' },
  { id: 'sms', name: 'SMS', icon: MessageSquare, description: 'Text messages' },
  { id: 'whatsapp', name: 'WhatsApp', icon: Share2, description: 'WhatsApp messages' },
  { id: 'linkedin', name: 'LinkedIn', icon: Share2, description: 'LinkedIn outreach' },
]

export function CreateCampaignModal({ onClose, onCreate }: CreateCampaignModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'email',
    channels: ['email'],
    scheduledStart: '',
    scheduledEnd: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    onCreate({
      ...formData,
      status: formData.scheduledStart ? 'scheduled' : 'draft',
      stats: { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0 }
    })
    setLoading(false)
  }

  const toggleChannel = (channelId: string) => {
    const newChannels = formData.channels.includes(channelId)
      ? formData.channels.filter(c => c !== channelId)
      : [...formData.channels, channelId]
    setFormData({ ...formData, channels: newChannels.length > 0 ? newChannels : ['email'] })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Create Campaign</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Q3 Enterprise Outreach"
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Channels *</Label>
            <div className="grid grid-cols-2 gap-3">
              {channelOptions.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => toggleChannel(channel.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                    formData.channels.includes(channel.id)
                      ? "border-primary bg-primary/5"
                      : "border-input hover:bg-accent"
                  )}
                >
                  <channel.icon className={cn(
                    "h-5 w-5",
                    formData.channels.includes(channel.id) ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div>
                    <p className="font-medium text-sm">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">{channel.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Start Date</Label>
              <Input
                id="start"
                type="date"
                value={formData.scheduledStart}
                onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Date</Label>
              <Input
                id="end"
                type="date"
                value={formData.scheduledEnd}
                onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Campaign'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
