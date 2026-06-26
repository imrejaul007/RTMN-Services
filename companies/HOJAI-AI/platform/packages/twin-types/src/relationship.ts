/**
 * Relationship Twin Types
 * Professional network graph and relationship management
 */

/**
 * Relationship node type
 */
export type RelationshipNodeType =
  | 'internal'
  | 'external'
  | 'customer'
  | 'partner'
  | 'vendor'
  | 'investor'
  | 'media'
  | 'government';

/**
 * Relationship strength
 */
export type RelationshipStrength = 'weak' | 'moderate' | 'strong' | 'critical';

/**
 * Relationship edge type
 */
export type RelationshipEdgeType =
  | 'reports-to'
  | 'manages'
  | 'collaborates'
  | 'influences'
  | 'mentors'
  | 'sponsors'
  | 'partners-with'
  | 'reports-to'
  | 'clients';

/**
 * Contact frequency
 */
export type ContactFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'rarely' | 'never';

/**
 * Relationship node (person in the network)
 */
export interface RelationshipNode {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  title?: string;
  department?: string;
  company?: string;
  type: RelationshipNodeType;
  avatar?: string;
  influence: number;            // 0-100
  trust: number;                // 0-100
  sentiment: number;            // -1 to 1
  contactFrequency: ContactFrequency;
  lastInteraction?: string;
  nextScheduledInteraction?: string;
  keyTopics: string[];
  strength: RelationshipStrength;
  sharedConnections: number;
  mutualConnections: number;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Relationship edge (connection between nodes)
 */
export interface RelationshipEdge {
  id: string;
  source: string;              // node ID
  target: string;              // node ID
  type: RelationshipEdgeType;
  weight: number;              // 0-1
  frequency: number;            // interactions per month
  mutual: boolean;
  context: string[];
  firstInteraction?: string;
  lastInteraction?: string;
  trust: number;               // 0-100
  collaborationScore: number;   // 0-100
  blockers?: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Network metrics
 */
export interface NetworkMetrics {
  totalConnections: number;
  strongConnections: number;
  weakConnections: number;
  networkReach: number;        // number of 2nd-degree connections
  centrality: number;         // how central they are (0-100)
  bridgingScore: number;     // how much they connect different groups
  clusteringCoefficient: number; // how clustered their network is
  avgConnectionStrength: number;
  diversityScore: number;      // variety of connection types
  influenceScore: number;      // based on connected nodes' influence
}

/**
 * Interaction record
 */
export interface Interaction {
  id: string;
  employeeId: string;
  personId: string;           // relationship node ID
  type: 'meeting' | 'call' | 'email' | 'chat' | 'message' | 'event' | 'project';
  channel?: 'zoom' | 'teams' | 'slack' | 'email' | 'phone' | 'in-person';
  subject?: string;
  outcome?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  duration?: number;          // minutes
  scheduled?: boolean;
  completed?: boolean;
  timestamp: string;
  nextFollowUp?: string;
  notes?: string;
  participants?: string[];
  createdAt: string;
}

/**
 * Stakeholder mapping
 */
export interface StakeholderMapping {
  id: string;
  employeeId: string;
  projectId?: string;
  name: string;
  stakeholders: {
    nodeId: string;
    name: string;
    influence: 'low' | 'medium' | 'high';
    interest: 'low' | 'medium' | 'high';
    role: 'supporter' | 'opponent' | 'neutral' | 'unknown';
    engagement: 'unaware' | 'resistant' | 'neutral' | 'supportive' | 'leading';
  }[];
  analysisDate: string;
  recommendations?: string[];
}

/**
 * Influence path
 */
export interface InfluencePath {
  from: string;
  to: string;
  path: string[];             // node IDs in path
  influence: number;          // 0-100
  confidence: number;         // 0-100
}

/**
 * Connection recommendation
 */
export interface ConnectionRecommendation {
  recommendedNodeId: string;
  recommendedNodeName: string;
  reason: string;
  mutualConnections: {
    id: string;
    name: string;
    mutualConnectionCount: number;
  }[];
  potentialValue: number;     // 0-100
  approachSuggestion?: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Network analysis result
 */
export interface NetworkAnalysis {
  employeeId: string;
  metrics: NetworkMetrics;
  strongestRelationships: RelationshipNode[];
  keyInfluencers: RelationshipNode[];
  bridgingConnections: RelationshipEdge[];
  isolatedGroups: string[][];  // groups that are disconnected
  opportunities: ConnectionRecommendation[];
  risks?: {
    overReliance: string[];    // too dependent on few people
    gaps: string[];           // missing important connections
  };
  analyzedAt: string;
}

/**
 * Relationship graph for an employee
 */
export interface RelationshipGraph {
  employeeId: string;
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
  metrics: NetworkMetrics;
  lastUpdated: string;
  analysis?: NetworkAnalysis;
}

/**
 * Relationship update
 */
export interface RelationshipUpdate {
  nodeId?: string;
  influence?: number;
  trust?: number;
  sentiment?: number;
  contactFrequency?: ContactFrequency;
  strength?: RelationshipStrength;
  tags?: string[];
  notes?: string;
}

/**
 * Group/team relationship
 */
export interface TeamRelationship {
  id: string;
  employeeId: string;
  teamId: string;
  teamName: string;
  role: 'lead' | 'member' | 'advisor';
  cohesion: number;           // 0-100
  trust: number;              // 0-100
  avgTenure: number;          // months
  collaborationScore: number; // 0-100
  lastTeamActivity?: string;
}

/**
 * External contact (for CRM sync)
 */
export interface ExternalContact {
  id: string;
  employeeId: string;
  source: 'linkedin' | 'twitter' | 'email' | 'conference' | 'referral' | 'other';
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  linkedinUrl?: string;
  notes?: string;
  convertedToNode: boolean;
  nodeId?: string;
  createdAt: string;
  lastContacted?: string;
}
