// RTMN Admin Portal Types

// Workflow Types
export interface WorkflowStep {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'notification' | 'api'
  name: string
  config: Record<string, unknown>
  nextStepId?: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'draft'
  trigger: string
  steps: WorkflowStep[]
  createdAt: string
  updatedAt: string
  lastRun?: string
  runCount: number
  successRate: number
}

export interface WorkflowRun {
  id: string
  workflowId: string
  status: 'success' | 'failed' | 'running'
  startedAt: string
  completedAt?: string
  duration?: number
  error?: string
}

// Knowledge Base Types
export interface Article {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  status: 'draft' | 'published' | 'archived'
  author: string
  createdAt: string
  updatedAt: string
  views: number
  slug: string
  metaDescription?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  articleCount: number
  parentId?: string
}

// Team Types
export type TeamRole = 'admin' | 'editor' | 'viewer'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
  status: 'active' | 'invited' | 'inactive'
  avatar?: string
  joinedAt: string
  lastActiveAt?: string
}

export interface RolePermission {
  permission: string
  admin: boolean
  editor: boolean
  viewer: boolean
}

// Integration Types
export type IntegrationStatus = 'connected' | 'disconnected' | 'error'

export interface Integration {
  id: string
  name: string
  description: string
  category: string
  icon: string
  color: string
  status: IntegrationStatus
  lastSync?: string
  config?: Record<string, unknown>
  credentials?: Record<string, string>
}

export interface IntegrationEvent {
  id: string
  integrationId: string
  type: string
  timestamp: string
  data: Record<string, unknown>
}

// SLA Types
export type Priority = 'critical' | 'high' | 'medium' | 'low'

export interface SLAPolicy {
  id: string
  name: string
  description: string
  priority: Priority
  firstResponseTime: number
  firstResponseUnit: 'minutes' | 'hours' | 'days'
  resolutionTime: number
  resolutionUnit: 'hours' | 'days'
  businessHours: boolean
  status: 'active' | 'draft' | 'archived'
  ticketCount: number
  complianceRate: number
  createdAt: string
  updatedAt: string
}

export interface SLAStats {
  activePolicies: number
  avgFirstResponse: string
  avgResolution: string
  complianceRate: number
}

// Settings Types
export interface Settings {
  organization: {
    name: string
    slug: string
    email: string
  }
  localization: {
    timezone: string
    language: string
    currency: string
    dateFormat: string
  }
  notifications: {
    email: boolean
    slack: boolean
    webhook: boolean
  }
  security: {
    twoFactorAuth: boolean
    sessionTimeout: number
    ipAllowlist: string[]
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    accentColor: string
  }
  apiKeys: {
    production: string
    development: string
  }
}

// API Response Types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  message: string
  code?: string
  details?: Record<string, string[]>
}

// Dashboard Types
export interface DashboardStats {
  workflows: {
    active: number
    total: number
    weeklyChange: number
  }
  articles: {
    published: number
    total: number
    weeklyChange: number
  }
  team: {
    members: number
    pending: number
    weeklyChange: number
  }
  integrations: {
    connected: number
    total: number
  }
}

export interface ActivityItem {
  id: string
  action: string
  item: string
  time: string
  status: 'success' | 'warning' | 'error'
  userId?: string
}

export interface SystemHealth {
  service: string
  status: 'operational' | 'degraded' | 'down'
  uptime: string
}
