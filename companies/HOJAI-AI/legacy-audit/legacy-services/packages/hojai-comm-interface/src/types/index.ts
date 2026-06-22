import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export enum EmployeeStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  AWAY = 'away',
  AVAILABLE = 'available'
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
  BUTTON = 'button',
  INTERACTIVE = 'interactive'
}

export enum Source {
  WHATSAPP = 'whatsapp',
  WEB = 'web',
  API = 'api'
}

export enum ConversationStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  PENDING = 'pending',
  ARCHIVED = 'archived'
}

// ============================================================================
// SCHEMAS
// ============================================================================

export const EmployeeSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  description: z.string().optional(),
  avatar: z.string().url().optional(),
  capabilities: z.array(z.string()),
  status: z.nativeEnum(EmployeeStatus).default(EmployeeStatus.OFFLINE),
  metadata: z.record(z.any()).optional(),
  skills: z.array(z.string()).default([]),
  languages: z.array(z.string()).default(['en']),
  workingHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().default('Asia/Kolkata')
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Employee = z.infer<typeof EmployeeSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  conversationId: z.string().uuid(),
  employeeId: z.string().uuid().optional(),
  userId: z.string().min(1).max(255),
  direction: z.nativeEnum(MessageDirection),
  source: z.nativeEnum(Source),
  type: z.nativeEnum(MessageType).default(MessageType.TEXT),
  content: z.object({
    text: z.string().optional(),
    mediaUrl: z.string().url().optional(),
    mediaCaption: z.string().optional(),
    buttons: z.array(z.object({
      id: z.string(),
      text: z.string()
    })).optional(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      name: z.string().optional()
    }).optional()
  }),
  metadata: z.record(z.any()).optional(),
  status: z.enum(['sent', 'delivered', 'read', 'failed']).default('sent'),
  externalId: z.string().optional(),
  timestamp: z.date(),
  createdAt: z.date()
});

export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().min(1).max(255),
  userName: z.string().optional(),
  employeeId: z.string().uuid().optional(),
  status: z.nativeEnum(ConversationStatus).default(ConversationStatus.ACTIVE),
  source: z.nativeEnum(Source).default(Source.WEB),
  lastMessage: z.object({
    content: z.string(),
    sender: z.enum(['user', 'employee', 'system']),
    timestamp: z.date()
  }).optional(),
  context: z.object({
    intent: z.string().optional(),
    entities: z.record(z.any()).optional(),
    sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
    language: z.string().default('en')
  }).optional(),
  metadata: z.record(z.any()).optional(),
  unreadCount: z.number().default(0),
  assignedAt: z.date().optional(),
  closedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Conversation = z.infer<typeof ConversationSchema>;

export const TaskAssignmentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  conversationId: z.string().uuid(),
  employeeId: z.string().uuid(),
  assignedBy: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  notes: z.string().optional(),
  status: z.enum(['assigned', 'accepted', 'completed', 'rejected', 'transferred']).default('assigned'),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type TaskAssignment = z.infer<typeof TaskAssignmentSchema>;

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ChatRequest {
  tenantId: string;
  userId: string;
  userName?: string;
  employeeId?: string;
  message: string;
  source: Source;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  success: boolean;
  conversationId: string;
  messageId: string;
  response: string;
  employeeId?: string;
  timestamp: string;
}

export interface EmployeeListResponse {
  success: boolean;
  employees: Array<{
    id: string;
    name: string;
    role: string;
    status: EmployeeStatus;
    capabilities: string[];
    avatar?: string;
  }>;
}

export interface ConversationHistoryResponse {
  success: boolean;
  conversations: Array<{
    id: string;
    employeeId?: string;
    employeeName?: string;
    status: ConversationStatus;
    lastMessage?: {
      content: string;
      sender: string;
      timestamp: string;
    };
    createdAt: string;
    updatedAt: string;
  }>;
  messages: Array<{
    id: string;
    direction: MessageDirection;
    type: MessageType;
    content: string;
    timestamp: string;
    status: string;
  }>;
}

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'status' | 'error' | 'ping' | 'pong' | 'join_conversation' | 'leave_conversation';
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface WebSocketConnection {
  id: string;
  tenantId: string;
  userId: string;
  conversationId?: string;
  source: Source;
  connectedAt: Date;
}

// ============================================================================
// MULTI-TENANT CONTEXT
// ============================================================================

export interface TenantContext {
  tenantId: string;
  userId?: string;
  requestId: string;
  source: Source;
}

export interface AuthContext {
  tenantId: string;
  userId?: string;
  role?: string;
  permissions?: string[];
}

// ============================================================================
// INTERNAL SERVICE TYPES
// ============================================================================

export interface EmployeeRoutingResult {
  employeeId: string;
  employee: Employee;
  confidence: number;
  reason: string;
}

export interface MessageContext {
  tenantId: string;
  userId: string;
  conversationId?: string;
  employeeId?: string;
  message: string;
  source: Source;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// WHATSAPP BRIDGE TYPES
// ============================================================================

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          image?: { id: string; mime_type: string; sha256: string; caption?: string };
          location?: { latitude: number; longitude: number; name?: string };
          interactive?: { type: string; button_reply?: { id: string; title: string } };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface WhatsAppOutboundMessage {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  text?: { body: string };
  image?: { link: string; caption?: string };
  audio?: { id: string };
  document?: { link: string; caption?: string; filename: string };
  sticker?: { id: string };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  interactive?: {
    type: string;
    header?: { type: string; text: string };
    body?: { text: string };
    footer?: { text: string };
    action: { buttons: Array<{ type: string; reply: { id: string; title: string } }> };
  };
}
