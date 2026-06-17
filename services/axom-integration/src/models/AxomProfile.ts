/**
 * AxomProfile - Community Intelligence Profile Model
 * Represents community members, local influencers, and engagement data
 */

export interface CommunityLocation {
  areaId: string;
  areaName: string;
  neighborhood?: string;
  city: string;
  region: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface CommunityStats {
  followers: number;
  following: number;
  postsCount: number;
  eventsHosted: number;
  eventsAttended: number;
  influenceScore: number; // 0-100
  engagementRate: number; // percentage
  reachScore: number;
}

export interface BuzzContent {
  contentId: string;
  type: 'post' | 'review' | 'event' | 'offer' | 'poll';
  content: string;
  mediaUrls?: string[];
  createdAt: Date;
  engagementMetrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface LocalEvent {
  eventId: string;
  title: string;
  description: string;
  eventType: 'community' | 'business' | 'cultural' | 'sports' | 'promotional';
  location: CommunityLocation;
  hostId: string;
  hostName: string;
  startDate: Date;
  endDate?: Date;
  attendees: number;
  maxAttendees?: number;
  isPublic: boolean;
  tags: string[];
  engagementScore?: number;
}

export interface BusinessConnection {
  businessId: string;
  businessName: string;
  businessType: string;
  connectionType: 'owner' | 'verified_business' | 'partner' | 'regular';
  connectedAt: Date;
  engagementStats: {
    postsAbout: number;
    checkIns: number;
    reviewsGiven: number;
    offersUsed: number;
  };
}

export interface InterestTag {
  tag: string;
  category: string;
  weight: number; // 0-1, relevance score
}

export interface AxomProfile {
  profileId: string;
  axomUserId: string;

  // Identity
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;

  // Community Location
  primaryLocation: CommunityLocation;
  secondaryLocations?: CommunityLocation[];

  // Stats & Influence
  stats: CommunityStats;

  // Content
  buzzContent: BuzzContent[];
  localEvents: LocalEvent[];

  // Business Connections
  connectedBusinesses: BusinessConnection[];

  // Interests
  interests: InterestTag[];

  // Customer Operations
  customerSegment?: 'influencer' | 'active_community' | 'passive_community' | 'local_business';
  lifetimeValue?: number;
  engagementTier?: 'platinum' | 'gold' | 'silver' | 'bronze';

  // Sync Status
  journeyTwinSynced: boolean;
  customerTwinSynced: boolean;
  industryTwinSynced: boolean;
  lastSyncedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Database operations interface
export interface AxomProfileDB {
  create(profile: Omit<AxomProfile, 'createdAt' | 'updatedAt'>): Promise<AxomProfile>;
  findById(profileId: string): Promise<AxomProfile | null>;
  findByAxomUserId(axomUserId: string): Promise<AxomProfile | null>;
  update(profileId: string, updates: Partial<AxomProfile>): Promise<AxomProfile | null>;
  delete(profileId: string): Promise<boolean>;
  findNearby(coordinates: { lat: number; lng: number }, radiusKm: number): Promise<AxomProfile[]>;
  findByInterest(tag: string, limit?: number): Promise<AxomProfile[]>;
  findBySegment(segment: string): Promise<AxomProfile[]>;
  syncToTwins(profileId: string): Promise<{ journey: boolean; customer: boolean; industry: boolean }>;
}

// In-memory storage for demo
export const axomProfileStore = new Map<string, AxomProfile>();
