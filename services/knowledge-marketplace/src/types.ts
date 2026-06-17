import { Document, Types } from 'mongoose';

// Knowledge Types
export type KnowledgeType = 'sop' | 'compliance' | 'training' | 'manual' | 'guide';
export type Industry =
  | 'hospitality' | 'healthcare' | 'retail' | 'hotel' | 'legal'
  | 'education' | 'agriculture' | 'automotive' | 'beauty' | 'fashion'
  | 'fitness' | 'gaming' | 'government' | 'home-services' | 'manufacturing'
  | 'non-profit' | 'professional' | 'sports' | 'travel' | 'entertainment'
  | 'construction' | 'financial' | 'real-estate' | 'transport';

export interface ContentSection {
  title: string;
  content: string;
  order: number;
}

export interface Content {
  summary: string;
  sections: ContentSection[];
}

export interface Citation {
  source: string;
  url?: string;
  description: string;
  date?: string;
}

export interface Review {
  userId?: string;
  userName?: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface KnowledgeBase {
  knowledgeId: string;
  title: string;
  description: string;
  industry: Industry;
  type: KnowledgeType;
  content: Content;
  citations: Citation[];
  reviews: Review[];
  installs: number;
  rating: number;
  tags: string[];
  author: string;
  version: string;
  isPublished: boolean;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeDocument extends KnowledgeBase, Document {}

// Installation Types
export interface InstallationBase {
  installationId: string;
  knowledgeId: string;
  clientId: string;
  clientName: string;
  industry: Industry;
  installedAt: Date;
  status: 'active' | 'paused' | 'uninstalled';
  lastUsedAt: Date;
  usageCount: number;
}

export interface InstallationDocument extends InstallationBase, Document {}

// Category Types
export interface Category {
  id: string;
  name: string;
  industry: Industry;
  type: KnowledgeType;
  count: number;
  icon: string;
  description: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Search Types
export interface SearchFilters {
  industry?: Industry;
  type?: KnowledgeType;
  tags?: string[];
  minRating?: number;
  isPremium?: boolean;
}

export interface SearchResult {
  knowledge: KnowledgeBase;
  relevanceScore: number;
  matchedTerms: string[];
}

// Install Request
export interface InstallRequest {
  knowledgeId: string;
  clientId: string;
  clientName: string;
}
