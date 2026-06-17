import type {
  Ticket,
  TicketMessage,
  FAQArticle,
  FAQCategory,
  ChatSession,
  ChatMessage,
  CustomerProfile,
  ApiResponse,
  PaginatedResponse,
  SubmitTicketForm,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4399';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'An error occurred',
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Ticket API
  async getTickets(page = 1, pageSize = 10): Promise<ApiResponse<PaginatedResponse<Ticket>>> {
    return this.request(`/api/tickets?page=${page}&pageSize=${pageSize}`);
  }

  async getTicket(id: string): Promise<ApiResponse<Ticket>> {
    return this.request(`/api/tickets/${id}`);
  }

  async createTicket(data: SubmitTicketForm): Promise<ApiResponse<Ticket>> {
    const formData = new FormData();
    formData.append('subject', data.subject);
    formData.append('description', data.description);
    formData.append('category', data.category);
    formData.append('priority', data.priority);

    if (data.attachments) {
      data.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });
    }

    return this.request('/api/tickets', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }

  async addTicketMessage(
    ticketId: string,
    content: string
  ): Promise<ApiResponse<TicketMessage>> {
    return this.request(`/api/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async closeTicket(id: string): Promise<ApiResponse<Ticket>> {
    return this.request(`/api/tickets/${id}/close`, {
      method: 'POST',
    });
  }

  // FAQ API
  async getFAQCategories(): Promise<ApiResponse<FAQCategory[]>> {
    return this.request('/api/faq/categories');
  }

  async getFAQArticles(
    category?: string,
    search?: string,
    page = 1,
    pageSize = 10
  ): Promise<ApiResponse<PaginatedResponse<FAQArticle>>> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    return this.request(`/api/faq/articles?${params.toString()}`);
  }

  async getFAQArticle(id: string): Promise<ApiResponse<FAQArticle>> {
    return this.request(`/api/faq/articles/${id}`);
  }

  async rateFAQArticle(
    id: string,
    helpful: boolean
  ): Promise<ApiResponse<{ helpful: number; notHelpful: number }>> {
    return this.request(`/api/faq/articles/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ helpful }),
    });
  }

  // Chat API
  async createChatSession(): Promise<ApiResponse<ChatSession>> {
    return this.request('/api/chat/sessions', {
      method: 'POST',
    });
  }

  async getChatSession(id: string): Promise<ApiResponse<ChatSession>> {
    return this.request(`/api/chat/sessions/${id}`);
  }

  async getChatMessages(sessionId: string): Promise<ApiResponse<ChatMessage[]>> {
    return this.request(`/api/chat/sessions/${sessionId}/messages`);
  }

  async sendChatMessage(
    sessionId: string,
    content: string
  ): Promise<ApiResponse<ChatMessage>> {
    return this.request(`/api/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async endChatSession(sessionId: string): Promise<ApiResponse<ChatSession>> {
    return this.request(`/api/chat/sessions/${sessionId}/end`, {
      method: 'POST',
    });
  }

  // Profile API
  async getProfile(): Promise<ApiResponse<CustomerProfile>> {
    return this.request('/api/profile');
  }

  async updateProfile(
    data: Partial<CustomerProfile>
  ): Promise<ApiResponse<CustomerProfile>> {
    return this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updatePreferences(
    data: Partial<CustomerProfile['preferences']>
  ): Promise<ApiResponse<CustomerProfile['preferences']>> {
    return this.request('/api/profile/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
