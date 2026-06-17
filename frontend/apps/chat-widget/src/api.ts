import type {
  ChatMessage,
  ChatSession,
  Agent,
  Attachment,
  APIError,
  ChatConfig,
  AIResponsesConfig
} from './types';

export class ChatAPI {
  private config: ChatConfig;
  private sessionId: string | null = null;

  constructor(config: ChatConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return this.config.apiUrl.replace(/\/$/, '');
  }

  private get headers(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        }
      });

      if (!response.ok) {
        const error: APIError = {
          code: `HTTP_${response.status}`,
          message: response.statusText
        };
        throw error;
      }

      return response.json();
    } catch (err) {
      if ((err as APIError).code) {
        throw err;
      }
      throw {
        code: 'NETWORK_ERROR',
        message: 'Network request failed'
      } as APIError;
    }
  }

  async createSession(metadata?: Record<string, string>): Promise<ChatSession> {
    const session = await this.request<ChatSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        businessId: this.config.businessId,
        widgetId: this.config.widgetId,
        metadata: {
          ...this.config.metadata,
          ...metadata
        }
      })
    });
    this.sessionId = session.id;
    return session;
  }

  async getSession(sessionId: string): Promise<ChatSession> {
    return this.request<ChatSession>(`/sessions/${sessionId}`);
  }

  async endSession(sessionId: string): Promise<void> {
    await this.request(`/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  }

  async sendMessage(
    sessionId: string,
    content: string,
    attachments?: Attachment[]
  ): Promise<ChatMessage> {
    return this.request<ChatMessage>(`/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        attachments
      })
    });
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/sessions/${sessionId}/messages`);
  }

  async markAsRead(sessionId: string, messageId: string): Promise<void> {
    await this.request(`/sessions/${sessionId}/messages/${messageId}/read`, {
      method: 'POST'
    });
  }

  async requestAgentTransfer(
    sessionId: string,
    department?: string
  ): Promise<{ success: boolean; agent?: Agent }> {
    return this.request(`/sessions/${sessionId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ department })
    });
  }

  async getAvailableAgents(): Promise<Agent[]> {
    return this.request<Agent[]>(`/businesses/${this.config.businessId}/agents`);
  }

  async getAIResponse(
    sessionId: string,
    message: string,
    context?: ChatMessage[]
  ): Promise<ChatMessage> {
    const aiConfig: AIResponsesConfig = {
      enabled: true,
      placeholder: 'Type a message...',
      fallbackMessage: 'I\'m not sure I understand. Would you like to connect with a human agent?',
      ...this.config.AIResponses
    };

    return this.request<ChatMessage>(`/sessions/${sessionId}/ai/respond`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        context: context?.map(m => ({
          role: m.type,
          content: m.content
        })),
        botName: aiConfig.botName || 'AI Assistant',
        fallbackMessage: aiConfig.fallbackMessage
      })
    });
  }

  async uploadFile(
    sessionId: string,
    file: File
  ): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);

    const maxSize = this.config.fileUpload?.maxSize || 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw {
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds ${maxSize / 1024 / 1024}MB limit`
      } as APIError;
    }

    const allowedTypes = this.config.fileUpload?.allowedTypes || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/doc',
      'application/docx'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw {
        code: 'INVALID_FILE_TYPE',
        message: `File type ${file.type} is not allowed`
      } as APIError;
    }

    const response = await fetch(
      `${this.baseUrl}/sessions/${sessionId}/attachments`,
      {
        method: 'POST',
        headers: this.config.apiKey
          ? { Authorization: `Bearer ${this.config.apiKey}` }
          : {},
        body: formData
      }
    );

    if (!response.ok) {
      throw {
        code: 'UPLOAD_FAILED',
        message: 'File upload failed'
      } as APIError;
    }

    return response.json();
  }

  async getFileUrl(attachmentId: string): Promise<string> {
    const result = await this.request<{ url: string }>(
      `/attachments/${attachmentId}/url`
    );
    return result.url;
  }

  setSessionId(id: string): void {
    this.sessionId = id;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}
