/**
 * HOJAI AI Support Agent - Support Routes
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: API routes for all support operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateTicketSchema,
  TicketQuerySchema,
  ResolveTicketSchema,
  AddMessageSchema,
  EscalateSchema,
  WarrantyCheckSchema,
  WarrantyClaimSchema,
  RefundProcessSchema,
  RefundPreviewSchema,
  CreateFAQSchema,
  FAQSearchSchema,
  ErrorResponse,
} from '../types.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as ticketService from '../services/ticketService.js';
import * as faqService from '../services/faqService.js';
import * as escalationService from '../services/escalationService.js';
import * as warrantyService from '../services/warrantyService.js';
import * as refundService from '../services/refundService.js';
import * as customerHistoryService from '../services/customerHistoryService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('support-routes');
const router = Router();

// ============================================================================
// Helper Functions
// ============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createResponse<T>(success: boolean, data?: T, error?: ErrorResponse['error'], meta?: Record<string, unknown>) {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      ...meta,
    },
  };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// Middleware
// ============================================================================

router.use(tenantMiddleware());

// ============================================================================
// TICKET ROUTES
// ============================================================================

// POST /api/support/tickets - Create ticket
router.post(
  '/tickets',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const userId = req.userId!;

    const parseResult = CreateTicketSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const input = parseResult.data;
    logger.info('create_ticket_request', { userId, tenantId, category: input.category });

    const ticket = await ticketService.createTicket(input, tenantId);

    res.status(201).json(createResponse(true, ticket, undefined, { tenantId }));
  })
);

// GET /api/support/tickets - List tickets
router.get(
  '/tickets',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;

    const parseResult = TicketQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'INVALID_QUERY',
          message: 'Invalid query parameters',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const { tickets, total } = await ticketService.listTickets(parseResult.data, tenantId);

    res.json(createResponse(true, {
      tickets,
      pagination: {
        page: parseResult.data.page,
        pageSize: parseResult.data.pageSize,
        total,
        hasMore: (parseResult.data.page * parseResult.data.pageSize) < total,
      },
    }, undefined, { tenantId }));
  })
);

// GET /api/support/tickets/:id - Get ticket by ID
router.get(
  '/tickets/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const ticketId = req.params.id;

    const ticket = await ticketService.getTicketById(ticketId);
    if (!ticket) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        })
      );
      return;
    }

    res.json(createResponse(true, ticket));
  })
);

// PATCH /api/support/tickets/:id/status - Update ticket status
router.patch(
  '/tickets/:id/status',
  asyncHandler(async (req: Request, res: Response) => {
    const ticketId = req.params.id;
    const { status, updatedBy } = req.body;

    if (!status || !updatedBy) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Status and updatedBy are required',
        })
      );
      return;
    }

    const ticket = await ticketService.updateTicketStatus(ticketId, status, updatedBy);
    if (!ticket) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        })
      );
      return;
    }

    res.json(createResponse(true, ticket));
  })
);

// POST /api/support/tickets/:id/resolve - Resolve ticket
router.post(
  '/tickets/:id/resolve',
  asyncHandler(async (req: Request, res: Response) => {
    const ticketId = req.params.id;

    const parseResult = ResolveTicketSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const ticket = await ticketService.resolveTicket(ticketId, parseResult.data.resolution);
    if (!ticket) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        })
      );
      return;
    }

    res.json(createResponse(true, ticket));
  })
);

// POST /api/support/tickets/:id/messages - Add message to ticket
router.post(
  '/tickets/:id/messages',
  asyncHandler(async (req: Request, res: Response) => {
    const ticketId = req.params.id;
    const { authorId, authorType, content, attachments } = req.body;

    const parseResult = AddMessageSchema.safeParse({ content, attachments });
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const message = await ticketService.addMessage(
      ticketId,
      authorId || req.userId!,
      authorType || 'customer',
      content,
      attachments
    );

    if (!message) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        })
      );
      return;
    }

    res.status(201).json(createResponse(true, message));
  })
);

// GET /api/support/tickets/stats - Get ticket statistics
router.get(
  '/tickets/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantContext!.tenant_id;
    const stats = await ticketService.getTicketStats(tenantId);

    res.json(createResponse(true, stats));
  })
);

// ============================================================================
// ESCALATION ROUTES
// ============================================================================

// POST /api/support/escalate - Escalate issue
router.post(
  '/escalate',
  asyncHandler(async (req: Request, res: Response) => {
    const escalatedBy = req.userId!;

    const parseResult = EscalateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    // Verify ticket exists
    const ticket = await ticketService.getTicketById(parseResult.data.ticketId);
    if (!ticket) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        })
      );
      return;
    }

    const escalation = await escalationService.createEscalation(parseResult.data, escalatedBy);

    // Update ticket status
    await ticketService.updateTicketStatus(ticket.id, 'escalated', escalatedBy);

    res.status(201).json(createResponse(true, escalation));
  })
);

// GET /api/support/escalate/rules - Get escalation rules
router.get(
  '/escalate/rules',
  asyncHandler(async (_req: Request, res: Response) => {
    const rules = await escalationService.getEscalationRules();

    res.json(createResponse(true, rules));
  })
);

// GET /api/support/escalate/teams - Get team statistics
router.get(
  '/escalate/teams',
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await escalationService.getTeamStats();

    res.json(createResponse(true, stats));
  })
);

// ============================================================================
// WARRANTY ROUTES
// ============================================================================

// POST /api/support/warranty/check - Check warranty
router.post(
  '/warranty/check',
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = WarrantyCheckSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const result = await warrantyService.checkWarranty(parseResult.data);

    res.json(createResponse(true, result));
  })
);

// POST /api/support/warranty/claim - Submit warranty claim
router.post(
  '/warranty/claim',
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = WarrantyClaimSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    try {
      const claim = await warrantyService.submitClaim({
        ...parseResult.data,
        customerId: req.body.customerId,
      });

      res.status(201).json(createResponse(true, claim));
    } catch (error) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'CLAIM_ERROR',
          message: error instanceof Error ? error.message : 'Failed to submit claim',
        })
      );
    }
  })
);

// GET /api/support/warranty/:id - Get warranty details
router.get(
  '/warranty/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const warrantyId = req.params.id;

    const warranty = await warrantyService.getWarrantyById(warrantyId);
    if (!warranty) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'NOT_FOUND',
          message: 'Warranty not found',
        })
      );
      return;
    }

    res.json(createResponse(true, warranty));
  })
);

// GET /api/support/warranty/stats - Get warranty statistics
router.get(
  '/warranty/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await warrantyService.getWarrantyStats();

    res.json(createResponse(true, stats));
  })
);

// ============================================================================
// REFUND ROUTES
// ============================================================================

// POST /api/support/refund/preview - Preview refund
router.post(
  '/refund/preview',
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = RefundPreviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const preview = await refundService.previewRefund(
      parseResult.data.orderId,
      parseResult.data.customerId,
      parseResult.data.reason
    );

    res.json(createResponse(true, preview));
  })
);

// POST /api/support/refund/process - Process refund
router.post(
  '/refund/process',
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = RefundProcessSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    try {
      const refund = await refundService.processRefund(parseResult.data);

      res.status(201).json(createResponse(true, refund));
    } catch (error) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'REFUND_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process refund',
        })
      );
    }
  })
);

// GET /api/support/refund/:id - Get refund details
router.get(
  '/refund/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const refundId = req.params.id;

    const refund = await refundService.getRefundById(refundId);
    if (!refund) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'NOT_FOUND',
          message: 'Refund not found',
        })
      );
      return;
    }

    res.json(createResponse(true, refund));
  })
);

// PATCH /api/support/refund/:id/approve - Approve refund
router.patch(
  '/refund/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const refundId = req.params.id;
    const { approvedBy, notes } = req.body;

    try {
      const refund = await refundService.approveRefund(refundId, approvedBy, notes);
      if (!refund) {
        res.status(404).json(
          createResponse(false, undefined, {
            code: 'NOT_FOUND',
            message: 'Refund not found',
          })
        );
        return;
      }

      res.json(createResponse(true, refund));
    } catch (error) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'APPROVAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to approve refund',
        })
      );
    }
  })
);

// PATCH /api/support/refund/:id/reject - Reject refund
router.patch(
  '/refund/:id/reject',
  asyncHandler(async (req: Request, res: Response) => {
    const refundId = req.params.id;
    const { rejectedBy, reason } = req.body;

    if (!reason) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Rejection reason is required',
        })
      );
      return;
    }

    try {
      const refund = await refundService.rejectRefund(refundId, rejectedBy || 'system', reason);
      if (!refund) {
        res.status(404).json(
          createResponse(false, undefined, {
            code: 'NOT_FOUND',
            message: 'Refund not found',
          })
        );
        return;
      }

      res.json(createResponse(true, refund));
    } catch (error) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'REJECTION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to reject refund',
        })
      );
    }
  })
);

// GET /api/support/refund/stats - Get refund statistics
router.get(
  '/refund/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await refundService.getRefundStats();

    res.json(createResponse(true, stats));
  })
);

// ============================================================================
// FAQ ROUTES
// ============================================================================

// GET /api/support/faq - List FAQs
router.get(
  '/faq',
  asyncHandler(async (req: Request, res: Response) => {
    const category = req.query.category as string;

    if (category) {
      const faqs = await faqService.getFAQsByCategory(category as any);
      res.json(createResponse(true, faqs));
    } else {
      const categories = await faqService.getFAQCategories();
      res.json(createResponse(true, categories));
    }
  })
);

// POST /api/support/faq/search - Search FAQs
router.post(
  '/faq/search',
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = FAQSearchSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const results = await faqService.searchFAQs(parseResult.data);

    res.json(createResponse(true, results));
  })
);

// GET /api/support/faq/:id - Get FAQ by ID
router.get(
  '/faq/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const faqId = req.params.id;

    const faq = await faqService.getFAQById(faqId);
    if (!faq) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'NOT_FOUND',
          message: 'FAQ not found',
        })
      );
      return;
    }

    // Record view
    await faqService.recordFAQView(faqId);

    res.json(createResponse(true, faq));
  })
);

// POST /api/support/faq - Create FAQ
router.post(
  '/faq',
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = CreateFAQSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const faq = await faqService.createFAQ(parseResult.data);

    res.status(201).json(createResponse(true, faq));
  })
);

// POST /api/support/faq/:id/feedback - Record FAQ feedback
router.post(
  '/faq/:id/feedback',
  asyncHandler(async (req: Request, res: Response) => {
    const faqId = req.params.id;
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Helpful field (boolean) is required',
        })
      );
      return;
    }

    const faq = await faqService.recordFAQFeedback(faqId, helpful);
    if (!faq) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'NOT_FOUND',
          message: 'FAQ not found',
        })
      );
      return;
    }

    res.json(createResponse(true, { success: true }));
  })
);

// ============================================================================
// CUSTOMER HISTORY ROUTES
// ============================================================================

// GET /api/support/customer/:id/history - Get customer history
router.get(
  '/customer/:id/history',
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = req.params.id;
    const includeRelatedTickets = req.query.includeTickets === 'true';

    const history = await customerHistoryService.getCustomerHistory(customerId, includeRelatedTickets);
    if (!history) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'NOT_FOUND',
          message: 'Customer not found',
        })
      );
      return;
    }

    res.json(createResponse(true, history));
  })
);

// GET /api/support/customer/:id/profile - Get customer profile
router.get(
  '/customer/:id/profile',
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = req.params.id;

    const profile = await customerHistoryService.getCustomerProfile(customerId);
    if (!profile) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'NOT_FOUND',
          message: 'Customer not found',
        })
      );
      return;
    }

    res.json(createResponse(true, profile));
  })
);

// GET /api/support/customer/:id/sentiment - Get customer sentiment
router.get(
  '/customer/:id/sentiment',
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = req.params.id;

    const sentiment = await customerHistoryService.getCustomerSentiment(customerId);

    res.json(createResponse(true, sentiment));
  })
);

// POST /api/support/customer/search - Search customers
router.post(
  '/customer/search',
  asyncHandler(async (req: Request, res: Response) => {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Query string is required',
        })
      );
      return;
    }

    const customers = await customerHistoryService.searchCustomers(query);

    res.json(createResponse(true, customers));
  })
);

// GET /api/support/customers/at-risk - Get at-risk customers
router.get(
  '/customers/at-risk',
  asyncHandler(async (req: Request, res: Response) => {
    const threshold = parseInt(req.query.threshold as string) || 50;

    const atRiskCustomers = await customerHistoryService.getAtRiskCustomers(threshold);

    res.json(createResponse(true, atRiskCustomers));
  })
);

// ============================================================================
// AI ASSISTANT ROUTES
// ============================================================================

// POST /api/support/ai/suggest - Get AI suggestions
router.post(
  '/ai/suggest',
  asyncHandler(async (req: Request, res: Response) => {
    const { context } = req.body;

    if (!context || typeof context !== 'string') {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Context is required',
        })
      );
      return;
    }

    // Generate AI suggestions based on context
    const suggestions: { type: string; message: string; confidence: number }[] = [];

    const contextLower = context.toLowerCase();

    // Check for refund keywords
    if (contextLower.includes('refund') || contextLower.includes('money back')) {
      suggestions.push({
        type: 'refund',
        message: 'Consider initiating a refund preview and checking refund eligibility',
        confidence: 0.9,
      });
    }

    // Check for warranty keywords
    if (contextLower.includes('warranty') || contextLower.includes('broken') || contextLower.includes('defect')) {
      suggestions.push({
        type: 'warranty',
        message: 'Check warranty status and coverage for this product',
        confidence: 0.85,
      });
    }

    // Check for technical issues
    if (contextLower.includes('not working') || contextLower.includes('error') || contextLower.includes('bug')) {
      suggestions.push({
        type: 'technical',
        message: 'Escalate to technical support team for detailed troubleshooting',
        confidence: 0.8,
      });
    }

    // Check for billing issues
    if (contextLower.includes('charge') || contextLower.includes('billing') || contextLower.includes('payment')) {
      suggestions.push({
        type: 'billing',
        message: 'Review billing history and check for duplicate charges',
        confidence: 0.85,
      });
    }

    // Add relevant FAQ suggestions
    const faqResults = await faqService.searchFAQs({ query: context, limit: 3 });
    if (faqResults.length > 0) {
      suggestions.push({
        type: 'faq',
        message: `${faqResults.length} relevant FAQ article(s) found`,
        confidence: 0.7,
      });
    }

    res.json(createResponse(true, {
      suggestions,
      context,
      generatedAt: new Date().toISOString(),
    }));
  })
);

// ============================================================================
// HEALTH CHECK ROUTES
// ============================================================================

// GET /api/support/health - Health check
router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(createResponse(true, {
      status: 'healthy',
      services: {
        tickets: 'online',
        faq: 'online',
        escalation: 'online',
        warranty: 'online',
        refund: 'online',
        customerHistory: 'online',
      },
      timestamp: new Date().toISOString(),
    }));
  })
);

export default router;
