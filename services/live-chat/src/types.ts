/**
 * Live Chat Server - TypeScript Types
 */

// User roles in the chat system
export type UserRole = 'customer' | 'agent' | 'admin';

// User connected via WebSocket
export interface User {
  id: string;
  name: string;
  role: UserRole;
  agentId?: string;
  isOnline: boolean;
  lastSeen: Date;
}

// Chat room representing a conversation
export interface ChatRoom {
  id: string;
  customerId: string;
  agentId?: string;
  status: 'waiting' | 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

// Chat message
export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  content: string;
  type: 'text' | 'system' | 'transfer' | 'typing';
  timestamp: Date;
  read: boolean;
}

// WebSocket message types
export type WSMessageType =
  | 'join_room'
  | 'leave_room'
  | 'send_message'
  | 'typing'
  | 'stop_typing'
  | 'agent_join'
  | 'agent_leave'
  | 'transfer'
  | 'close_room'
  | 'get_online_agents'
  | 'ping'
  | 'pong';

// Incoming WebSocket message
export interface WSIncomingMessage {
  type: WSMessageType;
  payload?: unknown;
}

// Outgoing WebSocket message
export interface WSOutgoingMessage {
  type: WSMessageType;
  payload?: unknown;
  timestamp?: Date;
}

// Join room payload
export interface JoinRoomPayload {
  roomId?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  agentId?: string;
}

// Send message payload
export interface SendMessagePayload {
  roomId: string;
  content: string;
  type?: 'text' | 'system';
}

// Typing payload
export interface TypingPayload {
  roomId: string;
  isTyping: boolean;
}

// Transfer payload
export interface TransferPayload {
  roomId: string;
  fromAgentId: string;
  toAgentId?: string;
}

// Agent info for availability
export interface AgentInfo {
  id: string;
  name: string;
  isAvailable: boolean;
  currentChats: number;
  maxChats: number;
}

// Room stats
export interface RoomStats {
  totalRooms: number;
  waitingRooms: number;
  activeRooms: number;
  closedRooms: number;
  onlineAgents: number;
  onlineCustomers: number;
}

// REST API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Message history query params
export interface MessageHistoryQuery {
  roomId: string;
  limit?: number;
  offset?: number;
  before?: string;
}
