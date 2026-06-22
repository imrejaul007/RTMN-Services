/**
 * REZ Identity Hub Client
 * Connects to REZ Identity Hub for 25-source pre-call research
 */

const REZ_IDENTITY_URL = process.env.REZ_IDENTITY_URL || 'http://localhost:6000';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  company?: string;
  role?: string;
  industry?: string;
  preferences?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PreCallResearch {
  userId: string;
  sources: {
    name: string;
    data: any;
    confidence: number;
    lastUpdated: string;
  }[];
  summary: string;
  riskFlags?: string[];
  opportunities?: string[];
}

export interface ThreeSixtyView {
  userId: string;
  personal: {
    name: string;
    age?: number;
    location?: string;
    interests?: string[];
    socialProfiles?: Record<string, string>;
  };
  professional: {
    title?: string;
    company?: string;
    industry?: string;
    skills?: string[];
    experience?: number;
    education?: string[];
  };
  financial: {
    creditScore?: number;
    income?: string;
    spendingHabits?: string;
    investmentProfile?: string;
  };
  behavioral: {
    communicationStyle?: string;
    decisionMaker?: boolean;
    urgencyLevel?: 'low' | 'medium' | 'high';
    preferredContact?: string;
  };
  relationships: {
    contacts?: { name: string; relationship: string; frequency: string }[];
    teams?: { name: string; role: string }[];
  };
  lastUpdated: string;
}

export interface IdentityVerification {
  verified: boolean;
  sourcesVerified: string[];
  score: number;
  flags?: string[];
}

export class REZIdentityClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = REZ_IDENTITY_URL;
  }

  /**
   * Get user profile from REZ Identity Hub
   */
  async getUserProfile(userId: string): Promise<UserProfile | { error: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/${userId}/profile`);
      if (!response.ok) {
        return { error: `Profile not found: ${response.status}` };
      }
      return response.json();
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Identity service unavailable' };
    }
  }

  /**
   * Get pre-call research from 25 data sources
   */
  async getPreCallResearch(userId: string): Promise<PreCallResearch | { error: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/${userId}/precall-research`);
      if (!response.ok) {
        return { error: `Pre-call research not available: ${response.status}` };
      }
      return response.json();
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Pre-call research service unavailable' };
    }
  }

  /**
   * Get 360-degree view of user
   */
  async get360View(userId: string): Promise<ThreeSixtyView | { error: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/${userId}/360-view`);
      if (!response.ok) {
        return { error: `360 view not available: ${response.status}` };
      }
      return response.json();
    } catch (error) {
      return { error: error instanceof Error ? error.message : '360 view service unavailable' };
    }
  }

  /**
   * Verify user identity
   */
  async verifyIdentity(userId: string): Promise<IdentityVerification | { error: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/${userId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Verification service unavailable' };
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/${userId}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
      return response.json();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
    }
  }

  /**
   * Search users by criteria
   */
  async searchUsers(query: {
    industry?: string;
    company?: string;
    role?: string;
    location?: string;
    limit?: number;
  }): Promise<{ users: UserProfile[]; total: number; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (query.industry) params.append('industry', query.industry);
      if (query.company) params.append('company', query.company);
      if (query.role) params.append('role', query.role);
      if (query.location) params.append('location', query.location);
      if (query.limit) params.append('limit', query.limit.toString());

      const response = await fetch(`${this.baseUrl}/api/users/search?${params}`);
      return response.json();
    } catch (error) {
      return { users: [], total: 0, error: error instanceof Error ? error.message : 'Search failed' };
    }
  }

  /**
   * Get interaction history
   */
  async getInteractionHistory(userId: string, limit = 50): Promise<{ interactions: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/${userId}/interactions?limit=${limit}`);
      return response.json();
    } catch (error) {
      return { interactions: [], error: error instanceof Error ? error.message : 'History unavailable' };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; sources: number; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return { healthy: data.status === 'healthy', sources: 25 };
    } catch (error) {
      return { healthy: false, sources: 0, error: error instanceof Error ? error.message : 'Service unavailable' };
    }
  }
}

export const rezIdentity = new REZIdentityClient();
export default rezIdentity;
