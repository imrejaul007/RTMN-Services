// Workflow Marketplace Type Definitions

export interface WorkflowStep {
  order: number;
  action: string;
  condition?: string;
  assignee?: string;
  description?: string;
  timeout?: number; // in seconds
  retryable?: boolean;
}

export interface Review {
  rating: number;
  comment: string;
  userId: string;
  createdAt: Date;
}

export interface WorkflowDocument {
  workflowId: string;
  name: string;
  industry: string;
  description: string;
  category: WorkflowCategory;
  steps: WorkflowStep[];
  reviews: Review[];
  installs: number;
  isFeatured: boolean;
  author?: string;
  version: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type WorkflowCategory =
  | 'refund'
  | 'cancellation'
  | 'upgrade'
  | 'claim'
  | 'support'
  | 'onboarding'
  | 'checkout'
  | 'feedback'
  | 'loyalty'
  | 'compliance'
  | 'general';

export type Industry =
  | 'retail'
  | 'restaurant'
  | 'hotel'
  | 'healthcare'
  | 'insurance'
  | 'fitness'
  | 'beauty'
  | 'automotive'
  | 'realestate'
  | 'legal'
  | 'education'
  | 'general';

export interface InstallationDocument {
  installationId: string;
  workflowId: string;
  clientId: string;
  config: Record<string, unknown>;
  status: 'pending' | 'active' | 'paused' | 'failed';
  installedAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface SearchFilters {
  industry?: Industry;
  category?: WorkflowCategory;
  query?: string;
  minRating?: number;
  featured?: boolean;
  sortBy?: 'installs' | 'rating' | 'newest';
}

export interface MarketplaceStats {
  totalWorkflows: number;
  totalInstalls: number;
  categories: Record<string, number>;
  industries: Record<string, number>;
}
