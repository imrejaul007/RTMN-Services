/**
 * Core types for the QR SDK
 */

import type { z } from 'zod';

// ─── Configuration ─────────────────────────────────────────────────────────────

export interface QRConfig {
  baseUrl?: string;
  apiKey?: string;
  environment?: 'development' | 'staging' | 'production';
  walletUrl?: string;
  paymentUrl?: string;
  authUrl?: string;
  merchantUrl?: string;
  intentUrl?: string;
  chatUrl?: string;
  knowledgeBaseUrl?: string;
  timeout?: number;
  debug?: boolean;
}

// ─── Room QR Types ─────────────────────────────────────────────────────────────

export interface RoomQR {
  id: string;
  hotelId: string;
  hotelName: string;
  roomNumber: string;
  floor: number;
  guestId: string;
  checkInDate: string;
  checkOutDate: string;
  amenities: string[];
  qrType: 'room_service' | 'checkout' | 'feedback' | 'concierge';
  metadata?: Record<string, unknown>;
}

export interface ServiceRequest {
  roomId: string;
  category: 'room_service' | 'housekeeping' | 'concierge' | 'spa' | 'restaurant' | 'laundry';
  itemId?: string;
  description?: string;
  quantity?: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledTime?: string;
  notes?: string;
  guestPreferences?: Record<string, unknown>;
}

export interface ServiceResponse {
  requestId: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  estimatedTime?: string;
  staffAssigned?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequestResponse {
  success: boolean;
  request: ServiceResponse;
  message?: string;
}

export interface Bill {
  id: string;
  roomId: string;
  guestId: string;
  items: BillItem[];
  subtotal: number;
  taxes: number;
  discounts: number;
  total: number;
  currency: string;
  status: 'pending' | 'paid' | 'refunded';
  createdAt: string;
  dueDate?: string;
}

export interface BillItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
}

export interface PaymentRequest {
  method: 'wallet' | 'card' | 'upi' | 'cash' | 'bank_transfer';
  amount: number;
  currency?: string;
  billId?: string;
  transactionId?: string;
  metadata?: Record<string, unknown>;
}

export interface Receipt {
  id: string;
  transactionId: string;
  amount: number;
  currency: string;
  method: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
  billId?: string;
  orderId?: string;
  merchantId?: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
}

export interface Feedback {
  type: 'room_service' | 'stay' | 'checkout' | 'general';
  roomId?: string;
  orderId?: string;
  rating: number;
  categories?: FeedbackCategory[];
  comment?: string;
  photos?: string[];
  contactPermission?: boolean;
}

export interface FeedbackCategory {
  category: string;
  rating: number;
  comment?: string;
}

export interface FeedbackResponse {
  id: string;
  status: 'submitted' | 'reviewed' | 'responded';
  thankYouMessage?: string;
  createdAt: string;
}

// ─── Menu QR Types ─────────────────────────────────────────────────────────────

export interface Menu {
  id: string;
  storeId: string;
  storeName: string;
  categories: MenuCategory[];
  items: MenuItem[];
  dietaryOptions: DietaryOption[];
  allergens: string[];
  lastUpdated: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  image?: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
  category: string;
  dietary: DietaryOption[];
  allergens: string[];
  available: boolean;
  preparationTime?: number;
  calories?: number;
  modifiers?: MenuModifier[];
  variants?: MenuVariant[];
}

export interface DietaryOption {
  code: string;
  name: string;
  icon?: string;
}

export interface MenuModifier {
  id: string;
  name: string;
  options: ModifierOption[];
  required: boolean;
  multiSelect: boolean;
  minSelections?: number;
  maxSelections?: number;
}

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

export interface MenuVariant {
  id: string;
  name: string;
  priceAdjustment: number;
  available: boolean;
}

export interface DietaryFilters {
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  nutFree?: boolean;
  halal?: boolean;
  kosher?: boolean;
  custom?: string[];
}

export interface Priority {
  level: 'normal' | 'rush';
  note?: string;
}

export interface Split {
  type: 'equal' | 'item' | 'custom';
  userId?: string;
  amount?: number;
  itemIds?: string[];
}

