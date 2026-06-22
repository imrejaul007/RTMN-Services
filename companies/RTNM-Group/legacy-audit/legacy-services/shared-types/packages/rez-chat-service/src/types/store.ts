// Store/Restaurant messaging types for rez-now and rez-web-menu
// These extend the base chat types with store-specific features

import type {
  ChatMessage,
  MessageAttachment,
  MessageType,
  MessageSender,
} from './index';

// ── Store Conversation Types ────────────────────────────────────────────────────

export type StoreConversationType =
  | 'order_inquiry'
  | 'product_inquiry'
  | 'delivery_issue'
  | 'order_status'
  | 'refund_request'
  | 'general';

export type StoreDepartment =
  | 'sales'
  | 'support'
  | 'delivery'
  | 'kitchen'
  | 'manager';

// ── Store Participants ──────────────────────────────────────────────────────────

export interface StoreParticipant {
  id: string;
  name: string;
  avatar?: string;
  role: 'customer' | 'store' | 'delivery_person' | 'system';
  status?: 'online' | 'away' | 'busy' | 'offline';
  storeId?: string;
  storeName?: string;
  storeLogo?: string;
  isOnline?: boolean;
}

// ── Store Message Types ────────────────────────────────────────────────────────

export interface StoreMessage {
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
  storeDepartment?: StoreDepartment;
  metadata?: StoreMessageMetadata;
}

export interface StoreMessageMetadata {
  orderId?: string;
  orderNumber?: string;
  productId?: string;
  productName?: string;
  storeId?: string;
  estimatedTime?: number; // minutes
  deliveryAddress?: string;
  trackingUrl?: string;
  items?: StoreOrderItem[];
  quickReplies?: StoreQuickReply[];
  [key: string]: unknown;
}

export interface StoreOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  image?: string;
  options?: Record<string, string>;
}

export interface StoreQuickReply {
  id: string;
  text: string;
  value?: string;
  icon?: string;
  action: 'send_message' | 'open_url' | 'view_order' | 'track_order';
  payload?: string;
}

// ── Store Conversation ──────────────────────────────────────────────────────────

export interface StoreConversation {
  id: string;
  type: StoreConversationType;
  status: 'active' | 'archived' | 'closed';
  participants: StoreParticipant[];
  storeId: string;
  storeName: string;
  storeLogo?: string;
  customerId: string;
  customerName: string;
  isStoreOnline: boolean;
  department: StoreDepartment;
  lastMessage?: StoreMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  lastOrderContext?: {
    orderId: string;
    orderNumber: string;
    status: string;
  };
}

// ── Kitchen Chat (Staff-facing) ────────────────────────────────────────────────

export interface KitchenMessage extends StoreMessage {
  tableNumber?: string;
  orderType: 'dine_in' | 'takeout' | 'delivery';
  priority?: 'normal' | 'rush' | 'vip';
}

export interface KitchenTable {
  tableNumber: string;
  orderCount: number;
  lastMessage?: KitchenMessage;
  isActive: boolean;
}

// ── AI Chat Types (for rez-now chatbot) ───────────────────────────────────────

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'order' | 'recommendation' | 'reservation' | 'handoff';
  metadata?: AIMetadata;
  createdAt: string;
}

export interface AIMetadata {
  items?: AIOrderItem[];
  reservationParams?: AIReservationParams;
  suggestedItems?: AISuggestedItem[];
}

export interface AIOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  image?: string;
}

export interface AIReservationParams {
  date: string;
  time: string;
  guests: number;
  name?: string;
  phone?: string;
  notes?: string;
}

export interface AISuggestedItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
}

// ── Store Chat Events ──────────────────────────────────────────────────────────

export const STORE_CHAT_EVENTS = {
  // Customer events
  CUSTOMER_MESSAGE: 'store:customer_message',
  CUSTOMER_TYPING: 'store:customer_typing',

  // Store events
  STORE_MESSAGE: 'store:store_message',
  STORE_TYPING: 'store:store_typing',
  STORE_ONLINE: 'store:online',
  STORE_OFFLINE: 'store:offline',

  // Kitchen events
  KITCHEN_MESSAGE: 'kitchen:message',
  KITCHEN_ORDER: 'kitchen:order',
  KITCHEN_COMPLETE: 'kitchen:complete',

  // Table events
  TABLE_MESSAGE: 'table:message',
  TABLE_MESSAGE_RECEIVED: 'table:message:received',
  TABLE_MESSAGE_ACK: 'table:message:ack',
  TABLE_MESSAGE_ERROR: 'table:message:error',

  // Order events
  ORDER_STATUS_UPDATE: 'order:status_update',
  ORDER_ASSIGNED: 'order:assigned',
  DELIVERY_UPDATE: 'delivery:update',
} as const;

// ── Store API Endpoints ─────────────────────────────────────────────────────────

export const STORE_CHAT_ENDPOINTS = {
  CONVERSATIONS: '/api/store/chat/conversations',
  MESSAGES: '/api/store/chat/messages',
  ORDERS: '/api/store/chat/orders',
  WAITER_CALL: '/api/store/chat/waiter',
} as const;
