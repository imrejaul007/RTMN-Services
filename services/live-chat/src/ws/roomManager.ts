/**
 * Room Manager - Chat room management
 */

import { ChatRoom, User, WSOutgoingMessage } from '../types';
import { messageStore } from '../services/messageStore';
import { agentQueue } from './agentQueue';
import { v4 as uuidv4 } from 'uuid';

interface RoomConnection {
  userId: string;
  ws: any;
  joinedAt: Date;
}

class RoomManager {
  private rooms: Map<string, Map<string, RoomConnection>> = new Map(); // roomId -> userId -> connection

  /**
   * Create a new chat room
   */
  createRoom(
    customerId: string,
    customerName: string,
    customerWs: any,
    agentId?: string
  ): ChatRoom {
    const roomId = uuidv4();
    const now = new Date();

    const room: ChatRoom = {
      id: roomId,
      customerId,
      agentId,
      status: agentId ? 'active' : 'waiting',
      createdAt: now,
      updatedAt: now,
    };

    messageStore.createRoom(room);

    // Add customer to room
    this.joinRoom(roomId, customerId, customerName, customerWs, 'customer');

    // If specific agent requested, add them
    if (agentId) {
      const agent = messageStore.getUser(agentId);
      if (agent) {
        this.joinRoom(roomId, agentId, agent.name, null, 'agent');
      }
    } else {
      // Add to agent queue for auto-assignment
      agentQueue.addToQueue(customerId, customerName, customerWs);
    }

    return room;
  }

