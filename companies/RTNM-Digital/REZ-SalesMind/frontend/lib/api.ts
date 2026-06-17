const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4760'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: any
  headers?: Record<string, string>
}

class APIClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    if (body) {
      config.body = JSON.stringify(body)
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Transcription APIs
  async transcribeCall(callId: string) {
    return this.request(`/api/communication/call/${callId}/transcribe`, { method: 'POST' })
  }

  async getTranscription(callId: string) {
    return this.request(`/api/communication/call/${callId}/transcription`)
  }

  async batchTranscribe(callIds: string[]) {
    return this.request('/api/transcription/batch', { method: 'POST', body: { callIds } })
  }

  // Voicemail APIs
  async detectVoicemail(data: { callId: string; leadId: string; duration: number; status: string }) {
    return this.request('/api/voicemail/detect', { method: 'POST', body: data })
  }

  async getVoicemail(callId: string) {
    return this.request(`/api/voicemail/${callId}`)
  }

  async transcribeVoicemail(voicemailId: string) {
    return this.request('/api/voicemail/transcribe', { method: 'POST', body: { voicemailId } })
  }

  // Campaign APIs
  async createCampaign(campaign: any) {
    return this.request('/api/campaign/create', { method: 'POST', body: campaign })
  }

  async getCampaign(campaignId: string) {
    return this.request(`/api/campaign/${campaignId}`)
  }

  async executeCampaign(campaignId: string, leads?: string[]) {
    return this.request(`/api/campaign/${campaignId}/execute`, { method: 'POST', body: { leads } })
  }

  async getCampaignResults(campaignId: string) {
    return this.request(`/api/campaign/${campaignId}/results`)
  }

  async pauseCampaign(campaignId: string) {
    return this.request(`/api/campaign/${campaignId}/pause`, { method: 'POST' })
  }

  async resumeCampaign(campaignId: string) {
    return this.request(`/api/campaign/${campaignId}/resume`, { method: 'POST' })
  }

  async listCampaigns(params?: { status?: string; type?: string }) {
    const query = new URLSearchParams(params as any).toString()
    return this.request(`/api/campaign${query ? `?${query}` : ''}`)
  }

  // AI APIs
  async generateWithClaude(prompt: string, options?: any) {
    return this.request('/api/ai/claude/generate', { method: 'POST', body: { prompt, ...options } })
  }

  async generateWithOpenAI(prompt: string, options?: any) {
    return this.request('/api/ai/openai/generate', { method: 'POST', body: { prompt, ...options } })
  }

  async enhanceEmail(email: string, lead: any, tone?: string) {
    return this.request('/api/ai/enhance-email', { method: 'POST', body: { email, lead, tone } })
  }

  async analyzeSentiment(text: string) {
    return this.request('/api/ai/analyze-sentiment', { method: 'POST', body: { text } })
  }

  async summarize(text: string, maxLength?: number) {
    return this.request('/api/ai/summarize', { method: 'POST', body: { text, maxLength } })
  }

  async generateEmail(lead: any, templateType?: string) {
    return this.request('/api/ai/generate-email', { method: 'POST', body: { lead, templateType } })
  }

  async chatWithAI(message: string, context?: any) {
    return this.request('/api/ai/chat', { method: 'POST', body: { message, context } })
  }

  // SDR APIs
  async startAutonomousSDR(config: any) {
    return this.request('/api/sdr/autonomous/start', { method: 'POST', body: config })
  }

  async stopAutonomousSDR(workflowId: string) {
    return this.request('/api/sdr/autonomous/stop', { method: 'POST', body: { workflowId } })
  }

  async getSDRStatus() {
    return this.request('/api/sdr/autonomous/status')
  }

  async getWorkflowStatus(workflowId: string) {
    return this.request(`/api/sdr/autonomous/status/${workflowId}`)
  }

  async handleSDRResponse(leadId: string, type: string, content?: string) {
    return this.request('/api/sdr/autonomous/respond', { method: 'POST', body: { leadId, type, content } })
  }

  async getLeads(params?: any) {
    const query = new URLSearchParams(params as any).toString()
    return this.request(`/api/sdr/leads${query ? `?${query}` : ''}`)
  }

  // CRM APIs
  async syncLeadToHubSpot(lead: any) {
    return this.request('/api/crm/sync/lead', { method: 'POST', body: { lead } })
  }

  async syncDealToHubSpot(deal: any) {
    return this.request('/api/crm/sync/deal', { method: 'POST', body: { deal } })
  }

  async logActivity(activity: any) {
    return this.request('/api/crm/sync/activity', { method: 'POST', body: { activity } })
  }

  async syncCall(call: any, transcription?: string) {
    return this.request('/api/crm/sync/call', { method: 'POST', body: { call, transcription } })
  }

  async getSyncStatus() {
    return this.request('/api/crm/sync/status')
  }

  // Dashboard
  async getDashboardStats() {
    return this.request('/api/sdr/dashboard')
  }
}

export const api = new APIClient(API_BASE_URL)
export default api
