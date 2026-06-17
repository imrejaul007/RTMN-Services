import type {
  Contact,
  Deal,
  Lead,
  Task,
  Activity,
  ContactFilters,
  DealFilters,
  LeadFilters,
  TaskFilters,
  ApiResponse,
  PaginatedResponse,
  SalesStats,
  TeamMember,
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4399'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Contacts API
  async getContacts(filters?: ContactFilters): Promise<PaginatedResponse<Contact>> {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.tags?.length) params.append('tags', filters.tags.join(','))

    return this.request<PaginatedResponse<Contact>>(
      `/api/crm/contacts?${params.toString()}`
    )
  }

  async getContact(id: string): Promise<ApiResponse<Contact>> {
    return this.request<ApiResponse<Contact>>(`/api/crm/contacts/${id}`)
  }

  async createContact(data: Partial<Contact>): Promise<ApiResponse<Contact>> {
    return this.request<ApiResponse<Contact>>('/api/crm/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateContact(
    id: string,
    data: Partial<Contact>
  ): Promise<ApiResponse<Contact>> {
    return this.request<ApiResponse<Contact>>(`/api/crm/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteContact(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/api/crm/contacts/${id}`, {
      method: 'DELETE',
    })
  }

  // Deals API
  async getDeals(filters?: DealFilters): Promise<PaginatedResponse<Deal>> {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.stage) params.append('stage', filters.stage)
    if (filters?.minValue) params.append('minValue', String(filters.minValue))
    if (filters?.maxValue) params.append('maxValue', String(filters.maxValue))
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo)

    return this.request<PaginatedResponse<Deal>>(`/api/crm/deals?${params.toString()}`)
  }

  async getDeal(id: string): Promise<ApiResponse<Deal>> {
    return this.request<ApiResponse<Deal>>(`/api/crm/deals/${id}`)
  }

  async createDeal(data: Partial<Deal>): Promise<ApiResponse<Deal>> {
    return this.request<ApiResponse<Deal>>('/api/crm/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateDeal(id: string, data: Partial<Deal>): Promise<ApiResponse<Deal>> {
    return this.request<ApiResponse<Deal>>(`/api/crm/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async updateDealStage(
    id: string,
    stage: Deal['stage']
  ): Promise<ApiResponse<Deal>> {
    return this.request<ApiResponse<Deal>>(`/api/crm/deals/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    })
  }

  async deleteDeal(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/api/crm/deals/${id}`, {
      method: 'DELETE',
    })
  }

  // Leads API
  async getLeads(filters?: LeadFilters): Promise<PaginatedResponse<Lead>> {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.source) params.append('source', filters.source)
    if (filters?.minScore) params.append('minScore', String(filters.minScore))
    if (filters?.maxScore) params.append('maxScore', String(filters.maxScore))
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo)

    return this.request<PaginatedResponse<Lead>>(`/api/crm/leads?${params.toString()}`)
  }

  async getLead(id: string): Promise<ApiResponse<Lead>> {
    return this.request<ApiResponse<Lead>>(`/api/crm/leads/${id}`)
  }

  async createLead(data: Partial<Lead>): Promise<ApiResponse<Lead>> {
    return this.request<ApiResponse<Lead>>('/api/crm/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateLead(id: string, data: Partial<Lead>): Promise<ApiResponse<Lead>> {
    return this.request<ApiResponse<Lead>>(`/api/crm/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async convertLeadToContact(id: string): Promise<ApiResponse<Contact>> {
    return this.request<ApiResponse<Contact>>(`/api/crm/leads/${id}/convert`, {
      method: 'POST',
    })
  }

  async deleteLead(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/api/crm/leads/${id}`, {
      method: 'DELETE',
    })
  }

  // Tasks API
  async getTasks(filters?: TaskFilters): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.priority) params.append('priority', filters.priority)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo)
    if (filters?.dueDate) params.append('dueDate', filters.dueDate)

    return this.request<PaginatedResponse<Task>>(`/api/crm/tasks?${params.toString()}`)
  }

  async getTask(id: string): Promise<ApiResponse<Task>> {
    return this.request<ApiResponse<Task>>(`/api/crm/tasks/${id}`)
  }

  async createTask(data: Partial<Task>): Promise<ApiResponse<Task>> {
    return this.request<ApiResponse<Task>>('/api/crm/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTask(id: string, data: Partial<Task>): Promise<ApiResponse<Task>> {
    return this.request<ApiResponse<Task>>(`/api/crm/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async completeTask(id: string): Promise<ApiResponse<Task>> {
    return this.request<ApiResponse<Task>>(`/api/crm/tasks/${id}/complete`, {
      method: 'PATCH',
    })
  }

  async deleteTask(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/api/crm/tasks/${id}`, {
      method: 'DELETE',
    })
  }

  // Activities API
  async getActivities(
    entityType: 'contact' | 'deal' | 'lead',
    entityId: string
  ): Promise<ApiResponse<Activity[]>> {
    return this.request<ApiResponse<Activity[]>>(
      `/api/crm/activities?entityType=${entityType}&entityId=${entityId}`
    )
  }

  async createActivity(data: Partial<Activity>): Promise<ApiResponse<Activity>> {
    return this.request<ApiResponse<Activity>>('/api/crm/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Reports API
  async getSalesStats(dateRange?: string): Promise<ApiResponse<SalesStats>> {
    const params = dateRange ? `?dateRange=${dateRange}` : ''
    return this.request<ApiResponse<SalesStats>>(`/api/crm/reports/stats${params}`)
  }

  async getTeamPerformance(dateRange?: string): Promise<ApiResponse<TeamMember[]>> {
    const params = dateRange ? `?dateRange=${dateRange}` : ''
    return this.request<ApiResponse<TeamMember[]>>(`/api/crm/reports/team${params}`)
  }

  async getRevenueData(dateRange?: string): Promise<ApiResponse<any[]>> {
    const params = dateRange ? `?dateRange=${dateRange}` : ''
    return this.request<ApiResponse<any[]>>(`/api/crm/reports/revenue${params}`)
  }

  async getPipelineData(dateRange?: string): Promise<ApiResponse<any[]>> {
    const params = dateRange ? `?dateRange=${dateRange}` : ''
    return this.request<ApiResponse<any[]>>(`/api/crm/reports/pipeline${params}`)
  }
}

export const crmApi = new ApiClient(API_BASE_URL)

export default crmApi
