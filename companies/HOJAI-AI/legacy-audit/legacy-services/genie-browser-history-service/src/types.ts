/**
 * GENIE Browser History Service - Type Definitions
 * Tracks browsing patterns for personal intelligence
 */
import { z } from 'zod';

export interface BrowserSession {
  id: string;
  linked_user_id?: string;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'other';
  device_type: 'desktop' | 'mobile' | 'tablet';
  started_at: Date;
  ended_at?: Date;
  tenant_id: string;
}

export interface BrowserVisit {
  id: string;
  session_id: string;
  linked_user_id?: string;
  url: string;
  domain: string;
  title?: string;
  category?: string;
  search_query?: string;
  time_spent_seconds: number;
  visit_count: number;
  first_visit: Date;
  last_visit: Date;
  is_bookmarked: boolean;
  is_product_page: boolean;
  product_info?: { name?: string; price?: number; currency?: string };
  tenant_id: string;
  created_at: Date;
}

export interface BrowsingPattern {
  id: string;
  linked_user_id: string;
  date: Date;
  total_visits: number;
  total_time_minutes: number;
  top_domains: Array<{ domain: string; count: number; minutes: number }>;
  top_categories: Array<{ category: string; count: number }>;
  search_queries: string[];
  product_pages_visited: number;
  shopping_intent_score: number;
  tenant_id: string;
}

export interface BrowsingInsight {
  id: string;
  linked_user_id: string;
  type: 'interest' | 'intent' | 'research' | 'shopping' | 'news' | 'entertainment';
  title: string;
  description: string;
  confidence: number;
  evidence_domains: string[];
  generated_at: Date;
  tenant_id: string;
}

export const AddVisitsSchema = z.object({
  visits: z.array(z.object({
    url: z.string().url(),
    title: z.string().optional(),
    visit_time: z.string().datetime().optional(),
    time_spent_seconds: z.number().min(0).default(0),
  })).min(1).max(100),
  browser: z.enum(['chrome', 'firefox', 'safari', 'edge', 'other']).default('chrome'),
  device_type: z.enum(['desktop', 'mobile', 'tablet']).default('desktop'),
});

export interface APIResponse<T> { success: boolean; data?: T; error?: { code: string; message: string }; meta: { timestamp: string } }
export interface TenantContext { tenant_id: string; user_id?: string }
declare global { namespace Express { interface Request { tenantContext?: TenantContext; userId?: string } } }
