/**
 * Message Store - In-memory message storage
 */

import { Message, ChatRoom, User } from '../types';

class MessageStore {
  private messages: Map<string, Message[]> = new Map();
  private rooms: Map<string, ChatRoom> = new Map();
  private users: Map<string, User> = new Map();

  // Message operations
  addMessage(message: Message): void {
    const roomMessages = this.messages.get(message.roomId) || [];
    roomMessages.push(message);
    this.messages.set(message.roomId, roomMessages);
  }

  getMessages(roomId: string, limit = 50, offset = 0): Message[] {
    const roomMessages = this.messages.get(roomId) || [];
    return roomMessages.slice(offset, offset + limit);
  }

  getMessagesBefore(roomId: string, before: Date, limit = 50): Message[] {
    const roomMessages = this.messages.get(roomId) || [];
    const filtered = roomMessages.filter(m => new Date(m.timestamp) < before);
    return filtered.slice(-limit);
  }

  markMessagesAsRead(roomId: string, userId: string): void {
    const roomMessages = this.messages.get(roomId) || [];
    roomMessages.forEach(msg => {
      if (msg.senderId !== userId) {
        msg.read = true;
      }
    });
  }

  getUnreadCount(roomId: string, userId: string): number {
    const roomMessages = this.messages.get(roomId) || [];
    return roomMessages.filter(m => m.senderId !== userId && !m.read).length;
  }

  // Room operations
  createRoom(room: ChatRoom): void {
    this.rooms.set(room.id, room);
    this.messages.set(room.id, []);
  }

  getRoom(roomId: string): ChatRoom | undefined {
    return this.rooms.get(roomId);
  }

  updateRoom(roomId: string, updates: Partial<ChatRoom>): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.rooms.set(roomId, { ...room, ...updates, updatedAt: new Date() });
    }
  }

  getRoomsByStatus(status: ChatRoom['status']): ChatRoom[] {
    return Array.from(this.rooms.values()).filter(r => r.status === status);
  }

  getRoomsByAgent(agentId: string): ChatRoom[] {
    return Array.from(this.rooms.values()).filter(r => r.agentId === agentId);
  }

  getRoomsByCustomer(customerId: string): ChatRoom[] {
    return Array.from(this.rooms.values()).filter(r => r.customerId === customerId);
  }

  getAllRooms(): ChatRoom[] {
    return Array.from(this.rooms.values());
  }

  // User operations
  setUser(user: User): void {
    this.users.set(user.id, user);
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
  }

  getOnlineUsers(): User[] {
    return Array.from(this.users.values()).filter(u => u.isOnline);
  }

  getOnlineAgents(): User[] {
    return Array.from(this.users.values()).filter(
      u => u.role === 'agent' && u.isOnline
    );
  }

  getOnlineCustomers(): User[] {
    return Array.from(this.users.values()).filter(
      u => u.role === 'customer' && u.isOnline
    );
  }

  // Cleanup old rooms (optional)
  cleanupOldRooms(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    const toDelete: string[] = [];

    this.rooms.forEach((room, id) => {
      if (
        room.status === 'closed' &&
        now.getTime() - new Date(room.updatedAt).getTime() > maxAgeMs
      ) {
        toDelete.push(id);
      }
    });

    toDelete.forEach(id => {
      this.rooms.delete(id);
      this.messages.delete(id);
    });
  }

  // Get statistics
  getStats() {
    const rooms = this.getAllRooms();
    return {
      totalRooms: rooms.length,
      waitingRooms: rooms.filter(r => r.status === 'waiting').length,
      activeRooms: rooms.filter(r => r.status === 'active').length,
      closedRooms: rooms.filter(r => r.status === 'closed').length,
      onlineAgents: this.getOnlineAgents().length,
      onlineCustomers: this.getOnlineCustomers().length,
      totalMessages: Array.from(this.messages.values()).reduce(
        (sum, msgs) => sum + msgs.length,
        0
      ),
    };
  }
}

// Singleton instance
export const messageStore = new MessageStore();
