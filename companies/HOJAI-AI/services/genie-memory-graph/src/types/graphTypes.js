/**
 * Graph Types - Type definitions for memory graph entities
 */

// Node types for the knowledge graph
export const NODE_TYPES = {
  PERSON: 'person',
  PLACE: 'place',
  THING: 'thing',
  CONCEPT: 'concept',
  EVENT: 'event',
  ORGANIZATION: 'organization',
  EMOTION: 'emotion',
  GOAL: 'goal',
  SKILL: 'skill',
  KNOWLEDGE: 'knowledge',
  PREFERENCE: 'preference',
  MEMORY: 'memory',
  TOPIC: 'topic'
};

// Edge types for the knowledge graph
export const EDGE_TYPES = {
  KNOWS: 'knows',
  LIKES: 'likes',
  DISLIKES: 'dislikes',
  VISITED: 'visited',
  WORKED_AT: 'worked_at',
  STUDY: 'studied',
  FRIEND_OF: 'friend_of',
  FAMILY_OF: 'family_of',
  COLLEAGUE_OF: 'colleague_of',
  LEARNED: 'learned',
  INTERESTED_IN: 'interested_in',
  GOALLED_BY: 'goaled_by',
  PART_OF: 'part_of',
  CONNECTED_TO: 'connected_to',
  SIMILAR_TO: 'similar_to',
  CAUSED: 'caused',
  RESULTED_IN: 'resulted_in'
};

// Relationship types for relationship graph
export const RELATIONSHIP_TYPES = {
  FAMILY: {
    parent: 'parent',
    child: 'child',
    sibling: 'sibling',
    spouse: 'spouse',
    grandparent: 'grandparent',
    grandchild: 'grandchild',
    uncle: 'uncle',
    aunt: 'aunt',
    cousin: 'cousin',
    in_laws: 'in_laws'
  },
  FRIEND: {
    best_friend: 'best_friend',
    close_friend: 'close_friend',
    friend: 'friend',
    acquaintance: 'acquaintance'
  },
  PROFESSIONAL: {
    colleague: 'colleague',
    boss: 'boss',
    employee: 'employee',
    mentor: 'mentor',
    mentee: 'mentee',
    client: 'client',
    partner: 'business_partner',
    investor: 'investor'
  },
  COMMUNITY: {
    neighbor: 'neighbor',
    community_member: 'community_member',
    fellow_student: 'fellow_student',
    teacher: 'teacher'
  }
};

// Knowledge domains
export const KNOWLEDGE_DOMAINS = {
  BUSINESS: ['startup', 'marketing', 'sales', 'finance', 'operations', 'strategy'],
  TECHNOLOGY: ['programming', 'ai', 'data', 'cloud', 'security'],
  PERSONAL: ['health', 'fitness', 'relationships', 'hobbies'],
  ACADEMIC: ['math', 'science', 'history', 'languages', 'arts'],
  INDUSTRY: ['restaurant', 'hotel', 'healthcare', 'retail', 'real_estate', 'manufacturing']
};

// Goal types and statuses
export const GOAL_TYPES = {
  SHORT_TERM: 'short_term', // < 1 month
  MEDIUM_TERM: 'medium_term', // 1-6 months
  LONG_TERM: 'long_term', // > 6 months
  LIFE_GOAL: 'life_goal' // multi-year
};

export const GOAL_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  ON_HOLD: 'on_hold',
  REVISED: 'revised'
};

// Preference categories
export const PREFERENCE_CATEGORIES = {
  LIFESTYLE: ['food', 'travel', 'entertainment', 'fashion', 'home'],
  WORK: ['work_style', 'communication', 'schedule', 'environment'],
  SOCIAL: ['interaction_style', 'privacy', 'sharing'],
  LEARNING: ['learning_style', 'pace', 'topics'],
  HEALTH: ['exercise', 'diet', 'sleep', 'wellness']
};

// Timeline event types
export const EVENT_TYPES = {
  LIFE: ['birthday', 'anniversary', 'milestone', 'achievement', 'move'],
  PROFESSIONAL: ['job_change', 'promotion', 'project_complete', 'business_launch'],
  PERSONAL: ['relationship_start', 'relationship_end', 'travel', 'learning'],
  HEALTH: ['health_issue', 'health_improvement', 'injury_recovery'],
  FINANCIAL: ['major_purchase', 'investment', 'financial_milestone']
};

// Confidence levels
export const CONFIDENCE_LEVELS = {
  LOW: 0.3,
  MEDIUM: 0.6,
  HIGH: 0.8,
  CERTAIN: 1.0
};

// Source types for knowledge
export const SOURCE_TYPES = {
  EXPLICIT: 'explicit', // User directly stated
  INFERRED: 'inferred', // AI inferred from context
  DERIVED: 'derived', // Computed from other facts
  MEMORY: 'memory', // From conversation memory
  DOCUMENT: 'document', // From uploaded document
  CALENDAR: 'calendar', // From calendar events
  ACTIVITY: 'activity' // From user activity
};

// Graph query types
export const QUERY_TYPES = {
  DIRECT: 'direct', // Direct lookup
  INFERENCE: 'inference', // Inferred from context
  RECOMMENDATION: 'recommendation', // Based on patterns
  PREDICTION: 'prediction', // Based on history
  COMPARISON: 'comparison' // Compare entities
};
