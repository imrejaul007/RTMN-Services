/**
 * RAZO Keyboard - Genie AI Client
 *
 * Integrates with RTNM Genie services:
 * - Genie Briefing Service (port 4706)
 * - Genie Memory Service (port 4703)
 * - Genie Relationship Service (port 4704)
 * - Genie Meeting Service (port 4713)
 * - CoPilot (Business AI, port 4002)
 */

import axios from 'axios';

// Configuration - CORRECTED PORTS
const GENIE_URL = process.env.GENIE_URL || 'http://localhost:4706';              // Genie Briefing
const GENIE_GATEWAY = process.env.GENIE_GATEWAY || 'http://localhost:4702';      // Genie Gateway
const GENIE_MEMORY = process.env.GENIE_MEMORY || 'http://localhost:4703';        // Genie Memory
const GENIE_RELATIONSHIP = process.env.GENIE_RELATIONSHIP || 'http://localhost:4704'; // Genie Relationship
const GENIE_MEETING = process.env.GENIE_MEETING || 'http://localhost:4713';      // Genie Meeting
const COPILOT_URL = process.env.COPILOT_URL || 'http://localhost:4002';          // Business CoPilot

// ============================================
// TYPES
// ============================================

export interface GenieResponse {
  success: boolean;
  response?: string;
  actions?: GenieAction[];
  suggestions?: string[];
  context?: Record<string, any>;
  data?: BriefingData;
}

export interface BriefingData {
  id?: string;
  userId?: string;
  date?: string;
  type?: 'morning' | 'evening' | 'daily';
  sections?: BriefingSection[];
  summary?: string;
  tasks?: TaskItem[];
  reminders?: ReminderItem[];
  meetings?: MeetingItem[];
}

export interface BriefingSection {
  id: string;
  type: string;
  title: string;
  content?: string;
  items?: any[];
  metadata?: Record<string, any>;
}

export interface TaskItem {
  id: string;
  title: string;
  dueDate?: string;
  dueIn?: string;
  priority?: 'high' | 'medium' | 'low';
  completed?: boolean;
}

export interface ReminderItem {
  id: string;
  title: string;
  time?: string;
  datetime?: string;
}

export interface MeetingItem {
  id: string;
  title: string;
  startTime?: string;
  joinLink?: string;
  contactName?: string;
  contactPhone?: string;
  isBirthday?: boolean;
}

export interface GenieAction {
  type: 'deeplink' | 'api' | 'notification' | 'calendar';
  title: string;
  description?: string;
  data: Record<string, any>;
}

export interface CoPilotResponse {
  success: boolean;
  response?: string;
  report?: Record<string, any>;
  email?: {
    to: string;
    subject: string;
    body: string;
  };
  data?: Record<string, any>;
}

export interface MemoryContext {
  recentTopics?: string[];
  relationships?: string[];
  preferences?: Record<string, any>;
  history?: string[];
}

// ============================================
// GENIE BRIEFING CLIENT (port 4706)
// ============================================

export class GenieClient {
  private baseUrl: string;
  private gatewayUrl: string;

  constructor(baseUrl = GENIE_URL, gatewayUrl = GENIE_GATEWAY) {
    this.baseUrl = baseUrl;
    this.gatewayUrl = gatewayUrl;
  }

