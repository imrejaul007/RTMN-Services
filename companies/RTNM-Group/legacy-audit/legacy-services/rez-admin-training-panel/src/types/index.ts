// FAQ Types
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'inactive';
}

export interface FAQCategory {
  id: string;
  name: string;
  description: string;
  faqCount: number;
}

// Knowledge Base Types
export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  merchantId?: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'inactive';
}

export interface Merchant {
  id: string;
  name: string;
  description: string;
  logo?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  categories: string[];
  status: 'active' | 'inactive';
}

// Training Data Types
export interface TrainingDocument {
  id: string;
  title: string;
  type: 'book' | 'article' | 'document' | 'menu';
  fileUrl?: string;
  content?: string;
  sourceUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processingProgress?: number;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    language?: string;
  };
}

export interface UploadResponse {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
}

// Conversation Types
export interface Conversation {
  id: string;
  sessionId: string;
  userId?: string;
  messages: Message[];
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'completed' | 'abandoned';
  intent?: string;
  resolved: boolean;
  rating?: number;
  feedback?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  url: string;
}

// Analytics Types
export interface AnalyticsOverview {
  totalConversations: number;
  totalMessages: number;
  resolutionRate: number;
  avgResponseTime: number;
  activeUsers: number;
  failedQueries: number;
  popularIntents: IntentStat[];
  conversationsByDay: DayStat[];
  conversationStatus: {
    completed: number;
    abandoned: number;
    active: number;
  };
}

export interface IntentStat {
  intent: string;
  count: number;
  percentage: number;
}

export interface DayStat {
  date: string;
  count: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Dashboard Stats
export interface DashboardStats {
  knowledgeEntries: number;
  trainingDocuments: number;
  faqs: number;
  merchants: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'faq_added' | 'document_uploaded' | 'knowledge_updated' | 'conversation';
  description: string;
  timestamp: string;
  user?: string;
}

// File Upload Types
export interface FileUploadType {
  id: string;
  name: string;
  type: 'pdf' | 'csv' | 'json' | 'url' | 'text';
  acceptedFormats: string[];
  maxSize: number; // in MB
}
