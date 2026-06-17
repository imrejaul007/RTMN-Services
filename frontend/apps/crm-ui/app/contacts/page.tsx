'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  ChevronRight,
  User,
} from 'lucide-react'
import ContactCard from '@/components/ContactCard'

const contacts = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techstart.io',
    phone: '+1 (555) 123-4567',
    company: 'TechStart Inc',
    role: 'VP of Engineering',
    avatar: null,
    status: 'active',
    lastContact: '2026-06-15',
    deals: 3,
    totalValue: 125000,
    tags: ['enterprise', 'hot-lead'],
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'mchen@enterprise.co',
    phone: '+1 (555) 234-5678',
    company: 'Enterprise Solutions',
    role: 'CTO',
    avatar: null,
    status: 'active',
    lastContact: '2026-06-14',
    deals: 2,
    totalValue: 89000,
    tags: ['decision-maker'],
  },
  {
    id: '3',
    name: 'Emily Davis',
    email: 'emily.d@globalretail.com',
    phone: '+1 (555) 345-6789',
    company: 'Global Retail Corp',
    role: 'Director of Operations',
    avatar: null,
    status: 'active',
    lastContact: '2026-06-13',
    deals: 4,
    totalValue: 210000,
    tags: ['enterprise', 'priority'],
  },
  {
    id: '4',
    name: 'James Wilson',
    email: 'jwilson@startupxyz.com',
    phone: '+1 (555) 456-7890',
    company: 'StartupXYZ',
    role: 'Founder & CEO',
    avatar: null,
    status: 'inactive',
    lastContact: '2026-06-01',
    deals: 1,
    totalValue: 15000,
    tags: ['startup'],
  },
  {
    id: '5',
    name: 'Amanda Rodriguez',
    email: 'arodriguez@consultingpro.com',
    phone: '+1 (555) 567-8901',
    company: 'Consulting Pro',
    role: 'Managing Partner',
    avatar: null,
    status: 'active',
    lastContact: '2026-06-15',
    deals: 2,
    totalValue: 67000,
    tags: ['partner', 'hot-lead'],
  },
  {
    id: '6',
    name: 'David Kim',
    email: 'dkim@techinnovate.io',
    phone: '+1 (555) 678-9012',
    company: 'TechInnovate',
    role: 'Head of Product',
    avatar: null,
    status: 'active',
    lastContact: '2026-06-12',
    deals: 3,
    totalValue: 95000,
    tags: ['product'],
  },
]

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter =
      selectedFilter === 'all' ||
      contact.status === selectedFilter ||
      contact.tags.includes(selectedFilter)
    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 mt-1">
            Manage your contacts and relationships ({contacts.length} total)
          </p>
        </div>
        <button className="px-4 py-2 bg-crm-600 text-white rounded-lg text-sm font-medium hover:bg-crm-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-500"
        >
          <option value="all">All Contacts</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="enterprise">Enterprise</option>
          <option value="hot-lead">Hot Lead</option>
        </select>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm ${
              viewMode === 'grid'
                ? 'bg-crm-50 text-crm-600'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm ${
              viewMode === 'list'
                ? 'bg-crm-50 text-crm-600'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Contacts Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Contact
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-crm-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-crm-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{contact.name}</p>
                        <p className="text-sm text-gray-500">{contact.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{contact.company}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        contact.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">
                      {contact.deals} deals
                    </p>
                    <p className="text-xs text-gray-500">
                      ${contact.totalValue.toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {contact.lastContact}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="text-crm-600 hover:text-crm-700"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredContacts.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No contacts found</h3>
          <p className="text-gray-500 mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  )
}
