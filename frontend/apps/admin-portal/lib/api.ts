// RTMN Admin Portal API Client

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rtmn-api.onrender.com'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

class ApiClient {
  private baseUrl: string
  private token: string | null

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
    this.token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
    }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (this.token) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Workflows API
  async getWorkflows() {
    return this.request<Workflow[]>('/api/workflows')
  }

  async getWorkflow(id: string) {
    return this.request<Workflow>(`/api/workflows/${id}`)
  }

  async createWorkflow(workflow: Partial<Workflow>) {
    return this.request<Workflow>('/api/workflows', {
      method: 'POST',
      body: workflow,
    })
  }

  async updateWorkflow(id: string, workflow: Partial<Workflow>) {
    return this.request<Workflow>(`/api/workflows/${id}`, {
      method: 'PUT',
      body: workflow,
    })
  }

  async deleteWorkflow(id: string) {
    return this.request<void>(`/api/workflows/${id}`, {
      method: 'DELETE',
    })
  }

  async triggerWorkflow(id: string) {
    return this.request<{ success: boolean }>(`/api/workflows/${id}/trigger`, {
      method: 'POST',
    })
  }

  // Knowledge Base API
  async getArticles(params?: { category?: string; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set('category', params.category)
    if (params?.status) searchParams.set('status', params.status)
    const query = searchParams.toString()
    return this.request<Article[]>(`/api/kb/articles${query ? `?${query}` : ''}`)
  }

  async getArticle(id: string) {
    return this.request<Article>(`/api/kb/articles/${id}`)
  }

  async createArticle(article: Partial<Article>) {
    return this.request<Article>('/api/kb/articles', {
      method: 'POST',
      body: article,
    })
  }

  async updateArticle(id: string, article: Partial<Article>) {
    return this.request<Article>(`/api/kb/articles/${id}`, {
      method: 'PUT',
      body: article,
    })
  }

  async deleteArticle(id: string) {
    return this.request<void>(`/api/kb/articles/${id}`, {
      method: 'DELETE',
    })
  }

  // Teams API
  async getTeamMembers() {
    return this.request<TeamMember[]>('/api/teams')
  }

  async inviteTeamMember(email: string, role: string) {
    return this.request<{ success: boolean }>('/api/teams/invite', {
      method: 'POST',
      body: { email, role },
    })
  }

  async updateTeamMemberRole(id: string, role: string) {
    return this.request<TeamMember>(`/api/teams/${id}`, {
      method: 'PATCH',
      body: { role },
    })
  }

  async removeTeamMember(id: string) {
    return this.request<void>(`/api/teams/${id}`, {
      method: 'DELETE',
    })
  }

  // Integrations API
  async getIntegrations() {
    return this.request<Integration[]>('/api/integrations')
  }

  async connectIntegration(id: string, credentials: Record<string, string>) {
    return this.request<Integration>(`/api/integrations/${id}/connect`, {
      method: 'POST',
      body: credentials,
    })
  }

  async disconnectIntegration(id: string) {
    return this.request<void>(`/api/integrations/${id}/disconnect`, {
      method: 'POST',
    })
  }

  async syncIntegration(id: string) {
    return this.request<{ success: boolean }>(`/api/integrations/${id}/sync`, {
      method: 'POST',
    })
  }

  // SLA Policies API
  async getSLAPolicies() {
    return this.request<SLAPolicy[]>('/api/sla')
  }

  async createSLAPolicy(policy: Partial<SLAPolicy>) {
    return this.request<SLAPolicy>('/api/sla', {
      method: 'POST',
      body: policy,
    })
  }

  async updateSLAPolicy(id: string, policy: Partial<SLAPolicy>) {
    return this.request<SLAPolicy>(`/api/sla/${id}`, {
      method: 'PUT',
      body: policy,
    })
  }

  async deleteSLAPolicy(id: string) {
    return this.request<void>(`/api/sla/${id}`, {
      method: 'DELETE',
    })
  }

  // Settings API
  async getSettings() {
    return this.request<Settings>('/api/settings')
  }

  async updateSettings(settings: Partial<Settings>) {
    return this.request<Settings>('/api/settings', {
      method: 'PUT',
      body: settings,
    })
  }

  async regenerateApiKey(type: 'production' | 'development') {
    return this.request<{ key: string }>(`/api/settings/api-keys/${type}/regenerate`, {
      method: 'POST',
    })
  }
}

export const api = new ApiClient()

// Singleton export for convenience
export default api
