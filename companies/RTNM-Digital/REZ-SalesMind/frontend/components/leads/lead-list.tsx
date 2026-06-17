'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Filter, MoreHorizontal, Mail, Phone, Calendar, MessageSquare } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Lead {
  id: string
  name: string
  email: string
  company?: string
  title?: string
  status: string
  score: number
  source: string
  lastActivity: string
}

interface LeadListProps {
  leads: Lead[]
  loading: boolean
  onLeadUpdate?: (lead: Lead) => void
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  contacted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  qualified: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  proposal: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  negotiation: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  closed_won: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  closed_lost: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export function LeadList({ leads, loading, onLeadUpdate }: LeadListProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading leads...
      </div>
    )
  }

  return (
    <div>
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {filteredLeads.length} leads
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Company</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Score</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Source</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Activity</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="border-b hover:bg-accent/50 transition-colors">
                <td className="p-4">
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                  </div>
                </td>
                <td className="p-4">
                  <div>
                    <p className="text-sm">{lead.company || '-'}</p>
                    <p className="text-xs text-muted-foreground">{lead.title || '-'}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[lead.status]}`}>
                    {lead.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${lead.score >= 80 ? 'bg-green-500' : lead.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${lead.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{lead.score}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-sm capitalize">{lead.source.replace('_', ' ')}</span>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {formatDate(lead.lastActivity)}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
