import { Router, Request, Response } from 'express';
import { Customer, ICustomer } from '../models/Customer';
import { asyncHandler } from '../utils/helpers';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/customers
 * List all customers with pagination
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    Customer.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-behaviors'),
    Customer.countDocuments({})
  ]);

  res.json({
    success: true,
    data: customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

/**
 * GET /api/customers/search
 * Search customers by various criteria
 */
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { q, email, phone, status, tier, tag } = req.query;

  const query: Record<string, unknown> = {};

  if (q) {
    query.$or = [
      { firstName: { $regex: q, $options: 'i' } },
      { lastName: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { company: { $regex: q, $options: 'i' } },
      { customerId: { $regex: q, $options: 'i' } }
    ];
  }

  if (email) query.email = email;
  if (phone) query.phone = phone;
  if (status) query.status = status;
  if (tier) query.tier = tier;
  if (tag) query.tags = tag;

  const customers = await Customer.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .select('-behaviors');

  res.json({
    success: true,
    data: customers,
    count: customers.length
  });
}));

/**
 * GET /api/customers/:id
 * Get customer by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findByCustomerId(req.params.id)
    .select('-behaviors');

  if (!customer) {
    res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
    return;
  }

  res.json({
    success: true,
    data: customer
  });
}));

/**
 * POST /api/customers
 * Create a new customer
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    company,
    title,
    industry,
    type,
    tier,
    source,
    identities,
    tags,
    metadata
  } = req.body;

  // Check if customer with email already exists
  if (email) {
    const existing = await Customer.findByEmail(email);
    if (existing) {
      res.status(409).json({
        success: false,
        error: 'Customer with this email already exists',
        existingId: existing.customerId
      });
      return;
    }
  }

  const customer = new Customer({
    firstName,
    lastName,
    email: email?.toLowerCase(),
    phone: phone?.replace(/\D/g, ''),
    company,
    title,
    industry,
    type: type || 'individual',
    tier: tier || 'standard',
    source: source || 'api',
    identities: identities || [],
    tags: tags || [],
    metadata: metadata || {},
    status: 'active'
  });

  await customer.save();

  logger.info('Customer created', { customerId: customer.customerId });

  res.status(201).json({
    success: true,
    data: customer
  });
}));

/**
 * PUT /api/customers/:id
 * Update customer
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findByCustomerId(req.params.id);

  if (!customer) {
    res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
    return;
  }

  const allowedUpdates = [
    'firstName', 'lastName', 'email', 'phone', 'company',
    'title', 'industry', 'type', 'tier', 'status',
    'tags', 'metadata'
  ];

  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      (customer as Record<string, unknown>)[key] = req.body[key];
    }
  }

  await customer.save();

  logger.info('Customer updated', { customerId: customer.customerId });

  res.json({
    success: true,
    data: customer
  });
}));

/**
 * DELETE /api/customers/:id
 * Delete customer (soft delete by changing status)
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findByCustomerId(req.params.id);

  if (!customer) {
    res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
    return;
  }

  customer.status = 'blocked';
  await customer.save();

  logger.info('Customer blocked', { customerId: customer.customerId });

  res.json({
    success: true,
    message: 'Customer blocked successfully'
  });
}));

/**
 * POST /api/customers/:id/identities
 * Add identity to customer
 */
router.post('/:id/identities', asyncHandler(async (req: Request, res: Response) => {
  const { type, value, verified } = req.body;

  const customer = await Customer.findByCustomerId(req.params.id);

  if (!customer) {
    res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
    return;
  }

  // Check if identity already exists
  const existingIdentity = customer.identities.find(
    i => i.type === type && i.value === value.toLowerCase()
  );

  if (existingIdentity) {
    res.status(409).json({
      success: false,
      error: 'Identity already exists'
    });
    return;
  }

  customer.identities.push({
    type,
    value: value.toLowerCase(),
    verified: verified || false,
    verifiedAt: verified ? new Date() : undefined,
    addedAt: new Date()
  });

  await customer.save();

  res.status(201).json({
    success: true,
    data: customer.identities
  });
}));

/**
 * POST /api/customers/:id/behaviors
 * Add behavior event to customer
 */
router.post('/:id/behaviors', asyncHandler(async (req: Request, res: Response) => {
  const { event, properties, source, sessionId } = req.body;

  const customer = await Customer.findByCustomerId(req.params.id);

  if (!customer) {
    res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
    return;
  }

  const behavior = {
    event,
    properties: properties || {},
    timestamp: new Date(),
    source,
    sessionId
  };

  customer.behaviors.push(behavior);
  customer.lastActivityAt = new Date();

  // Update metrics based on behavior
  if (event === 'order_completed') {
    const orderValue = (properties?.total as number) || 0;
    customer.metrics.totalOrders += 1;
    customer.metrics.totalRevenue += orderValue;
    customer.metrics.averageOrderValue = customer.metrics.totalRevenue / customer.metrics.totalOrders;

    if (!customer.metrics.firstOrderDate) {
      customer.metrics.firstOrderDate = new Date();
    }
    customer.metrics.lastOrderDate = new Date();
  }

  // Recalculate engagement
  await customer.calculateMetrics();

  await customer.save();

  res.status(201).json({
    success: true,
    data: behavior
  });
}));

/**
 * POST /api/customers/:id/preferences
 * Set customer preference
 */
router.post('/:id/preferences', asyncHandler(async (req: Request, res: Response) => {
  const { key, value, source } = req.body;

  const customer = await Customer.findByCustomerId(req.params.id);

  if (!customer) {
    res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
    return;
  }

  const existingPref = customer.preferences.find(p => p.key === key);

  if (existingPref) {
    existingPref.value = value;
    existingPref.updatedAt = new Date();
  } else {
    customer.preferences.push({
      key,
      value,
      source,
      updatedAt: new Date()
    });
  }

  await customer.save();

  res.json({
    success: true,
    data: customer.preferences
  });
}));

/**
 * POST /api/customers/:id/addresses
 * Add address to customer
 */
router.post('/:id/addresses', asyncHandler(async (req: Request, res: Response) => {
  const address = req.body;

  const customer = await Customer.findByCustomerId(req.params.id);

  if (!customer) {
    res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
    return;
  }

  customer.addresses.push({
    ...address,
    type: address.type || 'home'
  });

  await customer.save();

  res.status(201).json({
    success: true,
    data: customer.addresses
  });
}));

/**
 * GET /api/customers/:id/360
 * Get Customer 360 view
 */
router.get('/:id/360', asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findByCustomerId(req.params.id);

  if (!customer) {
    res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
    return;
  }

  res.json({
    success: true,
    data: customer.to360()
  });
}));

/**
 * GET /api/customers/:id/behaviors
 * Get customer behavior history
 */
router.get('/:id/behaviors', asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findByCustomerId(req.params.id);

  if (!customer) {
    res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
    return;
  }

  const limit = parseInt(req.query.limit as string) || 50;
  const behaviors = customer.behaviors
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);

  res.json({
    success: true,
    data: behaviors
  });
}));

export default router;
