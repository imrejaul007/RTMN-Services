// Workflow & Knowledge Marketplace Types

export interface Workflow {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  industry: Industry;
  author: Author;
  rating: number;
  reviewCount: number;
  installCount: number;
  price: number;
  isFree: boolean;
  tags: string[];
  steps: WorkflowStep[];
  integrations: string[];
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  isInstalled: boolean;
  version: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  service: string;
  action: string;
  config: Record<string, unknown>;
}

export interface KnowledgePack {
  id: string;
  name: string;
  description: string;
  category: KnowledgeCategory;
  industry: Industry;
  author: Author;
  rating: number;
  reviewCount: number;
  downloadCount: number;
  price: number;
  isFree: boolean;
  tags: string[];
  documents: KnowledgeDocument[];
  sources: string[];
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  isInstalled: boolean;
  version: string;
  documentCount: number;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  type: 'pdf' | 'doc' | 'link' | 'video' | 'article';
  url: string;
  size?: string;
}

export interface Author {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
  totalProducts: number;
  rating: number;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  title: string;
  content: string;
  createdAt: string;
  helpful: number;
  response?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export type WorkflowCategory =
  | 'automation'
  | 'integration'
  | 'reporting'
  | 'communication'
  | 'onboarding'
  | 'analytics'
  | 'compliance'
  | 'hr'
  | 'finance'
  | 'marketing';

export type KnowledgeCategory =
  | 'guides'
  | 'templates'
  | 'policies'
  | 'training'
  | 'compliance'
  | 'best-practices'
  | 'case-studies'
  | 'regulations';

export type Industry =
  | 'all'
  | 'restaurant'
  | 'hotel'
  | 'healthcare'
  | 'retail'
  | 'legal'
  | 'education'
  | 'automotive'
  | 'beauty'
  | 'fitness'
  | 'manufacturing'
  | 'real-estate'
  | 'hospitality'
  | 'fashion'
  | 'entertainment'
  | 'transport'
  | 'government'
  | 'non-profit';

export interface IndustryOption {
  id: Industry;
  name: string;
  icon: string;
}

export interface MarketplaceFilters {
  category?: WorkflowCategory | KnowledgeCategory;
  industry?: Industry;
  search?: string;
  sortBy?: 'popular' | 'rating' | 'newest' | 'price-low' | 'price-high';
  priceFilter?: 'all' | 'free' | 'paid';
}

export interface InstallRequest {
  itemId: string;
  itemType: 'workflow' | 'knowledge';
  workspaceId?: string;
  config?: Record<string, unknown>;
}

export interface InstallResponse {
  success: boolean;
  installationId: string;
  message: string;
  accessUrl?: string;
}

export interface ReviewRequest {
  itemId: string;
  itemType: 'workflow' | 'knowledge';
  rating: number;
  title: string;
  content: string;
}
