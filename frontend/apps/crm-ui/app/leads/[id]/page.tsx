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
  User,
  Star,
  ExternalLink,
  MessageSquare,
  FileText,
  Briefcase,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import LeadScore from '@/components/LeadScore'

// Mock lead data
const leadData = {
  id: '1',
  name: 'Michael Brown',
  email: 'mbrown@enterprise.net',
  phone: '+1 (555) 333-4444',
  company: 'EnterpriseNet Global',
  role: 'CTO',
  status: 'qualified',
  source: 'referral',
  score: 94,
  scoreBreakdown: {
    engagement: 35,
    firmographics: 30,
    demographics: 19,
    intent: 10,
  },
  assignedTo: 'John Smith',
  createdAt: '2026-06-01',
  lastActivity: '2026-06-15',
  tags: ['enterprise', 'hot-lead', 'decision-maker'],
  address: {
    street: '456 Corporate Blvd',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    country: 'USA',
  },
  companyInfo: {
    industry: 'Technology',
    size: '500-1000 employees',
    revenue: '$50M-$100M',
    website: 'https://enterprise-net.global',
  },
  social: {
    linkedin: 'https://linkedin.com/in/michaelbrown',
  },
  notes: 'Referred by Acme Corp CEO. High priority - looking for enterprise solution. Budget approved for Q3. Needs to close before end of fiscal year.',
  dealValue: 150000,
  conversionProbability: 75,
}

const activities = [
  {
    id: 1,
    type: 'email',
    title: 'Email sent: Enterprise Solution Overview',
    date: '2026-06-15T10:30:00',
    user: 'John Smith',
  },
  {
    id: 2,
    type: 'call',
    title: 'Discovery call - Budget confirmed',
    date: '2026-06-12T14:00:00',
    user: 'John Smith',
    notes: 'Michael confirmed budget of $150K for enterprise solution. Decision timeline is end of Q3.',
  },
  {
    id: 3,
    type: 'meeting',
    title: 'Intro meeting with CTO',
    date: '2026-06-08T11:00:00',
    user: 'John Smith',
    notes: 'Great intro call. Michael is evaluating multiple vendors. Our differentiator is the AI capabilities.',
  },
  {
    id: 4,
    type: 'email',
    title: 'Referral intro email from Acme Corp',
    date: '2026-06-01T09:00:00',
    user: 'System',
  },
]

const webActivity = [
  {
    page: '/enterprise/pricing',
    timestamp: '2026-06-15T08:45:00',
    duration: '4m 23s',
  },
  {
    page: '/enterprise/features',
    timestamp: '2026-06-15T08:40:00',
    duration: '2m 15s',
  },
  {
    page: '/demo-request',
    timestamp: '2026-06-12T14:30:00',
    duration: '1m 45s',
  },
  {
    page: '/blog/enterprise-automation',
    timestamp: '2026-06-10T16:20:00',
    duration: '5m 30s',
  },
]

const sourceLabels: Record<string, string> = {
  website: 'Website',
  linkedin: 'LinkedIn',
  referral: 'Referral',
  webinar: 'Webinar',
  cold_outreach: 'Cold Outreach',
  event: 'Event',
}

const statusOptions = [
  { value: 'new', label: 'New', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-amber-500' },
  { value: 'qualified', label: 'Qualified', color: 'bg-green-500' },
  { value: 'unqualified', label: 'Unqualified', color: 'bg-gray-500' },
]

export default function LeadDetailPage() {
  const [activeTab, setActiveTab] = useState('activity')
  const [currentStatus, setCurrentStatus] = useState(leadData.status)
  const [isFavorite, setIsFavorite] = useState(true)

  const tabs = [
    { id: 'activity', label: 'Activity', count: activities.length },
    { id: 'web', label: 'Web Activity', count: webActivity.length },
    { id: 'notes', label: 'Notes', count: 0 },
    { id: 'files', label: 'Files', count: 0 },
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email':
        return Mail
      case 'call':
        return Phone
      case 'meeting':
        return Calendar
      default:
        return MessageSquare
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-500'
    if (score >= 60) return 'text-amber-500'
    return 'text-green-500'
  }

  return (
    <div className="p-8">
      {/* Back Button */}
      <Link
        href="/leads"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Leads
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
                <h1 className="text-2xl font-bold text-gray-900">{leadData.name}</h1>
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`p-1 ${isFavorite ? 'text-yellow-500' : 'text-gray-300'}`}
                >
                  <Star className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>
              <p className="text-gray-500 mt-1">
                {leadData.role} at {leadData.company}
              </p>
              <div className="flex items-center gap-2 mt-3">
                {leadData.tags.map((tag) => (
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
            <select
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Lead Score Section */}
        <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-500 mb-2">Lead Score</p>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke={leadData.score >= 80 ? '#ef4444' : leadData.score >= 60 ? '#f59e0b' : '#22c55e'}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(leadData.score / 100) * 226} 226`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${getScoreColor(leadData.score)}`}>
                  {leadData.score}
                </span>
              </div>
              <div className="flex-1">
                <LeadScore score={leadData.score} breakdown={leadData.scoreBreakdown} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Source</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">
              {sourceLabels[leadData.source]}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Created {leadData.createdAt}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Assigned To</p>
            <p className="text-lg font-semibold text-gray-900">{leadData.assignedTo}</p>
            <p className="text-sm text-gray-500 mt-1">
              Last activity: {leadData.lastActivity}
            </p>
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
          <button className="flex items-center gap-2 px-4 py-2 border border-crm-200 bg-crm-50 text-crm-700 rounded-lg text-sm font-medium hover:bg-crm-100">
            <Briefcase className="w-4 h-4" />
            Create Deal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <a href={`mailto:${leadData.email}`} className="text-sm text-crm-600 hover:text-crm-700">
                    {leadData.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <a href={`tel:${leadData.phone}`} className="text-sm text-gray-900">
                    {leadData.phone}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Company</p>
                  <p className="text-sm text-gray-900">{leadData.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ExternalLink className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">LinkedIn</p>
                  <a href={leadData.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-crm-600 hover:text-crm-700">
                    Profile
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Info</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Industry</span>
                <span className="text-sm font-medium text-gray-900">
                  {leadData.companyInfo.industry}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Size</span>
                <span className="text-sm font-medium text-gray-900">
                  {leadData.companyInfo.size}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Revenue</span>
                <span className="text-sm font-medium text-gray-900">
                  {leadData.companyInfo.revenue}
                </span>
              </div>
            </div>
          </div>

          {/* Potential Value */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Potential Value</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Est. Deal Value</span>
                <span className="text-lg font-bold text-gray-900">
                  ${leadData.dealValue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Conversion Prob.</span>
                <span className="text-sm font-medium text-green-600">
                  {leadData.conversionProbability}%
                </span>
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Expected Value</span>
                  <span className="font-semibold text-gray-900">
                    ${((leadData.dealValue * leadData.conversionProbability) / 100).toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${leadData.conversionProbability}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
              <button className="text-sm text-crm-600 hover:text-crm-700">Edit</button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{leadData.notes}</p>
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

              {activeTab === 'web' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-4">
                    Recent website activity and page views
                  </p>
                  {webActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-crm-100 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{activity.page}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-700">{activity.duration}</p>
                        <p className="text-xs text-gray-500">Duration</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Add notes about this lead</p>
                  <button className="mt-4 px-4 py-2 bg-crm-600 text-white rounded-lg text-sm font-medium hover:bg-crm-700">
                    Add Note
                  </button>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No files uploaded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
