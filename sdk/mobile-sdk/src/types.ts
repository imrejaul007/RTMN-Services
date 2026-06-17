/**
 * RTMN Mobile SDK - TypeScript Types
 */

// ============== Core Types ==============

export interface SDKConfig {
  apiUrl: string;
  eventBusUrl?: string;
  firebaseConfig?: FirebaseConfig;
  pushNotifications?: boolean;
  debug?: boolean;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

// ============== Customer Twin Types ==============

export interface Customer {
  id: string;
  twinId: string;
  email: string;
  phone?: string;
  name: string;
  avatar?: string;
  companyId?: string;
  metadata: Record<string, unknown>;
  preferences: CustomerPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPreferences {
  language: string;
  notifications: NotificationPreferences;
  timezone: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  tickets: boolean;
  chat: boolean;
  marketing: boolean;
}

export interface Interaction {
  id: string;
  customerId: string;
  type: InteractionType;
  channel: string;
  timestamp: string;
  duration?: number;
  metadata: Record<string, unknown>;
}

export type InteractionType =
  | 'chat'
  | 'ticket'
  | 'purchase'
  | 'login'
  | 'profile_update'
  | 'support';

// ============== Ticket Types ==============

export interface Ticket {
  id: string;
  ticketNumber: string;
  customerId: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  assignedTo?: string;
  tags: string[];
  comments: Comment[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  sla?: SLAPolicy;
}

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'pending'
  | 'resolved'
  | 'closed'
  | 'escalated';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketInput {
  title: string;
  description: string;
  priority?: TicketPriority;
  category?: string;
  tags?: string[];
  attachments?: File[];
}

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface Comment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface SLAPolicy {
  responseDue: string;
  resolutionDue: string;
  breached: boolean;
}

// ============== Chat Types ==============

export interface ChatSession {
  id: string;
  customerId: string;
  agentId?: string;
  status: ChatStatus;
  channel: string;
  startedAt: string;
  endedAt?: string;
  unreadCount: number;
}

export type ChatStatus = 'waiting' | 'active' | 'ended' | 'transferred';

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderType: 'customer' | 'agent' | 'system';
  content: string;
  messageType: MessageType;
  metadata?: Record<string, unknown>;
  attachments?: Attachment[];
  readAt?: string;
  createdAt: string;
}

export type MessageType = 'text' | 'image' | 'file' | 'system' | 'typing';

export interface ChatChannel {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'support';
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

// ============== Analytics Types ==============

export interface AnalyticsEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  osVersion: string;
  appVersion: string;
  deviceModel?: string;
  screenSize?: string;
}

export interface ScreenTracking {
  name: string;
  properties?: Record<string, unknown>;
  startTime: number;
  duration?: number;
}

export interface UserTraits {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  company?: string;
  plan?: string;
  traits: Record<string, unknown>;
}

// ============== Push Notification Types ==============

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  image?: string;
  badge?: number;
  sound?: string;
  clickAction?: string;
  category?: string;
}

export interface NotificationPermission {
  granted: boolean;
  status: 'granted' | 'denied' | 'provisional' | 'not_determined';
}

// ============== API Response Types ==============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============== Event Types ==============

export interface EventSubscription {
  event: string;
  callback: (data: unknown) => void;
  unsubscribe: () => void;
}

// ============== Connection Types ==============

export interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: string;
  error?: string;
}

export interface WebSocketMessage {
  type: string;
  channel?: string;
  data: unknown;
  timestamp: string;
}
