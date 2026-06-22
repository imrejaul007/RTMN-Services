import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { AuthenticatedRequest, authenticate, authenticateAny, tenantContext, generateToken } from '../middleware/auth.js';
import { employeeRegistry, EmployeeRegistration, EmployeeUpdate } from '../services/employeeRegistry.js';
import { conversationManager } from '../services/conversationManager.js';
import { messageRouter } from '../services/messageRouter.js';
import { whatsAppBridge } from '../whatsappBridge.js';
import { webSocketServer } from '../webSocketServer.js';
import { Source, EmployeeStatus } from '../types/index.js';

// ============================================================================
// CONFIG
// ============================================================================

const router = Router();

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const ChatRequestSchema = z.object({
  userId: z.string().min(1).max(255),
  userName: z.string().optional(),
  employeeId: z.string().uuid().optional(),
  message: z.string().min(1).max(4096),
  conversationId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
});

const RegisterEmployeeSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  description: z.string().optional(),
  avatar: z.string().url().optional(),
  capabilities: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  languages: z.array(z.string()).default(['en']),
  workingHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().default('Asia/Kolkata')
  }).optional(),
  metadata: z.record(z.any()).optional()
});

const UpdateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  avatar: z.string().url().optional(),
  capabilities: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  workingHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string()
  }).optional(),
  metadata: z.record(z.any()).optional()
});

const AssignTaskSchema = z.object({
  conversationId: z.string().uuid(),
  employeeId: z.string().uuid(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  notes: z.string().optional()
});

const UpdateStatusSchema = z.object({
  status: z.nativeEnum(EmployeeStatus)
});

// ============================================================================
// AUTH ROUTES
// ============================================================================

/**
 * POST /api/auth/token
 * Generate a JWT token for a user
 */
router.post('/api/auth/token', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId, role, permissions } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    const token = generateToken({
      tenantId,
      userId,
      role,
      permissions
    });

    res.json({
      success: true,
      data: {
        token,
        expiresIn: '24h',
        tokenType: 'Bearer'
      }
    });
  } catch (error) {
    console.error('[Auth] Token generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate token'
    });
  }
});

// ============================================================================
// CHAT ROUTES
// ============================================================================

/**
 * POST /api/chat
 * Chat with an AI employee
 */
router.post('/api/chat', authenticateAny, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantContext?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    const parseResult = ChatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.issues
      });
    }

    const { userId, userName, employeeId, message, conversationId, metadata } = parseResult.data;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    const result = await messageRouter.processMessage({
      tenantId,
      userId,
      conversationId,
      employeeId,
      message,
      source: Source.API,
      metadata
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to process message'
      });
    }

    res.json({
      success: true,
      data: {
        conversationId: result.conversationId,
        messageId: result.messageId,
        response: result.response,
        employeeId: result.employeeId,
        employeeName: result.routedTo?.name,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Chat] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message'
    });
  }
});

// ============================================================================
// EMPLOYEE ROUTES
// ============================================================================

/**
 * GET /api/employees
 * List all available employees
 */
router.get('/api/employees', tenantContext, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantContext?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    const { status, role, capability } = req.query;

    let employees;

    if (status) {
      employees = await employeeRegistry.findByStatus(tenantId, status as EmployeeStatus);
    } else if (role) {
      employees = await employeeRegistry.findByRole(tenantId, role as string);
    } else if (capability) {
      employees = await employeeRegistry.findByCapability(tenantId, capability as string);
    } else {
      employees = await employeeRegistry.listByTenant(tenantId);
    }

    const formattedEmployees = employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      description: emp.description,
      status: emp.status,
      capabilities: emp.capabilities,
      avatar: emp.avatar,
      skills: emp.skills,
      languages: emp.languages
    }));

    res.json({
      success: true,
      data: {
        employees: formattedEmployees,
        total: employees.length
      }
    });
  } catch (error) {
    console.error('[Employees] List error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list employees'
    });
  }
});

/**
 * POST /api/employees
 * Register a new AI employee
 */
router.post('/api/employees', tenantContext, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantContext?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    const parseResult = RegisterEmployeeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.issues
      });
    }

    const registration: EmployeeRegistration = {
      tenantId,
      ...parseResult.data
    };

    const employee = await employeeRegistry.register(registration);

    res.status(201).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('[Employees] Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register employee'
    });
  }
});

/**
 * GET /api/employees/:id
 * Get employee by ID
 */
router.get('/api/employees/:id', tenantContext, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantContext?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    const employee = await employeeRegistry.findById(id, tenantId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('[Employees] Get error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get employee'
    });
  }
});

/**
 * PATCH /api/employees/:id
 * Update an employee
 */
router.patch('/api/employees/:id', tenantContext, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantContext?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    const parseResult = UpdateEmployeeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.issues
      });
    }

    const updates: EmployeeUpdate = parseResult.data;
    const employee = await employeeRegistry.update(id, tenantId, updates);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('[Employees] Update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update employee'
    });
  }
});

/**
 * POST /api/employees/:id/status
 * Update employee status
 */
router.post('/api/employees/:id/status', tenantContext, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantContext?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    const parseResult = UpdateStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.issues
      });
    }

    const employee = await employeeRegistry.updateStatus(id, tenantId, parseResult.data.status);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('[Employees] Status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status'
    });
  }
});

/**
 * DELETE /api/employees/:id
 * Delete an employee
 */
router.delete('/api/employees/:id', tenantContext, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantContext?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    const deleted = await employeeRegistry.delete(id, tenantId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Employee deleted'
    });
  } catch (error) {
    console.error('[Employees] Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete employee'
    });
  }
});

