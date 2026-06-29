/**
 * HOJAI WebSocket Server
 * Real-time agent + workflow updates
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class RealtimeServer {
  constructor(config) {
    this.port = config.port || 4001;
    this.jwtSecret = config.jwtSecret || 'hojai-secret';
    this.clients = new Map(); // userId -> Set<ws>
    this.workflows = new Map(); // executionId -> Set<ws>
    this.agents = new Map(); // agentId -> Set<ws>
  }

  start() {
    this.wss = new WebSocket.Server({ port: this.port });

    this.wss.on('connection', (ws, req) => {
      // Authenticate via token
      const token = req.url?.split('token=')[1];
      if (!token) return ws.close();

      try {
        const user = jwt.verify(token, this.jwtSecret);
        ws.userId = user.userId;
        ws.tenantId = user.tenantId;

        // Add to client map
        if (!this.clients.has(user.userId)) {
          this.clients.set(user.userId, new Set());
        }
        this.clients.get(user.userId).add(ws);

        console.log(`[WS] User ${user.userId} connected`);
      } catch (e) {
        ws.close();
      }
    });

    // Handle messages
    this.wss.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        this.handleMessage(ws, msg);
      } catch (e) {
        ws.send(JSON.stringify({ error: 'Invalid message' }));
      }
    });

    // Cleanup
    this.wss.on('close', () => {
      if (ws.userId) {
        this.clients.get(ws.userId)?.delete(ws);
      }
    });

    console.log(`[WS] Server running on ws://localhost:${this.port}`);
  }

  // Handle incoming messages
  async handleMessage(ws, msg) {
    const { type, payload } = msg;

    switch (type) {
      case 'subscribe:workflow':
        this.subscribeWorkflow(ws, payload.executionId);
        break;

      case 'subscribe:agent':
        this.subscribeAgent(ws, payload.agentId);
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'agent:invoke':
        await this.invokeAgent(ws, payload);
        break;
    }
  }

  subscribeWorkflow(ws, executionId) {
    if (!this.workflows.has(executionId)) {
      this.workflows.set(executionId, new Set());
    }
    this.workflows.get(executionId).add(ws);
    ws.send(JSON.stringify({ type: 'subscribed:workflow', executionId }));
  }

  subscribeAgent(ws, agentId) {
    if (!this.agents.has(agentId)) {
      this.agents.set(agentId, new Set());
    }
    this.agents.get(agentId).add(ws);
    ws.send(JSON.stringify({ type: 'subscribed:agent', agentId }));
  }

  // Broadcast workflow updates
  broadcastWorkflow(executionId, event) {
    const subscribers = this.workflows.get(executionId);
    if (subscribers) {
      subscribers.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'workflow:event', executionId, event }));
        }
      });
    }
  }

  // Broadcast agent updates
  broadcastAgent(agentId, event) {
    const subscribers = this.agents.get(agentId);
    if (subscribers) {
      subscribers.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'agent:event', agentId, event }));
        }
      });
    }
  }

  // Broadcast to user
  notifyUser(userId, type, data) {
    const userWs = this.clients.get(userId);
    if (userWs) {
      userWs.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type, data });
        }
      });
    }
  }

  async invokeAgent(ws, payload) {
    // Call agent runtime
    // const result = await agentRuntime.execute(payload.agentId, payload.input);
    ws.send(JSON.stringify({ type: 'agent:result', result }));
  }
}

module.exports = RealtimeServer;