  /**
   * Join a room
   */
  joinRoom(
    roomId: string,
    userId: string,
    userName: string,
    ws: any,
    role: 'customer' | 'agent'
  ): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }

    const roomConnections = this.rooms.get(roomId)!;
    roomConnections.set(userId, {
      userId,
      ws,
      joinedAt: new Date(),
    });

    // Update room
    const room = messageStore.getRoom(roomId);
    if (room) {
      if (role === 'agent' && !room.agentId) {
        messageStore.updateRoom(roomId, { agentId: userId, status: 'active' });
        agentQueue.removeFromQueue(room.customerId);
      }
    }

    // Notify other users in room
    this.broadcastToRoom(roomId, {
      type: `${role === 'agent' ? 'agent_join' : 'join_room'}`,
      payload: { userId, userName, roomId },
      timestamp: new Date(),
    }, userId);
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string, userId: string, reason: 'disconnect' | 'leave' = 'disconnect'): void {
    const roomConnections = this.rooms.get(roomId);
    if (!roomConnections) return;

    const user = messageStore.getUser(userId);
    const wasInRoom = roomConnections.has(userId);

    roomConnections.delete(userId);

    if (wasInRoom) {
      // Notify others
      this.broadcastToRoom(roomId, {
        type: user?.role === 'agent' ? 'agent_leave' : 'leave_room',
        payload: { userId, roomId, reason },
        timestamp: new Date(),
      }, userId);

      // If agent left, update room and potentially re-queue customer
      if (user?.role === 'agent') {
        const room = messageStore.getRoom(roomId);
        if (room) {
          messageStore.updateRoom(roomId, { agentId: undefined, status: 'waiting' });
          agentQueue.releaseFromAgent(room.customerId, userId);
          // Re-add to queue
          const customer = messageStore.getUser(room.customerId);
          if (customer) {
            agentQueue.addToQueue(room.customerId, customer.name, null);
          }
        }
      }

      // Clean up empty rooms
      if (roomConnections.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  /**
   * Close a room
   */
  closeRoom(roomId: string, closedBy: string): void {
    const room = messageStore.getRoom(roomId);
    if (!room) return;

    // Notify all users
    this.broadcastToRoom(roomId, {
      type: 'close_room',
      payload: { roomId, closedBy },
      timestamp: new Date(),
    });

    // Update room status
    messageStore.updateRoom(roomId, { status: 'closed' });

    // Clean up connections
    this.rooms.delete(roomId);

    // Release agent from queue
    if (room.agentId) {
      agentQueue.releaseFromAgent(room.customerId, room.agentId);
    }
  }

  /**
   * Transfer room to another agent
   */
  transferRoom(roomId: string, fromAgentId: string, toAgentId?: string): boolean {
    const room = messageStore.getRoom(roomId);
    if (!room) return false;

    // If no specific agent, auto-assign
    if (!toAgentId) {
      const assignment = agentQueue.autoAssign();
      if (assignment) {
        toAgentId = assignment.agent.id;
      } else {
        return false;
      }
    }

    // Verify agent is available
    const agentInfo = agentQueue.getAgentInfo(toAgentId);
    if (!agentInfo || !agentInfo.isAvailable) {
      return false;
    }

    // Transfer in queue
    const success = agentQueue.transferCustomer(room.customerId, fromAgentId, toAgentId);

    if (success) {
      // Update room
      messageStore.updateRoom(roomId, { agentId: toAgentId });

      // Notify users
      this.broadcastToRoom(roomId, {
        type: 'transfer',
        payload: {
          roomId,
          fromAgentId,
          toAgentId,
          message: `Transferred from agent to another agent`,
        },
        timestamp: new Date(),
      });

      return true;
    }

    return false;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId: string): ChatRoom | undefined {
    return messageStore.getRoom(roomId);
  }

  /**
   * Get room by customer ID
   */
  getRoomByCustomer(customerId: string): ChatRoom | undefined {
    const rooms = messageStore.getRoomsByCustomer(customerId);
    return rooms.find(r => r.status !== 'closed');
  }

  /**
   * Get room by agent ID
   */
  getRoomByAgent(agentId: string): ChatRoom[] {
    return messageStore.getRoomsByAgent(agentId).filter(r => r.status === 'active');
  }

  /**
   * Get users in a room
   */
  getRoomUsers(roomId: string): string[] {
    const roomConnections = this.rooms.get(roomId);
    if (!roomConnections) return [];
    return Array.from(roomConnections.keys());
  }

  /**
   * Get WebSocket for a user in a room
   */
  getUserWs(roomId: string, userId: string): any {
    const roomConnections = this.rooms.get(roomId);
    if (!roomConnections) return null;
    const conn = roomConnections.get(userId);
    return conn?.ws || null;
  }

  /**
   * Broadcast message to all users in a room
   */
  broadcastToRoom(roomId: string, message: WSOutgoingMessage, excludeUserId?: string): void {
    const roomConnections = this.rooms.get(roomId);
    if (!roomConnections) return;

    const messageStr = JSON.stringify(message);

    roomConnections.forEach((conn, uid) => {
      if (uid !== excludeUserId && conn.ws && conn.ws.readyState === 1) {
        conn.ws.send(messageStr);
      }
    });
  }

  /**
   * Send to specific user in a room
   */
  sendToUser(roomId: string, userId: string, message: WSOutgoingMessage): void {
    const ws = this.getUserWs(roomId, userId);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Get all active rooms
   */
  getActiveRooms(): ChatRoom[] {
    return messageStore.getRoomsByStatus('active');
  }

  /**
   * Get waiting rooms
   */
  getWaitingRooms(): ChatRoom[] {
    return messageStore.getRoomsByStatus('waiting');
  }

  /**
   * Clean up stale rooms (no activity)
   */
  cleanupStaleRooms(maxInactivityMs: number = 30 * 60 * 1000): void {
    const now = new Date();

    this.rooms.forEach((connections, roomId) => {
      if (connections.size === 0) {
        this.rooms.delete(roomId);
        return;
      }

      // Check room activity
      const room = messageStore.getRoom(roomId);
      if (room && room.status === 'waiting') {
        const waitTime = now.getTime() - new Date(room.updatedAt).getTime();
        if (waitTime > maxInactivityMs) {
          this.closeRoom(roomId, 'system');
        }
      }
    });
  }
}

// Singleton instance
export const roomManager = new RoomManager();
