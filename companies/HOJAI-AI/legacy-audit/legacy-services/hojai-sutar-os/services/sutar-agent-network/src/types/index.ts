// ============================================================================
// SUTAR Agent Network - Type Definitions
// ============================================================================

// Core Types
export type AgentStatus = 'available' | 'busy' | 'offline' | 'training';
export type AgentCapability =
  | 'reasoning'
  | 'execution'
  | 'analysis'
  | 'creation'
  | 'communication'
  | 'coordination'
  | 'planning'
  | 'research'
  | 'coding'
  | 'data_processing'
  | 'language'
  | 'vision'
  | 'audio'
  | 'security'
  | 'optimization';

export type CertificationStatus = 'pending' | 'certified' | 'expired' | 'revoked';
export type CertificationLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';
export type TeamRole = 'lead' | 'member' | 'consultant';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'archived';
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

// Agent Profile Interface
export interface AgentProfile {
  id: string;
  agentId: string;
  displayName: string;
  tagline: string;
  bio: string;
  avatarUrl?: string;
  location?: string;
  timezone?: string;
  languages: string[];
  specializations: string[];
  yearsOfExperience: number;
  hourlyRate?: number;
  dailyRate?: number;
  fixedPrice?: number;
  availability: {
    hoursPerWeek: number;
    preferredHours: { start: string; end: string };
    daysAvailable: string[];
  };
  socialLinks?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    twitter?: string;
  };
  certifications: string[];
  badges: string[];
  verifiedInfo: {
    identity: boolean;
    skills: boolean;
    experience: boolean;
  };
  preferences: {
    remoteOnly: boolean;
    travelWilling: boolean;
    teamWork: boolean;
    soloProjects: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// Capability Definition
export interface Capability {
  id: string;
  name: string;
  description: string;
  category: string;
  level: CertificationLevel;
  tags: string[];
  examples?: string[];
  prerequisites?: string[];
  estimatedDuration?: number; // in minutes
}

export interface AgentCapabilityDetail {
  capabilityId: string;
  agentId: string;
  proficiencyLevel: CertificationLevel;
  certified: boolean;
  certificationId?: string;
  verifiedBy?: string;
  experienceMonths: number;
  projectsCompleted: number;
  successRate: number;
  averageRating: number;
  lastUsed?: string;
  endorsements: Endorsement[];
  registeredAt: string;
  updatedAt: string;
}

export interface Endorsement {
  id: string;
  endorserId: string;
  endorserName: string;
  comment?: string;
  rating: number;
  createdAt: string;
}

// Skill Definition
export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  relatedCapabilities: string[];
  learningResources?: string[];
}

export interface AgentSkill {
  skillId: string;
  agentId: string;
  proficiencyLevel: CertificationLevel;
  yearsOfExperience: number;
  lastUsed?: string;
  endorsements: number;
}

// Team Interfaces
export interface Team {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  memberIds: string[];
  consultants: string[];
  status: 'forming' | 'active' | 'completed' | 'disbanded';
  projectDescription?: string;
  requiredCapabilities: AgentCapability[];
  requiredSkills: string[];
  maxTeamSize: number;
  createdAt: string;
  updatedAt: string;
  completedTasks: number;
  successRate: number;
}

export interface TeamMembership {
  teamId: string;
  agentId: string;
  role: TeamRole;
  joinedAt: string;
  contributions: number;
  rating: number;
}

// Performance Metrics
export interface PerformanceMetrics {
  agentId: string;
  period: {
    start: string;
    end: string;
  };
  tasks: {
    total: number;
    completed: number;
    failed: number;
    cancelled: number;
    inProgress: number;
    averageCompletionTime: number; // in minutes
  };
  quality: {
    averageRating: number;
    totalRatings: number;
    fiveStarRatings: number;
    oneStarRatings: number;
    repeatClients: number;
  };
  efficiency: {
    averageResponseTime: number; // in seconds
    uptimePercentage: number;
    taskCompletionRate: number;
    errorRate: number;
  };
  revenue: {
    totalEarnings: number;
    hourlyAverage: number;
    totalHoursWorked: number;
    tips: number;
  };
  clientSatisfaction: {
    netPromoterScore: number;
    satisfactionRate: number;
    responseRate: number;
  };
  trend: {
    ratingTrend: number; // positive = improving
    taskTrend: number;
    qualityTrend: number;
  };
  rankings: {
    global: number;
    category: Record<string, number>;
    skill: Record<string, number>;
  };
  updatedAt: string;
}

// Task Tracking
export interface TaskAssignment {
  id: string;
  taskId: string;
  agentId: string;
  teamId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  quality?: number; // 1-5
  feedback?: string;
}

