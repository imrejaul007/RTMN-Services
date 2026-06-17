import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type {
  Workflow,
  KnowledgePack,
  Review,
  Category,
  MarketplaceFilters,
  InstallRequest,
  InstallResponse,
  ReviewRequest,
} from './types';

// Utility function
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// API Base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://rtmn-pilot-onboarding.onrender.com';

// Mock data for workflows
const mockWorkflows: Workflow[] = [
  {
    id: 'wf-001',
    name: 'Customer Onboarding Flow',
    description: 'Automate customer onboarding with welcome emails, profile setup, and tutorial guides.',
    category: 'onboarding',
    industry: 'all',
    author: {
      id: 'auth-001',
      name: 'RTMN Team',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rtmn',
      verified: true,
      totalProducts: 45,
      rating: 4.8,
    },
    rating: 4.7,
    reviewCount: 128,
    installCount: 3420,
    price: 0,
    isFree: true,
    tags: ['onboarding', 'automation', 'email'],
    steps: [
      { id: 's1', name: 'Trigger', description: 'New user signup', service: 'auth', action: 'user.created' },
      { id: 's2', name: 'Send Welcome', description: 'Email welcome sequence', service: 'email', action: 'send' },
      { id: 's3', name: 'Create Profile', description: 'Initialize user profile', service: 'memory', action: 'create' },
    ],
    integrations: ['Email Service', 'Memory OS', 'Auth Service'],
    thumbnail: '/thumbnails/onboarding.png',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-06-01T14:30:00Z',
    isInstalled: false,
    version: '2.1.0',
    difficulty: 'beginner',
    estimatedTime: '5 min',
  },
  {
    id: 'wf-002',
    name: 'Invoice Processing Pipeline',
    description: 'Extract invoice data, validate entries, and route for approval automatically.',
    category: 'finance',
    industry: 'all',
    author: {
      id: 'auth-002',
      name: 'Finance Pro',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=finance',
      verified: true,
      totalProducts: 23,
      rating: 4.6,
    },
    rating: 4.5,
    reviewCount: 89,
    installCount: 1560,
    price: 29,
    isFree: false,
    tags: ['invoicing', 'finance', 'approval'],
    steps: [
      { id: 's1', name: 'Receive Invoice', description: 'Email or upload', service: 'file', action: 'upload' },
      { id: 's2', name: 'Extract Data', description: 'OCR and parsing', service: 'ai', action: 'extract' },
      { id: 's3', name: 'Route Approval', description: 'Send for approval', service: 'workflow', action: 'route' },
    ],
    integrations: ['AI Service', 'File Storage', 'Approval Chain'],
    thumbnail: '/thumbnails/invoice.png',
    createdAt: '2024-02-20T08:00:00Z',
    updatedAt: '2024-05-28T11:00:00Z',
    isInstalled: true,
    version: '1.5.0',
    difficulty: 'intermediate',
    estimatedTime: '15 min',
  },
  {
    id: 'wf-003',
    name: 'Restaurant Order Automation',
    description: 'Streamline order flow from POS to kitchen display with real-time status updates.',
    category: 'automation',
    industry: 'restaurant',
    author: {
      id: 'auth-003',
      name: 'Restaurant OS',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=restaurant',
      verified: true,
      totalProducts: 18,
      rating: 4.9,
    },
    rating: 4.8,
    reviewCount: 234,
    installCount: 4520,
    price: 49,
    isFree: false,
    tags: ['pos', 'kitchen', 'orders', 'restaurant'],
    steps: [
      { id: 's1', name: 'Order Received', description: 'From POS or online', service: 'pos', action: 'order.create' },
      { id: 's2', name: 'Kitchen Display', description: 'Send to KDS', service: 'kds', action: 'display' },
      { id: 's3', name: 'Status Updates', description: 'Real-time tracking', service: 'notification', action: 'push' },
    ],
    integrations: ['Restaurant OS', 'POS System', 'Kitchen Display', 'Notifications'],
    thumbnail: '/thumbnails/restaurant.png',
    createdAt: '2024-03-10T09:00:00Z',
    updatedAt: '2024-06-10T16:00:00Z',
    isInstalled: false,
    version: '3.0.0',
    difficulty: 'intermediate',
    estimatedTime: '30 min',
  },
  {
    id: 'wf-004',
    name: 'Hotel Guest Check-in',
    description: 'Digital check-in workflow with room assignment, key generation, and concierge setup.',
    category: 'automation',
    industry: 'hotel',
    author: {
      id: 'auth-004',
      name: 'Hotel OS',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hotel',
      verified: true,
      totalProducts: 22,
      rating: 4.7,
    },
    rating: 4.6,
    reviewCount: 156,
    installCount: 2890,
    price: 39,
    isFree: false,
    tags: ['checkin', 'hotel', 'guest', 'rooms'],
    steps: [
      { id: 's1', name: 'Guest Arrival', description: 'Digital or lobby', service: 'hotel', action: 'checkin.start' },
      { id: 's2', name: 'Room Assignment', description: 'Auto room selection', service: 'pms', action: 'assign' },
      { id: 's3', name: 'Key & Concierge', description: 'Digital key + services', service: 'key', action: 'generate' },
    ],
    integrations: ['Hotel OS', 'PMS', 'Key System', 'CRM'],
    thumbnail: '/thumbnails/hotel.png',
    createdAt: '2024-04-05T11:00:00Z',
    updatedAt: '2024-06-05T09:00:00Z',
    isInstalled: false,
    version: '2.0.0',
    difficulty: 'beginner',
    estimatedTime: '10 min',
  },
  {
    id: 'wf-005',
    name: 'HR Employee Offboarding',
    description: 'Comprehensive offboarding process with asset collection, access revocation, and exit interviews.',
    category: 'hr',
    industry: 'all',
    author: {
      id: 'auth-005',
      name: 'CorpPerks',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hr',
      verified: true,
      totalProducts: 31,
      rating: 4.5,
    },
    rating: 4.4,
    reviewCount: 67,
    installCount: 1230,
    price: 19,
    isFree: false,
    tags: ['hr', 'offboarding', 'compliance', 'access'],
    steps: [
      { id: 's1', name: 'Initiate', description: 'HR trigger', service: 'hr', action: 'offboard.start' },
      { id: 's2', name: 'Revoke Access', description: 'All systems', service: 'auth', action: 'revoke' },
      { id: 's3', name: 'Assets & Exit', description: 'Collect + interview', service: 'assets', action: 'collect' },
    ],
    integrations: ['HR Service', 'Auth Service', 'Assets Management', 'Calendar'],
    thumbnail: '/thumbnails/hr.png',
    createdAt: '2024-05-12T14:00:00Z',
    updatedAt: '2024-06-08T10:00:00Z',
    isInstalled: false,
    version: '1.2.0',
    difficulty: 'advanced',
    estimatedTime: '45 min',
  },
];

