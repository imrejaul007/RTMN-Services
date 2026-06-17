'use client'

import { useState } from 'react'
import {
  Plus,
  Search,
  Plug,
  Settings,
  RefreshCw,
  Trash2,
  Check,
  X,
  ExternalLink,
  Zap,
} from 'lucide-react'
import { IntegrationCard } from '@/components/IntegrationCard'

const availableIntegrations = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications and receive commands via Slack',
    category: 'Communication',
    icon: '/icons/slack.svg',
    color: '#4A154B',
    status: 'connected',
    lastSync: '5 minutes ago',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Trigger workflows on repository events',
    category: 'Development',
    icon: '/icons/github.svg',
    color: '#24292E',
    status: 'connected',
    lastSync: '1 hour ago',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Process payments and manage subscriptions',
    category: 'Payments',
    icon: '/icons/stripe.svg',
    color: '#635BFF',
    status: 'connected',
    lastSync: '2 hours ago',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync CRM data and manage customer relationships',
    category: 'CRM',
    icon: '/icons/hubspot.svg',
    color: '#FF7A59',
    status: 'disconnected',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Enterprise CRM integration for sales and service',
    category: 'CRM',
    icon: '/icons/salesforce.svg',
    color: '#00A1E0',
    status: 'disconnected',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Send SMS and voice notifications',
    category: 'Communication',
    icon: '/icons/twilio.svg',
    color: '#F22F46',
    status: 'disconnected',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Email marketing and transactional emails',
    category: 'Communication',
    icon: '/icons/sendgrid.svg',
    color: '#1A82E2',
    status: 'disconnected',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect to 5000+ apps via Zapier',
    category: 'Automation',
    icon: '/icons/zapier.svg',
    color: '#FF4A00',
    status: 'connected',
    lastSync: '30 minutes ago',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Connect to your PostgreSQL database',
    category: 'Database',
    icon: '/icons/postgres.svg',
    color: '#336791',
    status: 'connected',
    lastSync: '1 hour ago',
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'Connect to MongoDB for NoSQL data',
    category: 'Database',
    icon: '/icons/mongodb.svg',
    color: '#47A248',
    status: 'disconnected',
  },
]

const categories = ['All', 'Communication', 'CRM', 'Payments', 'Database', 'Automation', 'Development']

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [filterStatus, setFilterStatus] = useState<'all' | 'connected' | 'disconnected'>('all')

  const filteredIntegrations = availableIntegrations.filter((integration) => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || integration.category === selectedCategory
    const matchesStatus = filterStatus === 'all' || integration.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const connectedCount = availableIntegrations.filter(i => i.status === 'connected').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-1">Connect third-party services to RTMN</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          Add Integration
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{connectedCount}</p>
              <p className="text-sm text-muted-foreground">Connected</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{availableIntegrations.reduce((acc, i) => acc + (i.status === 'connected' ? 1247 : 0), 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Events Today</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Plug className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{availableIntegrations.length}</p>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'connected' | 'disconnected')}
          className="px-4 py-2 border rounded-lg bg-background"
        >
          <option value="all">All Status</option>
          <option value="connected">Connected</option>
          <option value="disconnected">Available</option>
        </select>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIntegrations.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="text-center py-12">
          <Plug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No integrations found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}
