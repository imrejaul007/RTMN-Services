'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, MoreVertical, Mail, Phone, Eye, Trash2 } from 'lucide-react';
import LeadTable from '@/components/lead-table';
import { leadOS } from '@/lib/api';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  useEffect(() => {
    fetchLeads();
  }, [search, filter]);

  async function fetchLeads() {
    setLoading(true);
    try {
      const data = await leadOS.getLeads({ q: search, type: filter !== 'all' ? filter : undefined });
      setLeads(data || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleViewLead = (lead: any) => {
    console.log('View lead:', lead);
  };

  const handleEditLead = (lead: any) => {
    console.log('Edit lead:', lead);
  };

  const handleDeleteLead = async (lead: any) => {
    if (confirm(`Delete ${lead.name}?`)) {
      await leadOS.deleteLead(lead.id);
      fetchLeads();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">Manage and track your leads</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads by name, email, or company..."
              className="input-field pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-field w-auto"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Leads</option>
            <option value="hot">Hot Leads</option>
            <option value="warm">Warm Leads</option>
            <option value="cold">Cold Leads</option>
          </select>
          <button className="btn-secondary">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
          <button className="btn-secondary">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">
            {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button className="text-sm text-blue-700 hover:text-blue-800 font-medium">
              Add to Campaign
            </button>
            <button className="text-sm text-red-600 hover:text-red-700 font-medium">
              Delete Selected
            </button>
            <button
              className="text-sm text-gray-600 hover:text-gray-700 font-medium"
              onClick={() => setSelectedLeads([])}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Lead Table */}
      <LeadTable
        leads={leads}
        loading={loading}
        onView={handleViewLead}
        onEdit={handleEditLead}
        onDelete={handleDeleteLead}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {leads.length} leads
        </p>
        <div className="flex gap-2">
          <button className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50" disabled>
            Previous
          </button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">1</button>
          <button className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-50">2</button>
          <button className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-50">3</button>
          <button className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-50">Next</button>
        </div>
      </div>
    </div>
  );
}
