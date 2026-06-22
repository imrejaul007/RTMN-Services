import { v4 as uuid } from 'uuid';
import { employeeRegistry } from './employeeRegistry.js';
import { conversationManager } from './conversationManager.js';
import {
  MessageContext,
  EmployeeRoutingResult,
  Employee,
  MessageDirection,
  MessageType,
  Source
} from '../types/index.js';

// ============================================================================
// MESSAGE ROUTER
// ============================================================================

export interface RouteResult {
  success: boolean;
  conversationId?: string;
  messageId?: string;
  response?: string;
  employeeId?: string;
  routedTo?: {
    id: string;
    name: string;
    role: string;
  };
  confidence?: number;
  error?: string;
}

export interface IntentMatch {
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
}

class MessageRouter {
  // Intent patterns for routing (simplified - production would use ML)
  private intentPatterns: Map<string, RegExp[]> = new Map([
    ['sales', [/price/i, /buy/i, /purchase/i, /cost/i, /quote/i, /discount/i, /offer/i]],
    ['support', [/help/i, /issue/i, /problem/i, /error/i, /not working/i, /broken/i, /fix/i]],
    ['billing', [/invoice/i, /payment/i, /refund/i, /charge/i, /bill/i, /subscription/i]],
    ['technical', [/api/i, /integration/i, /developer/i, /code/i, /sdk/i, /documentation/i]],
    ['general', [/.*/]] // Fallback
  ]);

  private intentKeywords: Map<string, string[]> = new Map([
    ['sales', ['pricing', 'buy', 'purchase', 'cost', 'quote', 'discount', 'offer', 'plan', 'upgrade']],
    ['support', ['help', 'issue', 'problem', 'error', 'not working', 'broken', 'fix', 'troubleshoot', 'support']],
    ['billing', ['invoice', 'payment', 'refund', 'charge', 'bill', 'subscription', 'billing', 'subscription']],
    ['technical', ['api', 'integration', 'developer', 'code', 'sdk', 'documentation', 'technical', 'setup']],
    ['hr', ['leave', 'holiday', 'policy', 'employee', 'benefits', 'salary', 'attendance', 'hr']],
    ['onboarding', ['setup', 'getting started', 'onboard', 'configure', 'first step', 'begin']]
  ]);

