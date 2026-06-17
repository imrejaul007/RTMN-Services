'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  Plus,
  Trash2,
  GripVertical,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

const workflowData = {
  id: 'wf-1',
  name: 'Customer Onboarding',
  description: 'Automated onboarding flow for new customers',
  status: 'active',
  trigger: 'user.created',
  steps: [
    {
      id: 'step-1',
      type: 'trigger',
      name: 'User Created',
      config: { event: 'user.created' },
    },
    {
      id: 'step-2',
      type: 'action',
      name: 'Send Welcome Email',
      config: { template: 'welcome', delay: 0 },
    },
    {
      id: 'step-3',
      type: 'condition',
      name: 'Check Plan',
      config: { field: 'subscription.plan', operator: 'equals', value: 'premium' },
    },
    {
      id: 'step-4',
      type: 'action',
      name: 'Assign Onboarding Specialist',
      config: { role: 'onboarding_specialist' },
    },
    {
      id: 'step-5',
      type: 'action',
      name: 'Schedule Kickoff Call',
      config: { meetingDuration: 30, daysAfter: 3 },
    },
    {
      id: 'step-6',
      type: 'delay',
      name: 'Wait 7 Days',
      config: { duration: 7, unit: 'days' },
    },
    {
      id: 'step-7',
      type: 'action',
      name: 'Send Check-in Email',
      config: { template: 'checkin' },
    },
    {
      id: 'step-8',
      type: 'action',
      name: 'Create CRM Record',
      config: { object: 'contact', action: 'create' },
    },
  ],
}

const stepTypes = [
  { type: 'action', label: 'Action', description: 'Perform an operation' },
  { type: 'condition', label: 'Condition', description: 'Branch based on logic' },
  { type: 'delay', label: 'Delay', description: 'Wait for a duration' },
  { type: 'notification', label: 'Notification', description: 'Send a notification' },
  { type: 'api', label: 'API Call', description: 'Call external service' },
]

export default function EditWorkflowPage({ params }: { params: { id: string } }) {
  const [workflow, setWorkflow] = useState(workflowData)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const addStep = (type: string) => {
    const newStep = {
      id: `step-${Date.now()}`,
      type,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      config: {},
    }
    setWorkflow({
      ...workflow,
      steps: [...workflow.steps, newStep],
    })
    setShowAddMenu(false)
  }

  const removeStep = (stepId: string) => {
    setWorkflow({
      ...workflow,
      steps: workflow.steps.filter((s) => s.id !== stepId),
    })
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'trigger':
        return '⚡'
      case 'action':
        return '⚙️'
      case 'condition':
        return '🔀'
      case 'delay':
        return '⏱️'
      case 'notification':
        return '📧'
      case 'api':
        return '🌐'
      default:
        return '📦'
    }
  }

  const getStepColor = (type: string) => {
    switch (type) {
      case 'trigger':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'action':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'condition':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'delay':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'notification':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'api':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/workflows"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{workflow.name}</h1>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                workflow.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {workflow.status === 'active' && <div className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                {workflow.status}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">{workflow.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50 transition-colors">
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50 transition-colors">
            {workflow.status === 'active' ? (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Activate
              </>
            )}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Builder */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Workflow Builder</h2>
            </div>
            <div className="p-6">
              {/* Trigger */}
              <div className="mb-6">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getStepColor('trigger')}`}>
                  <span className="text-lg">{getStepIcon('trigger')}</span>
                  <span className="font-medium">Trigger: {workflow.trigger}</span>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3 relative">
                {/* Connection line */}
                <div className="absolute left-8 top-20 bottom-20 w-0.5 bg-border" />

                {workflow.steps.filter(s => s.type !== 'trigger').map((step, index) => (
                  <div key={step.id} className="relative">
                    <div
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${expandedStep === step.id ? 'ring-2 ring-primary' : 'hover:bg-slate-50'}`}
                      onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <div className={`p-2 rounded-lg border ${getStepColor(step.type)}`}>
                        <span className="text-sm">{getStepIcon(step.type)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{step.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">({step.type})</span>
                        </div>
                        {expandedStep === step.id && (
                          <div className="mt-3 space-y-2">
                            {Object.entries(step.config).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">{key}:</span>
                                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  {String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                          className="p-1 hover:bg-red-100 text-red-600 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {expandedStep === step.id ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Step Button */}
                <div className="relative pt-4">
                  <div className="relative">
                    <button
                      onClick={() => setShowAddMenu(!showAddMenu)}
                      className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg w-full justify-center hover:bg-slate-50 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Step
                    </button>
                    {showAddMenu && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border rounded-lg shadow-lg z-10">
                        {stepTypes.map((stepType) => (
                          <button
                            key={stepType.type}
                            onClick={() => addStep(stepType.type)}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg"
                          >
                            <span className="text-lg">{getStepIcon(stepType.type)}</span>
                            <div className="text-left">
                              <div className="font-medium">{stepType.label}</div>
                              <div className="text-xs text-muted-foreground">{stepType.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Workflow Stats */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
            <h3 className="font-semibold mb-4">Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Runs</span>
                <span className="font-medium">1,247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="font-medium text-green-600">98.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Avg. Duration</span>
                <span className="font-medium">2m 34s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Run</span>
                <span className="font-medium">2 hours ago</span>
              </div>
            </div>
          </div>

          {/* Recent Runs */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Recent Runs</h3>
            </div>
            <div className="divide-y">
              {[
                { id: 1, status: 'success', time: '2 hours ago' },
                { id: 2, status: 'success', time: '5 hours ago' },
                { id: 3, status: 'failed', time: '1 day ago' },
                { id: 4, status: 'success', time: '2 days ago' },
              ].map((run) => (
                <div key={run.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${run.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">Run #{run.id}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{run.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