// Mock data for knowledge packs
const mockKnowledgePacks: KnowledgePack[] = [
  {
    id: 'kb-001',
    name: 'Restaurant Operations Guide',
    description: 'Complete guide to running efficient restaurant operations including inventory, staffing, and customer service best practices.',
    category: 'guides',
    industry: 'restaurant',
    author: {
      id: 'auth-003',
      name: 'Restaurant OS',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=restaurant',
      verified: true,
      totalProducts: 18,
      rating: 4.9,
    },
    rating: 4.8,
    reviewCount: 189,
    downloadCount: 5620,
    price: 0,
    isFree: true,
    tags: ['operations', 'guide', 'restaurant', 'best-practices'],
    documents: [
      { id: 'd1', title: 'Restaurant Operations Manual', type: 'pdf', url: '/docs/ops-manual.pdf', size: '2.4 MB' },
      { id: 'd2', title: 'Inventory Management Guide', type: 'pdf', url: '/docs/inventory.pdf', size: '1.8 MB' },
      { id: 'd3', title: 'Staff Training Checklist', type: 'doc', url: '/docs/training.docx', size: '0.5 MB' },
    ],
    sources: ['Industry Standards', 'Case Studies', 'Expert Interviews'],
    thumbnail: '/thumbnails/restaurant-kb.png',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-06-01T12:00:00Z',
    isInstalled: false,
    version: '4.0.0',
    documentCount: 3,
  },
  {
    id: 'kb-002',
    name: 'Healthcare Compliance Handbook',
    description: 'HIPAA and healthcare regulation compliance guide with checklists, templates, and training materials.',
    category: 'compliance',
    industry: 'healthcare',
    author: {
      id: 'auth-006',
      name: 'RisaCare',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=healthcare',
      verified: true,
      totalProducts: 15,
      rating: 4.7,
    },
    rating: 4.9,
    reviewCount: 312,
    downloadCount: 7840,
    price: 49,
    isFree: false,
    tags: ['hipaa', 'compliance', 'healthcare', 'regulations'],
    documents: [
      { id: 'd1', title: 'HIPAA Compliance Guide', type: 'pdf', url: '/docs/hipaa.pdf', size: '3.2 MB' },
      { id: 'd2', title: 'Compliance Checklist', type: 'doc', url: '/docs/checklist.docx', size: '0.3 MB' },
      { id: 'd3', title: 'Training Videos', type: 'video', url: '/docs/training.mp4', size: '45 MB' },
      { id: 'd4', title: 'Policy Templates', type: 'doc', url: '/docs/policies.zip', size: '1.2 MB' },
    ],
    sources: ['Legal Experts', 'Healthcare Associations', 'Government Guidelines'],
    thumbnail: '/thumbnails/healthcare-kb.png',
    createdAt: '2024-02-15T08:00:00Z',
    updatedAt: '2024-06-10T14:00:00Z',
    isInstalled: true,
    version: '5.2.0',
    documentCount: 4,
  },
  {
    id: 'kb-003',
    name: 'Legal Case Management Templates',
    description: 'Professional templates for case management, client intake, document drafting, and court filing.',
    category: 'templates',
    industry: 'legal',
    author: {
      id: 'auth-007',
      name: 'LawGens',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=legal',
      verified: true,
      totalProducts: 25,
      rating: 4.6,
    },
    rating: 4.5,
    reviewCount: 145,
    downloadCount: 4230,
    price: 79,
    isFree: false,
    tags: ['legal', 'templates', 'cases', 'documents'],
    documents: [
      { id: 'd1', title: 'Case Intake Form', type: 'doc', url: '/docs/intake.docx', size: '0.2 MB' },
      { id: 'd2', title: 'Discovery Request Template', type: 'doc', url: '/docs/discovery.docx', size: '0.3 MB' },
      { id: 'd3', title: 'Motion Templates', type: 'doc', url: '/docs/motions.zip', size: '1.5 MB' },
    ],
    sources: ['Bar Association', 'Legal Experts', 'Court Forms'],
    thumbnail: '/thumbnails/legal-kb.png',
    createdAt: '2024-03-01T09:00:00Z',
    updatedAt: '2024-05-20T11:00:00Z',
    isInstalled: false,
    version: '2.1.0',
    documentCount: 3,
  },
  {
    id: 'kb-004',
    name: 'Hotel Revenue Management Playbook',
    description: 'Strategies and tools for maximizing hotel revenue through dynamic pricing, occupancy optimization, and distribution management.',
    category: 'best-practices',
    industry: 'hotel',
    author: {
      id: 'auth-004',
      name: 'Hotel OS',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hotel',
      verified: true,
      totalProducts: 22,
      rating: 4.7,
    },
    rating: 4.7,
    reviewCount: 198,
    downloadCount: 3450,
    price: 59,
    isFree: false,
    tags: ['revenue', 'pricing', 'hotel', 'strategy'],
    documents: [
      { id: 'd1', title: 'Revenue Strategy Guide', type: 'pdf', url: '/docs/revenue.pdf', size: '2.8 MB' },
      { id: 'd2', title: 'Pricing Templates', type: 'xlsx', url: '/docs/pricing.xlsx', size: '0.8 MB' },
      { id: 'd3', title: 'Case Studies', type: 'pdf', url: '/docs/cases.pdf', size: '1.5 MB' },
    ],
    sources: ['Industry Analysis', 'Revenue Experts', 'Market Data'],
    thumbnail: '/thumbnails/hotel-revenue.png',
    createdAt: '2024-04-10T10:00:00Z',
    updatedAt: '2024-06-05T15:00:00Z',
    isInstalled: false,
    version: '3.0.0',
    documentCount: 3,
  },
  {
    id: 'kb-005',
    name: 'Retail Inventory Management',
    description: 'Complete guide to managing retail inventory with stock optimization, shrinkage prevention, and supplier coordination.',
    category: 'guides',
    industry: 'retail',
    author: {
      id: 'auth-008',
      name: 'Retail OS',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=retail',
      verified: true,
      totalProducts: 12,
      rating: 4.5,
    },
    rating: 4.4,
    reviewCount: 123,
    downloadCount: 2890,
    price: 29,
    isFree: false,
    tags: ['inventory', 'retail', 'stock', 'suppliers'],
    documents: [
      { id: 'd1', title: 'Inventory Handbook', type: 'pdf', url: '/docs/inventory.pdf', size: '2.1 MB' },
      { id: 'd2', title: 'Stock Templates', type: 'xlsx', url: '/docs/stock.xlsx', size: '0.5 MB' },
    ],
    sources: ['Retail Experts', 'Supply Chain Data', 'Best Practices'],
    thumbnail: '/thumbnails/retail-kb.png',
    createdAt: '2024-05-01T11:00:00Z',
    updatedAt: '2024-06-02T09:00:00Z',
    isInstalled: false,
    version: '1.8.0',
    documentCount: 2,
  },
];

