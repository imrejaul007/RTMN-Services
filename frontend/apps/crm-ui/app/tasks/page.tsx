'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Bell,
  Users,
  Phone,
  Mail,
  Video,
  Coffee,
  ChevronRight,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'

const tasks = [
  {
    id: '1',
    title: 'Follow up with Acme Corp',
    description: 'Send revised proposal with volume discount',
    dueDate: '2026-06-16',
    dueTime: '14:00',
    priority: 'high',
    status: 'pending',
    type: 'call',
    contact: {
      id: '1',
      name: 'Sarah Johnson',
      company: 'TechStart Inc',
    },
    assignedTo: 'John Smith',
  },
  {
    id: '2',
    title: 'Send proposal to TechStart',
    description: 'Enterprise license proposal with pricing breakdown',
    dueDate: '2026-06-16',
    dueTime: '17:00',
    priority: 'high',
    status: 'pending',
    type: 'email',
    contact: {
      id: '2',
      name: 'Sarah Johnson',
      company: 'TechStart Inc',
    },
    assignedTo: 'John Smith',
  },
  {
    id: '3',
    title: 'Quarterly review call',
    description: 'Review Q2 performance and Q3 targets',
    dueDate: '2026-06-17',
    dueTime: '10:00',
    priority: 'medium',
    status: 'pending',
    type: 'meeting',
    contact: {
      id: '3',
      name: 'Emily Davis',
      company: 'Global Retail Corp',
    },
    assignedTo: 'John Smith',
  },
  {
    id: '4',
    title: 'Contract review meeting',
    description: 'Review contract terms with legal team',
    dueDate: '2026-06-17',
    dueTime: '15:00',
    priority: 'medium',
    status: 'pending',
    type: 'meeting',
    contact: {
      id: '4',
      name: 'Michael Brown',
      company: 'Enterprise Solutions',
    },
    assignedTo: 'Sarah Lee',
  },
  {
    id: '5',
    title: 'Demo preparation',
    description: 'Prepare demo environment for EnterpriseNet',
    dueDate: '2026-06-18',
    dueTime: '09:00',
    priority: 'low',
    status: 'pending',
    type: 'task',
    contact: {
      id: '5',
      name: 'Michael Brown',
      company: 'EnterpriseNet Global',
    },
    assignedTo: 'John Smith',
  },
  {
    id: '6',
    title: 'Cold outreach campaign',
    description: 'Send follow-up emails to new leads',
    dueDate: '2026-06-15',
    dueTime: '12:00',
    priority: 'medium',
    status: 'completed',
    type: 'email',
    contact: null,
    assignedTo: 'John Smith',
  },
  {
    id: '7',
    title: 'Lead qualification calls',
    description: 'Qualify 10 new leads from webinar',
    dueDate: '2026-06-14',
    dueTime: '16:00',
    priority: 'high',
    status: 'completed',
    type: 'call',
    contact: null,
    assignedTo: 'Sarah Lee',
  },
]

const activities = [
  {
    id: 1,
    type: 'task_completed',
    title: 'Cold outreach campaign completed',
    date: '2026-06-15T12:30:00',
    user: 'John Smith',
  },
  {
    id: 2,
    type: 'meeting_completed',
    title: 'Demo with TechInnovate',
    date: '2026-06-14T15:00:00',
    user: 'Sarah Lee',
    notes: 'Great demo. They want to proceed with pilot.',
  },
  {
    id: 3,
    type: 'call_completed',
    title: 'Discovery call with StartupXYZ',
    date: '2026-06-14T10:00:00',
    user: 'John Smith',
    notes: 'Budget confirmed at $20K. Timeline is Q4.',
  },
]

const taskTypes: Record<string, { icon: typeof Phone; color: string }> = {
  call: { icon: Phone, color: 'text-blue-500 bg-blue-50' },
  email: { icon: Mail, color: 'text-green-500 bg-green-50' },
  meeting: { icon: Video, color: 'text-purple-500 bg-purple-50' },
  task: { icon: CheckCircle2, color: 'text-amber-500 bg-amber-50' },
  coffee: { icon: Coffee, color: 'text-orange-500 bg-orange-50' },
}

const priorityColors: Record<string, { bg: string; text: string; dot: string }> = {
  high: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
}

export default function TasksPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [activeTab, setActiveTab] = useState<'tasks' | 'activity'>('tasks')

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && task.status === 'pending') ||
      (statusFilter === 'completed' && task.status === 'completed')
    return matchesSearch && matchesStatus
  })

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    overdue: tasks.filter((t) => t.status === 'pending' && t.dueDate < '2026-06-16').length,
    dueToday: tasks.filter((t) => t.status === 'pending' && t.dueDate === '2026-06-16').length,
  }

  const handleToggleComplete = (taskId: string) => {
    // In a real app, this would update the task status
    console.log('Toggle complete:', taskId)
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks & Activities</h1>
          <p className="text-gray-500 mt-1">
            Track your daily activities and tasks
          </p>
        </div>
        <button className="px-4 py-2 bg-crm-600 text-white rounded-lg text-sm font-medium hover:bg-crm-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tasks'
                ? 'border-crm-600 text-crm-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Tasks
            <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
              {taskStats.pending}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-crm-600 text-crm-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Activity Feed
          </button>
        </div>
      </div>

      {activeTab === 'tasks' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{taskStats.total}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{taskStats.pending}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Due Today</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{taskStats.dueToday}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Overdue</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{taskStats.overdue}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{taskStats.completed}</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-500"
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="all">All Tasks</option>
            </select>
            <button className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              More Filters
            </button>
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const TypeIcon = taskTypes[task.type]?.icon || CheckCircle2
              const typeColor = taskTypes[task.type]?.color || 'text-gray-500 bg-gray-50'
              const priority = priorityColors[task.priority]
              const isOverdue = task.status === 'pending' && task.dueDate < '2026-06-16'

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-all ${
                    isOverdue ? 'border-red-200' : 'border-gray-100'
                  } ${task.status === 'completed' ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleComplete(task.id)}
                      className={`flex-shrink-0 ${
                        task.status === 'completed' ? 'text-green-500' : 'text-gray-300 hover:text-green-500'
                      }`}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </button>

                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${typeColor}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium ${
                          task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'
                        }`}>
                          {task.title}
                        </h3>
                        {isOverdue && (
                          <span className="flex items-center gap-1 text-xs text-red-500">
                            <AlertCircle className="w-3 h-3" />
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{task.description}</p>
                      {task.contact && (
                        <Link
                          href={`/contacts/${task.contact.id}`}
                          className="text-xs text-crm-600 hover:text-crm-700 mt-1 inline-block"
                        >
                          {task.contact.name} at {task.contact.company}
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                          <Calendar className="w-4 h-4" />
                          {task.dueDate}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {task.dueTime}
                        </div>
                      </div>

                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priority.bg} ${priority.text}`}>
                        {task.priority}
                      </span>

                      <div className="text-right">
                        <p className="text-xs text-gray-500">Assigned to</p>
                        <p className="text-sm font-medium text-gray-700">{task.assignedTo}</p>
                      </div>

                      <button className="p-1 hover:bg-gray-100 rounded">
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
              <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No tasks found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your filters</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-4 p-4 rounded-lg border border-gray-100 hover:border-crm-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
