/**
 * REST API Routes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { messageStore } from '../services/messageStore';
import { roomManager } from '../ws/roomManager';
import { agentQueue } from '../ws/agentQueue';
import { chatHandler } from '../ws/chatHandler';
import { authMiddleware, agentOnly, adminOnly } from '../middleware/auth';

const router = Router();

// Validation schemas
const messageQuerySchema = z.object({
  roomId: z.string().uuid(),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  before: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

const createRoomSchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  agentId: z.string().optional(),
});

const transferSchema = z.object({
  roomId: z.string().uuid(),
  toAgentId: z.string().optional(),
});

const updateRoomSchema = z.object({
  status: z.enum(['waiting', 'active', 'closed']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'live-chat-server',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Get server stats
router.get('/stats', (req: Request, res: Response) => {
  const messageStats = messageStore.getStats();
  const queueStats = agentQueue.getStats();

  res.json({
    success: true,
    data: {
      ...messageStats,
      ...queueStats,
      connectedClients: chatHandler.getClientCount(),
    },
  });
});

// Get all rooms
router.get('/rooms', authMiddleware, agentOnly, (req: Request, res: Response) => {
  const rooms = messageStore.getAllRooms();
  res.json({ success: true, data: rooms });
});

// Get room by ID
router.get('/rooms/:roomId', authMiddleware, (req: Request, res: Response) => {
  const { roomId } = req.params;
  const room = messageStore.getRoom(roomId);

  if (!room) {
    res.status(404).json({
      success: false,
      error: 'Room not found',
    });
    return;
  }

  // Customers can only view their own rooms
  if (req.user!.role === 'customer' && room.customerId !== req.user!.userId) {
    res.status(403).json({
      success: false,
      error: 'Access denied',
    });
    return;
  }

  res.json({ success: true, data: room });
});

// Get rooms for current user
router.get('/my-rooms', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;

  if (req.user!.role === 'agent' || req.user!.role === 'admin') {
    const rooms = messageStore.getRoomsByAgent(userId);
    res.json({ success: true, data: rooms });
  } else {
    const rooms = messageStore.getRoomsByCustomer(userId);
    res.json({ success: true, data: rooms });
  }
});

// Create new room
router.post('/rooms', authMiddleware, (req: Request, res: Response) => {
  try {
    const data = createRoomSchema.parse(req.body);

    // Only customers can create rooms
    if (req.user!.role !== 'customer' && req.user!.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Only customers can create chat rooms',
      });
      return;
    }

    const room = roomManager.createRoom(
      data.customerId,
      data.customerName,
      null, // WebSocket provided separately
      data.agentId
    );

    res.status(201).json({ success: true, data: room });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create room',
    });
  }
});

// Update room status
router.patch('/rooms/:roomId', authMiddleware, agentOnly, (req: Request, res: Response) => {
  const { roomId } = req.params;

  try {
    const data = updateRoomSchema.parse(req.body);
    const room = messageStore.getRoom(roomId);

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
      });
      return;
    }

    if (data.status) {
      messageStore.updateRoom(roomId, { status: data.status });
    }

    if (data.metadata) {
      messageStore.updateRoom(roomId, { metadata: data.metadata });
    }

    res.json({
      success: true,
      data: messageStore.getRoom(roomId),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update room',
    });
  }
});

// Close room
router.post('/rooms/:roomId/close', authMiddleware, agentOnly, (req: Request, res: Response) => {
  const { roomId } = req.params;
  const room = messageStore.getRoom(roomId);

  if (!room) {
    res.status(404).json({
      success: false,
      error: 'Room not found',
    });
    return;
  }

  roomManager.closeRoom(roomId, req.user!.userId);

  res.json({
    success: true,
    data: { roomId, status: 'closed' },
  });
});

// Transfer room
router.post('/rooms/:roomId/transfer', authMiddleware, agentOnly, (req: Request, res: Response) => {
  const { roomId } = req.params;

  try {
    const data = transferSchema.parse(req.body);
    const room = messageStore.getRoom(roomId);

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
      });
      return;
    }

    const success = roomManager.transferRoom(
      roomId,
      req.user!.userId,
      data.toAgentId
    );

    if (!success) {
      res.status(400).json({
        success: false,
        error: 'Transfer failed - no available agents',
      });
      return;
    }

    res.json({
      success: true,
      data: { roomId, transferred: true },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Transfer failed',
    });
  }
});

// Get messages for a room
router.get('/rooms/:roomId/messages', authMiddleware, (req: Request, res: Response) => {
  const { roomId } = req.params;

  try {
    const query = messageQuerySchema.parse({
      ...req.query,
      roomId,
    });

    const room = messageStore.getRoom(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found',
      });
      return;
    }

    // Check access
    if (
      req.user!.role === 'customer' &&
      room.customerId !== req.user!.userId
    ) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    let messages;
    if (query.before) {
      messages = messageStore.getMessagesBefore(roomId, query.before, query.limit);
    } else {
      messages = messageStore.getMessages(roomId, query.limit, query.offset);
    }

    res.json({
      success: true,
      data: {
        roomId,
        messages,
        count: messages.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Failed to get messages',
    });
  }
});

// Get online agents
router.get('/agents', authMiddleware, (req: Request, res: Response) => {
  const agents = agentQueue.getAllAgentsInfo();
  res.json({ success: true, data: agents });
});

// Get agent queue stats
router.get('/queue', authMiddleware, (req: Request, res: Response) => {
  const stats = agentQueue.getStats();
  res.json({ success: true, data: stats });
});

// Get online users
router.get('/users', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const users = messageStore.getOnlineUsers();
  res.json({ success: true, data: users });
});

// Broadcast message to all connected clients
router.post('/broadcast', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const { content, type = 'system' } = req.body;

  if (!content) {
    res.status(400).json({
      success: false,
      error: 'Content is required',
    });
    return;
  }

  chatHandler.broadcastToAll({
    type: 'new_message',
    payload: {
      message: {
        id: 'broadcast',
        senderId: 'system',
        senderName: 'System',
        senderRole: 'admin',
        content,
        type,
        timestamp: new Date(),
        read: false,
      },
    },
    timestamp: new Date(),
  });

  res.json({
    success: true,
    data: { broadcast: true },
  });
});

export default router;