// Mock reviews
const mockReviews: Review[] = [
  {
    id: 'rev-001',
    userId: 'user-001',
    userName: 'Sarah Chen',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    rating: 5,
    title: 'Exactly what we needed!',
    content: 'This workflow saved us hours of manual work. Setup was quick and the support team was very helpful.',
    createdAt: '2024-06-10T14:30:00Z',
    helpful: 24,
    response: 'Thank you Sarah! Glad it helped your team.',
  },
  {
    id: 'rev-002',
    userId: 'user-002',
    userName: 'Michael Torres',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael',
    rating: 4,
    title: 'Great workflow, minor tweaks needed',
    content: 'Works well overall. Had to make some adjustments for our specific use case but nothing major.',
    createdAt: '2024-06-08T10:15:00Z',
    helpful: 12,
  },
  {
    id: 'rev-003',
    userId: 'user-003',
    userName: 'Emma Wilson',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma',
    rating: 5,
    title: 'Game changer for our operations',
    content: 'We have automated processes that used to take 2 hours down to 15 minutes. Highly recommend!',
    createdAt: '2024-06-05T16:45:00Z',
    helpful: 31,
  },
];

// Categories
const workflowCategories: Category[] = [
  { id: 'all', name: 'All Categories', icon: 'Grid3X3', count: 156 },
  { id: 'automation', name: 'Automation', icon: 'Zap', count: 42 },
  { id: 'integration', name: 'Integration', icon: 'Plug', count: 28 },
  { id: 'reporting', name: 'Reporting', icon: 'BarChart3', count: 35 },
  { id: 'communication', name: 'Communication', icon: 'MessageSquare', count: 22 },
  { id: 'onboarding', name: 'Onboarding', icon: 'UserPlus', count: 18 },
  { id: 'analytics', name: 'Analytics', icon: 'TrendingUp', count: 25 },
  { id: 'compliance', name: 'Compliance', icon: 'Shield', count: 15 },
  { id: 'hr', name: 'HR', icon: 'Users', count: 20 },
  { id: 'finance', name: 'Finance', icon: 'DollarSign', count: 28 },
  { id: 'marketing', name: 'Marketing', icon: 'Megaphone', count: 32 },
];

