// Contact Types
export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  company: string
  role: string
  avatar: string | null
  status: 'active' | 'inactive'
  lastContact: string
  deals: number
  totalValue: number
  tags: string[]
  address?: Address
  social?: SocialLinks
  notes?: string
  createdAt: string
}

export interface Address {
  street: string
  city: string
  state: string
  zip: string
  country: string
}

export interface SocialLinks {
  linkedin?: string
  twitter?: string
  facebook?: string
}

// Deal Types
export interface Deal {
  id: string
  title: string
  value: number
  contact: string
  company: string
  stage: DealStage
  probability: number
  expectedClose: string
  daysInStage: number
  createdAt: string
  description?: string
  nextSteps?: string
  lossReason?: string
  tags?: string[]
  assignedTo?: string
  contactId?: string
  companyId?: string
}

export type DealStage =
  | 'discovery'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost'

export interface DealStageConfig {
  id: DealStage
  name: string
  color: string
}

// Lead Types
export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  company: string
  role: string
  source: LeadSource
  status: LeadStatus
  score: number
  scoreBreakdown?: LeadScoreBreakdown
  assignedTo?: string
  createdAt: string
  lastActivity?: string
  notes?: string
  tags?: string[]
  address?: Address
  social?: SocialLinks
  companyInfo?: CompanyInfo
  dealValue?: number
  conversionProbability?: number
}

export interface LeadScoreBreakdown {
  engagement: number
  firmographics: number
  demographics: number
  intent: number
}

export type LeadSource =
  | 'website'
  | 'linkedin'
  | 'referral'
  | 'webinar'
  | 'cold_outreach'
  | 'event'

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified'

export interface CompanyInfo {
  industry: string
  size: string
  revenue?: string
  website?: string
}

// Task Types
export interface Task {
  id: string
  title: string
  description?: string
  dueDate: string
  dueTime?: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'completed'
  type: TaskType
  contact?: {
    id: string
    name: string
    company: string
  }
  assignedTo: string
  createdAt?: string
}

export type TaskType = 'call' | 'email' | 'meeting' | 'task' | 'coffee'

// Activity Types
export interface Activity {
  id: string
  type: ActivityType
  title: string
  date: string
  user: string
  notes?: string
  contactId?: string
  dealId?: string
}

export type ActivityType = 'email' | 'call' | 'meeting' | 'note' | 'stage_change' | 'task_completed'

// Report Types
export interface SalesStats {
  totalRevenue: number
  dealsClosed: number
  conversionRate: number
  avgDealSize: number
  revenueChange: number
  dealsChange: number
  conversionChange: number
  avgDealChange: number
}

export interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  deals: number
  revenue: number
  conversion: number
  avgDealSize: number
}

export interface ChartDataPoint {
  month: string
  value: number
  target?: number
}

export interface PipelineStageData {
  name: string
  value: number
  color: string
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

// Filter Types
export interface ContactFilters {
  search?: string
  status?: Contact['status']
  tags?: string[]
  company?: string
}

export interface DealFilters {
  search?: string
  stage?: DealStage
  minValue?: number
  maxValue?: number
  assignedTo?: string
}

export interface LeadFilters {
  search?: string
  status?: LeadStatus
  source?: LeadSource
  minScore?: number
  maxScore?: number
  assignedTo?: string
}

export interface TaskFilters {
  search?: string
  status?: Task['status']
  priority?: Task['priority']
  type?: TaskType
  assignedTo?: string
  dueDate?: string
}
