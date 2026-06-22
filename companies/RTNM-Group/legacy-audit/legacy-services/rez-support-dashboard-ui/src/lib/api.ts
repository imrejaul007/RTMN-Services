const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4052';
const TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'your-token';

interface Conversation {
  id: string;
  channel: 'whatsapp' | 'email' | 'instagram' | 'web' | 'chat';
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  assignedAgent?: string;
  assignedAgentName?: string;
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject?: string;
  tags: string[];
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  slaDeadline?: string;
  sourceService: string;
}

interface Message {
  id: string;
  content: string;
  sender: 'customer' | 'agent' | 'system' | 'bot';
  senderName?: string;
  timestamp: string;
  read: boolean;
}

interface Analytics {
  totalConversations: number;
  openConversations: number;
  resolvedToday: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  channelBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
}

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': TOKEN,
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  conversations: {
    list: (params?: { channel?: string; status?: string; page?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.channel) searchParams.set('channel', params.channel);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.page) searchParams.set('page', params.page.toString());
      return fetchApi(`/api/inbox/conversations?${searchParams}`);
    },
    get: (id: string) => fetchApi(`/api/inbox/conversations/${id}`),
    reply: (id: string, content: string) =>
      fetchApi(`/api/inbox/conversations/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    assign: (id: string, agentId: string, agentName: string) =>
      fetchApi(`/api/inbox/conversations/${id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ agentId, agentName }),
      }),
    updateStatus: (id: string, status: string) =>
      fetchApi(`/api/inbox/conversations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    updatePriority: (id: string, priority: string) =>
      fetchApi(`/api/inbox/conversations/${id}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({ priority }),
      }),
  },
  analytics: {
    dashboard: () => fetchApi('/api/inbox/analytics'),
    agentStats: () => fetchApi('/api/inbox/agents/stats'),
    queue: () => fetchApi('/api/inbox/queue'),
  },
  sync: () => fetchApi('/api/inbox/sync', { method: 'POST' }),
};

export type { Conversation, Message, Analytics };