const knowledgeCategories: Category[] = [
  { id: 'all', name: 'All Categories', icon: 'BookOpen', count: 234 },
  { id: 'guides', name: 'Guides', icon: 'FileText', count: 65 },
  { id: 'templates', name: 'Templates', icon: 'Copy', count: 48 },
  { id: 'policies', name: 'Policies', icon: 'Scroll', count: 35 },
  { id: 'training', name: 'Training', icon: 'GraduationCap', count: 42 },
  { id: 'compliance', name: 'Compliance', icon: 'Shield', count: 38 },
  { id: 'best-practices', name: 'Best Practices', icon: 'Award', count: 55 },
  { id: 'case-studies', name: 'Case Studies', icon: 'Briefcase', count: 28 },
  { id: 'regulations', name: 'Regulations', icon: 'Scale', count: 22 },
];

const industries: { id: string; name: string; icon: string }[] = [
  { id: 'all', name: 'All Industries', icon: 'Building2' },
  { id: 'restaurant', name: 'Restaurant', icon: 'UtensilsCrossed' },
  { id: 'hotel', name: 'Hotel', icon: 'Building' },
  { id: 'healthcare', name: 'Healthcare', icon: 'Heart' },
  { id: 'retail', name: 'Retail', icon: 'ShoppingBag' },
  { id: 'legal', name: 'Legal', icon: 'Scale' },
  { id: 'education', name: 'Education', icon: 'GraduationCap' },
  { id: 'automotive', name: 'Automotive', icon: 'Car' },
  { id: 'beauty', name: 'Beauty', icon: 'Sparkles' },
  { id: 'fitness', name: 'Fitness', icon: 'Dumbbell' },
  { id: 'manufacturing', name: 'Manufacturing', icon: 'Factory' },
  { id: 'real-estate', name: 'Real Estate', icon: 'Home' },
];

