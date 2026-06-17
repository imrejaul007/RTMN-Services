/**
 * Chat Handler - WebSocket message handling
 */

import { WebSocket, WebSocketServer } from 'ws';
import {
  WSIncomingMessage,
  WSOutgoingMessage,
  JoinRoomPayload,
  SendMessagePayload,
  TypingPayload,
  TransferPayload,
  Message,
  User,
  UserRole,
} from '../types';
import { messageStore } from '../services/messageStore';
import { roomManager } from './roomManager';
import { agentQueue } from './agentQueue';
import { v4 as uuidv4 } from 'uuid';

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  userName: string;
  role: UserRole;
  roomId?: string;
  lastPing: Date;
}

class ChatHandler {
  private clients: Map<WebSocket, ConnectedClient> = new Map();
  private wss: WebSocketServer | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(wss: WebSocketServer): void {
    this.wss = wss;
    this.startPingInterval();

    wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    console.log('New WebSocket connection');

    // Set initial client state
    this.clients.set(ws, {
      ws,
      userId: '',
      userName: '',
      role: 'customer',
      lastPing: new Date(),
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WSIncomingMessage;
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('Failed to parse message:', error);
        this.sendToClient(ws, {
          type: 'error',
          payload: { message: 'Invalid message format' },
          timestamp: new Date(),
        });
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) {
        client.lastPing = new Date();
      }
    });