  /**
   * Detect intent from message content
   */
  detectIntent(message: string): IntentMatch {
    const lowerMessage = message.toLowerCase();
    const scores: Map<string, number> = new Map();

    // Score each intent based on keyword matches
    for (const [intent, keywords] of this.intentKeywords) {
      let score = 0;
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          score += 1;
        }
      }
      scores.set(intent, score);
    }

    // Find highest scoring intent
    let bestIntent = 'general';
    let bestScore = 0;

    for (const [intent, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    // Extract entities (simplified)
    const entities: Record<string, unknown> = {};
    const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      entities.email = emailMatch[0];
    }

    const phoneMatch = message.match(/[\+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}/);
    if (phoneMatch) {
      entities.phone = phoneMatch[0];
    }

    const numberMatch = message.match(/\d+/);
    if (numberMatch) {
      entities.number = parseInt(numberMatch[0], 10);
    }

    return {
      intent: bestIntent,
      confidence: bestScore > 0 ? Math.min(0.9, 0.5 + bestScore * 0.1) : 0.3,
      entities
    };
  }

  /**
   * Find the best employee for a message based on intent and availability
   */
  async routeToEmployee(tenantId: string, intent: IntentMatch, preferredEmployeeId?: string): Promise<EmployeeRoutingResult | null> {
    // If specific employee requested, verify they're available
    if (preferredEmployeeId) {
      const employee = await employeeRegistry.findById(preferredEmployeeId, tenantId);
      if (employee && this.isEmployeeAvailable(employee)) {
        return {
          employeeId: employee.id,
          employee,
          confidence: 1.0,
          reason: 'User requested specific employee'
        };
      }
    }

    // Map intent to role
    const intentRoleMap: Record<string, string> = {
      'sales': 'sales',
      'support': 'support',
      'billing': 'billing',
      'technical': 'technical',
      'hr': 'hr',
      'onboarding': 'onboarding',
      'general': 'assistant'
    };

    const preferredRole = intentRoleMap[intent.intent] || 'assistant';

    // Find employees with matching role
    const employees = await employeeRegistry.findByRole(tenantId, preferredRole);

    // Filter for available employees
    const availableEmployees = employees.filter(e => this.isEmployeeAvailable(e));

    if (availableEmployees.length > 0) {
      // Round-robin selection based on least recently used
      const selected = availableEmployees.sort((a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      )[0];

      return {
        employeeId: selected.id,
        employee: selected,
        confidence: intent.confidence,
        reason: `Matched intent '${intent.intent}' with role '${preferredRole}'`
      };
    }

    // Fallback: find any available employee
    const anyAvailable = await employeeRegistry.findAvailable(tenantId);
    if (anyAvailable.length > 0) {
      const selected = anyAvailable[0];
      return {
        employeeId: selected.id,
        employee: selected,
        confidence: 0.5,
        reason: 'Fallback to any available employee'
      };
    }

    return null;
  }

  /**
   * Check if an employee is available for new conversations
   */
  private isEmployeeAvailable(employee: Employee): boolean {
    // Check working hours if defined
    if (employee.workingHours) {
      const now = new Date();
      const timeZone = employee.workingHours.timezone || 'Asia/Kolkata';
      const timeString = now.toLocaleTimeString('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      if (timeString < employee.workingHours.start || timeString > employee.workingHours.end) {
        return false;
      }
    }

    return employee.status === 'online' || employee.status === 'available';
  }

  /**
   * Process incoming message and route to appropriate employee
   */
  async processMessage(context: MessageContext): Promise<RouteResult> {
    try {
      const { tenantId, userId, conversationId: existingConvId, employeeId: preferredEmployeeId, message, source, metadata } = context;

      // Get or create conversation
      let conversation = existingConvId
        ? await conversationManager.findById(existingConvId, tenantId)
        : null;

      if (!conversation) {
        conversation = await conversationManager.getOrCreateConversation({
          tenantId,
          userId,
          source
        });
      }

      // Detect intent
      const intent = this.detectIntent(message);

      // Route to employee
      const routing = await this.routeToEmployee(tenantId, intent, preferredEmployeeId);

      if (!routing) {
        // No employees available - respond with auto-message
        const autoResponse = await this.handleNoEmployeeAvailable(tenantId, conversation.id, userId, source);
        return {
          success: true,
          conversationId: conversation.id,
          messageId: autoResponse.messageId,
          response: autoResponse.response,
          confidence: 0
        };
      }

      // Store message
      const messageRecord = await conversationManager.sendMessage({
        tenantId,
        conversationId: conversation.id,
        userId,
        direction: MessageDirection.INBOUND,
        source,
        type: MessageType.TEXT,
        content: { text: message },
        metadata: { intent: intent.intent, confidence: intent.confidence, ...metadata }
      });

      // Assign to employee if not already assigned
      if (!conversation.employeeId) {
        await conversationManager.assignToEmployee(conversation.id, tenantId, routing.employeeId);
      }

      // Update conversation context
      await conversationManager.updateContext(conversation.id, tenantId, {
        intent: intent.intent,
        entities: intent.entities
      });

      // Generate AI response (in production, this would call actual AI service)
      const response = await this.generateAIResponse(
        tenantId,
        routing.employee,
        conversation.id,
        message,
        intent
      );

      // Send response
      const responseMessage = await conversationManager.sendMessage({
        tenantId,
        conversationId: conversation.id,
        userId,
        employeeId: routing.employeeId,
        direction: MessageDirection.OUTBOUND,
        source,
        type: MessageType.TEXT,
        content: { text: response },
        metadata: { intent: intent.intent }
      });

      return {
        success: true,
        conversationId: conversation.id,
        messageId: messageRecord.id,
        response,
        employeeId: routing.employeeId,
        routedTo: {
          id: routing.employee.id,
          name: routing.employee.name,
          role: routing.employee.role
        },
        confidence: routing.confidence
      };
    } catch (error) {
      console.error('[MessageRouter] Error processing message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate AI response for a message
   */
  private async generateAIResponse(
    tenantId: string,
    employee: Employee,
    conversationId: string,
    userMessage: string,
    intent: IntentMatch
  ): Promise<string> {
    // In production, this would call the actual AI service
    // For now, return contextual auto-responses

    const responses: Record<string, string[]> = {
      sales: [
        `Thanks for your interest! I'm ${employee.name}, your sales assistant. I'd be happy to help you with pricing and plans.`,
        `Hello! This is ${employee.name} from the sales team. Let me help you find the best solution for your needs.`,
        `Hi there! I'm ${employee.name}. Great question about our offerings - let me guide you through the options.`
      ],
      support: [
        `Hi! I'm ${employee.name}, here to help. Let me look into this for you.`,
        `Hello! I'm ${employee.name} from support. I'll assist you with any issues you're experiencing.`,
        `Hey! This is ${employee.name}. Don't worry, we'll get this sorted out together.`
      ],
      billing: [
        `Hi! I'm ${employee.name}, handling billing inquiries. Let me assist you with your question.`,
        `Hello! This is ${employee.name} from the billing team. I'll help you with your invoice or payment.`,
        `Hi there! I'm ${employee.name}. Let me look into your billing details.`
      ],
      technical: [
        `Hi! I'm ${employee.name}, your technical specialist. I'll help you with any technical questions.`,
        `Hello! This is ${employee.name}. Let me assist you with the technical aspects.`,
        `Hey! I'm ${employee.name} from the tech team. What integration or technical question do you have?`
      ],
      hr: [
        `Hi! I'm ${employee.name}, here to help with HR-related questions.`,
        `Hello! This is ${employee.name} from HR. Let me assist you.`,
        `Hey! I'm ${employee.name}. What can I help you with regarding HR policies?`
      ],
      onboarding: [
        `Welcome! I'm ${employee.name}, here to help you get started. Let's set things up together.`,
        `Hello! I'm ${employee.name}. Excited to help you onboard! Let me guide you through the first steps.`,
        `Hi there! I'm ${employee.name}. Welcome aboard! Let me walk you through the setup process.`
      ],
      general: [
        `Hi! I'm ${employee.name}. How can I help you today?`,
        `Hello! This is ${employee.name}. What can I assist you with?`,
        `Hey! I'm ${employee.name}. I'm here to help - just let me know what you need!`
      ]
    };

    const employeeResponses = responses[employee.role] || responses.general;
    return employeeResponses[Math.floor(Math.random() * employeeResponses.length)];
  }

  /**
   * Handle case when no employees are available
   */
  private async handleNoEmployeeAvailable(
    tenantId: string,
    conversationId: string,
    userId: string,
    source: Source
  ): Promise<{ messageId: string; response: string }> {
    const response = "Thanks for reaching out! All our team members are currently busy. Please leave a message and we'll get back to you shortly, or try again in a few minutes.";

    const message = await conversationManager.sendMessage({
      tenantId,
      conversationId,
      userId,
      direction: MessageDirection.OUTBOUND,
      source,
      type: MessageType.TEXT,
      content: { text: response },
      metadata: { autoGenerated: true, reason: 'no_employees_available' }
    });

    return { messageId: message.id, response };
  }

  /**
   * Forward message to specific employee
   */
  async forwardToEmployee(
    tenantId: string,
    conversationId: string,
    employeeId: string,
    message: string,
    source: Source,
    metadata?: Record<string, unknown>
  ): Promise<RouteResult> {
    try {
      const employee = await employeeRegistry.findById(employeeId, tenantId);
      if (!employee) {
        return { success: false, error: 'Employee not found' };
      }

      const conversation = await conversationManager.findById(conversationId, tenantId);
      if (!conversation) {
        return { success: false, error: 'Conversation not found' };
      }

      // Store user message
      const userMessage = await conversationManager.sendMessage({
        tenantId,
        conversationId,
        userId: conversation.userId,
        employeeId,
        direction: MessageDirection.INBOUND,
        source,
        type: MessageType.TEXT,
        content: { text: message },
        metadata
      });

      return {
        success: true,
        conversationId,
        messageId: userMessage.id,
        employeeId,
        routedTo: {
          id: employee.id,
          name: employee.name,
          role: employee.role
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const messageRouter = new MessageRouter();
