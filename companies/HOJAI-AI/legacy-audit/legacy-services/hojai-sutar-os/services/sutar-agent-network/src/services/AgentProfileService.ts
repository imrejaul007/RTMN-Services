// ============================================================================
// SUTAR Agent Network - Agent Profile Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { AgentProfile, ApiResponse } from '../types/index.js';

export class AgentProfileService {
  private profiles: Map<string, AgentProfile> = new Map();

  /**
   * Create a new agent profile
   */
  createProfile(agentId: string, data: Partial<AgentProfile>): AgentProfile {
    const now = new Date().toISOString();
    const profile: AgentProfile = {
      id: `profile-${uuidv4()}`,
      agentId,
      displayName: data.displayName || '',
      tagline: data.tagline || '',
      bio: data.bio || '',
      avatarUrl: data.avatarUrl,
      location: data.location,
      timezone: data.timezone,
      languages: data.languages || ['English'],
      specializations: data.specializations || [],
      yearsOfExperience: data.yearsOfExperience || 0,
      hourlyRate: data.hourlyRate,
      dailyRate: data.dailyRate,
      fixedPrice: data.fixedPrice,
      availability: data.availability || {
        hoursPerWeek: 40,
        preferredHours: { start: '09:00', end: '17:00' },
        daysAvailable: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      socialLinks: data.socialLinks,
      certifications: data.certifications || [],
      badges: data.badges || [],
      verifiedInfo: data.verifiedInfo || {
        identity: false,
        skills: false,
        experience: false,
      },
      preferences: data.preferences || {
        remoteOnly: true,
        travelWilling: false,
        teamWork: true,
        soloProjects: true,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(agentId, profile);
    return profile;
  }

  /**
   * Get agent profile by agent ID
   */
  getProfile(agentId: string): AgentProfile | undefined {
    return this.profiles.get(agentId);
  }

  /**
   * Update agent profile
   */
  updateProfile(agentId: string, updates: Partial<AgentProfile>): AgentProfile | undefined {
    const profile = this.profiles.get(agentId);
    if (!profile) {
      return undefined;
    }

    const updatedProfile: AgentProfile = {
      ...profile,
      ...updates,
      id: profile.id,
      agentId: profile.agentId,
      createdAt: profile.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(agentId, updatedProfile);
    return updatedProfile;
  }

  /**
   * Delete agent profile
   */
  deleteProfile(agentId: string): boolean {
    return this.profiles.delete(agentId);
  }

  /**
   * Search profiles by various criteria
   */
  searchProfiles(criteria: {
    location?: string;
    timezone?: string;
    languages?: string[];
    specializations?: string[];
    minExperience?: number;
    maxHourlyRate?: number;
    verified?: boolean;
  }): AgentProfile[] {
    let results = Array.from(this.profiles.values());

    if (criteria.location) {
      results = results.filter(p => p.location?.toLowerCase().includes(criteria.location!.toLowerCase()));
    }

    if (criteria.timezone) {
      results = results.filter(p => p.timezone === criteria.timezone);
    }

    if (criteria.languages && criteria.languages.length > 0) {
      results = results.filter(p =>
        criteria.languages!.some(lang => p.languages.includes(lang))
      );
    }

    if (criteria.specializations && criteria.specializations.length > 0) {
      results = results.filter(p =>
        criteria.specializations!.some(spec => p.specializations.includes(spec))
      );
    }

    if (criteria.minExperience !== undefined) {
      results = results.filter(p => p.yearsOfExperience >= criteria.minExperience!);
    }

    if (criteria.maxHourlyRate !== undefined) {
      results = results.filter(p => !p.hourlyRate || p.hourlyRate <= criteria.maxHourlyRate!);
    }

    if (criteria.verified !== undefined) {
      results = results.filter(p =>
        p.verifiedInfo.identity || p.verifiedInfo.skills || p.verifiedInfo.experience
      );
    }

    return results;
  }

  /**
   * Get profiles by agent IDs
   */
  getProfilesByAgentIds(agentIds: string[]): AgentProfile[] {
    return agentIds
      .map(id => this.profiles.get(id))
      .filter((p): p is AgentProfile => p !== undefined);
  }

  /**
   * Update availability for an agent
   */
  updateAvailability(
    agentId: string,
    availability: AgentProfile['availability']
  ): AgentProfile | undefined {
    const profile = this.profiles.get(agentId);
    if (!profile) {
      return undefined;
    }

    profile.availability = availability;
    profile.updatedAt = new Date().toISOString();
    this.profiles.set(agentId, profile);
    return profile;
  }

  /**
   * Add badge to agent
   */
  addBadge(agentId: string, badge: string): AgentProfile | undefined {
    const profile = this.profiles.get(agentId);
    if (!profile) {
      return undefined;
    }

    if (!profile.badges.includes(badge)) {
      profile.badges.push(badge);
      profile.updatedAt = new Date().toISOString();
      this.profiles.set(agentId, profile);
    }

    return profile;
  }

  /**
   * Add certification to agent
   */
  addCertification(agentId: string, certification: string): AgentProfile | undefined {
    const profile = this.profiles.get(agentId);
    if (!profile) {
      return undefined;
    }

    if (!profile.certifications.includes(certification)) {
      profile.certifications.push(certification);
      profile.updatedAt = new Date().toISOString();
      this.profiles.set(agentId, profile);
    }

    return profile;
  }

  /**
   * Update verification status
   */
  updateVerificationStatus(
    agentId: string,
    verification: Partial<AgentProfile['verifiedInfo']>
  ): AgentProfile | undefined {
    const profile = this.profiles.get(agentId);
    if (!profile) {
      return undefined;
    }

    profile.verifiedInfo = {
      ...profile.verifiedInfo,
      ...verification,
    };
    profile.updatedAt = new Date().toISOString();
    this.profiles.set(agentId, profile);
    return profile;
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): AgentProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get profile count
   */
  getProfileCount(): number {
    return this.profiles.size;
  }

  /**
   * Calculate profile completeness
   */
  getProfileCompleteness(agentId: string): number {
    const profile = this.profiles.get(agentId);
    if (!profile) {
      return 0;
    }

    let score = 0;
    const fields = [
      profile.displayName,
      profile.tagline,
      profile.bio,
      profile.avatarUrl,
      profile.location,
      profile.timezone,
    ];

    // Basic info (6 fields)
    score += fields.filter(f => f && f.toString().length > 0).length * (100 / 6 / fields.length);

    // Specializations
    if (profile.specializations.length > 0) {
      score += 10;
    }

    // Languages
    if (profile.languages.length > 0) {
      score += 5;
    }

    // Experience
    if (profile.yearsOfExperience > 0) {
      score += 10;
    }

    // Pricing
    if (profile.hourlyRate || profile.dailyRate || profile.fixedPrice) {
      score += 10;
    }

    // Social links
    if (profile.socialLinks) {
      const linkCount = Object.values(profile.socialLinks).filter(l => l).length;
      score += linkCount * 2.5;
    }

    // Verification
    if (profile.verifiedInfo.identity) score += 5;
    if (profile.verifiedInfo.skills) score += 5;
    if (profile.verifiedInfo.experience) score += 5;

    return Math.min(100, Math.round(score));
  }

  /**
   * Export profile data for external use
   */
  exportProfile(agentId: string): Record<string, unknown> | undefined {
    const profile = this.profiles.get(agentId);
    if (!profile) {
      return undefined;
    }

    return {
      ...profile,
      exportDate: new Date().toISOString(),
      completeness: this.getProfileCompleteness(agentId),
    };
  }

  /**
   * Import profile data
   */
  importProfile(data: AgentProfile): AgentProfile {
    const profile: AgentProfile = {
      ...data,
      id: data.id || `profile-${uuidv4()}`,
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(profile.agentId, profile);
    return profile;
  }
}

// Singleton instance
export const agentProfileService = new AgentProfileService();