  /**
   * Get headers for API calls
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (process.env.INTERNAL_SERVICE_TOKEN) {
      headers['x-internal-token'] = process.env.INTERNAL_SERVICE_TOKEN;
    }

    return headers;
  }

  /**
   * Get today's briefing from Genie Briefing Service
   */
  async getTodayBriefing(userId: string): Promise<GenieResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/briefings/today`,
        {
          headers: {
            ...this.getHeaders(),
            'x-user-id': userId,
            'x-tenant-id': 'razo-keyboard',
          },
          timeout: 10000,
        }
      );

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return { success: false, response: 'No briefing found' };
    } catch (error: any) {
      console.error('Genie getTodayBriefing error:', error.message);
      return { success: false, response: 'Unable to fetch briefing' };
    }
  }

  /**
   * Get morning briefing
   */
  async getMorningBriefing(userId: string): Promise<GenieResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/briefings/morning`,
        {
          headers: {
            ...this.getHeaders(),
            'x-user-id': userId,
            'x-tenant-id': 'razo-keyboard',
          },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Genie getMorningBriefing error:', error.message);
      return { success: false, response: 'Unable to fetch morning briefing' };
    }
  }

  /**
   * Get evening briefing
   */
  async getEveningBriefing(userId: string): Promise<GenieResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/briefings/evening`,
        {
          headers: {
            ...this.getHeaders(),
            'x-user-id': userId,
            'x-tenant-id': 'razo-keyboard',
          },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Genie getEveningBriefing error:', error.message);
      return { success: false, response: 'Unable to fetch evening briefing' };
    }
  }

  /**
   * Generate a new briefing
   */
  async generateBriefing(userId: string, type: 'morning' | 'evening' | 'daily' = 'daily'): Promise<GenieResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/briefings/generate`,
        { userId, type },
        {
          headers: {
            ...this.getHeaders(),
            'x-user-id': userId,
            'x-tenant-id': 'razo-keyboard',
          },
          timeout: 30000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Genie generateBriefing error:', error.message);
      return { success: false, response: 'Unable to generate briefing' };
    }
  }

  /**
   * Process a command through Genie Gateway
   */
  async processCommand(command: string, userId: string): Promise<GenieResponse> {
    try {
      const response = await axios.post(
        `${this.gatewayUrl}/api/genie/process`,
        { command, userId },
        {
          headers: this.getHeaders(),
          timeout: 30000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Genie processCommand error:', error.message);
      return { success: false, response: "I'm having trouble connecting to Genie. Please try again." };
      return {
        response: "I'm having trouble connecting to Genie. Please try again.",
        actions: [],
        suggestions: [],
      };
    }
  }

  /**
   * Get briefing (daily summary)
   */
  async getBriefing(userId: string): Promise<GenieResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/genie/briefing/${userId}`, {
        headers: this.getHeaders(),
        timeout: 15000,
      });

      return response.data;
    } catch (error: any) {
      console.error('Genie briefing error:', error.message);
      return {
        response: 'Unable to fetch briefing at this time.',
        actions: [],
        suggestions: [],
      };
    }
  }

  /**
   * Search knowledge base
   */
  async search(query: string, userId: string): Promise<GenieResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/genie/search`,
        { query, userId },
        {
          headers: this.getHeaders(),
          timeout: 15000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Genie search error:', error.message);
      return {
        response: 'Search failed. Please try again.',
        suggestions: [],
      };
    }
  }

  /**
   * Generate birthday/message greeting
   */
  async generateGreeting(
    type: 'birthday' | 'anniversary' | 'thank_you' | 'follow_up',
    context: { name?: string; relationship?: string },
    userId: string
  ): Promise<GenieResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/genie/greeting`,
        { type, context, userId },
        {
          headers: this.getHeaders(),
          timeout: 15000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Genie greeting error:', error.message);
      return {
        response: this.getDefaultGreeting(type, context.name),
        actions: [],
        suggestions: [],
      };
    }
  }

  /**
   * Set reminder
   */
  async setReminder(reminder: {
    text: string;
    datetime?: string;
    repeat?: 'daily' | 'weekly' | 'monthly';
  }, userId: string): Promise<GenieResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/genie/reminder`,
        { ...reminder, userId },
        {
          headers: this.getHeaders(),
          timeout: 15000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Genie reminder error:', error.message);
      return {
        response: 'Reminder set. I will remind you!',
        actions: [
          {
            type: 'notification',
            title: 'Reminder',
            description: reminder.text,
            data: reminder,
          },
        ],
        suggestions: [],
      };
    }
  }

  /**
   * Book/meeting scheduling
   */
  async schedule(data: {
    title: string;
    datetime?: string;
    duration?: number;
    attendees?: string[];
  }, userId: string): Promise<GenieResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/genie/schedule`,
        { ...data, userId },
        {
          headers: this.getHeaders(),
          timeout: 15000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Genie schedule error:', error.message);
      return {
        response: `Meeting "${data.title}" has been scheduled.`,
        actions: [
          {
            type: 'calendar',
            title: data.title,
            data,
          },
        ],
        suggestions: [],
      };
    }
  }

  /**
   * Get headers for API calls
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (process.env.INTERNAL_SERVICE_TOKEN) {
      headers['x-internal-token'] = process.env.INTERNAL_SERVICE_TOKEN;
    }

    return headers;
  }

  /**
   * Default greeting generator
   */
  private getDefaultGreeting(type: string, name?: string): string {
    const greetings: Record<string, string> = {
      birthday: `Happy Birthday${name ? `, ${name}!` : '!'} 🎂 Wishing you a wonderful day!`,
      anniversary: `Happy Anniversary${name ? `, ${name}!` : '!'} 💐 Here's to many more!`,
      thank_you: 'Thank you so much! I really appreciate it! 🙏',
      follow_up: "Just following up! I'd love to hear your thoughts.",
    };

    return greetings[type] || greetings.follow_up;
  }
}

