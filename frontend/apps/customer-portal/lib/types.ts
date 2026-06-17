// Ticket types
export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'customer' | 'agent';
  senderName: string;
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

// FAQ types
export interface FAQArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  helpful: number;
  notHelpful: number;
  createdAt: string;
  updatedAt: string;
}

export interface FAQCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  articleCount: number;
}

// Chat types
export interface ChatSession {
  id: string;
  status: 'waiting' | 'active' | 'ended';
  agentId?: string;
  agentName?: string;
  startedAt: string;
  endedAt?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderType: 'customer' | 'agent' | 'system';
  senderName: string;
  content: string;
  createdAt: string;
}

// User/Profile types
export interface CustomerProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  avatar?: string;
  createdAt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  language: string;
  timezone: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form types
export interface SubmitTicketForm {
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  attachments?: File[];
}

export interface ChatInput {
  sessionId: string;
  message: string;
}