// Marketplace Listing
export interface MarketplaceListing {
  id: string;
  agentId: string;
  title: string;
  description: string;
  services: ServiceOffered[];
  pricing: {
    hourlyRate?: number;
    dailyRate?: number;
    fixedPrice?: number;
    currency: string;
    negotiable: boolean;
  };
  availability: {
    availableNow: boolean;
    nextAvailable?: string;
    limitedSlots?: number;
  };
  ratings: {
    average: number;
    totalReviews: number;
    fiveStar: number;
  };
  statistics: {
    totalJobs: number;
    completionRate: number;
    responseTime: number; // in minutes
    memberSince: string;
  };
  featured: boolean;
  promoted: boolean;
  views: number;
  inquiries: number;
  status: 'active' | 'paused' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface ServiceOffered {
  name: string;
  description: string;
  deliveryTime?: string;
  revisions?: number;
  price?: number;
}

// Certification
export interface Certification {
  id: string;
  name: string;
  issuer: string;
  description: string;
  category: string;
  level: CertificationLevel;
  validityPeriod?: number; // in days
  examUrl?: string;
  badgeUrl?: string;
  requirements: string[];
}

export interface AgentCertification {
  id: string;
  agentId: string;
  certificationId: string;
  certificationName: string;
  issuer: string;
  level: CertificationLevel;
  status: CertificationStatus;
  issuedAt: string;
  expiresAt?: string;
  credentialUrl?: string;
  credentialId?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  score?: number;
  expiresInDays?: number;
}

// Communication
export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  subject: string;
  content: string;
  priority: MessagePriority;
  status: MessageStatus;
  attachments?: Attachment[];
  references?: string[];
  replyTo?: string;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface MessageThread {
  id: string;
  participants: string[];
  subject: string;
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived';
  labels?: string[];
  pinned?: boolean;
}

// Task Routing
export interface Task {
  id: string;
  title: string;
  description: string;
  requirements: {
    capabilities: AgentCapability[];
    skills: string[];
    minExperience?: number;
    certifications?: string[];
  };
  priority: TaskPriority;
  budget?: {
    min?: number;
    max?: number;
    currency: string;
  };
  deadline?: string;
  estimatedDuration?: number;
  preferredAgentId?: string;
  teamRequired: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  status: TaskStatus;
  assignedAgentId?: string;
  assignedTeamId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TaskMatch {
  taskId: string;
  agentId: string;
  agent?: Agent;
  score: number;
  reasons: string[];
  estimatedCompletionTime: number;
  proposedRate: number;
  availability: string;
  confidence: number;
}

// Decision Engine Integration
export interface DecisionRequest {
  requestId: string;
  agentId?: string;
  taskId?: string;
  context: Record<string, unknown>;
  options: DecisionOption[];
  constraints?: Record<string, unknown>;
  callbackUrl?: string;
}

export interface DecisionOption {
  id: string;
  type: string;
  value: unknown;
  weight?: number;
  metadata?: Record<string, unknown>;
}

export interface DecisionResponse {
  requestId: string;
  decision: DecisionOption;
  confidence: number;
  reasoning: string;
  alternativeOptions?: DecisionOption[];
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface AgentDecision {
  agentId: string;
  decisionType: string;
  context: Record<string, unknown>;
  decision: unknown;
  confidence: number;
  timestamp: string;
}

// Agent Interface (Extended)
export interface Agent {
  id: string;
  name: string;
  type: string;
  description: string;
  capabilities: AgentCapability[];
  skills: string[];
  status: AgentStatus;
  rating: number;
  completedTasks: number;
  successRate: number;
  hourlyRate?: number;
  metadata: Record<string, unknown>;
  registeredAt: string;
  lastActive: string;
  // Extended fields
  profile?: AgentProfile;
  capabilityDetails?: AgentCapabilityDetail[];
  skillDetails?: AgentSkill[];
  metrics?: PerformanceMetrics;
  certifications?: AgentCertification[];
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Notification Types
export interface Notification {
  id: string;
  recipientId: string;
  type: 'message' | 'task' | 'certification' | 'system' | 'payment';
  title: string;
  content: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// Skill Match Request
export interface SkillMatchRequest {
  requiredCapabilities?: AgentCapability[];
  requiredSkills?: string[];
  preferredRating?: number;
  maxHourlyRate?: number;
  timezone?: string;
  languages?: string[];
  certifications?: string[];
  teamRequired?: boolean;
  minExperience?: number;
}

// Task Routing Request
export interface TaskRoutingRequest {
  taskId?: string;
  title: string;
  description: string;
  requirements: {
    capabilities: AgentCapability[];
    skills: string[];
    minExperience?: number;
    certifications?: string[];
  };
  priority: TaskPriority;
  budget?: {
    min?: number;
    max?: number;
    currency: string;
  };
  deadline?: string;
  teamRequired: boolean;
  maxTeamSize?: number;
  estimatedDuration?: number;
}

// Team Creation Request
export interface TeamCreateRequest {
  name: string;
  description: string;
  leaderId: string;
  projectDescription?: string;
  requiredCapabilities: AgentCapability[];
  requiredSkills: string[];
  maxTeamSize: number;
}

// Marketplace Listing Request
export interface MarketplaceListingRequest {
  title: string;
  description: string;
  services: ServiceOffered[];
  pricing: {
    hourlyRate?: number;
    dailyRate?: number;
    fixedPrice?: number;
    currency: string;
    negotiable: boolean;
  };
  availability: {
    availableNow: boolean;
    nextAvailable?: string;
    limitedSlots?: number;
  };
}
