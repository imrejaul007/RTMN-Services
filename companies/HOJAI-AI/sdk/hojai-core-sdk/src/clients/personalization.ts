import { BaseClient, HojaiConfig } from '../base.js';

// Personalization OS — Port 4893
export class PersonalizationClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4893' }); }

  // Profiles
  async listProfiles(params?: { userId?: string }) { return this.get<any>('/profiles', params); }
  async getProfile(userId: string) { return this.get<any>(`/profiles/${userId}`); }
  async createProfile(data: { userId: string; name?: string; preferences?: Record<string, unknown>; traits?: Record<string, unknown> }) { return this.post<any>('/profiles', data); }
  async updateProfile(userId: string, data: Record<string, unknown>) { return this.put<any>(`/profiles/${userId}`, data); }
  async deleteProfile(userId: string) { return this.delete<any>(`/profiles/${userId}`); }

  // Preferences
  async trackPreference(userId: string, category: string, score: number) { return this.post<any>(`/preferences/${userId}/track`, { category, score }); }
  async getPreferences(userId: string) { return this.get<any>(`/preferences/${userId}`); }

  // Recommendations
  async getRecommendations(userId: string, limit?: number) { return this.get<any>(`/recommendations/${userId}`, { limit }); }
  async getSegmentRecommendations(segment: string, limit?: number) { return this.get<any>(`/recommendations/segment/${segment}`, { limit }); }

  // Segments
  async listSegments() { return this.get<any>('/segments'); }
}