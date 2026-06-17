/**
 * RTMN WebSocket Server - Real-time Features
 *
 * Provides real-time notifications, live updates,
 * and WebSocket-based communication
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rtmn-workforce-secret-key';

// WebSocket Server
class RTMNWebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // clientId -> { ws, user, subscriptions }
    this.channels = new Map(); // channel -> Set<clientId>
    this.heartbeatInterval = null;
  }

  // Initialize WebSocket server
  initialize(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Heartbeat to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 30000);

    console.log('WebSocket server initialized');
    return this.wss;
  }

  // Handle new connection
  async handleConnection(ws, req) {
    const clientId = this.generateClientId();
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    // Authenticate user
    let user = null;
    if (token) {
      try {
        user = jwt.verify(token, JWT_SECRET);
      } catch (error) {
        console.warn('Invalid WebSocket token');
      }
    }

    // Register client
    const client = {
      id: clientId,
      ws,
      user,
      subscriptions: new Set(),
      connectedAt: Date.now(),
      isAlive: true,
    };

    this.clients.set(clientId, client);

    // Subscribe to personal channel
    if (user) {
      this.subscribe(clientId, `user:${user.id}`);
      this.subscribe(clientId, `tenant:${user.tenantId}`);
    }

    // Handle messages
    ws.on('message', (data) => {
      this.handleMessage(clientId, data);
    });

    // Handle pong (heartbeat response)
    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) client.isAlive = true;
    });

    // Handle disconnect
    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    // Handle error
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnect(clientId);
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connected',
      clientId,
      user: user ? { id: user.id, email: user.email } : null,
    });

    console.log(`Client connected: ${clientId}${user ? ` (${user.email})` : ' (anonymous)'}`);
  }

  // Handle incoming message
  handleMessage(clientId, data) {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(clientId);
      if (!client) return;

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, message);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(clientId, message);
          break;

        case 'ping':
          this.sendToClient(clientId, { type: 'pong' });
          break;

        case 'chat':
          this.handleChatMessage(clientId, message);
          break;

        case 'notification':
          this.handleNotification(clientId, message);
          break;

        case 'typing':
          this.handleTyping(clientId, message);
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Message parse error:', error);
    }
  }

  // Handle subscribe
  handleSubscribe(clientId, message) {
    const { channel } = message;
    if (!channel) return;

    this.subscribe(clientId, channel);
    this.sendToClient(clientId, {
      type: 'subscribed',
      channel,
    });
  }

  // Handle unsubscribe
  handleUnsubscribe(clientId, message) {
    const { channel } = message;
    if (!channel) return;

    this.unsubscribe(clientId, channel);
    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channel,
    });
  }

  // Handle chat message
  handleChatMessage(clientId, message) {
    const { to, content, metadata } = message;
    const client = this.clients.get(clientId);

    if (!client || !client.user) return;

    const chatMessage = {
      type: 'chat',
      from: client.user,
      content,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // Send to recipient or broadcast
    if (to) {
      this.sendToClient(to, chatMessage);
    } else {
      // Broadcast to subscribed channel
      this.broadcast(chatMessage);
    }

    // Confirm sent
    this.sendToClient(clientId, {
      type: 'message_sent',
      id: this.generateId(),
      timestamp: chatMessage.timestamp,
    });
  }

  // Handle notification
  handleNotification(clientId, message) {
    const { userId, notification } = message;
    const targetClient = this.findClientByUserId(userId);

    if (targetClient) {
      this.sendToClient(targetClient.id, {
        type: 'notification',
        notification,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Handle typing indicator
  handleTyping(clientId, message) {
    const { channel, isTyping } = message;
    const client = this.clients.get(clientId);

    if (!client?.user) return;

    this.broadcastToChannel(channel, {
      type: 'typing',
      user: { id: client.user.id, name: client.user.name },
      isTyping,
    }, clientId);
  }

  // Handle disconnect
  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all channels
    client.subscriptions.forEach(channel => {
      const channelClients = this.channels.get(channel);
      if (channelClients) {
        channelClients.delete(clientId);
      }
    });

    // Remove client
    this.clients.delete(clientId);

    console.log(`Client disconnected: ${clientId}${client.user ? ` (${client.user.email})` : ''}`);
  }

  // Check heartbeats
  checkHeartbeats() {
    this.clients.forEach((client, clientId) => {
      if (!client.isAlive) {
        client.ws.terminate();
        this.handleDisconnect(clientId);
        return;
      }

      client.isAlive = false;
      client.ws.ping();
    });
  }

  // Subscribe client to channel
  subscribe(clientId, channel) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(channel);

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel).add(clientId);

    console.log(`Client ${clientId} subscribed to ${channel}`);
  }

  // Unsubscribe client from channel
  unsubscribe(clientId, channel) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(channel);

    const channelClients = this.channels.get(channel);
    if (channelClients) {
      channelClients.delete(clientId);
    }
  }

  // Send message to specific client
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return false;

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Send error:', error);
      return false;
    }
  }

  // Broadcast to channel
  broadcastToChannel(channel, message, excludeClientId = null) {
    const channelClients = this.channels.get(channel);
    if (!channelClients) return;

    channelClients.forEach(clientId => {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  // Broadcast to all connected clients
  broadcast(message, excludeClientId = null) {
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  // Find client by user ID
  findClientByUserId(userId) {
    for (const client of this.clients.values()) {
      if (client.user?.id === userId) {
        return client;
      }
    }
    return null;
  }

  // Publish event (for integration with Event Bus)
  publish(channel, event) {
    this.broadcastToChannel(channel, {
      type: 'event',
      channel,
      event,
      timestamp: new Date().toISOString(),
    });
  }

  // Get stats
  getStats() {
    return {
      totalClients: this.clients.size,
      authenticatedClients: Array.from(this.clients.values()).filter(c => c.user).length,
      channels: this.channels.size,
      uptime: process.uptime(),
    };
  }

  // Generate client ID
  generateClientId() {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate message ID
  generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Shutdown
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.ws.close();
    });

    this.wss.close();
    console.log('WebSocket server shutdown');
  }
}

// Singleton instance
export const wsServer = new RTMNWebSocketServer();

// ============================================================
// Real-time Event Handlers
// ============================================================

// Publish real-time notifications
export function notifyLeaveRequest(request) {
  wsServer.publish(`tenant:${request.tenantId}`, {
    type: 'notification',
    category: 'leave',
    title: 'New Leave Request',
    message: `${request.employeeName} requested ${request.leaveType} leave`,
    data: request,
  });
}

export function notifyLeaveApproved(request, approvedBy) {
  wsServer.publish(`user:${request.employeeId}`, {
    type: 'notification',
    category: 'leave',
    title: 'Leave Approved',
    message: `Your ${request.leaveType} leave has been approved`,
    data: { request, approvedBy },
  });
}

export function notifyAttendanceAnomaly(employeeId, anomaly) {
  wsServer.publish(`user:${employeeId}`, {
    type: 'notification',
    category: 'attendance',
    title: 'Attendance Alert',
    message: anomaly.message,
    data: anomaly,
  });
}

export function notifyNewCandidate(candidate) {
  wsServer.publish('talent:recruiters', {
    type: 'notification',
    category: 'recruitment',
    title: 'New Candidate',
    message: `${candidate.name} applied for ${candidate.jobTitle}`,
    data: candidate,
  });
}

export function notifyPipelineUpdate(candidate) {
  wsServer.publish('talent:pipeline', {
    type: 'pipeline_update',
    data: {
      candidateId: candidate.id,
      stage: candidate.stage,
      previousStage: candidate.previousStage,
    },
  });
}

export function notifyTrainingComplete(employeeId, course) {
  wsServer.publish(`user:${employeeId}`, {
    type: 'notification',
    category: 'training',
    title: 'Course Completed',
    message: `Congratulations! You completed "${course.name}"`,
    data: course,
  });
}

export function notifyPayrollProcessed(run) {
  wsServer.publish(`tenant:${run.tenantId}`, {
    type: 'notification',
    category: 'payroll',
    title: 'Payroll Processed',
    message: `Payslips for ${run.month}/${run.year} are ready`,
    data: run,
  });
}

// Real-time dashboard updates
export function broadcastDashboardUpdate(tenantId, update) {
  wsServer.publish(`tenant:${tenantId}`, {
    type: 'dashboard_update',
    data: update,
  });
}

// Real-time attendance updates
export function broadcastAttendanceUpdate(tenantId, data) {
  wsServer.publish(`tenant:${tenantId}`, {
    type: 'attendance_update',
    data,
  });
}

// Real-time chat
export function sendChatMessage(channel, from, message) {
  wsServer.publish(channel, {
    type: 'chat',
    from,
    message,
    timestamp: new Date().toISOString(),
  });
}

export default {
  wsServer,
  notifyLeaveRequest,
  notifyLeaveApproved,
  notifyAttendanceAnomaly,
  notifyNewCandidate,
  notifyPipelineUpdate,
  notifyTrainingComplete,
  notifyPayrollProcessed,
  broadcastDashboardUpdate,
  broadcastAttendanceUpdate,
  sendChatMessage,
};
