// Hotel-specific chat types for Room QR / Hotel PMS
// These extend the base chat types with hotel-specific features

import type {
  ChatMessage,
  Conversation,
  MessageAttachment,
  MessageType,
  MessageSender,
} from './index';

// ── Hotel Conversation Types ────────────────────────────────────────────────────

export type HotelConversationType =
  | 'room_service'    // In-room dining orders
  | 'concierge'      // Concierge desk queries
  | 'housekeeping'   // Housekeeping requests
  | 'maintenance'    // Maintenance issues
  | 'spa'           // Spa bookings
  | 'transport'      // Transportation requests
  | 'general'        // General hotel queries
  | 'checkout';      // Checkout assistance

export type HotelDepartment =
  | 'front_desk'
  | 'concierge'
  | 'housekeeping'
  | 'room_service'
  | 'maintenance'
  | 'spa'
  | 'transport'
  | 'manager';

export type ServiceRequestStatus =
  | 'pending'
  | 'acknowledged'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

// ── Hotel Participants ──────────────────────────────────────────────────────────

export interface HotelGuest {
  id: string;
  name: string;
  avatar?: string;
  role: 'guest';
  status?: 'online' | 'away' | 'busy' | 'offline';
  roomNumber?: string;
  bookingId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  guestCount?: number;
  preferences?: GuestPreferences;
  metadata?: Record<string, unknown>;
}

export interface HotelStaff {
  id: string;
  name: string;
  avatar?: string;
  role: 'staff';
  email?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  department: HotelDepartment;
  employeeId: string;
  isOnDuty: boolean;
  metadata?: Record<string, unknown>;
}

export interface GuestPreferences {
  dietaryRestrictions?: string[];
  allergies?: string[];
  roomTemperature?: 'warmer' | 'cooler' | 'normal';
  pillowType?: 'firm' | 'soft' | 'foam';
  language?: string;
  specialNotes?: string;
}

// ── Hotel Message Types ─────────────────────────────────────────────────────────

export interface HotelMessage {
  id: string;
  conversationId: string;
  content: string;
  sender: MessageSender;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: MessageType;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  readAt?: string;
  deliveredAt?: string;
  attachments?: MessageAttachment[];
  department?: HotelDepartment;
  serviceRequestId?: string;
  metadata?: HotelMessageMetadata;
}

export interface HotelMessageMetadata {
  orderId?: string;
  orderType?: 'food' | 'beverage' | 'amenity' | 'housekeeping' | 'laundry';
  items?: HotelOrderItem[];
  estimatedTime?: number; // minutes
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: MessageAttachment[];
  quickReplies?: HotelQuickReply[];
  [key: string]: unknown;
}

export interface HotelOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  choices?: string[]; // e.g., ["No ice", "Extra sugar"]
}

export interface HotelQuickReply {
  id: string;
  text: string;
  value?: string;
  icon?: string;
  action: 'send_message' | 'open_url' | 'create_request';
  payload?: string;
}

// ── Hotel Conversation ──────────────────────────────────────────────────────────

export interface HotelConversation {
  id: string;
  type: HotelConversationType;
  status: 'active' | 'archived' | 'closed' | 'resolved';
  participants: (HotelGuest | HotelStaff)[];
  guest: HotelGuest;
  staff?: HotelStaff;
  roomNumber: string;
  bookingId: string;
  department: HotelDepartment;
  lastMessage?: HotelMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  serviceRequestId?: string;
  checkInDate: string;
  checkOutDate: string;
  metadata?: HotelConversationMetadata;
}

export interface HotelConversationMetadata {
  roomServiceMenu?: string; // menu ID if this is a room service conversation
  orderTotal?: number;
  estimatedDelivery?: string;
  specialRequests?: string;
  dietaryRestrictions?: string[];
  isPriority?: boolean;
  repeatGuest?: boolean;
  vipLevel?: 'standard' | 'silver' | 'gold' | 'platinum';
}

// ── Hotel Service Request ──────────────────────────────────────────────────────

export interface HotelServiceRequest {
  id: string;
  conversationId: string;
  guestId: string;
  guestName: string;
  roomNumber: string;
  bookingId: string;
  type: HotelConversationType;
  department: HotelDepartment;
  status: ServiceRequestStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description?: string;
  items?: HotelOrderItem[];
  scheduledTime?: string;
  completedAt?: string;
  assignedTo?: HotelStaff;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

// ── Staff Availability ─────────────────────────────────────────────────────────

export interface StaffAvailability {
  staffId: string;
  department: HotelDepartment;
  status: 'available' | 'busy' | 'offline' | 'break';
  activeConversations: number;
  maxConversations: number;
  averageResponseTime: number; // seconds
  currentGuestRating?: number;
}

// ── Hotel Chat Events ────────────────────────────────────────────────────────────

export const HOTEL_CHAT_EVENTS = {
  // Guest events
  GUEST_JOIN: 'hotel:guest_join',
  GUEST_MESSAGE: 'hotel:guest_message',
  GUEST_TYPING: 'hotel:guest_typing',
  GUEST_READ: 'hotel:guest_read',

  // Staff events
  STAFF_JOIN: 'hotel:staff_join',
  STAFF_ASSIGNED: 'hotel:staff_assigned',
  STAFF_MESSAGE: 'hotel:staff_message',
  STAFF_TYPING: 'hotel:staff_typing',
  STAFF_READ: 'hotel:staff_read',

  // Request events
  REQUEST_CREATED: 'hotel:request_created',
  REQUEST_ASSIGNED: 'hotel:request_assigned',
  REQUEST_STATUS_CHANGED: 'hotel:request_status_changed',
  REQUEST_COMPLETED: 'hotel:request_completed',

  // Notifications
  NEW_GUEST_MESSAGE: 'hotel:new_guest_message',
  STAFF_AVAILABLE: 'hotel:staff_available',
  GUEST_LEFT: 'hotel:guest_left',

  // Room context
  ROOM_CONTEXT_SET: 'hotel:room_context_set',
  BOOKING_CONTEXT_SET: 'hotel:booking_context_set',

  // Conversation events
  CONVERSATION_CREATED: 'conversation:created',
  CONVERSATION_UPDATED: 'conversation:updated',
  CONVERSATION_RESOLVED: 'conversation:resolved',
} as const;

// ── Hotel API Endpoints ─────────────────────────────────────────────────────────

export const HOTEL_CHAT_ENDPOINTS = {
  CONVERSATIONS: '/api/hotel/chat/conversations',
  MESSAGES: '/api/hotel/chat/messages',
  SERVICE_REQUESTS: '/api/hotel/chat/requests',
  STAFF_AVAILABILITY: '/api/hotel/chat/staff/availability',
  HOTEL_CONFIG: '/api/hotel/chat/config',
  MARK_READ: '/api/hotel/chat/read',
} as const;
