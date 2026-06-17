// Ticket Types
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketChannel = 'email' | 'chat' | 'phone' | 'social' | 'portal';

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: TicketChannel;
  customerId: string;
  customerName: string;
  customerEmail: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  firstResponseAt?: string;
  slaDeadline?: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'agent' | 'system';
  content: string;
  createdAt: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

// Customer Types
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  company?: string;
  totalOrders: number;
  totalSpent: number;
  lifetimeValue: number;
  churnRisk: 'low' | 'medium' | 'high';
  satisfaction: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  createdAt: string;
  lastOrderAt?: string;
  lastContactAt?: string;
  tags: string[];
  notes?: string;
}

export interface CustomerOrder {
  id: string;
  customerId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: number;
  createdAt: string;
  deliveredAt?: string;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  method: string;
  createdAt: string;
}

export interface CustomerTicket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  resolvedAt?: string;
}

export interface Customer360 {
  customer: Customer;
  orders: CustomerOrder[];
  payments: CustomerPayment[];
  tickets: CustomerTicket[];
  predictions: AIPrediction;
}

export interface AIPrediction {
  churnRisk: number;
  lifetimeValue: number;
  nextPurchaseDate?: string;
  recommendedActions: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  engagementScore: number;
}

// Knowledge Base Types
export interface KBArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  helpful: number;
  updatedAt: string;
}

// AI Suggestion Types
export interface AISuggestion {
  id: string;
  type: 'reply' | 'refund' | 'escalate' | 'cross-sell' | 'retention';
  confidence: number;
  title: string;
  description: string;
  action?: {
    label: string;
    handler: string;
  };
}

// Dashboard Metrics
export interface DashboardMetrics {
  openTickets: number;
  avgResponseTime: string;
  resolutionRate: number;
  customerSatisfaction: number;
  ticketsToday: number;
  ticketsThisWeek: number;
  urgentTickets: number;
}

// Agent Types
export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  role: 'agent' | 'supervisor' | 'admin';
}

// Filter Types
export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  channel?: TicketChannel[];
  assignee?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}
