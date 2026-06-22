/**
 * GENIE Browser History Service - Models
 */
import mongoose, { Schema, Document } from 'mongoose';

export interface IBrowserSession extends Document {
  linked_user_id?: string; browser: string; device_type: string;
  started_at: Date; ended_at?: Date; tenant_id: string;
}
const BrowserSessionSchema = new Schema<IBrowserSession>({
  linked_user_id: { type: String, index: true },
  browser: { type: String, enum: ['chrome', 'firefox', 'safari', 'edge', 'other'], default: 'chrome' },
  device_type: { type: String, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop' },
  started_at: { type: Date, default: Date.now },
  ended_at: Date,
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });
BrowserSessionSchema.index({ tenant_id: 1, linked_user_id: 1 });
export const BrowserSession = mongoose.model<IBrowserSession>('BrowserSession', BrowserSessionSchema);

export interface IBrowserVisit extends Document {
  session_id?: string; linked_user_id?: string; url: string; domain: string;
  title?: string; category?: string; search_query?: string; time_spent_seconds: number;
  visit_count: number; first_visit: Date; last_visit: Date; is_bookmarked: boolean;
  is_product_page: boolean; product_info?: { name?: string; price?: number; currency?: string };
  tenant_id: string;
}
const BrowserVisitSchema = new Schema<IBrowserVisit>({
  session_id: { type: String, index: true },
  linked_user_id: { type: String, index: true },
  url: { type: String, required: true },
  domain: { type: String, required: true, index: true },
  title: String,
  category: String,
  search_query: String,
  time_spent_seconds: { type: Number, default: 0 },
  visit_count: { type: Number, default: 1 },
  first_visit: { type: Date, default: Date.now },
  last_visit: { type: Date, default: Date.now },
  is_bookmarked: { type: Boolean, default: false },
  is_product_page: { type: Boolean, default: false },
  product_info: { name: String, price: Number, currency: String },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });
BrowserVisitSchema.index({ tenant_id: 1, linked_user_id: 1, domain: 1 }, { unique: true });
BrowserVisitSchema.index({ tenant_id: 1, linked_user_id: 1, last_visit: -1 });
BrowserVisitSchema.index({ tenant_id: 1, category: 1 });
export const BrowserVisit = mongoose.model<IBrowserVisit>('BrowserVisit', BrowserVisitSchema);

export interface IBrowsingPattern extends Document {
  linked_user_id: string; date: Date; total_visits: number; total_time_minutes: number;
  top_domains: Array<{ domain: string; count: number; minutes: number }>;
  top_categories: Array<{ category: string; count: number }>;
  search_queries: string[]; product_pages_visited: number; shopping_intent_score: number;
  tenant_id: string;
}
const BrowsingPatternSchema = new Schema<IBrowsingPattern>({
  linked_user_id: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true },
  total_visits: { type: Number, default: 0 },
  total_time_minutes: { type: Number, default: 0 },
  top_domains: [{ domain: String, count: Number, minutes: Number }],
  top_categories: [{ category: String, count: Number }],
  search_queries: [String],
  product_pages_visited: { type: Number, default: 0 },
  shopping_intent_score: { type: Number, default: 0 },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });
BrowsingPatternSchema.index({ tenant_id: 1, linked_user_id: 1, date: -1 }, { unique: true });
export const BrowsingPattern = mongoose.model<IBrowsingPattern>('BrowsingPattern', BrowsingPatternSchema);

export interface IBrowsingInsight extends Document {
  linked_user_id: string; type: string; title: string; description: string;
  confidence: number; evidence_domains: string[]; generated_at: Date; tenant_id: string;
}
const BrowsingInsightSchema = new Schema<IBrowsingInsight>({
  linked_user_id: { type: String, required: true, index: true },
  type: { type: String, enum: ['interest', 'intent', 'research', 'shopping', 'news', 'entertainment'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 1, default: 0.5 },
  evidence_domains: [String],
  generated_at: { type: Date, default: Date.now },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });
BrowsingInsightSchema.index({ tenant_id: 1, linked_user_id: 1, type: 1 });
export const BrowsingInsight = mongoose.model<IBrowsingInsight>('BrowsingInsight', BrowsingInsightSchema);
