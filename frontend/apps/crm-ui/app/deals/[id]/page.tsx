'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  Users,
  Target,
  Clock,
  Edit,
  Trash2,
  MoreHorizontal,
  MessageSquare,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react'

// Mock deal data
const dealData = {
  id: '1',
  title: 'Enterprise License - Acme Corp',
  value: 85000,
  stage: 'proposal',
  probability: 60,
  expectedClose: '2026-06-30',
  createdAt: '2026-06-01',
  daysInStage: 5,
  contact: {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techstart.io',
    phone: '+1 (555) 123-4567',
    role: 'VP of Engineering',
  },
  company: {
    id: 'c1',
    name: 'TechStart Inc',
    address: '123 Innovation Drive, San Francisco, CA',
    industry: 'Technology',
    size: '50-200 employees',
  },
  description: 'Enterprise license deal for TechStart Inc. Includes all modules, priority support, and dedicated account manager.',
  nextSteps: 'Send revised proposal with volume discount',
  lossReason: null,
  tags: ['enterprise', 'hot-lead'],
}

const activities = [
  {
    id: 1,
    type: 'stage_change',
    title: 'Stage changed to Proposal',
    date: '2026-06-10T14:30:00',
    user: 'John Smith',
  },
  {
    id: 2,
    type: 'email',
    title: 'Proposal email sent',
    date: '2026-06-10T14:35:00',
    user: 'John Smith',
  },
  {
    id: 3,
    type: 'call',
    title: 'Discovery call completed',
    date: '2026-06-05T10:00:00',
    user: 'John Smith',
    notes: 'Sarah confirmed budget approval and timeline. Moving to proposal stage.',
  },
  {
    id: 4,
    type: 'meeting',
    title: 'Initial meeting',
    date: '2026-06-01T15:00:00',
    user: 'John Smith',
  },
]

const stages = [
  { id: 'discovery', name: 'Discovery', color: 'bg-gray-400' },
  { id: 'qualification', name: 'Qualification', color: 'bg-blue-400' },
  { id: 'proposal', name: 'Proposal', color: 'bg-purple-400' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-amber-400' },
  { id: 'closed_won', name: 'Closed Won', color: 'bg-green-400' },
  { id: 'closed_lost', name: 'Closed Lost', color: 'bg-red-400' },
]

export default function DealDetailPage() {
  const [activeTab, setActiveTab] = useState('activity')
  const [currentStage, setCurrentStage] = useState(dealData.stage)

  const tabs = [
    { id: 'activity', label: 'Activity', count: activities.length },
    { id: 'files', label: 'Files', count: 2 },
    { id: 'contacts', label: 'Contacts', count: 1 },
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email':
        return Mail
      case 'call':
        return Phone
      case 'meeting':
        return Calendar
      case 'stage_change':
        return ArrowUpRight
      default:
        return MessageSquare
    }
  }

  const getStageIndex = (stage: string) => stages.findIndex((s) => s.id === stage)

  return (
    <div className="p-8">
      {/* Back Button */}
      <Link
        href="/deals"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Deals
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{dealData.title}</h1>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full capitalize">
                {dealData.stage.replace('_', ' ')}
              </span>
            </div>
            <Link
              href={`/contacts/${dealData.contact.id}`}
              className="text-gray-500 hover:text-crm-600 mt-1 inline-flex items-center gap-1"
            >
              {dealData.contact.name} at {dealData.company.name}
              <ChevronRight className="w-3 h-3" />
            </Link>
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

        {/* Value and Stats */}
        <div className="grid grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-500">Deal Value</p>
            <p className="text-2xl font-bold text-gray-900">
              ${dealData.value.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Probability</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${dealData.probability}%` }}
                />
              </div>
              <span className="text-sm font-medium">{dealData.probability}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Expected Close</p>
            <p className="text-lg font-semibold text-gray-900">{dealData.expectedClose}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Days in Stage</p>
            <p className="text-lg font-semibold text-gray-900">{dealData.daysInStage} days</p>
          </div>
        </div>

        {/* Stage Progress */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 mb-4">Stage Progress</p>
          <div className="flex items-center gap-2">
            {stages.slice(0, -2).map((stage, index) => {
              const stageIndex = getStageIndex(currentStage)
              const isActive = index === stageIndex
              const isPast = index < stageIndex
              return (
                <div key={stage.id} className="flex items-center flex-1">
                  <div
                    className={`w-4 h-4 rounded-full ${stage.color} ${
                      isPast ? 'opacity-100' : isActive ? 'ring-4 ring-offset-2 ring-blue-200' : 'opacity-40'
                    }`}
                  />
                  {index < stages.slice(0, -2).length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        isPast ? 'bg-gray-400' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
            <select
              value={currentStage}
              onChange={(e) => setCurrentStage(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-500"
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Next Steps</p>
              <p className="text-gray-900 mt-1">{dealData.nextSteps}</p>
            </div>
            <button className="text-sm text-crm-600 hover:text-crm-700">Edit</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 hover:border-crm-200 hover:bg-crm-50 transition-colors">
                <Mail className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Send Email</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 hover:border-crm-200 hover:bg-crm-50 transition-colors">
                <Phone className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Log Call</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 hover:border-crm-200 hover:bg-crm-50 transition-colors">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Schedule Meeting</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 hover:border-crm-200 hover:bg-crm-50 transition-colors">
                <FileText className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Add Note</span>
              </button>
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Company</h2>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-900">{dealData.company.name}</p>
                <p className="text-sm text-gray-500 mt-1">{dealData.company.address}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                  {dealData.company.industry}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                  {dealData.company.size}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Contact</h2>
            <Link
              href={`/contacts/${dealData.contact.id}`}
              className="block hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
            >
              <p className="font-medium text-gray-900">{dealData.contact.name}</p>
              <p className="text-sm text-gray-500">{dealData.contact.role}</p>
              <p className="text-sm text-crm-600 mt-1">{dealData.contact.email}</p>
              <p className="text-sm text-gray-500">{dealData.contact.phone}</p>
            </Link>
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
                              {new Date(activity.date).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">by {activity.user}</p>
                          {activity.notes && (
                            <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                              {activity.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {activeTab === 'files' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-crm-200">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Enterprise_Proposal_v2.pdf</p>
                        <p className="text-xs text-gray-500">Uploaded 2 days ago</p>
                      </div>
                    </div>
                    <button className="text-sm text-crm-600 hover:text-crm-700">Download</button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-crm-200">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Pricing_Sheet.xlsx</p>
                        <p className="text-xs text-gray-500">Uploaded 1 week ago</p>
                      </div>
                    </div>
                    <button className="text-sm text-crm-600 hover:text-crm-700">Download</button>
                  </div>
                </div>
              )}

              {activeTab === 'contacts' && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Contact management for this deal</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