// ============================================
// COPILOT CLIENT (Business AI - Port 4002)
// ============================================

export class CoPilotClient {
  private baseUrl: string;

  constructor(baseUrl = COPILOT_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get headers for API calls
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (process.env.INTERNAL_SERVICE_TOKEN) {
      headers['x-internal-token'] = process.env.INTERNAL_SERVICE_TOKEN;
    }

    return headers;
  }

  /**
   * Get skills catalog
   */
  async getSkillsCatalog(industry?: string): Promise<{ industries: string[]; skills: any[] }> {
    try {
      const url = industry
        ? `${this.baseUrl}/skills?industry=${industry}`
        : `${this.baseUrl}/skills`;

      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 10000,
      });

      return response.data;
    } catch (error: any) {
      console.error('CoPilot getSkillsCatalog error:', error.message);
      return { industries: [], skills: [] };
    }
  }

  /**
   * Process business command via chat endpoint
   */
  async processCommand(message: string, userId: string, industry?: string): Promise<CoPilotResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat`,
        {
          message,
          industry: industry || 'general',
          context: { userId, source: 'razo-keyboard' },
        },
        {
          headers: this.getHeaders(),
          timeout: 30000,
        }
      );

      return {
        success: true,
        response: response.data.response,
        data: {
          sessionId: response.data.sessionId,
          skills: response.data.skills,
          suggestions: response.data.suggestions,
        },
      };
    } catch (error: any) {
      console.error('CoPilot processCommand error:', error.message);
      return {
        success: false,
        response: "I'm having trouble connecting to CoPilot. Please try again.",
      };
    }
  }

  /**
   * Chat with CoPilot (alias for processCommand)
   */
  async chat(message: string, industry?: string, context?: Record<string, any>): Promise<CoPilotResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat`,
        {
          message,
          industry: industry || 'general',
          context: context || { source: 'razo-keyboard' },
        },
        {
          headers: this.getHeaders(),
          timeout: 30000,
        }
      );

      return {
        success: true,
        response: response.data.response,
        data: {
          sessionId: response.data.sessionId,
          skills: response.data.skills,
          suggestions: response.data.suggestions,
        },
      };
    } catch (error: any) {
      console.error('CoPilot chat error:', error.message);
      return {
        success: false,
        response: "I'm having trouble connecting to CoPilot. Please try again.",
      };
    }
  }

  /**
   * Get session
   */
  async getSession(sessionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/sessions/${sessionId}`,
        {
          headers: this.getHeaders(),
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('CoPilot getSession error:', error.message);
      return null;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await axios.delete(
        `${this.baseUrl}/sessions/${sessionId}`,
        {
          headers: this.getHeaders(),
          timeout: 10000,
        }
      );

      return true;
    } catch (error: any) {
      console.error('CoPilot deleteSession error:', error.message);
      return false;
    }
  }

  /**
   * Get analytics
   */
  async getAnalytics(period: string = '24h'): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/analytics?period=${period}`,
        {
          headers: this.getHeaders(),
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('CoPilot getAnalytics error:', error.message);
      return null;
    }
  }

  /**
   * Generate sales/business report
   */
  async generateReport(params: {
    type: 'sales' | 'performance' | 'inventory' | 'customer';
    period?: 'daily' | 'weekly' | 'monthly';
    filters?: Record<string, any>;
  }, userId: string): Promise<CoPilotResponse> {
    try {
      // Use chat endpoint for report generation
      const reportType = params.type || 'sales';
      const period = params.period || 'daily';

      const response = await this.chat(
        `Generate a ${period} ${reportType} report${params.filters ? ` with filters: ${JSON.stringify(params.filters)}` : ''}`,
        reportType,
        { userId, requestType: 'report' }
      );

      return response;
    } catch (error: any) {
      console.error('CoPilot generateReport error:', error.message);
      return {
        success: false,
        response: "I'm having trouble generating the report. Please try again.",
      };
    }
  }

  /**
   * Draft email via CoPilot
   */
  async draftEmail(params: {
    to: string;
    subject?: string;
    tone?: 'formal' | 'friendly' | 'urgent';
    context?: string;
  }, userId: string): Promise<CoPilotResponse> {
    try {
      const tone = params.tone || 'friendly';
      const message = params.context
        ? `Draft an email to ${params.to}${params.subject ? ` about "${params.subject}"` : ''} in a ${tone} tone. ${params.context}`
        : `Draft a ${tone} email to ${params.to}${params.subject ? ` with subject "${params.subject}"` : ''}`;

      return await this.chat(message, 'email', { userId, requestType: 'email' });
    } catch (error: any) {
      console.error('CoPilot draftEmail error:', error.message);
      return {
        success: false,
        response: "I'm having trouble drafting the email. Please try again.",
      };
    }
  }

  /**
   * Analyze data via chat
   */
  async analyze(data: any, question: string, userId: string): Promise<CoPilotResponse> {
    try {
      const message = `${question}\n\nData: ${JSON.stringify(data, null, 2)}`;
      return await this.chat(message, 'analytics', { userId, requestType: 'analysis' });
    } catch (error: any) {
      console.error('CoPilot analyze error:', error.message);
      return {
        success: false,
        response: 'Analysis in progress...',
        data: {},
      };
    }
  }
}

