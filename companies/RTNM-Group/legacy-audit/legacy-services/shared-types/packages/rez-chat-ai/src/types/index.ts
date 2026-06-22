// ── AI Chat Types ─────────────────────────────────────────────────────────────

// ReZ App Main Types
export type ReZAppType = 'going_out' | 'home_delivery' | 'earn' | 'play' | 'general';

// Legacy support for old types
export type AppType = ReZAppType | 'hotel' | 'restaurant' | 'retail' | 'support';

// Industry categories (12 main categories)
export type IndustryCategory =
  // Going Out (food & dining)
  | 'restaurant' | 'cafe' | 'bar' | 'food_court' | 'cloud_kitchen'
  // Home Delivery (shopping)
  | 'fashion' | 'grocery' | 'pharmacy' | 'electronics' | 'beauty' | 'home_services'
  // Play (entertainment)
  | 'entertainment' | 'travel' | 'events' | 'movies' | 'gaming'
  // Earn (rewards)
  | 'earn'
  // General
  | 'financial' | 'education' | 'healthcare' | 'fitness'
  // Hotel (special)
  | 'hotel' | 'hotel_restaurant' | 'hotel_spa' | 'hotel_lounge'
  // Support
  | 'support';

export interface KnowledgeEntry {
  id: string;
  type: 'product' | 'service' | 'offer' | 'faq' | 'policy' | 'info';
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  relevanceScore?: number;
}

export interface KnowledgeBase {
  appType: AppType;
  merchantId?: string;
  entries: KnowledgeEntry[];
  lastUpdated: Date;
}

export interface CustomerContext {
  customerId: string;
  name?: string;
  email?: string;
  phone?: string;
  tier?: string;
  preferences?: Record<string, unknown>;
  recentOrders?: OrderSummary[];
  bookings?: BookingSummary[];
  totalSpent?: number;
  visitCount?: number;
  activeApps?: string[];
}

export interface OrderSummary {
  orderId: string;
  type: 'hotel_booking' | 'restaurant_order' | 'retail_purchase';
  status: string;
  total: number;
  date: Date;
  items?: string[];
}

export interface BookingSummary {
  bookingId: string;
  type: 'hotel' | 'restaurant' | 'service';
  status: string;
  date: Date;
  details?: string;
}

export interface AIChatMessage {
  id: string;
  conversationId: string;
  sender: 'user' | 'ai' | 'staff';
  content: string;
  timestamp: Date;
  metadata?: {
    isAutomated?: boolean;
    confidence?: number;
    suggestions?: string[];
    toolsUsed?: string[];
  };
}

export interface AIChatRequest {
  conversationId: string;
  message: string;
  userId: string;
  appType: AppType;
  merchantId?: string;
  customerContext?: CustomerContext;
  chatHistory?: AIChatMessage[];
}

export interface AIChatResponse {
  message: string;
  suggestions?: string[];
  actions?: AIAction[];
  confidence: number;
  knowledgeUsed?: string[];
}

export interface AIAction {
  type: 'create_booking' | 'place_order' | 'send_to_staff' | 'provide_info' | 'suggest_product' | 'escalate';
  data: Record<string, unknown>;
  reason: string;
}

export interface ToolHandler {
  name: string;
  description: string;
  execute: (params: Record<string, unknown>, context: CustomerContext) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ── Knowledge Provider Types ───────────────────────────────────────────────────

export interface KnowledgeProvider {
  type: 'global' | 'merchant' | 'customer' | 'app' | 'industry';
  priority: number; // Higher = more relevant
  getEntries: (context: CustomerContext) => Promise<KnowledgeEntry[]>;
}

export interface Sanitizer {
  name: string;
  sanitize: (text: string) => string;
}

// ── Chat Session Types ─────────────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  userId: string;
  appType: AppType;
  merchantId?: string;
  customerContext?: CustomerContext;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

export interface ChatConfig {
  appType: AppType;
  merchantId?: string;
  enableAutoReply: boolean;
  autoReplyDelay: number; // ms
  enableSuggestions: boolean;
  maxSuggestions: number;
  enableToolUse: boolean;
  confidenceThreshold: number;
  escalationKeywords: string[];
}

// ── Tool Handler ────────────────────────────────────────────────────────────────

export interface ToolHandlerConfig {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required: boolean }>;
  execute: (params: Record<string, unknown>, context: CustomerContext) => Promise<ToolResult>;
}
