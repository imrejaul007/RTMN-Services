/**
 * GENIE WhatsApp Bot Service - Type Definitions
 * Version: 1.0.0 | Date: June 15, 2026
 * Purpose: WhatsApp Genie - User talks to Genie on WhatsApp
 */

export interface WhatsAppMessage {
  from: string;
  to: string;
  body: string;
  timestamp: number;
  id: string;
  type: 'text' | 'image' | 'voice' | 'document';
}

export interface GenieResponse {
  to: string;
  body: string;
  preview_url?: boolean;
}

export interface Session {
  user_id: string;
  phone: string;
  context: ConversationContext;
  last_message: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationContext {
  intent?: string;
  entities?: Record<string, unknown>;
  memories?: string[];
  twin_id?: string;
  briefing?: unknown;
}

export interface IntentResult {
  intent: string;
  entities: Record<string, unknown>;
  confidence: number;
  response_template: string;
}

export interface GenieConfig {
  whatsapp_business_token: string;
  whatsapp_phone_number_id: string;
  whatsapp_business_account_id: string;
  genie_gateway_url: string;
  genie_memory_url: string;
  genie_twin_url: string;
  personal_twin_url: string;
  greeting: string;
}
