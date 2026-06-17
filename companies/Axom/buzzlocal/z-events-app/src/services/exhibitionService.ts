/**
 * Exhibition OS API Service
 * Real API integration for all apps
 */

import axios, { AxiosInstance } from 'axios';

// ============================================
// CONFIGURATION
// ============================================

const GATEWAY_URL = process.env.EXPO_PUBLIC_EXHIBITION_GATEWAY_URL || 'http://localhost:5040';
const CORPID_URL = process.env.EXPO_PUBLIC_CORPID_URL || 'http://localhost:4300';
const SUTAR_ESCROW_URL = process.env.EXPO_PUBLIC_SUTAR_ESCROW_URL || 'http://localhost:4149';

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
  exhibitor_count: number;
  expected_visitors: number;
  tags: string[];
}

export interface Booth {
  id: string;
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

export interface Ticket {
  id: string;
  ticket_id: string;
  exhibition_id: string;
  exhibition_name: string;
  attendee_name: string;
  ticket_type: 'general' | 'vip' | 'press' | 'speaker';
  status: 'booked' | 'checked_in' | 'checked_out';
  qr_data: string;
  booked_at: string;
}

export interface Attendee {
  attendee_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  avatar_url: string;
  interests: string[];
  coin_balance: number;
  badges_earned: string[];
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
}

export interface Appointment {
  id: string;
  exhibitor_id: string;
  exhibitor_name: string;
  booth_number: string;
  date: string;
  start_time: string;
  status: 'scheduled' | 'confirmed' | 'completed';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  images: string[];
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount_percent: number;
  coupon_code: string;
  valid_until: string;
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
}

// ============================================
// API CLIENT
// ============================================

class ExhibitionAPI {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: GATEWAY_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      // Add tenant ID
      config.headers['X-Tenant-Id'] = 'default';
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        const message = error.response?.data?.error?.message || error.message;
        console.error('API Error:', message);
        throw new Error(message);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
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
  }): Promise<{ exhibitions: Exhibition[]; total: number }> {
    const data = await this.client.get('/api/exhibitions', { params });
    return data;
  }

  async getExhibition(id: string): Promise<Exhibition> {
    const data = await this.client.get(`/api/exhibitions/${id}`);
    return data.exhibition;
  }

  async searchExhibitions(query: string): Promise<Exhibition[]> {
    const data = await this.client.get('/api/exhibitions/search', { params: { q: query } });
    return data.exhibitions || [];
  }

  async getLiveExhibitions(): Promise<Exhibition[]> {
    const data = await this.client.get('/api/exhibitions', { params: { status: 'live' } });
    return data.exhibitions || [];
  }

  async getExhibitionBySlug(slug: string): Promise<Exhibition> {
    const data = await this.client.get(`/api/exhibitions/slug/${slug}`);
    return data.exhibition;
  }

  // ============================================
  // BOOTHS
  // ============================================

  async getBooths(exhibitionId: string, params?: {
    zone?: string;
    category?: string;
    search?: string;
  }): Promise<Booth[]> {
    const data = await this.client.get(`/api/exhibitions/${exhibitionId}/booths`, { params });
    return data.booths || [];
  }

  async getBooth(exhibitionId: string, boothId: string): Promise<Booth> {
    const data = await this.client.get(`/api/exhibitions/${exhibitionId}/booths/${boothId}`);
    return data.booth;
  }

  async getFeaturedBooths(exhibitionId: string): Promise<Booth[]> {
    const data = await this.client.get(`/api/exhibitions/${exhibitionId}/booths/featured`);
    return data.booths || [];
  }

  async getBoothProducts(exhibitionId: string, boothId: string): Promise<Product[]> {
    const data = await this.client.get(`/api/exhibitions/${exhibitionId}/booths/${boothId}/products`);
    return data.products || [];
  }

  // ============================================
  // SESSIONS
  // ============================================

  async getSessions(exhibitionId: string, params?: {
    type?: string;
    date?: string;
  }): Promise<Session[]> {
    const data = await this.client.get(`/api/exhibitions/${exhibitionId}/sessions`, { params });
    return data.sessions || [];
  }

  async getSession(exhibitionId: string, sessionId: string): Promise<Session> {
    const data = await this.client.get(`/api/exhibitions/${exhibitionId}/sessions/${sessionId}`);
    return data.session;
  }

  async registerForSession(exhibitionId: string, sessionId: string): Promise<Session> {
    const data = await this.client.post(`/api/sessions/${sessionId}/register`, {
      exhibition_id: exhibitionId,
    });
    return data.session;
  }

  // ============================================
  // REGISTRATION & TICKETS
  // ============================================

  async registerAttendee(exhibitionId: string, attendee: {
    name: string;
    email: string;
    phone: string;
    company: string;
    title: string;
    interests: string[];
  }): Promise<{ ticket: Ticket; attendee: Attendee }> {
    const data = await this.client.post(`/api/exhibitions/${exhibitionId}/register`, attendee);
    return data;
  }

  async getTickets(exhibitionId?: string): Promise<Ticket[]> {
    const data = await this.client.get('/api/tickets', {
      params: exhibitionId ? { exhibition_id: exhibitionId } : {},
    });
    return data.tickets || [];
  }

  async getTicket(ticketId: string): Promise<Ticket> {
    const data = await this.client.get(`/api/tickets/${ticketId}`);
    return data.ticket;
  }

  async checkIn(exhibitionId: string, badgeId: string): Promise<{
    success: boolean;
    attendee: Attendee;
    message: string;
  }> {
    const data = await this.client.post(`/api/exhibitions/${exhibitionId}/checkin`, { badge_id: badgeId });
    return data;
  }

  // ============================================
  // NETWORKING
  // ============================================

  async getConnections(exhibitionId: string): Promise<Connection[]> {
    const data = await this.client.get(`/api/connections/${exhibitionId}`);
    return data.connections || [];
  }

  async connectWithAttendee(exhibitionId: string, profileId: string): Promise<Connection> {
    const data = await this.client.post('/api/connections', {
      exhibition_id: exhibitionId,
      to_profile_id: profileId,
    });
    return data.connection;
  }

  async getSuggestedConnections(exhibitionId: string): Promise<Connection[]> {
    const data = await this.client.get(`/api/profiles/suggestions/${exhibitionId}`);
    return data.profiles || [];
  }

  async searchAttendees(exhibitionId: string, query: string): Promise<Connection[]> {
    const data = await this.client.get(`/api/profiles/search/${exhibitionId}`, {
      params: { q: query },
    });
    return data.profiles || [];
  }

  // ============================================
  // APPOINTMENTS
  // ============================================

  async getAppointments(exhibitionId: string): Promise<Appointment[]> {
    const data = await this.client.get('/api/appointments', {
      params: { exhibition_id: exhibitionId },
    });
    return data.appointments || [];
  }

  async bookAppointment(params: {
    exhibition_id: string;
    exhibitor_id: string;
    date: string;
    start_time: string;
    subject?: string;
  }): Promise<Appointment> {
    const data = await this.client.post('/api/appointments', params);
    return data.appointment;
  }

  async getExhibitorAvailability(
    exhibitionId: string,
    exhibitorId: string,
    date: string
  ): Promise<{ slots: { start_time: string; end_time: string; is_available: boolean }[] }> {
    const data = await this.client.get(`/api/availability/${exhibitorId}/${exhibitionId}/${date}`);
    return data;
  }

  async cancelAppointment(appointmentId: string): Promise<void> {
    await this.client.delete(`/api/appointments/${appointmentId}`);
  }

  // ============================================
  // ECONOMY (Coins, Missions)
  // ============================================

  async getCoinBalance(exhibitionId: string): Promise<{
    balance: number;
    total_earned: number;
    total_spent: number;
  }> {
    const data = await this.client.get(`/api/coins/balance/${exhibitionId}`);
    return data;
  }

  async getMissions(exhibitionId: string): Promise<Mission[]> {
    const data = await this.client.get(`/api/missions/${exhibitionId}`);
    return data.missions || [];
  }

  async recordProgress(params: {
    exhibition_id: string;
    mission_type: string;
    entity_id: string;
  }): Promise<{ coins_earned: number; mission_completed: boolean }> {
    const data = await this.client.post('/api/progress/record', params);
    return data;
  }

  // ============================================
  // AI / GENIE
  // ============================================

  async getDailyBriefing(exhibitionId: string): Promise<{
    summary: any;
    insights: any[];
    recommendations: any[];
  }> {
    const data = await this.client.get(`/api/genie/exhibitions/${exhibitionId}/briefing`);
    return data;
  }

  async getRecommendations(exhibitionId: string): Promise<{
    booths: Booth[];
    sessions: Session[];
    connections: Connection[];
  }> {
    const data = await this.client.get(`/api/recommendations/${exhibitionId}`);
    return data;
  }

  async askGenie(message: string, context?: {
    exhibition_id?: string;
    role?: 'visitor' | 'exhibitor' | 'organizer';
  }): Promise<string> {
    const data = await this.client.post('/api/chat', {
      message,
      ...context,
    });
    return data.response;
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
    const data = await this.client.get(`/api/analytics/dashboard/${exhibitionId}`);
    return data;
  }

  async getHeatmap(exhibitionId: string): Promise<{
    zones: { zone_id: string; zone_name: string; density: number; visitors: number }[];
  }> {
    const data = await this.client.get(`/api/heatmap/${exhibitionId}`);
    return data;
  }

  // ============================================
  // PAYMENTS (via SUTAR)
  // ============================================

  async createPaymentIntent(params: {
    exhibition_id: string;
    ticket_type: string;
    amount: number;
  }): Promise<{
    payment_id: string;
    amount: number;
    currency: string;
    order_id: string;
    checkout_url?: string;
  }> {
    const data = await this.client.post('/api/payments/intent', params);
    return data;
  }

  async confirmPayment(paymentId: string, paymentData: {
    gateway_txn_id: string;
    utr?: string;
  }): Promise<{ success: boolean; ticket: Ticket }> {
    const data = await this.client.post(`/api/payments/${paymentId}/confirm`, paymentData);
    return data;
  }

  // ============================================
  // HEALTH
  // ============================================

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton
export const exhibitionAPI = new ExhibitionAPI();
export default exhibitionAPI;