// ============================================================================
// TASK ASSIGNMENT ROUTES
// ============================================================================

/**
 * POST /api/employees/:id/assign
 * Assign a conversation/task to an employee
 */
router.post('/api/employees/:id/assign', tenantContext, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantContext?.tenantId;
    const { id: employeeId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    const parseResult = AssignTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.issues
      });
    }

    const { conversationId, priority, notes } = parseResult.data;

    // Verify employee exists
    const employee = await employeeRegistry.findById(employeeId, tenantId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Assign conversation to employee
    const conversation = await conversationManager.assignToEmployee(
      conversationId,
      tenantId,
      employeeId
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Notify via WebSocket if connected
    webSocketServer.broadcastToConversation(conversationId, {
      type: 'status',
      payload: {
        action: 'conversation_assigned',
        employeeId,
        employeeName: employee.name,
        priority
      },
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        assignmentId: uuid(),
        conversationId,
        employeeId,
        employeeName: employee.name,
        priority,
        notes,
        assignedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Assign] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign task'
    });
  }
});

// ============================================================================
// CONVERSATION ROUTES
// ============================================================================

/**
 * GET /api/conversations/:userId
 * Get conversation history for a user
 */
router.get('/api/conversations/:userId', tenantContext, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantContext?.tenantId;
    const { userId } = req.params;
    const { limit = '20', conversationId } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    if (conversationId) {
      // Get specific conversation with messages
      const conversation = await conversationManager.findById(conversationId as string, tenantId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }

      const messages = await conversationManager.getMessageHistory(
        conversationId as string,
        tenantId,
        parseInt(limit as string, 10)
      );

      const employee = conversation.employeeId
        ? await employeeRegistry.findById(conversation.employeeId, tenantId)
        : null;

      return res.json({
        success: true,
        data: {
          conversations: [{
            id: conversation.id,
            employeeId: conversation.employeeId,
            employeeName: employee?.name,
            status: conversation.status,
            source: conversation.source,
            lastMessage: conversation.lastMessage,
            context: conversation.context,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt
          }],
          messages: messages.map(msg => ({
            id: msg.id,
            direction: msg.direction,
            type: msg.type,
            content: msg.content.text || msg.content.mediaUrl,
            timestamp: msg.timestamp,
            status: msg.status,
            employeeId: msg.employeeId
          }))
        }
      });
    }

    // Get all conversations for user
    const conversations = await conversationManager.listByUser(
      tenantId,
      userId,
      parseInt(limit as string, 10)
    );

    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const employee = conv.employeeId
          ? await employeeRegistry.findById(conv.employeeId, tenantId)
          : null;

        return {
          id: conv.id,
          employeeId: conv.employeeId,
          employeeName: employee?.name,
          status: conv.status,
          source: conv.source,
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt
        };
      })
    );

    res.json({
      success: true,
      data: {
        conversations: formattedConversations,
        total: conversations.length
      }
    });
  } catch (error) {
    console.error('[Conversations] List error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations'
    });
  }
});

/**
 * POST /api/conversations/:conversationId/close
 * Close a conversation
 */
router.post('/api/conversations/:conversationId/close', tenantContext, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantContext?.tenantId;
    const { conversationId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    const conversation = await conversationManager.close(conversationId, tenantId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Notify via WebSocket
    webSocketServer.broadcastToConversation(conversationId, {
      type: 'status',
      payload: {
        action: 'conversation_closed'
      },
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('[Conversations] Close error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close conversation'
    });
  }
});

/**
 * POST /api/conversations/:conversationId/read
 * Mark conversation as read
 */
router.post('/api/conversations/:conversationId/read', tenantContext, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantContext?.tenantId;
    const { conversationId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    await conversationManager.markAsRead(conversationId, tenantId);

    res.json({
      success: true,
      message: 'Conversation marked as read'
    });
  } catch (error) {
    console.error('[Conversations] Read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark as read'
    });
  }
});

// ============================================================================
// WHATSAPP WEBHOOK ROUTES
// ============================================================================

/**
 * GET /api/webhooks/whatsapp
 * WhatsApp webhook verification
 */
router.get('/api/webhooks/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (whatsAppBridge.verifyWebhook(mode as string, token as string, challenge as string)) {
    res.send(challenge);
  } else {
    res.sendStatus(403);
  }
});

/**
 * POST /api/webhooks/whatsapp
 * WhatsApp webhook for incoming messages
 */
router.post('/api/webhooks/whatsapp', async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    console.warn('[Webhook] Missing tenant ID');
    return res.sendStatus(400);
  }

  try {
    await whatsAppBridge.handleWebhook(tenantId, req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('[Webhook] Error:', error);
    res.sendStatus(500);
  }
});

// ============================================================================
// STATS ROUTES
// ============================================================================

/**
 * GET /api/stats
 * Get communication stats
 */
router.get('/api/stats', tenantContext, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantContext?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }

    const [employeeCount, employeeStatusCounts, whatsappStatus] = await Promise.all([
      employeeRegistry.countByTenant(tenantId),
      employeeRegistry.countByStatus(tenantId),
      whatsAppBridge.getStatus(tenantId)
    ]);

    res.json({
      success: true,
      data: {
        employees: {
          total: employeeCount,
          byStatus: employeeStatusCounts
        },
        websocket: {
          connections: webSocketServer.getConnectionCount(),
          tenantConnections: webSocketServer.getTenantConnectionCount(tenantId)
        },
        whatsapp: whatsappStatus
      }
    });
  } catch (error) {
    console.error('[Stats] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
});

export default router;
