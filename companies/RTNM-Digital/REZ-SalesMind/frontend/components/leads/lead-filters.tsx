'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Filter, X } from 'lucide-react'

interface LeadFiltersProps {
  filters: {
    status: string
    source: string
    minScore: number
  }
  onFiltersChange: (filters: any) => void
}

export function LeadFilters({ filters, onFiltersChange }: LeadFiltersProps) {
  const statuses = [
    { value: '', label: 'All Statuses' },
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'negotiation', label: 'Negotiation' },
    { value: 'closed_won', label: 'Closed Won' },
    { value: 'closed_lost', label: 'Closed Lost' },
  ]

  const sources = [
    { value: '', label: 'All Sources' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'referral', label: 'Referral' },
    { value: 'website', label: 'Website' },
    { value: 'cold_outreach', label: 'Cold Outreach' },
  ]

  const hasFilters = filters.status || filters.source || filters.minScore > 0

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filters:</span>
      </div>

      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {statuses.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <select
        value={filters.source}
        onChange={(e) => onFiltersChange({ ...filters, source: e.target.value })}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {sources.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Min Score:</span>
        <input
          type="number"
          min="0"
          max="100"
          value={filters.minScore}
          onChange={(e) => onFiltersChange({ ...filters, minScore: parseInt(e.target.value) || 0 })}
          className="h-10 w-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange({ status: '', source: '', minScore: 0 })}
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
