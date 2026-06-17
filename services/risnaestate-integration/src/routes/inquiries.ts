import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';

// In-memory storage for inquiries (replace with database in production)
interface PropertyInquiry {
  id: string;
  inquiryId: string;
  propertyId?: string;
  propertyTitle?: string;
  inquiryType: 'property_inquiry' | 'general' | 'callback_request' | 'valuation_request' | 'mortgage_inquiry' | 'site_visit';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerId?: string;
  message: string;
  source?: 'website' | 'mobile_app' | 'referral' | 'social_media' | 'classified' | 'agent';
  status: 'new' | 'in_progress' | 'responded' | 'converted' | 'closed' | 'spam';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedAgent?: string;
  responseSent?: string;
  followUpDate?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const inquiriesStore: Map<string, PropertyInquiry> = new Map();

/**
 * Inquiries routes for RisnaEstate Integration
 * Handles customer inquiries for properties
 */
export default function inquiriesRoutes(customerOpsBridge: CustomerOpsBridge) {
  const router = Router();

  /**
   * GET /api/inquiries
   * List all inquiries with optional filters
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const {
        status,
        inquiryType,
        propertyId,
        customerId,
        priority,
        source,
        fromDate,
        toDate,
        page,
        limit
      } = req.query;

      let inquiries = Array.from(inquiriesStore.values());

      // Apply filters
      if (status) {
        inquiries = inquiries.filter(i => i.status === status);
      }
      if (inquiryType) {
        inquiries = inquiries.filter(i => i.inquiryType === inquiryType);
      }
      if (propertyId) {
        inquiries = inquiries.filter(i => i.propertyId === propertyId);
      }
      if (customerId) {
        inquiries = inquiries.filter(i => i.customerId === customerId);
      }
      if (priority) {
        inquiries = inquiries.filter(i => i.priority === priority);
      }
      if (source) {
        inquiries = inquiries.filter(i => i.source === source);
      }
      if (fromDate) {
        inquiries = inquiries.filter(i => new Date(i.createdAt) >= new Date(fromDate as string));
      }
      if (toDate) {
        inquiries = inquiries.filter(i => new Date(i.createdAt) <= new Date(toDate as string));
      }

      // Sort by created date (newest first)
      inquiries.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Pagination
      const pageNum = page ? Number(page) : 1;
      const limitNum = limit ? Number(limit) : 20;
      const total = inquiries.length;
      const totalPages = Math.ceil(total / limitNum);
      const offset = (pageNum - 1) * limitNum;
      const paginatedInquiries = inquiries.slice(offset, offset + limitNum);

      res.json({
        success: true,
        data: paginatedInquiries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch inquiries',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/inquiries/stats
   * Get inquiry statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const inquiries = Array.from(inquiriesStore.values());
      const today = new Date();
      const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = {
        total: inquiries.length,
        new: inquiries.filter(i => i.status === 'new').length,
        inProgress: inquiries.filter(i => i.status === 'in_progress').length,
        responded: inquiries.filter(i => i.status === 'responded').length,
        converted: inquiries.filter(i => i.status === 'converted').length,
        closed: inquiries.filter(i => i.status === 'closed').length,
        spam: inquiries.filter(i => i.status === 'spam').length,
        byType: {} as Record<string, number>,
        byPriority: {
          low: inquiries.filter(i => i.priority === 'low').length,
          medium: inquiries.filter(i => i.priority === 'medium').length,
          high: inquiries.filter(i => i.priority === 'high').length,
          urgent: inquiries.filter(i => i.priority === 'urgent').length
        },
        bySource: {} as Record<string, number>,
        last7Days: inquiries.filter(i => new Date(i.createdAt) >= last7Days).length,
        last30Days: inquiries.filter(i => new Date(i.createdAt) >= last30Days).length,
        conversionRate: 0,
        averageResponseTime: 0
      };

      // Group by type
      inquiries.forEach(i => {
        stats.byType[i.inquiryType] = (stats.byType[i.inquiryType] || 0) + 1;
      });

      // Group by source
      inquiries.forEach(i => {
        if (i.source) {
          stats.bySource[i.source] = (stats.bySource[i.source] || 0) + 1;
        }
      });

      // Calculate conversion rate
      const convertedCount = inquiries.filter(i => i.status === 'converted').length;
      stats.conversionRate = inquiries.length > 0
        ? (convertedCount / inquiries.length) * 100
        : 0;

      // Calculate average response time (for responded inquiries)
      const respondedWithTime = inquiries.filter(i =>
        i.status === 'responded' && i.responseSent
      );
      if (respondedWithTime.length > 0) {
        const totalResponseTime = respondedWithTime.reduce((sum, i) => {
          const created = new Date(i.createdAt).getTime();
          const responded = new Date(i.responseSent!).getTime();
          return sum + (responded - created);
        }, 0);
        stats.averageResponseTime = totalResponseTime / respondedWithTime.length;
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch inquiry statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/inquiries/unassigned
   * Get unassigned inquiries (high priority)
   */
  router.get('/unassigned', async (req: Request, res: Response) => {
    try {
      const unassigned = Array.from(inquiriesStore.values())
        .filter(i => !i.assignedAgent && (i.status === 'new' || i.priority === 'urgent'))
        .sort((a, b) => {
          // Sort by priority first, then by date
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      res.json({
        success: true,
        data: unassigned,
        count: unassigned.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch unassigned inquiries',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/inquiries/:id
   * Get single inquiry by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const inquiry = inquiriesStore.get(req.params.id);

      if (!inquiry) {
        return res.status(404).json({
          success: false,
          error: 'Inquiry not found'
        });
      }

      res.json({
        success: true,
        data: inquiry
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch inquiry',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/inquiries
   * Create new inquiry
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const {
        propertyId,
        propertyTitle,
        inquiryType,
        customerName,
        customerEmail,
        customerPhone,
        customerId,
        message,
        source,
        priority
      } = req.body;

      // Validate required fields
      if (!customerName || !customerEmail || !message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['customerName', 'customerEmail', 'message']
        });
      }

      const inquiryId = `INQ-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      const now = new Date().toISOString();

      const inquiry: PropertyInquiry = {
        id: uuidv4(),
        inquiryId,
        propertyId,
        propertyTitle,
        inquiryType: inquiryType || 'property_inquiry',
        customerName,
        customerEmail,
        customerPhone,
        customerId,
        message,
        source: source || 'website',
        status: 'new',
        priority: priority || 'medium',
        createdAt: now,
        updatedAt: now
      };

      inquiriesStore.set(inquiry.id, inquiry);

      // Create or update customer in Customer Twin
      await customerOpsBridge.createOrUpdateCustomer({
        id: customerId || uuidv4(),
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        type: 'prospect',
        interests: propertyId ? [propertyId] : []
      });

      // Create lead if it's a high priority inquiry
      if (inquiry.priority === 'high' || inquiry.priority === 'urgent') {
        await customerOpsBridge.createLeadFromInquiry(inquiry);
      }

      // Publish event to Event Bus
      await customerOpsBridge.publishInquiryEvent(inquiry);

      res.status(201).json({
        success: true,
        data: inquiry,
        message: 'Inquiry created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create inquiry',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/inquiries/:id
   * Update inquiry
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const existingInquiry = inquiriesStore.get(req.params.id);

      if (!existingInquiry) {
        return res.status(404).json({
          success: false,
          error: 'Inquiry not found'
        });
      }

      const updatedInquiry: PropertyInquiry = {
        ...existingInquiry,
        ...req.body,
        id: existingInquiry.id,
        inquiryId: existingInquiry.inquiryId,
        createdAt: existingInquiry.createdAt,
        updatedAt: new Date().toISOString()
      };

      inquiriesStore.set(updatedInquiry.id, updatedInquiry);

      // Sync update to Customer Twin
      await customerOpsBridge.updateInquiryInCustomer(updatedInquiry);

      res.json({
        success: true,
        data: updatedInquiry,
        message: 'Inquiry updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update inquiry',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/inquiries/:id/assign
   * Assign inquiry to an agent
   */
  router.put('/:id/assign', async (req: Request, res: Response) => {
    try {
      const inquiry = inquiriesStore.get(req.params.id);

      if (!inquiry) {
        return res.status(404).json({
          success: false,
          error: 'Inquiry not found'
        });
      }

      const { agentId } = req.body;

      if (!agentId) {
        return res.status(400).json({
          success: false,
          error: 'Agent ID is required'
        });
      }

      inquiry.assignedAgent = agentId;
      inquiry.updatedAt = new Date().toISOString();

      inquiriesStore.set(inquiry.id, inquiry);

      res.json({
        success: true,
        data: inquiry,
        message: 'Inquiry assigned successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to assign inquiry',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/inquiries/:id/respond
   * Mark inquiry as responded
   */
  router.put('/:id/respond', async (req: Request, res: Response) => {
    try {
      const inquiry = inquiriesStore.get(req.params.id);

      if (!inquiry) {
        return res.status(404).json({
          success: false,
          error: 'Inquiry not found'
        });
      }

      inquiry.status = 'responded';
      inquiry.responseSent = new Date().toISOString();
      inquiry.updatedAt = new Date().toISOString();

      if (req.body.notes) {
        inquiry.notes = req.body.notes;
      }

      inquiriesStore.set(inquiry.id, inquiry);

      // Notify customer via Customer Twin
      await customerOpsBridge.notifyCustomer(inquiry.customerId, {
        type: 'inquiry_response',
        message: `Thank you for your inquiry about ${inquiry.propertyTitle || 'our property'}. We have responded to your query.`
      });

      res.json({
        success: true,
        data: inquiry,
        message: 'Inquiry marked as responded'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to respond to inquiry',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/inquiries/:id/convert
   * Convert inquiry to lead/opportunity
   */
  router.put('/:id/convert', async (req: Request, res: Response) => {
    try {
      const inquiry = inquiriesStore.get(req.params.id);

      if (!inquiry) {
        return res.status(404).json({
          success: false,
          error: 'Inquiry not found'
        });
      }

      inquiry.status = 'converted';
      inquiry.updatedAt = new Date().toISOString();

      inquiriesStore.set(inquiry.id, inquiry);

      // Create lead in Lead Twin
      await customerOpsBridge.createLeadFromInquiry(inquiry);

      // Update customer in Customer Twin
      await customerOpsBridge.updateCustomerStage(inquiry.customerId!, 'lead');

      res.json({
        success: true,
        data: inquiry,
        message: 'Inquiry converted to lead successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to convert inquiry',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/inquiries/:id/close
   * Close inquiry (not interested / duplicate)
   */
  router.put('/:id/close', async (req: Request, res: Response) => {
    try {
      const inquiry = inquiriesStore.get(req.params.id);

      if (!inquiry) {
        return res.status(404).json({
          success: false,
          error: 'Inquiry not found'
        });
      }

      inquiry.status = 'closed';
      inquiry.notes = req.body.reason || inquiry.notes;
      inquiry.updatedAt = new Date().toISOString();

      inquiriesStore.set(inquiry.id, inquiry);

      res.json({
        success: true,
        data: inquiry,
        message: 'Inquiry closed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to close inquiry',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/inquiries/:id/followup
   * Schedule follow-up for inquiry
   */
  router.put('/:id/followup', async (req: Request, res: Response) => {
    try {
      const inquiry = inquiriesStore.get(req.params.id);

      if (!inquiry) {
        return res.status(404).json({
          success: false,
          error: 'Inquiry not found'
        });
      }

      const { followUpDate, notes } = req.body;

      if (!followUpDate) {
        return res.status(400).json({
          success: false,
          error: 'Follow-up date is required'
        });
      }

      inquiry.status = 'in_progress';
      inquiry.followUpDate = followUpDate;
      if (notes) {
        inquiry.notes = notes;
      }
      inquiry.updatedAt = new Date().toISOString();

      inquiriesStore.set(inquiry.id, inquiry);

      res.json({
        success: true,
        data: inquiry,
        message: 'Follow-up scheduled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to schedule follow-up',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/inquiries/customer/:customerId
   * Get all inquiries for a customer
   */
  router.get('/customer/:customerId', async (req: Request, res: Response) => {
    try {
      const customerInquiries = Array.from(inquiriesStore.values())
        .filter(i => i.customerId === req.params.customerId)
        .sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      res.json({
        success: true,
        data: customerInquiries,
        count: customerInquiries.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer inquiries',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

// Export the store for use in other routes
export { inquiriesStore };
