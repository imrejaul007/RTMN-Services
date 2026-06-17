'use client'

import { useState } from 'react'
import {
  Plus,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
} from 'lucide-react'

const slaPolicies = [
  {
    id: 'sla-1',
    name: 'Premium Support',
    description: '24/7 premium support for enterprise customers',
    priority: 'critical',
    firstResponseTime: 15,
    firstResponseUnit: 'minutes',
    resolutionTime: 4,
    resolutionUnit: 'hours',
    businessHours: false,
    status: 'active',
    ticketsCount: 234,
  },
  {
    id: 'sla-2',
    name: 'Standard Support',
    description: 'Business hours support for standard tier',
    priority: 'high',
    firstResponseTime: 2,
    firstResponseUnit: 'hours',
    resolutionTime: 24,
    resolutionUnit: 'hours',
    businessHours: true,
    status: 'active',
    ticketsCount: 567,
  },
  {
    id: 'sla-3',
    name: 'Basic Support',
    description: 'Email-based support for free users',
    priority: 'medium',
    firstResponseTime: 1,
    firstResponseUnit: 'days',
    resolutionTime: 7,
    resolutionUnit: 'days',
    businessHours: true,
    status: 'active',
    ticketsCount: 1243,
  },
  {
    id: 'sla-4',
    name: 'Development SLA',
    description: 'Technical SLA for development issues',
    priority: 'low',
    firstResponseTime: 4,
    firstResponseUnit: 'hours',
    resolutionTime: 48,
    resolutionUnit: 'hours',
    businessHours: true,
    status: 'draft',
    ticketsCount: 0,
  },
]

const priorityColors = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
}

const priorityIcons = {
  critical: AlertTriangle,
  high: Clock,
  medium: Clock,
  low: Clock,
}

export default function SLAPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSLA, setEditingSLA] = useState<typeof slaPolicies[0] | null>(null)

  const filteredPolicies = slaPolicies.filter((policy) =>
    policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    policy.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (value: number, unit: string) => {
    if (value === 1) return `1 ${unit.slice(0, -1)}`
    return `${value} ${unit}`
  }

  const handleEdit = (policy: typeof slaPolicies[0]) => {
    setEditingSLA(policy)
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SLA Policies</h1>
          <p className="text-muted-foreground mt-1">Define service level agreements and response times</p>
        </div>
        <button
          onClick={() => { setEditingSLA(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Policy
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Policies</p>
              <p className="text-2xl font-bold mt-1">{slaPolicies.filter(p => p.status === 'active').length}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg. First Response</p>
              <p className="text-2xl font-bold mt-1">1.2h</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg. Resolution</p>
              <p className="text-2xl font-bold mt-1">18.5h</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">SLA Compliance</p>
              <p className="text-2xl font-bold mt-1 text-green-600">98.7%</p>
            </div>
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search policies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
        />
      </div>

      {/* Policies Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium text-muted-foreground">Policy</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Priority</th>
                <th className="text-left p-4 font-medium text-muted-foreground">First Response</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Resolution</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Hours</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Tickets</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPolicies.map((policy) => (
                <tr key={policy.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{policy.name}</p>
                      <p className="text-sm text-muted-foreground">{policy.description}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${priorityColors[policy.priority as keyof typeof priorityColors]}`}>
                      {policy.priority}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">
                      {formatTime(policy.firstResponseTime, policy.firstResponseUnit)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">
                      {formatTime(policy.resolutionTime, policy.resolutionUnit)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-sm ${policy.businessHours ? 'text-muted-foreground' : 'text-green-600 font-medium'}`}>
                      {policy.businessHours ? 'Business' : '24/7'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      policy.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {policy.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{policy.ticketsCount.toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(policy)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLA Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">
              {editingSLA ? 'Edit SLA Policy' : 'Create SLA Policy'}
            </h2>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium">Policy Name</label>
                <input
                  type="text"
                  defaultValue={editingSLA?.name || ''}
                  placeholder="Premium Support"
                  className="w-full mt-1 px-4 py-2 border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  defaultValue={editingSLA?.description || ''}
                  placeholder="Describe this SLA policy..."
                  className="w-full mt-1 px-4 py-2 border rounded-lg bg-background h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <select
                    defaultValue={editingSLA?.priority || 'medium'}
                    className="w-full mt-1 px-4 py-2 border rounded-lg bg-background"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    defaultValue={editingSLA?.status || 'draft'}
                    className="w-full mt-1 px-4 py-2 border rounded-lg bg-background"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">First Response Time</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      defaultValue={editingSLA?.firstResponseTime || 1}
                      className="w-20 px-4 py-2 border rounded-lg bg-background"
                    />
                    <select
                      defaultValue={editingSLA?.firstResponseUnit || 'hours'}
                      className="flex-1 px-4 py-2 border rounded-lg bg-background"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Resolution Time</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      defaultValue={editingSLA?.resolutionTime || 24}
                      className="w-20 px-4 py-2 border rounded-lg bg-background"
                    />
                    <select
                      defaultValue={editingSLA?.resolutionUnit || 'hours'}
                      className="flex-1 px-4 py-2 border rounded-lg bg-background"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Business Hours Only</p>
                  <p className="text-sm text-muted-foreground">Only count during business hours</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={editingSLA?.businessHours ?? true}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                {editingSLA ? 'Save Changes' : 'Create Policy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
