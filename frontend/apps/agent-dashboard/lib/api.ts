import type {
  Ticket,
  Customer,
  Customer360,
  KBArticle,
  AISuggestion,
  DashboardMetrics,
  Agent,
  TicketFilters,
  TicketMessage,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4399';

// Demo data for development
const DEMO_AGENT: Agent = {
  id: 'agent-001',
  name: 'Sarah Chen',
  email: 'sarah.chen@rtmn.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  status: 'online',
  role: 'agent',
};

const DEMO_METRICS: DashboardMetrics = {
  openTickets: 47,
  avgResponseTime: '2.4 min',
  resolutionRate: 94.2,
  customerSatisfaction: 4.7,
  ticketsToday: 23,
  ticketsThisWeek: 156,
  urgentTickets: 8,
};

const DEMO_TICKETS: Ticket[] = [
  {
    id: 'TKT-001',
    subject: 'Order delivery delayed - tracking not updating',
    description: 'My order #ORD-12345 was supposed to arrive 3 days ago but tracking shows no updates.',
    status: 'open',
    priority: 'high',
    channel: 'email',
    customerId: 'CUST-001',
    customerName: 'Michael Roberts',
    customerEmail: 'michael.r@email.com',
    assignedAgentId: 'agent-001',
    assignedAgentName: 'Sarah Chen',
    tags: ['shipping', 'delay', 'vip'],
    createdAt: '2024-03-15T09:30:00Z',
    updatedAt: '2024-03-15T14:20:00Z',
    firstResponseAt: '2024-03-15T09:45:00Z',
    slaDeadline: '2024-03-15T21:30:00Z',
    messages: [
      {
        id: 'MSG-001',
        ticketId: 'TKT-001',
        senderId: 'CUST-001',
        senderName: 'Michael Roberts',
        senderType: 'customer',
        content: 'My order #ORD-12345 was supposed to arrive 3 days ago but tracking shows no updates. This is very frustrating as I need this for a business trip.',
        createdAt: '2024-03-15T09:30:00Z',
      },
      {
        id: 'MSG-002',
        ticketId: 'TKT-001',
        senderId: 'agent-001',
        senderName: 'Sarah Chen',
        senderType: 'agent',
        content: 'Hi Michael, I sincerely apologize for the delay. I\'ve checked with our logistics team and found that your package is stuck at a distribution center due to weather conditions. I\'m escalating this to our priority handling team.',
        createdAt: '2024-03-15T09:45:00Z',
      },
    ],
  },
  {
    id: 'TKT-002',
    subject: 'Request for refund - damaged product received',
    description: 'Received damaged item, need immediate refund.',
    status: 'pending',
    priority: 'urgent',
    channel: 'chat',
    customerId: 'CUST-002',
    customerName: 'Emma Thompson',
    customerEmail: 'emma.t@email.com',
    tags: ['refund', 'damaged', 'quality'],
    createdAt: '2024-03-15T08:15:00Z',
    updatedAt: '2024-03-15T11:00:00Z',
    messages: [],
  },
  {
    id: 'TKT-003',
    subject: 'How to reset my account password?',
    description: 'Need help resetting account credentials.',
    status: 'resolved',
    priority: 'low',
    channel: 'portal',
    customerId: 'CUST-003',
    customerName: 'James Wilson',
    customerEmail: 'james.w@email.com',
    assignedAgentId: 'agent-001',
    assignedAgentName: 'Sarah Chen',
    tags: ['account', 'password', 'reset'],
    createdAt: '2024-03-14T16:00:00Z',
    updatedAt: '2024-03-14T16:30:00Z',
    resolvedAt: '2024-03-14T16:30:00Z',
    firstResponseAt: '2024-03-14T16:15:00Z',
    messages: [],
  },
  {
    id: 'TKT-004',
    subject: 'Bulk order inquiry - corporate pricing',
    description: 'Interested in placing bulk order for our company.',
    status: 'open',
    priority: 'medium',
    channel: 'phone',
    customerId: 'CUST-004',
    customerName: 'Lisa Anderson',
    customerEmail: 'lisa.a@corp.com',
    company: 'Tech Solutions Inc.',
    tags: ['enterprise', 'bulk-order', 'pricing'],
    createdAt: '2024-03-15T10:00:00Z',
    updatedAt: '2024-03-15T10:00:00Z',
    messages: [],
  },
  {
    id: 'TKT-005',
    subject: 'Product quality issue - repeated complaints',
    description: 'This is the third time receiving defective product.',
    status: 'open',
    priority: 'high',
    channel: 'social',
    customerId: 'CUST-005',
    customerName: 'David Martinez',
    customerEmail: 'david.m@email.com',
    tags: ['quality', 'repeat-issue', 'compensation'],
    createdAt: '2024-03-15T07:45:00Z',
    updatedAt: '2024-03-15T12:00:00Z',
    messages: [],
  },
];

const DEMO_CUSTOMER_360: Customer360 = {
  customer: {
    id: 'CUST-001',
    name: 'Michael Roberts',
    email: 'michael.r@email.com',
    phone: '+1 (555) 123-4567',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    company: 'Roberts Consulting',
    totalOrders: 47,
    totalSpent: 12450.00,
    lifetimeValue: 15800.00,
    churnRisk: 'low',
    satisfaction: 4.8,
    tier: 'platinum',
    createdAt: '2022-06-15T00:00:00Z',
    lastOrderAt: '2024-03-10T00:00:00Z',
    lastContactAt: '2024-03-15T09:30:00Z',
    tags: ['vip', 'enterprise', 'tech'],
    notes: 'Key account - always available for priority handling',
  },
  orders: [
    { id: 'ORD-12345', customerId: 'CUST-001', status: 'processing', total: 459.99, items: 3, createdAt: '2024-03-12T00:00:00Z' },
    { id: 'ORD-12300', customerId: 'CUST-001', status: 'delivered', total: 234.50, items: 2, createdAt: '2024-03-01T00:00:00Z', deliveredAt: '2024-03-05T00:00:00Z' },
    { id: 'ORD-12250', customerId: 'CUST-001', status: 'delivered', total: 890.00, items: 5, createdAt: '2024-02-15T00:00:00Z', deliveredAt: '2024-02-20T00:00:00Z' },
  ],
  payments: [
    { id: 'PAY-001', customerId: 'CUST-001', amount: 459.99, status: 'completed', method: 'Credit Card', createdAt: '2024-03-12T00:00:00Z' },
    { id: 'PAY-002', customerId: 'CUST-001', amount: 234.50, status: 'completed', method: 'PayPal', createdAt: '2024-03-01T00:00:00Z' },
  ],
  tickets: [
    { id: 'TKT-001', subject: 'Order delivery delayed', status: 'open', priority: 'high', createdAt: '2024-03-15T09:30:00Z' },
    { id: 'TKT-098', subject: 'Bulk order inquiry', status: 'resolved', priority: 'medium', createdAt: '2024-02-28T00:00:00Z', resolvedAt: '2024-02-28T14:00:00Z' },
  ],
  predictions: {
    churnRisk: 12,
    lifetimeValue: 15800,
    nextPurchaseDate: '2024-04-15',
    recommendedActions: [
      'Send personalized thank you note for being a loyal customer',
      'Offer exclusive early access to new product launches',
      'Provide priority customer support for all future interactions',
    ],
    sentiment: 'positive',
    engagementScore: 85,
  },
};

const DEMO_SUGGESTIONS: AISuggestion[] = [
  {
    id: 'SUG-001',
    type: 'reply',
    confidence: 0.94,
    title: 'Proactive shipping update',
    description: 'Send proactive message with compensation offer for delivery delay.',
    action: { label: 'Send Message', handler: 'sendMessage' },
  },
  {
    id: 'SUG-002',
    type: 'cross-sell',
    confidence: 0.87,
    title: 'Premium membership upgrade',
    description: 'Customer qualifies for premium tier based on purchase history.',
    action: { label: 'Offer Upgrade', handler: 'offerUpgrade' },
  },
  {
    id: 'SUG-003',
    type: 'retention',
    confidence: 0.82,
    title: 'Loyalty reward',
    description: 'Issue $25 credit for inconvenience caused by delay.',
    action: { label: 'Apply Credit', handler: 'applyCredit' },
  },
];

const DEMO_KB_ARTICLES: KBArticle[] = [
  {
    id: 'KB-001',
    title: 'How to Process Refunds',
    summary: 'Step-by-step guide for processing customer refunds in the system.',
    content: 'Full refund processing guide content...',
    category: 'Operations',
    tags: ['refund', 'payments', 'processing'],
    views: 1523,
    helpful: 342,
    updatedAt: '2024-03-10T00:00:00Z',
  },
  {
    id: 'KB-002',
    title: 'Handling Shipping Delays',
    summary: 'Best practices for managing customer expectations during shipping delays.',
    content: 'Shipping delay management content...',
    category: 'Customer Service',
    tags: ['shipping', 'delay', 'communication'],
    views: 892,
    helpful: 234,
    updatedAt: '2024-03-08T00:00:00Z',
  },
  {
    id: 'KB-003',
    title: 'Escalation Procedures',
    summary: 'When and how to escalate tickets to supervisors or specialized teams.',
    content: 'Escalation procedures content...',
    category: 'Workflow',
    tags: ['escalation', 'procedure', 'workflow'],
    views: 567,
    helpful: 189,
    updatedAt: '2024-03-05T00:00:00Z',
  },
];

// Simulated delay for API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API Client Class
class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Use demo data for development
    await delay(300);

    if (endpoint.includes('/tickets')) {
      if (endpoint.match(/\/tickets\/[^/]+$/)) {
        const ticketId = endpoint.split('/').pop();
        return DEMO_TICKETS.find(t => t.id === ticketId) as T;
      }
      return DEMO_TICKETS as T;
    }

    if (endpoint.includes('/customers')) {
      if (endpoint.match(/\/customers\/[^/]+$/)) {
        const customerId = endpoint.split('/').pop();
        if (customerId === 'CUST-001') {
          return DEMO_CUSTOMER_360 as T;
        }
      }
      return {
        customers: [],
        total: 0,
      } as T;
    }

    if (endpoint.includes('/metrics')) {
      return DEMO_METRICS as T;
    }

    if (endpoint.includes('/suggestions')) {
      return DEMO_SUGGESTIONS as T;
    }

    if (endpoint.includes('/knowledge')) {
      return DEMO_KB_ARTICLES as T;
    }

    if (endpoint.includes('/agent')) {
      return DEMO_AGENT as T;
    }

    throw new Error(`Unknown endpoint: ${endpoint}`);
  }

  // Dashboard Metrics
  async getMetrics(): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>('/api/agent/metrics');
  }

  // Tickets
  async getTickets(filters?: TicketFilters): Promise<Ticket[]> {
    return this.request<Ticket[]>('/api/agent/tickets');
  }

  async getTicket(id: string): Promise<Ticket> {
    return this.request<Ticket>(`/api/agent/tickets/${id}`);
  }

  async updateTicket(id: string, data: Partial<Ticket>): Promise<Ticket> {
    await delay(200);
    const ticket = DEMO_TICKETS.find(t => t.id === id);
    if (!ticket) throw new Error('Ticket not found');
    return { ...ticket, ...data, updatedAt: new Date().toISOString() };
  }

  async addMessage(ticketId: string, content: string): Promise<TicketMessage> {
    await delay(300);
    return {
      id: `MSG-${Date.now()}`,
      ticketId,
      senderId: 'agent-001',
      senderName: 'Sarah Chen',
      senderType: 'agent',
      content,
      createdAt: new Date().toISOString(),
    };
  }

  // Customers
  async searchCustomers(query: string): Promise<Customer[]> {
    await delay(400);
    if (query.toLowerCase().includes('michael')) {
      return [DEMO_CUSTOMER_360.customer];
    }
    return [];
  }

  async getCustomer360(id: string): Promise<Customer360> {
    return this.request<Customer360>(`/api/agent/customers/${id}`);
  }

  // AI Suggestions
  async getSuggestions(context: { ticketId?: string; customerId?: string }): Promise<AISuggestion[]> {
    return this.request<AISuggestion[]>('/api/agent/suggestions');
  }

  // Knowledge Base
  async searchKnowledge(query: string): Promise<KBArticle[]> {
    return this.request<KBArticle[]>('/api/agent/knowledge');
  }

  // Agent
  async getCurrentAgent(): Promise<Agent> {
    return this.request<Agent>('/api/agent/me');
  }
}

export const api = new APIClient(API_BASE);
export { DEMO_METRICS, DEMO_TICKETS, DEMO_CUSTOMER_360, DEMO_SUGGESTIONS };
