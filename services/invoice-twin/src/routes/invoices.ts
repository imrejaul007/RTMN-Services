import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Invoice, { InvoiceStatus, IInvoice, ILineItem, PaymentMethod } from '../models/Invoice';
import PaymentRecord from '../models/PaymentRecord';

const router = Router();

// Validation schemas using plain objects (zod would be imported but we'll keep it simple)
const validateInvoice = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.customerId) errors.push('customerId is required');
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('items array is required and must not be empty');
  }
  if (!data.dueDate) errors.push('dueDate is required');

  if (data.items) {
    data.items.forEach((item: any, index: number) => {
      if (!item.description) errors.push(`items[${index}].description is required`);
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push(`items[${index}].quantity must be a positive number`);
      }
      if (typeof item.price !== 'number' || item.price < 0) {
        errors.push(`items[${index}].price must be a non-negative number`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
};

// Helper to calculate line item totals
const calculateLineItemTotals = (items: any[]): ILineItem[] => {
  return items.map(item => ({
    description: item.description,
    quantity: item.quantity,
    price: item.price,
    taxRate: item.taxRate || 0,
    taxAmount: (item.price * item.quantity) * ((item.taxRate || 0) / 100),
    total: (item.price * item.quantity) * (1 + (item.taxRate || 0) / 100),
  }));
};

// GET /api/invoices - List all invoices
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const {
      page = 1,
      limit = 20,
      status,
      customerId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query: any = { tenantId };

    if (status) {
      query.status = status;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate as string);
      if (endDate) query.issueDate.$lte = new Date(endDate as string);
    }

    // Execute query with pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      Invoice.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/invoices/overdue - Get overdue invoices
router.get('/overdue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;

    const overdueInvoices = await Invoice.find({
      tenantId,
      status: { $nin: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
      dueDate: { $lt: new Date() },
    })
      .sort({ overdueDays: -1 })
      .lean();

    res.json({
      success: true,
      count: overdueInvoices.length,
      data: overdueInvoices,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/invoices/stats - Get invoice statistics
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { startDate, endDate } = req.query;

    const matchQuery: any = { tenantId };
    if (startDate || endDate) {
      matchQuery.issueDate = {};
      if (startDate) matchQuery.issueDate.$gte = new Date(startDate as string);
      if (endDate) matchQuery.issueDate.$lte = new Date(endDate as string);
    }

    const stats = await Invoice.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } },
          ],
          totalAmount: [
            { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$paidAmount' } } },
          ],
          byMonth: [
            {
              $group: {
                _id: {
                  year: { $year: '$issueDate' },
                  month: { $month: '$issueDate' },
                },
                count: { $sum: 1 },
                total: { $sum: '$total' },
              },
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        byStatus: stats[0].byStatus,
        totalAmount: stats[0].totalAmount[0] || { total: 0, paid: 0 },
        byMonth: stats[0].byMonth,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/invoices/:id - Get single invoice
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const invoice = await Invoice.findOne({ invoiceId: id, tenantId }).lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Get payment history
    const payments = await PaymentRecord.find({ invoiceId: id, tenantId })
      .sort({ date: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        ...invoice,
        payments,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/invoices - Create new invoice
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;

    // Validate request
    const validation = validateInvoice(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const {
      customerId,
      orderId,
      issueDate,
      dueDate,
      items,
      discount = 0,
      currency = 'INR',
      notes,
      terms,
      metadata,
    } = req.body;

    // Calculate line items with totals
    const calculatedItems = calculateLineItemTotals(items);

    // Calculate invoice totals
    const subtotal = calculatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxAmount = calculatedItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = subtotal + taxAmount - discount;

    // Generate invoice ID and number
    const invoiceId = uuidv4();
    const invoiceNumber = await Invoice.getNextInvoiceNumber(tenantId);

    const invoice = new Invoice({
      invoiceId,
      tenantId,
      customerId,
      orderId,
      invoiceNumber,
      issueDate: issueDate || new Date(),
      dueDate,
      items: calculatedItems,
      subtotal,
      taxAmount,
      discount,
      total,
      currency,
      status: InvoiceStatus.DRAFT,
      notes,
      terms,
      paidAmount: 0,
      remainingAmount: total,
      overdueDays: 0,
      metadata,
    });

    await invoice.save();

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/invoices/:id - Update invoice
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const invoice = await Invoice.findOne({ invoiceId: id, tenantId });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Only allow updates to draft invoices
    if (invoice.status !== InvoiceStatus.DRAFT) {
      return res.status(400).json({
        success: false,
        error: 'Only draft invoices can be updated',
      });
    }

    const {
      customerId,
      dueDate,
      items,
      discount,
      currency,
      notes,
      terms,
      metadata,
    } = req.body;

    // Update fields
    if (customerId) invoice.customerId = customerId;
    if (dueDate) invoice.dueDate = dueDate;
    if (discount !== undefined) invoice.discount = discount;
    if (currency) invoice.currency = currency;
    if (notes !== undefined) invoice.notes = notes;
    if (terms !== undefined) invoice.terms = terms;
    if (metadata) invoice.metadata = { ...invoice.metadata, ...metadata };

    // Recalculate items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      invoice.items = calculateLineItemTotals(items);
    }

    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/invoices/:id/status - Update invoice status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { status, reason } = req.body;

    const invoice = await Invoice.findOne({ invoiceId: id, tenantId });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Validate status transition
    const validStatuses = Object.values(InvoiceStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        validStatuses,
      });
    }

    // Handle specific status transitions
    switch (status) {
      case InvoiceStatus.SENT:
        invoice.markAsSent();
        break;
      case InvoiceStatus.CANCELLED:
        invoice.cancel(reason);
        break;
      default:
        invoice.status = status;
    }

    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice status updated',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/invoices/:id/send - Mark invoice as sent
router.post('/:id/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const invoice = await Invoice.findOne({ invoiceId: id, tenantId });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    if (invoice.status === InvoiceStatus.DRAFT) {
      invoice.markAsSent();
      await invoice.save();
    }

    res.json({
      success: true,
      message: 'Invoice marked as sent',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/invoices/:id/payments - Add payment to invoice
router.post('/:id/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const invoice = await Invoice.findOne({ invoiceId: id, tenantId });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      return res.status(400).json({
        success: false,
        error: 'Cannot add payment to paid or cancelled invoice',
      });
    }

    const { amount, method, date, reference, notes, transactionId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid payment amount is required',
      });
    }

    // Check if payment exceeds remaining amount
    const remainingAmount = invoice.total - invoice.paidAmount;
    if (amount > remainingAmount) {
      return res.status(400).json({
        success: false,
        error: `Payment amount exceeds remaining balance of ${remainingAmount}`,
      });
    }

    // Create payment record
    const paymentId = uuidv4();
    const paymentDate = date ? new Date(date) : new Date();

    const paymentRecord = new PaymentRecord({
      paymentId,
      invoiceId: id,
      tenantId,
      customerId: invoice.customerId,
      amount,
      method: method || PaymentMethod.BANK_TRANSFER,
      date: paymentDate,
      reference,
      notes,
      transactionId,
      status: 'completed',
    });

    await paymentRecord.save();

    // Update invoice
    invoice.recordPayment({
      amount,
      method: method || PaymentMethod.BANK_TRANSFER,
      date: paymentDate,
      reference,
      transactionId,
    });

    await invoice.save();

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        invoice,
        payment: paymentRecord,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const invoice = await Invoice.findOne({ invoiceId: id, tenantId });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Only allow deletion of draft invoices
    if (invoice.status !== InvoiceStatus.DRAFT) {
      return res.status(400).json({
        success: false,
        error: 'Only draft invoices can be deleted',
      });
    }

    await Invoice.deleteOne({ invoiceId: id, tenantId });

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
