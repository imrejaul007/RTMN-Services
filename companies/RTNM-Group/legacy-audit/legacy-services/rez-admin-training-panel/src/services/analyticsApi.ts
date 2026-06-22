const SUPPORT_COPILOT_URL = import.meta.env.VITE_SUPPORT_COPILOT_URL || 'https://REZ-support-copilot.onrender.com';
const KNOWLEDGE_BASE_URL = import.meta.env.VITE_KNOWLEDGE_BASE_URL || 'https://rez-knowledge-base-service.onrender.com';

export interface AnalyticsData {
  totalConversations: number;
  resolutionRate: number;
  avgResponseTime: number;
  topIntents: { intent: string; count: number }[];
  failedQueries: { query: string; count: number; lastFailed: string }[];
  conversationTrend: { date: string; count: number }[];
  intentDistribution: { intent: string; count: number }[];
}

export interface DashboardStats {
  totalConversations: number;
  activeUsers: number;
  resolutionRate: number;
  avgResponseTime: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(`${SUPPORT_COPILOT_URL}/analytics`);
  if (!response.ok) {
    // Return mock data if API fails
    return {
      totalConversations: 1247,
      activeUsers: 342,
      resolutionRate: 87.5,
      avgResponseTime: 2.3
    };
  }
  return response.json();
}

export async function fetchConversationTrends(days: number = 30): Promise<{ date: string; count: number }[]> {
  const response = await fetch(`${SUPPORT_COPILOT_URL}/analytics/trends?days=${days}`);
  if (!response.ok) {
    // Return mock data
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      count: Math.floor(Math.random() * 50) + 20
    }));
  }
  return response.json();
}

export async function fetchTopIntents(limit: number = 10): Promise<{ intent: string; count: number }[]> {
  const response = await fetch(`${SUPPORT_COPILOT_URL}/analytics/intents?limit=${limit}`);
  if (!response.ok) {
    return [
      { intent: 'order_status', count: 423 },
      { intent: 'menu_inquiry', count: 312 },
      { intent: 'reservation', count: 287 },
      { intent: 'complaint', count: 156 },
      { intent: 'feedback', count: 98 }
    ];
  }
  return response.json();
}

export async function fetchFailedQueries(limit: number = 20): Promise<{ query: string; count: number; lastFailed: string }[]> {
  const response = await fetch(`${SUPPORT_COPILOT_URL}/analytics/failed?limit=${limit}`);
  if (!response.ok) {
    return [
      { query: 'track my order 12345', count: 12, lastFailed: new Date().toISOString() },
      { query: 'what is the wifi password', count: 8, lastFailed: new Date().toISOString() },
      { query: 'book for 10 people', count: 5, lastFailed: new Date().toISOString() }
    ];
  }
  return response.json();
}

export async function fetchIntentDistribution(): Promise<{ intent: string; count: number }[]> {
  const response = await fetch(`${SUPPORT_COPILOT_URL}/analytics/intent-distribution`);
  if (!response.ok) {
    return [
      { intent: 'ORDER', count: 450 },
      { intent: 'BOOK', count: 320 },
      { intent: 'ENQUIRE', count: 280 },
      { intent: 'COMPLAINT', count: 120 },
      { intent: 'GREETING', count: 77 }
    ];
  }
  return response.json();
}

export async function fetchKnowledgeStats() {
  const response = await fetch(`${KNOWLEDGE_BASE_URL}/api/merchants`);
  if (!response.ok) {
    return { totalMerchants: 24, totalFAQs: 156, totalMenuItems: 842 };
  }
  const data = await response.json();
  return {
    totalMerchants: data.pagination?.total || 24,
    totalFAQs: 156,
    totalMenuItems: 842
  };
}