// API Functions
export async function getWorkflows(filters?: MarketplaceFilters): Promise<Workflow[]> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));

  let results = [...mockWorkflows];

  if (filters?.industry && filters.industry !== 'all') {
    results = results.filter(w => w.industry === filters.industry || w.industry === 'all');
  }

  if (filters?.category) {
    results = results.filter(w => w.category === filters.category);
  }

  if (filters?.search) {
    const search = filters.search.toLowerCase();
    results = results.filter(w =>
      w.name.toLowerCase().includes(search) ||
      w.description.toLowerCase().includes(search) ||
      w.tags.some(t => t.toLowerCase().includes(search))
    );
  }

  if (filters?.priceFilter === 'free') {
    results = results.filter(w => w.isFree);
  } else if (filters?.priceFilter === 'paid') {
    results = results.filter(w => !w.isFree);
  }

  // Sort
  switch (filters?.sortBy) {
    case 'rating':
      results.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'price-low':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      results.sort((a, b) => b.price - a.price);
      break;
    default:
      results.sort((a, b) => b.installCount - a.installCount);
  }

  return results;
}

export async function getWorkflow(id: string): Promise<Workflow | null> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockWorkflows.find(w => w.id === id) || null;
}

export async function getKnowledgePacks(filters?: MarketplaceFilters): Promise<KnowledgePack[]> {
  await new Promise(resolve => setTimeout(resolve, 300));

  let results = [...mockKnowledgePacks];

  if (filters?.industry && filters.industry !== 'all') {
    results = results.filter(k => k.industry === filters.industry || k.industry === 'all');
  }

  if (filters?.category) {
    results = results.filter(k => k.category === filters.category);
  }

  if (filters?.search) {
    const search = filters.search.toLowerCase();
    results = results.filter(k =>
      k.name.toLowerCase().includes(search) ||
      k.description.toLowerCase().includes(search) ||
      k.tags.some(t => t.toLowerCase().includes(search))
    );
  }

  if (filters?.priceFilter === 'free') {
    results = results.filter(k => k.isFree);
  } else if (filters?.priceFilter === 'paid') {
    results = results.filter(k => !k.isFree);
  }

  // Sort
  switch (filters?.sortBy) {
    case 'rating':
      results.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'price-low':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      results.sort((a, b) => b.price - a.price);
      break;
    default:
      results.sort((a, b) => b.downloadCount - a.downloadCount);
  }

  return results;
}

export async function getKnowledgePack(id: string): Promise<KnowledgePack | null> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockKnowledgePacks.find(k => k.id === id) || null;
}

export async function getReviews(itemId: string): Promise<Review[]> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockReviews;
}

export async function getWorkflowCategories(): Promise<Category[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return workflowCategories;
}

export async function getKnowledgeCategories(): Promise<Category[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return knowledgeCategories;
}

export async function getIndustries(): Promise<{ id: string; name: string; icon: string }[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return industries;
}

export async function installItem(request: InstallRequest): Promise<InstallResponse> {
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    success: true,
    installationId: `inst-${Date.now()}`,
    message: `${request.itemType === 'workflow' ? 'Workflow' : 'Knowledge pack'} installed successfully!`,
    accessUrl: `/dashboard/${request.itemType}s/${request.itemId}`,
  };
}

export async function submitReview(request: ReviewRequest): Promise<{ success: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return { success: true };
}

export async function getMyReviews(): Promise<(Review & { itemName: string; itemType: 'workflow' | 'knowledge' })[]> {
  await new Promise(resolve => setTimeout(resolve, 200));

  return [
    {
      ...mockReviews[0],
      itemName: 'Customer Onboarding Flow',
      itemType: 'workflow',
    },
    {
      ...mockReviews[1],
      itemName: 'Healthcare Compliance Handbook',
      itemType: 'knowledge',
    },
  ];
}

export { API_BASE };
