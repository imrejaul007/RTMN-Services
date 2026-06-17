'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  Edit,
  Trash2,
  MoreHorizontal,
  Briefcase,
  DollarSign,
  MessageSquare,
  Clock,
  User,
  ExternalLink,
  Star,
} from 'lucide-react'

// Mock contact data
const contactData = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@techstart.io',
  phone: '+1 (555) 123-4567',
  company: 'TechStart Inc',
  role: 'VP of Engineering',
  status: 'active',
  avatar: null,
  createdAt: '2026-01-15',
  lastContact: '2026-06-15',
  tags: ['enterprise', 'hot-lead', 'decision-maker'],
  address: {
    street: '123 Innovation Drive',
    city: 'San Francisco',
    state: 'CA',
    zip: '94105',
    country: 'USA',
  },
  social: {
    linkedin: 'https://linkedin.com/in/sarahjohnson',
    twitter: '@sarahjohnson',
  },
  notes: 'Key decision maker for enterprise deal. Prefers detailed technical documentation. Follow up after demo.',
  lifetimeValue: 125000,
  openDeals: 2,
  closedWon: 1,
}

const activities = [
  {
    id: 1,
    type: 'email',
    title: 'Email sent: Proposal Follow-up',
    date: '2026-06-15T14:30:00',
    description: 'Sent follow-up email regarding enterprise proposal',
  },
  {
    id: 2,
    type: 'call',
    title: 'Phone call: Discovery',
    date: '2026-06-12T10:00:00',
    description: '45-minute discovery call about their needs',
  },
  {
    id: 3,
    type: 'meeting',
    title: 'Meeting: Product Demo',
    date: '2026-06-10T15:00:00',
    description: 'Full product demonstration for technical team',
  },
  {
    id: 4,
    type: 'deal',
    title: 'Deal created: Enterprise License',
    date: '2026-06-08T09:00:00',
    description: 'New deal worth $85,000 created',
  },
  {
    id: 5,
    type: 'email',
    title: 'Email received: Interest confirmed',
    date: '2026-06-05T11:20:00',
    description: 'Sarah confirmed interest in enterprise tier',
  },
]

const deals = [
  {
    id: 'd1',
    title: 'Enterprise License',
    value: 85000,
    stage: 'proposal',
    probability: 60,
    expectedClose: '2026-06-30',
  },
  {
    id: 'd2',
    title: 'Support Contract',
    value: 15000,
    stage: 'negotiation',
    probability: 80,
    expectedClose: '2026-06-25',
  },
]

export default function ContactDetailPage() {
  const [activeTab, setActiveTab] = useState('activity')
  const [isFavorite, setIsFavorite] = useState(false)

  const tabs = [
    { id: 'activity', label: 'Activity', count: activities.length },
    { id: 'deals', label: 'Deals', count: deals.length },
    { id: 'files', label: 'Files', count: 0 },
    { id: 'notes', label: 'Notes', count: 0 },
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email':
        return Mail
      case 'call':
        return Phone
      case 'meeting':
        return Calendar
      case 'deal':
        return Briefcase
      default:
        return MessageSquare
    }
  }

  return (
    <div className="p-8">
      {/* Back Button */}
      <Link
        href="/contacts"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Contacts
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-crm-100 flex items-center justify-center">
              <User className="w-8 h-8 text-crm-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{contactData.name}</h1>
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`p-1 ${isFavorite ? 'text-yellow-500' : 'text-gray-300'}`}
                >
                  <Star className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>
              <p className="text-gray-500 mt-1">
                {contactData.role} at {contactData.company}
              </p>
              <div className="flex items-center gap-2 mt-3">
                {contactData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 bg-crm-50 text-crm-700 text-xs font-medium rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-100">
          <button className="flex items-center gap-2 px-4 py-2 bg-crm-600 text-white rounded-lg text-sm font-medium hover:bg-crm-700">
            <Mail className="w-4 h-4" />
            Send Email
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
            <Phone className="w-4 h-4" />
            Call
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
            <Calendar className="w-4 h-4" />
            Schedule Meeting
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <a href={`mailto:${contactData.email}`} className="text-sm text-crm-600 hover:text-crm-700">
                    {contactData.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <a href={`tel:${contactData.phone}`} className="text-sm text-gray-900">
                    {contactData.phone}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Company</p>
                  <p className="text-sm text-gray-900">{contactData.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ExternalLink className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">LinkedIn</p>
                  <a href={contactData.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-crm-600 hover:text-crm-700">
                    Profile
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Lifetime Value</span>
                </div>
                <span className="font-semibold text-gray-900">
                  ${contactData.lifetimeValue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm">Open Deals</span>
                </div>
                <span className="font-semibold text-gray-900">{contactData.openDeals}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Last Contact</span>
                </div>
                <span className="font-semibold text-gray-900">{contactData.lastContact}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
              <button className="text-sm text-crm-600 hover:text-crm-700">Edit</button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{contactData.notes}</p>
          </div>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Tabs */}
            <div className="border-b border-gray-100">
              <div className="flex gap-6 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-crm-600 text-crm-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const Icon = getActivityIcon(activity.type)
                    return (
                      <div
                        key={activity.id}
                        className="flex gap-4 p-4 rounded-lg border border-gray-100 hover:border-crm-100 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-crm-50 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-crm-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">{activity.title}</p>
                            <span className="text-xs text-gray-500">
                              {new Date(activity.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {activeTab === 'deals' && (
                <div className="space-y-4">
                  {deals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="block p-4 rounded-lg border border-gray-100 hover:border-crm-200 hover:bg-crm-50/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{deal.title}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Expected close: {deal.expectedClose}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            ${deal.value.toLocaleString()}
                          </p>
                          <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                            {deal.probability}% probability
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {activeTab === 'files' && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No files uploaded yet</p>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Add notes about this contact</p>
                  <button className="mt-4 px-4 py-2 bg-crm-600 text-white rounded-lg text-sm font-medium hover:bg-crm-700">
                    Add Note
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