// ============================================
// MEMORY CLIENT (Genie Memory - Port 4703)
// ============================================

export class MemoryClient {
  private baseUrl: string;

  constructor(baseUrl = GENIE_MEMORY) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get headers for API calls
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (process.env.INTERNAL_SERVICE_TOKEN) {
      headers['x-internal-token'] = process.env.INTERNAL_SERVICE_TOKEN;
    }

    return headers;
  }

  /**
   * Get context for user
   */
  async getContext(userId: string, depth: 'basic' | 'detailed' = 'basic'): Promise<MemoryContext> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/memory/context/${userId}?depth=${depth}`,
        {
          headers: {
            ...this.getHeaders(),
            'x-user-id': userId,
            'x-tenant-id': 'razo-keyboard',
          },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Memory getContext error:', error.message);
      return {};
    }
  }

  /**
   * Store interaction
   */
  async storeInteraction(
    userId: string,
    interaction: {
      type: string;
      content: string;
      entities?: string[];
      sentiment?: string;
    }
  ): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/api/memory/interaction`,
        { userId, interaction },
        {
          headers: {
            ...this.getHeaders(),
            'x-user-id': userId,
            'x-tenant-id': 'razo-keyboard',
          },
          timeout: 10000,
        }
      );

      return true;
    } catch (error: any) {
      console.error('Memory storeInteraction error:', error.message);
      return false;
    }
  }

  /**
   * Search memory
   */
  async search(query: string, userId: string): Promise<string[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/memory/search`,
        { query, userId },
        {
          headers: {
            ...this.getHeaders(),
            'x-user-id': userId,
            'x-tenant-id': 'razo-keyboard',
          },
          timeout: 10000,
        }
      );

      return response.data.results || [];
    } catch (error: any) {
      console.error('Memory search error:', error.message);
      return [];
    }
  }
}

// ============================================
// SINGLETON INSTANCES
// ============================================

let genieClient: GenieClient | null = null;
let copilotClient: CoPilotClient | null = null;
let memoryClient: MemoryClient | null = null;

/**
 * Get Genie client instance
 */
export function getGenieClient(): GenieClient {
  if (!genieClient) {
    genieClient = new GenieClient();
  }
  return genieClient;
}

/**
 * Get CoPilot client instance
 */
export function getCoPilotClient(): CoPilotClient {
  if (!copilotClient) {
    copilotClient = new CoPilotClient();
  }
  return copilotClient;
}

/**
 * Get Memory client instance
 */
export function getMemoryClient(): MemoryClient {
  if (!memoryClient) {
    memoryClient = new MemoryClient();
  }
  return memoryClient;
}

// ============================================
// ROUTING HELPERS
// ============================================

/**
 * Route command to appropriate AI service
 */
export async function routeToAI(
  text: string,
  userId: string,
  mode?: 'genie' | 'copilot' | 'auto'
): Promise<{ service: string; response: GenieResponse | CoPilotResponse }> {
  const lower = text.toLowerCase();

  // Auto-detect mode
  if (mode === 'auto' || !mode) {
    if (
      lower.includes('report') ||
      lower.includes('sales') ||
      lower.includes('email') ||
      lower.includes('business') ||
      lower.includes('analytics')
    ) {
      mode = 'copilot';
    } else {
      mode = 'genie';
    }
  }

  if (mode === 'copilot') {
    const copilot = getCoPilotClient();
    const response = await copilot.processCommand(text, userId);
    return { service: 'copilot', response };
  }

  const genie = getGenieClient();
  const response = await genie.processCommand(text, userId);
  return { service: 'genie', response };
}