    // Send welcome
    this.sendToClient(ws, {
      type: 'connected',
      payload: { message: 'Connected to Live Chat Server' },
      timestamp: new Date(),
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(ws: WebSocket, message: WSIncomingMessage): void {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'join_room':
        this.handleJoinRoom(ws, message.payload as JoinRoomPayload);
        break;

      case 'leave_room':
        this.handleLeaveRoom(ws);
        break;

      case 'send_message':
        this.handleSendMessage(ws, message.payload as SendMessagePayload);
        break;

      case 'typing':
        this.handleTyping(ws, message.payload as TypingPayload);
        break;

      case 'stop_typing':
        this.handleTyping(ws, { ...(message.payload as TypingPayload), isTyping: false });
        break;

      case 'transfer':
        this.handleTransfer(ws, message.payload as TransferPayload);
        break;

      case 'close_room':
        this.handleCloseRoom(ws);
        break;

      case 'get_online_agents':
        this.handleGetOnlineAgents(ws);
        break;

      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: new Date() });
        break;

      default:
        this.sendToClient(ws, {
          type: 'error',
          payload: { message: `Unknown message type: ${message.type}` },
          timestamp: new Date(),
        });
    }
  }

  /**
   * Handle join room
   */
  private handleJoinRoom(ws: WebSocket, payload: JoinRoomPayload): void {
    const client = this.clients.get(ws);
    if (!client) return;

    const { roomId, userId, userName, userRole, agentId } = payload;

    // Update client info
    client.userId = userId;
    client.userName = userName;
    client.role = userRole;

    // Register user
    const user: User = {
      id: userId,
      name: userName,
      role: userRole,
      isOnline: true,
      lastSeen: new Date(),
    };
    messageStore.setUser(user);

    // Register agent in queue
    if (userRole === 'agent') {
      agentQueue.registerAgent(user);
    }

    if (roomId) {
      // Join existing room
      const room = messageStore.getRoom(roomId);
      if (room && room.status !== 'closed') {
        roomManager.joinRoom(roomId, userId, userName, ws, userRole);
        client.roomId = roomId;

        // Send confirmation
        this.sendToClient(ws, {
          type: 'room_joined',
          payload: { roomId, room },
          timestamp: new Date(),
        });

        // Send message history
        const history = messageStore.getMessages(roomId, 50);
        this.sendToClient(ws, {
          type: 'message_history',
          payload: { roomId, messages: history },
          timestamp: new Date(),
        });
      } else {
        this.sendToClient(ws, {
          type: 'error',
          payload: { message: 'Room not found or closed' },
          timestamp: new Date(),
        });
      }
    } else {
      // Create new room
      const room = roomManager.createRoom(userId, userName, ws, agentId);
      client.roomId = room.id;

      // Send confirmation
      this.sendToClient(ws, {
        type: 'room_created',
        payload: { roomId: room.id, room },
        timestamp: new Date(),
      });

      // If customer is waiting for agent
      if (room.status === 'waiting') {
        this.sendToClient(ws, {
          type: 'waiting_for_agent',
          payload: {
            queuePosition: agentQueue.getQueuePosition(userId),
          },
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Handle leave room
   */
  private handleLeaveRoom(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client || !client.roomId) return;

    roomManager.leaveRoom(client.roomId, client.userId);
    client.roomId = undefined;

    this.sendToClient(ws, {
      type: 'room_left',
      payload: {},
      timestamp: new Date(),
    });
  }

  /**
   * Handle send message
   */
  private handleSendMessage(ws: WebSocket, payload: SendMessagePayload): void {
    const client = this.clients.get(ws);
    if (!client || !client.roomId) {
      this.sendToClient(ws, {
        type: 'error',
        payload: { message: 'Not in a room' },
        timestamp: new Date(),
      });
      return;
    }

    const { roomId, content, type = 'text' } = payload;

    // Validate content
    if (!content || content.trim().length === 0) {
      this.sendToClient(ws, {
        type: 'error',
        payload: { message: 'Message content is required' },
        timestamp: new Date(),
      });
      return;
    }

    // Create message
    const message: Message = {
      id: uuidv4(),
      roomId,
      senderId: client.userId,
      senderRole: client.role,
      senderName: client.userName,
      content: content.trim(),
      type,
      timestamp: new Date(),
      read: false,
    };

    // Store message
    messageStore.addMessage(message);

    // Update room timestamp
    messageStore.updateRoom(roomId, { updatedAt: new Date() });

    // Broadcast to room
    roomManager.broadcastToRoom(roomId, {
      type: 'new_message',
      payload: { message },
      timestamp: new Date(),
    });

    // If agent is assigned, mark as read by agent
    const room = messageStore.getRoom(roomId);
    if (room?.agentId && client.role === 'customer') {
      messageStore.markMessagesAsRead(roomId, client.userId);
    }
  }

  /**
   * Handle typing indicator
   */
  private handleTyping(ws: WebSocket, payload: TypingPayload): void {
    const client = this.clients.get(ws);
    if (!client || !client.roomId) return;

    const { roomId, isTyping } = payload;

    roomManager.broadcastToRoom(
      roomId,
      {
        type: isTyping ? 'user_typing' : 'user_stop_typing',
        payload: {
          roomId,
          userId: client.userId,
          userName: client.userName,
          userRole: client.role,
        },
        timestamp: new Date(),
      },
      client.userId
    );
  }

  /**
   * Handle transfer request
   */
  private handleTransfer(ws: WebSocket, payload: TransferPayload): void {
    const client = this.clients.get(ws);
    if (!client || client.role !== 'agent') {
      this.sendToClient(ws, {
        type: 'error',
        payload: { message: 'Only agents can transfer rooms' },
        timestamp: new Date(),
      });
      return;
    }

    const { roomId, fromAgentId, toAgentId } = payload;

    const success = roomManager.transferRoom(roomId, fromAgentId, toAgentId);

    if (!success) {
      this.sendToClient(ws, {
        type: 'transfer_failed',
        payload: { roomId, message: 'No available agents for transfer' },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle close room
   */
  private handleCloseRoom(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client || !client.roomId) {
      this.sendToClient(ws, {
        type: 'error',
        payload: { message: 'Not in a room' },
        timestamp: new Date(),
      });
      return;
    }

    roomManager.closeRoom(client.roomId, client.userId);
    client.roomId = undefined;
  }

  /**
   * Handle get online agents
   */
  private handleGetOnlineAgents(ws: WebSocket): void {
    const agents = agentQueue.getAllAgentsInfo();

    this.sendToClient(ws, {
      type: 'online_agents',
      payload: { agents },
      timestamp: new Date(),
    });
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client) return;

    console.log(`User disconnected: ${client.userId}`);

    // Leave room if in one
    if (client.roomId) {
      roomManager.leaveRoom(client.roomId, client.userId, 'disconnect');
    }

    // Update user status
    const user = messageStore.getUser(client.userId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      messageStore.setUser(user);
    }

    // Unregister agent
    if (client.role === 'agent') {
      agentQueue.unregisterAgent(client.userId);
    }

    // Remove client
    this.clients.delete(ws);
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: WSOutgoingMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Start ping interval for connection health
   */
  private startPingInterval(): void {
    if (this.pingInterval) return;

    this.pingInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      });

      // Clean up stale connections
      this.clients.forEach((client, ws) => {
        const inactiveTime = Date.now() - client.lastPing.getTime();
        if (inactiveTime > 60000) {
          // 60 seconds
          ws.terminate();
        }
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop ping interval
   */
  stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Get connected clients count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Broadcast to all clients
   */
  broadcastToAll(message: WSOutgoingMessage): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }
}

// Singleton instance
export const chatHandler = new ChatHandler();
