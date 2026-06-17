/**
 * Exhibition OS SDK
 * Shared API client for Z Events, REZ Consumer, DO App integration
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// ============================================
// TYPES
// ============================================

export interface Exhibition {
  id: string;
  exhibition_id: string;
  name: string;
  tagline: string;
  description: string;
  industry: string;
  venue: string;
  city: string;
  start_date: string;
  end_date: string;
  ticket_price: number;
  status: 'draft' | 'published' | 'live' | 'completed';
  banner_image: string;
  logo_image: string;
  expected_visitors: number;
  exhibitor_count: number;
  tags: string[];
}

export interface Booth {
  id: string;
  booth_id: string;
  exhibitor_id: string;
  exhibitor_name: string;
  booth_number: string;
  zone_name: string;
  category: string;
  description: string;
  logo_url: string;
  banner_url: string;
  products: Product[];
  offers: Offer[];
  live_metrics: {
    visitors_count: number;
    leads_captured: number;
    avg_dwell_time: number;
  };
}

export interface Attendee {
  id: string;
  attendee_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  avatar_url: string;
  linkedin_url: string;
  interests: string[];
  badge_id: string;
  coin_balance: number;
  checkin_status: 'not_arrived' | 'inside' | 'left';
}

export interface Lead {
  id: string;
  lead_id: string;
  visitor_name: string;
  visitor_company: string;
  visitor_title: string;
  visitor_email: string;
  visitor_phone: string;
  interests: string[];
  intent_level: 'hot' | 'warm' | 'cold';
  notes: string;
  follow_up_status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  captured_at: string;
  source: 'badge_scan' | 'manual' | 'form';
}

export interface Session {
  id: string;
  session_id: string;
  title: string;
  description: string;
  type: 'keynote' | 'panel' | 'workshop' | 'networking';
  speaker_name: string;
  speaker_company: string;
  room: string;
  start_time: string;
  end_time: string;
  capacity: number;
  registered_count: number;
  is_registered: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  images: string[];
  in_stock: boolean;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount_percent: number;
  coupon_code: string;
  valid_until: string;
}

export interface Connection {
  id: string;
  profile_id: string;
  name: string;
  company: string;
  title: string;
  avatar_url: string;
  interests: string[];
  is_connected: boolean;
  connected_at?: string;
}

export interface Appointment {
  id: string;
  appointment_id: string;
  exhibitor_id: string;
  exhibitor_name: string;
  booth_number: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  type: string;
  target: number;
  current: number;
  coin_reward: number;
  is_completed: boolean;
  completed_at?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  earned_at?: string;
}

export interface AIInsight {
  type: 'opportunity' | 'warning' | 'recommendation' | 'trend';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

// ============================================
// API CLIENT
// ============================================

export class ExhibitionOSClient {
  private client: AxiosInstance;
  private gatewayUrl: string;

  constructor(options: {
    gatewayUrl?: string;
    apiKey?: string;
    tenantId?: string;
  } = {}) {
    this.gatewayUrl = options.gatewayUrl || 'http://localhost:5040';

    this.client = axios.create({
      baseURL: this.gatewayUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey && { 'X-API-Key': options.apiKey }),
        ...(options.tenantId && { 'X-Tenant-Id': options.tenantId }),
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        const message = (error.response?.data as any)?.error?.message || error.message;
        throw new Error(message);
      }
    );
  }

  // ============================================
  // EXHIBITIONS
  // ============================================

  async getExhibitions(params?: {
    status?: string;
    industry?: string;
    city?: string;
    page?: number;
    limit?: number;
  }): Promise<Exhibition[]> {
    const { data } = await this.client.get('/api/exhibitions', { params });
    return data.exhibitions || [];
  }

  async getExhibition(id: string): Promise<Exhibition> {
    const { data } = await this.client.get(`/api/exhibitions/${id}`);
    return data.exhibition;
  }

  async getExhibitionBySlug(slug: string): Promise<Exhibition> {
    const { data } = await this.client.get(`/api/exhibitions/slug/${slug}`);
    return data.exhibition;
  }

  async searchExhibitions(query: string): Promise<Exhibition[]> {
    const { data } = await this.client.get('/api/exhibitions/search', { params: { q: query } });
    return data.exhibitions || [];
  }

  // ============================================
  // BOOTHS
  // ============================================

  async getBooths(exhibitionId: string, params?: {
    zone?: string;
    category?: string;
    search?: string;
  }): Promise<Booth[]> {
    const { data } = await this.client.get(`/api/exhibitions/${exhibitionId}/booths`, { params });
    return data.booths || [];
  }

  async getBooth(exhibitionId: string, boothId: string): Promise<Booth> {
    const { data } = await this.client.get(`/api/exhibitions/${exhibitionId}/booths/${boothId}`);
    return data.booth;
  }

  async getFeaturedBooths(exhibitionId: string): Promise<Booth[]> {
    const { data } = await this.client.get(`/api/exhibitions/${exhibitionId}/booths/featured`);
    return data.booths || [];
  }

  // ============================================
  // ATTENDEE
  // ============================================

  async registerAttendee(exhibitionId: string, attendee: {
    name: string;
    email: string;
    phone: string;
    company: string;
    title: string;
    interests: string[];
  }): Promise<{ attendee: Attendee; ticket_id: string; badge_id: string }> {
    const { data } = await this.client.post(`/api/exhibitions/${exhibitionId}/register`, attendee);
    return data;
  }

  async getAttendee(exhibitionId: string, attendeeId: string): Promise<Attendee> {
    const { data } = await this.client.get(`/api/attendees/${attendeeId}`, {
      params: { exhibition_id: exhibitionId },
    });
    return data.attendee;
  }

  async checkIn(exhibitionId: string, badgeId: string): Promise<{ success: boolean; attendee: Attendee }> {
    const { data } = await this.client.post(`/api/exhibitions/${exhibitionId}/checkin`, { badge_id: badgeId });
    return data;
  }

  async getConnections(exhibitionId: string, attendeeId: string): Promise<Connection[]> {
    const { data } = await this.client.get(`/api/attendees/${attendeeId}/connections`, {
      params: { exhibition_id: exhibitionId },
    });
    return data.connections || [];
  }

  // ============================================
  // NETWORKING
  // ============================================

  async connectWithAttendee(exhibitionId: string, fromAttendeeId: string, toAttendeeId: string): Promise<Connection> {
    const { data } = await this.client.post('/api/connections', {
      exhibition_id: exhibitionId,
      from_profile_id: fromAttendeeId,
      to_profile_id: toAttendeeId,
    });
    return data.connection;
  }

  async getSuggestedConnections(exhibitionId: string, attendeeId: string): Promise<Connection[]> {
    const { data } = await this.client.get(`/api/profiles/${attendeeId}/suggestions`, {
      params: { exhibition_id: exhibitionId },
    });
    return data.profiles || [];
  }

  // ============================================
  // SESSIONS
  // ============================================

  async getSessions(exhibitionId: string, params?: {
    type?: string;
    date?: string;
  }): Promise<Session[]> {
    const { data } = await this.client.get(`/api/exhibitions/${exhibitionId}/sessions`, { params });
    return data.sessions || [];
  }

  async registerForSession(exhibitionId: string, sessionId: string, attendeeId: string): Promise<Session> {
    const { data } = await this.client.post(`/api/sessions/${sessionId}/register`, {
      exhibition_id: exhibitionId,
      attendee_id: attendeeId,
    });
    return data.session;
  }

  // ============================================
  // APPOINTMENTS
  // ============================================

  async getAppointments(exhibitionId: string, attendeeId: string): Promise<Appointment[]> {
    const { data } = await this.client.get('/api/appointments', {
      params: { exhibition_id: exhibitionId, attendee_id: attendeeId },
    });
    return data.appointments || [];
  }

  async bookAppointment(appointment: {
    exhibition_id: string;
    exhibitor_id: string;
    attendee_id: string;
    date: string;
    start_time: string;
    subject?: string;
  }): Promise<Appointment> {
    const { data } = await this.client.post('/api/appointments', appointment);
    return data.appointment;
  }

  async getExhibitorAvailability(exhibitionId: string, exhibitorId: string, date: string): Promise<{
    slots: { start_time: string; end_time: string; is_available: boolean }[];
  }> {
    const { data } = await this.client.get(`/api/availability/${exhibitorId}/${exhibitionId}/${date}`);
    return data;
  }

  // ============================================
  // ECONOMY (Coins, Missions)
  // ============================================

  async getCoinBalance(exhibitionId: string, attendeeId: string): Promise<{
    balance: number;
    total_earned: number;
    total_spent: number;
  }> {
    const { data } = await this.client.get(`/api/coins/${attendeeId}/${exhibitionId}`);
    return data;
  }

  async getMissions(exhibitionId: string, attendeeId: string): Promise<Mission[]> {
    const { data } = await this.client.get(`/api/attendees/${attendeeId}/${exhibitionId}/passport`);
    return data.missions || [];
  }

  async recordMissionProgress(attendeeId: string, exhibitionId: string, missionType: string, entityId: string): Promise<{
    coins_earned: number;
    missions_completed: number;
  }> {
    const { data } = await this.client.post('/api/progress/record', {
      attendee_id: attendeeId,
      exhibition_id: exhibitionId,
      mission_type: missionType,
      entity_id: entityId,
    });
    return data;
  }

  async getBadges(exhibitionId: string, attendeeId: string): Promise<Badge[]> {
    const { data } = await this.client.get(`/api/attendees/${attendeeId}/badges`, {
      params: { exhibition_id: exhibitionId },
    });
    return data.badges || [];
  }

  // ============================================
  // AI / INTELLIGENCE
  // ============================================

  async getDailyBriefing(exhibitionId: string): Promise<{
    summary: any;
    insights: AIInsight[];
    top_booths: any[];
    predicted_metrics: any;
  }> {
    const { data } = await this.client.get(`/api/genie/exhibitions/${exhibitionId}/briefing`);
    return data;
  }

  async getRecommendations(exhibitionId: string, attendeeId: string): Promise<{
    suggested_booths: Booth[];
    suggested_sessions: Session[];
    suggested_connections: Connection[];
  }> {
    const { data } = await this.client.get(`/api/visitor/${attendeeId}/${exhibitionId}/recommendations`);
    return data;
  }

  async askGenie(message: string, context?: {
    exhibition_id?: string;
    attendee_id?: string;
    role?: 'visitor' | 'exhibitor' | 'organizer';
  }): Promise<{ response: string }> {
    const { data } = await this.client.post('/api/chat', {
      message,
      ...context,
    });
    return data;
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getExhibitionAnalytics(exhibitionId: string): Promise<{
    total_visitors: number;
    current_inside: number;
    leads_captured: number;
    sessions_attended: number;
    top_booths: any[];
  }> {
    const { data } = await this.client.get(`/api/exhibitions/${exhibitionId}/dashboard`);
    return data.overview;
  }

  async getHeatmap(exhibitionId: string): Promise<{
    zones: { zone_id: string; density: number; visitors: number }[];
  }> {
    const { data } = await this.client.get(`/api/heatmap/${exhibitionId}`);
    return data;
  }
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default ExhibitionOSClient;

// Factory function for creating client with env config
export function createExhibitionOSClient(): ExhibitionOSClient {
  return new ExhibitionOSClient({
    gatewayUrl: process.env.EXHIBITION_GATEWAY_URL || 'http://localhost:5040',
    apiKey: process.env.EXHIBITION_API_KEY,
    tenantId: process.env.EXHIBITION_TENANT_ID,
  });
}