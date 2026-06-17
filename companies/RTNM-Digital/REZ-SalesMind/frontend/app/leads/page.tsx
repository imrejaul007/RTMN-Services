'use client'

import { useState, useEffect } from 'react'
import { LeadList } from '@/components/leads/lead-list'
import { LeadFilters } from '@/components/leads/lead-filters'
import { AddLeadModal } from '@/components/leads/add-lead-modal'
import { Button } from '@/components/ui/button'
import { Plus, Download, Upload, Filter } from 'lucide-react'

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    source: '',
    minScore: 0
  })

  useEffect(() => {
    // Mock leads data
    setTimeout(() => {
      setLeads([
        { id: '1', name: 'John Smith', email: 'john@techcorp.com', company: 'TechCorp Inc', title: 'VP of Sales', status: 'qualified', score: 85, source: 'linkedin', lastActivity: '2026-06-15' },
        { id: '2', name: 'Sarah Johnson', email: 'sarah@startupxyz.com', company: 'StartupXYZ', title: 'CEO', status: 'contacted', score: 72, source: 'referral', lastActivity: '2026-06-14' },
        { id: '3', name: 'Mike Chen', email: 'mike@enterprise.io', company: 'Enterprise.io', title: 'Director of Operations', status: 'new', score: 65, source: 'website', lastActivity: '2026-06-13' },
        { id: '4', name: 'Emily Davis', email: 'emily@retailplus.com', company: 'RetailPlus', title: 'Head of Growth', status: 'proposal', score: 91, source: 'linkedin', lastActivity: '2026-06-15' },
        { id: '5', name: 'Robert Wilson', email: 'robert@manufacturing.co', company: 'Manufacturing Co', title: 'Sales Manager', status: 'negotiation', score: 78, source: 'cold_outreach', lastActivity: '2026-06-12' },
        { id: '6', name: 'Lisa Anderson', email: 'lisa@healthtech.com', company: 'HealthTech Solutions', title: 'CTO', status: 'qualified', score: 88, source: 'referral', lastActivity: '2026-06-14' },
        { id: '7', name: 'David Brown', email: 'david@fintech.io', company: 'FinTech.io', title: 'VP Engineering', status: 'contacted', score: 62, source: 'linkedin', lastActivity: '2026-06-11' },
        { id: '8', name: 'Jennifer Lee', email: 'jennifer@edustart.com', company: 'EduStart', title: 'Founder', status: 'new', score: 55, source: 'website', lastActivity: '2026-06-10' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const filteredLeads = leads.filter(lead => {
    if (filters.status && lead.status !== filters.status) return false
    if (filters.source && lead.source !== filters.source) return false
    if (filters.minScore && lead.score < filters.minScore) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-muted-foreground">
            Manage and track all your sales leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      <LeadFilters filters={filters} onFiltersChange={setFilters} />

      <div className="rounded-lg border bg-card">
        <LeadList
          leads={filteredLeads}
          loading={loading}
          onLeadUpdate={(updatedLead) => {
            setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l))
          }}
        />
      </div>

      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onAdd={(newLead) => {
            setLeads([...leads, { ...newLead, id: String(leads.length + 1) }])
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}
