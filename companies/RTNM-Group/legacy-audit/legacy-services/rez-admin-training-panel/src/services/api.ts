import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  FAQ,
  FAQCategory,
  KnowledgeEntry,
  Merchant,
  TrainingDocument,
  Conversation,
  AnalyticsOverview,
  DashboardStats,
  ApiResponse,
  PaginatedResponse,
  UploadResponse,
} from '../types';

// Service URLs - configurable via environment variables
const SERVICES = {
  SUPPORT_COPILOT: import.meta.env.VITE_SUPPORT_COPILOT_URL || 'http://localhost:3001',
  KNOWLEDGE_BASE: import.meta.env.VITE_KNOWLEDGE_BASE_URL || 'http://localhost:3002',
  TRAINING_API: import.meta.env.VITE_TRAINING_API_URL || 'http://localhost:3003',
};

class ApiService {
  private copilotClient: AxiosInstance;
  private knowledgeClient: AxiosInstance;
  private trainingClient: AxiosInstance;

  constructor() {
    // REZ-support-copilot client
    this.copilotClient = axios.create({
      baseURL: SERVICES.SUPPORT_COPILOT,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    // rez-knowledge-base-service client
    this.knowledgeClient = axios.create({
      baseURL: SERVICES.KNOWLEDGE_BASE,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Training API client
    this.trainingClient = axios.create({
      baseURL: SERVICES.TRAINING_API,
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Response interceptors for error handling
    [this.copilotClient, this.knowledgeClient, this.trainingClient].forEach((client) => {
      client.interceptors.response.use(
        (response) => response,
        (error: AxiosError) => {
          console.error('API Error:', error.message);
          return Promise.reject(error);
        }
      );
    });
  }

  // ==================== Dashboard ====================
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.trainingClient.get<ApiResponse<DashboardStats>>('/api/dashboard/stats');
    return response.data.data;
  }

  // ==================== FAQs ====================
  async getFAQs(params?: { page?: number; pageSize?: number; category?: string; search?: string }): Promise<PaginatedResponse<FAQ>> {
    const response = await this.trainingClient.get<ApiResponse<PaginatedResponse<FAQ>>>('/api/faqs', { params });
    return response.data.data;
  }

  async getFAQById(id: string): Promise<FAQ> {
    const response = await this.trainingClient.get<ApiResponse<FAQ>>(`/api/faqs/${id}`);
    return response.data.data;
  }

  async createFAQ(faq: Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>): Promise<FAQ> {
    const response = await this.trainingClient.post<ApiResponse<FAQ>>('/api/faqs', faq);
    return response.data.data;
  }

  async updateFAQ(id: string, faq: Partial<FAQ>): Promise<FAQ> {
    const response = await this.trainingClient.put<ApiResponse<FAQ>>(`/api/faqs/${id}`, faq);
    return response.data.data;
  }

  async deleteFAQ(id: string): Promise<void> {
    await this.trainingClient.delete(`/api/faqs/${id}`);
  }

  async bulkImportFAQs(faqs: Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<{ imported: number; failed: number }> {
    const response = await this.trainingClient.post<ApiResponse<{ imported: number; failed: number }>>('/api/faqs/bulk', { faqs });
    return response.data.data;
  }

  async getFAQCategories(): Promise<FAQCategory[]> {
    const response = await this.trainingClient.get<ApiResponse<FAQCategory[]>>('/api/faqs/categories');
    return response.data.data;
  }

  async createFAQCategory(category: Omit<FAQCategory, 'id' | 'faqCount'>): Promise<FAQCategory> {
    const response = await this.trainingClient.post<ApiResponse<FAQCategory>>('/api/faqs/categories', category);
    return response.data.data;
  }

  // ==================== Knowledge Base ====================
  async getKnowledgeEntries(params?: { page?: number; pageSize?: number; category?: string; search?: string }): Promise<PaginatedResponse<KnowledgeEntry>> {
    const response = await this.knowledgeClient.get<ApiResponse<PaginatedResponse<KnowledgeEntry>>>('/api/knowledge', { params });
    return response.data.data;
  }

  async getKnowledgeEntryById(id: string): Promise<KnowledgeEntry> {
    const response = await this.knowledgeClient.get<ApiResponse<KnowledgeEntry>>(`/api/knowledge/${id}`);
    return response.data.data;
  }

  async createKnowledgeEntry(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeEntry> {
    const response = await this.knowledgeClient.post<ApiResponse<KnowledgeEntry>>('/api/knowledge', entry);
    return response.data.data;
  }

  async updateKnowledgeEntry(id: string, entry: Partial<KnowledgeEntry>): Promise<KnowledgeEntry> {
    const response = await this.knowledgeClient.put<ApiResponse<KnowledgeEntry>>(`/api/knowledge/${id}`, entry);
    return response.data.data;
  }

  async deleteKnowledgeEntry(id: string): Promise<void> {
    await this.knowledgeClient.delete(`/api/knowledge/${id}`);
  }

  // ==================== Merchants ====================
  async getMerchants(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<Merchant>> {
    const response = await this.knowledgeClient.get<ApiResponse<PaginatedResponse<Merchant>>>('/api/merchants', { params });
    return response.data.data;
  }

  async getMerchantById(id: string): Promise<Merchant> {
    const response = await this.knowledgeClient.get<ApiResponse<Merchant>>(`/api/merchants/${id}`);
    return response.data.data;
  }

  async createMerchant(merchant: Omit<Merchant, 'id'>): Promise<Merchant> {
    const response = await this.knowledgeClient.post<ApiResponse<Merchant>>('/api/merchants', merchant);
    return response.data.data;
  }

  async updateMerchant(id: string, merchant: Partial<Merchant>): Promise<Merchant> {
    const response = await this.knowledgeClient.put<ApiResponse<Merchant>>(`/api/merchants/${id}`, merchant);
    return response.data.data;
  }

  async deleteMerchant(id: string): Promise<void> {
    await this.knowledgeClient.delete(`/api/merchants/${id}`);
  }

  // ==================== Training Documents ====================
  async getTrainingDocuments(params?: { page?: number; pageSize?: number; type?: string; status?: string }): Promise<PaginatedResponse<TrainingDocument>> {
    const response = await this.trainingClient.get<ApiResponse<PaginatedResponse<TrainingDocument>>>('/api/documents', { params });
    return response.data.data;
  }

  async getTrainingDocumentById(id: string): Promise<TrainingDocument> {
    const response = await this.trainingClient.get<ApiResponse<TrainingDocument>>(`/api/documents/${id}`);
    return response.data.data;
  }

  async deleteTrainingDocument(id: string): Promise<void> {
    await this.trainingClient.delete(`/api/documents/${id}`);
  }

  async uploadFile(file: File, type: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await this.trainingClient.post<ApiResponse<UploadResponse>>('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }

  async uploadArticle(data: { url?: string; content?: string; title: string; type: string }): Promise<TrainingDocument> {
    const response = await this.trainingClient.post<ApiResponse<TrainingDocument>>('/api/documents/article', data);
    return response.data.data;
  }

  async uploadMenuData(file: File): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.trainingClient.post<ApiResponse<{ imported: number; errors: string[] }>>('/api/documents/menu', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }

  // ==================== Conversations ====================
  async getConversations(params?: { page?: number; pageSize?: number; status?: string; search?: string; dateFrom?: string; dateTo?: string }): Promise<PaginatedResponse<Conversation>> {
    const response = await this.copilotClient.get<ApiResponse<PaginatedResponse<Conversation>>>('/api/conversations', { params });
    return response.data.data;
  }

  async getConversationById(id: string): Promise<Conversation> {
    const response = await this.copilotClient.get<ApiResponse<Conversation>>(`/api/conversations/${id}`);
    return response.data.data;
  }

  async updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation> {
    const response = await this.copilotClient.put<ApiResponse<Conversation>>(`/api/conversations/${id}`, data);
    return response.data.data;
  }

  // ==================== Analytics ====================
  async getAnalytics(params?: { dateFrom?: string; dateTo?: string }): Promise<AnalyticsOverview> {
    const response = await this.copilotClient.get<ApiResponse<AnalyticsOverview>>('/api/analytics/overview', { params });
    return response.data.data;
  }

  async getConversationTrends(params?: { days?: number }): Promise<{ date: string; conversations: number; messages: number }[]> {
    const response = await this.copilotClient.get<ApiResponse<{ date: string; conversations: number; messages: number }[]>>('/api/analytics/trends', { params });
    return response.data.data;
  }

  async getFailedQueries(params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<{ query: string; count: number; lastSeen: string }>> {
    const response = await this.copilotClient.get<ApiResponse<PaginatedResponse<{ query: string; count: number; lastSeen: string }>>>( '/api/analytics/failed-queries', { params }
    );
    return response.data.data;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