export interface SplitBill {
  id: string;
  orderId: string;
  splits: SplitResult[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'completed' | 'partial';
  createdAt: string;
}

export interface SplitResult {
  userId: string;
  amount: number;
  status: 'pending' | 'paid';
  paymentMethod?: string;
}

// ─── Store QR (Rez Now / Linktree) Types ──────────────────────────────────────

export interface StoreProfile {
  id: string;
  slug: string;
  name: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  theme?: StoreTheme;
  links: StoreLink[];
  socialLinks?: SocialLink[];
  contactInfo?: ContactInfo;
  location?: StoreLocation;
  businessHours?: BusinessHours;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreTheme {
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  fontFamily?: string;
  buttonStyle?: 'rounded' | 'square' | 'pill';
}

export interface StoreLink {
  id: string;
  type: 'menu' | 'order' | 'booking' | 'website' | 'social' | 'custom';
  title: string;
  url: string;
  icon?: string;
  image?: string;
  sortOrder: number;
  active: boolean;
  analytics?: LinkAnalytics;
}

export interface LinkAnalytics {
  clicks: number;
  uniqueClicks: number;
  lastClicked?: string;
}

export interface SocialLink {
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok' | 'whatsapp';
  url: string;
  handle?: string;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
}

export interface StoreLocation {
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface BusinessHours {
  timezone: string;
  schedule: DaySchedule[];
}

export interface DaySchedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  open: string;
  close: string;
  closed: boolean;
}

export type QRType = 'menu' | 'order' | 'payment' | 'feedback' | 'loyalty' | 'custom';

export interface QRCode {
  id: string;
  url: string;
  data: string;
  type: QRType;
  size: number;
  foregroundColor?: string;
  backgroundColor?: string;
  logo?: string;
  expiresAt?: string;
}

export interface AnalyticsEvent {
  eventType: 'scan' | 'click' | 'purchase' | 'book' | 'contact';
  source: 'qr' | 'link' | 'search' | 'direct';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ─── Campaign QR (Ads) Types ─────────────────────────────────────────────────

export interface Campaign {
  id: string;
  slug: string;
  name: string;
  description: string;
  brandName: string;
  brandLogo?: string;
  coverImage?: string;
  type: 'product' | 'service' | 'promotion' | 'awareness';
  status: 'active' | 'paused' | 'ended';
  startDate: string;
  endDate?: string;
  rewards: CampaignReward[];
  actions: CampaignAction[];
  tracking: CampaignTracking;
  targetAudience?: TargetAudience;
  landingPage?: LandingPage;
  createdAt: string;
}

export interface CampaignReward {
  id: string;
  type: 'discount' | 'freebie' | 'cashback' | 'points' | 'consultation' | 'sample';
  title: string;
  description: string;
  value?: number;
  currency?: string;
  code?: string;
  conditions?: string[];
  expiresAt?: string;
  claimLimit?: number;
  claimedCount: number;
}

export interface CampaignAction {
  id: string;
  type: 'visit' | 'purchase' | 'signup' | 'share' | 'review';
  title: string;
  description: string;
  rewardId?: string;
  requiredCount?: number;
}

export interface CampaignTracking {
  scans: number;
  uniqueScans: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

export interface TargetAudience {
  demographics?: {
    ageRange?: { min: number; max: number };
    gender?: string[];
    locations?: string[];
  };
  interests?: string[];
  behaviors?: string[];
}

export interface LandingPage {
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaUrl?: string;
  sections: LandingSection[];
}

export interface LandingSection {
  type: 'hero' | 'features' | 'testimonials' | 'pricing' | 'faq' | 'gallery';
  content: Record<string, unknown>;
}

export interface Reward {
  id: string;
  type: string;
  title: string;
  value?: number;
  code?: string;
  status: 'available' | 'claimed' | 'expired' | 'redeemed';
  expiresAt?: string;
  redeemedAt?: string;
}

export interface ConsultationRequest {
  campaignId: string;
  name: string;
  email: string;
  phone?: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
  source: 'qr' | 'link' | 'ad';
}

export interface Booking {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  scheduledDate?: string;
  scheduledTime?: string;
  confirmationCode?: string;
  consultantName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  createdAt: string;
}

export interface SampleRequest {
  id: string;
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';
  sampleId: string;
  sampleName: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  deliveryAddress?: string;
  createdAt: string;
}

// ─── AI Types ─────────────────────────────────────────────────────────────────

export interface RecommendationContext {
  source: 'room_qr' | 'menu_qr' | 'store_qr' | 'campaign_qr';
  roomId?: string;
  storeId?: string;
  campaignId?: string;
  userId?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  stayDuration?: string;
  dietaryPreferences?: DietaryFilters;
  browsingHistory?: string[];
  preferences?: Record<string, unknown>;
}

export interface Recommendation {
  id: string;
  type: 'item' | 'service' | 'experience' | 'promotion';
  title: string;
  description: string;
  itemId?: string;
  image?: string;
  price?: number;
  currency?: string;
  score: number;
  reasons: string[];
  actionLabel?: string;
}

export interface AIContext {
  sessionId?: string;
  userId?: string;
  source: 'room_qr' | 'menu_qr' | 'store_qr' | 'campaign_qr' | 'chat';
  roomId?: string;
  storeId?: string;
  context?: Record<string, unknown>;
}

export interface AIResponse {
  message: string;
  suggestions?: string[];
  actions?: AIAction[];
  context?: Record<string, unknown>;
  confidence: number;
}

export interface AIAction {
  type: 'navigate' | 'order' | 'book' | 'call' | 'open_link';
  label: string;
  data: Record<string, unknown>;
}

export interface Intent {
  id: string;
  name: string;
  confidence: number;
  entities: Record<string, unknown>;
  suggestedActions: string[];
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface OTPResponse {
  success: boolean;
  messageId: string;
  expiresIn: number;
  resendAvailableIn?: number;
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  avatar?: string;
  role: 'guest' | 'member' | 'vip' | 'admin';
  verified: boolean;
  createdAt: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  language: string;
  currency: string;
  notifications: NotificationPreferences;
  dietary?: DietaryFilters;
}

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  types: string[];
}

// ─── Wallet Types ─────────────────────────────────────────────────────────────

export interface WalletBalance {
  total: number;
  available: number;
  locked: number;
  currency: string;
  coins: CoinBalance[];
  lastUpdated: string;
}

export interface CoinBalance {
  type: 'promo' | 'rewards' | 'cashback' | 'refund';
  balance: number;
  expiryDate?: string;
  label: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  newBalance: number;
  bonusAmount?: number;
  message?: string;
  timestamp: string;
}

export interface PaymentMethod {
  type: 'card' | 'upi' | 'netbanking' | 'wallet' | 'bank';
  id?: string;
  cardLast4?: string;
  cardType?: 'visa' | 'mastercard' | 'amex' | 'rupay';
  upiId?: string;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  balance: number;
  description: string;
  reference?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ─── Common Types ──────────────────────────────────────────────────────────────

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: ResponseMeta;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  version: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
