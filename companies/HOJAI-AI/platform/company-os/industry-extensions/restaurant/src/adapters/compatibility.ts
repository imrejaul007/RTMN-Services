/**
 * Restaurant Extension - Compatibility Adapter
 *
 * Routes legacy routes to DepartmentOS while keeping vertical routes local.
 * This ensures backward compatibility during migration.
 */

import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

// ============================================
// TENANT CONTEXT (Shared with other packs)
// ============================================

interface TenantContext {
  tenantId: string;
  companyId: string;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

function extractTenantId(req: Request): string | null {
  const headerTenant = req.headers['x-tenant-id'] as string;
  if (headerTenant) return headerTenant;

  if (req.user && typeof req.user === 'object') {
    const user = req.user as { tenantId?: string };
    return user.tenantId || null;
  }

  return null;
}

function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  const tenantId = extractTenantId(req);

  if (!tenantId) {
    res.status(401).json({ error: 'Missing X-Tenant-ID header' });
    return;
  }

  req.tenant = {
    tenantId,
    companyId: (req.headers['x-company-id'] as string) || tenantId,
  };

  next();
}

// ============================================
// VERTICAL ROUTES (Local - Restaurant-specific)
// ============================================

// Menu routes
router.get('/api/menu', tenantMiddleware, (_req: Request, res: Response) => {
  // Imported from menu service
  res.json({ message: 'Menu endpoint - routes to menuService' });
});

router.post('/api/menu', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({ message: 'Create menu endpoint' });
});

// Kitchen routes
router.get('/api/kitchen', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({ message: 'Kitchen display endpoint' });
});

router.patch('/api/kitchen/:orderId', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({ message: 'Update kitchen ticket' });
});

// POS routes
router.get('/api/pos/tables', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({ message: 'List POS tables' });
});

router.post('/api/pos/tables/:id/order', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({ message: 'Create table order' });
});

// Orders routes
router.get('/api/orders', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({ message: 'List orders' });
});

router.post('/api/orders', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({ message: 'Create order' });
});

router.patch('/api/orders/:id/status', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({ message: 'Update order status' });
});

// Reservations routes
router.get('/api/reservations', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({ message: 'List reservations' });
});

router.post('/api/reservations', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({ message: 'Create reservation' });
});

router.get('/api/reservations/waitlist', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({ message: 'List waitlist' });
});

// Tables routes
router.get('/api/tables', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({ message: 'List tables' });
});

// ============================================
// UNIVERSAL ROUTES (Delegated to DepartmentOS)
// These are placeholders - in production, these would proxy to DepartmentOS
// ============================================

// CRM/Customer routes → Sales Department
router.get('/api/customers', tenantMiddleware, (_req: Request, res: Response) => {
  // In production: proxy to Sales Department Pack
  // req.httpRequest('GET', `${SALES_DEPT_URL}/customers`, req.tenant)
  res.json({
    _delegated: true,
    _to: 'sales-department-pack',
    _originalPath: '/api/customers',
    message: 'This route is delegated to Sales Department. Update your code to use /api/sales/customers'
  });
});

router.post('/api/customers', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({
    _delegated: true,
    _to: 'sales-department-pack',
    _originalPath: '/api/customers',
    message: 'POST /api/customers is deprecated. Use /api/sales/customers'
  });
});

// CRM Contacts → Sales Department
router.get('/api/crm/contacts', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({
    _delegated: true,
    _to: 'sales-department-pack',
    _originalPath: '/api/crm/contacts',
    message: 'CRM routes now live in Sales Department. Use /api/sales/contacts'
  });
});

// Finance routes → Finance Department
router.get('/api/finance/accounting', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({
    _delegated: true,
    _to: 'finance-department-pack',
    _originalPath: '/api/finance/accounting',
    message: 'Finance routes now live in Finance Department. Use /api/finance/accounting'
  });
});

router.get('/api/finance/wallet', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({
    _delegated: true,
    _to: 'finance-department-pack',
    _originalPath: '/api/finance/wallet',
    message: 'Wallet routes now live in Finance Department'
  });
});

// Marketing/Ads routes → Marketing Department
router.get('/api/ads/campaigns', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({
    _delegated: true,
    _to: 'marketing-department-pack',
    _originalPath: '/api/ads/campaigns',
    message: 'Ad routes now live in Marketing Department. Use /api/marketing/ads'
  });
});

// Loyalty routes → Sales Department
router.get('/api/loyalty/points', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({
    _delegated: true,
    _to: 'sales-department-pack',
    _originalPath: '/api/loyalty/points',
    message: 'Loyalty routes now live in Sales Department. Use /api/sales/loyalty'
  });
});

// HR/Staff routes → HR Department
router.get('/api/hr/staff', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({
    _delegated: true,
    _to: 'hr-department-pack',
    _originalPath: '/api/hr/staff',
    message: 'Staff routes now live in HR Department. Use /api/hr/staff'
  });
});

// Analytics routes → Analytics Department
router.get('/api/analytics', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({
    _delegated: true,
    _to: 'analytics-department-pack',
    _originalPath: '/api/analytics',
    message: 'Analytics routes now live in Analytics Department'
  });
});

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Get migration status for a tenant
 */
router.get('/__migration/status', tenantMiddleware, (_req: Request, res: Response) => {
  const { tenantId } = req.tenant!;

  res.json({
    tenantId,
    migratedAt: new Date().toISOString(),
    routes: {
      vertical: {
        local: [
          '/api/menu',
          '/api/kitchen',
          '/api/pos/*',
          '/api/orders',
          '/api/reservations',
          '/api/tables',
        ],
        count: 6,
      },
      universal: {
        delegated: [
          '/api/customers → /api/sales/customers',
          '/api/crm/* → /api/sales/crm/*',
          '/api/finance/* → /api/finance/*',
          '/api/ads/* → /api/marketing/ads/*',
          '/api/loyalty/* → /api/sales/loyalty/*',
          '/api/hr/* → /api/hr/*',
        ],
        count: 6,
      },
    },
    backwardCompatible: true,
    recommendation: 'Update client code to use new paths. Legacy paths will work until v2.0.',
  });
});

/**
 * Get list of deprecated routes
 */
router.get('/__migration/deprecations', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({
    deprecatedRoutes: [
      { old: '/api/customers', new: '/api/sales/customers', deprecatedAt: '2026-06-29' },
      { old: '/api/crm/contacts', new: '/api/sales/contacts', deprecatedAt: '2026-06-29' },
      { old: '/api/finance/accounting', new: '/api/finance/accounting', deprecatedAt: '2026-06-29', note: 'Same path, different handler' },
      { old: '/api/ads/*', new: '/api/marketing/ads/*', deprecatedAt: '2026-06-29' },
      { old: '/api/loyalty/*', new: '/api/sales/loyalty/*', deprecatedAt: '2026-06-29' },
    ],
    sunsetDate: '2026-12-31',
    migrationGuide: '/__migration/guide',
  });
});

/**
 * Migration guide
 */
router.get('/__migration/guide', tenantMiddleware, (_req: Request, res: Response) => {
  res.json({
    title: 'Restaurant Extension Migration Guide',
    version: '1.0.0',
    steps: [
      {
        step: 1,
        action: 'Update customer routes',
        from: '/api/customers',
        to: '/api/sales/customers',
      },
      {
        step: 2,
        action: 'Update CRM routes',
        from: '/api/crm/*',
        to: '/api/sales/crm/*',
      },
      {
        step: 3,
        action: 'Update ad routes',
        from: '/api/ads/*',
        to: '/api/marketing/ads/*',
      },
      {
        step: 4,
        action: 'Update loyalty routes',
        from: '/api/loyalty/*',
        to: '/api/sales/loyalty/*',
      },
    ],
    verticalRoutesUnchanged: [
      '/api/menu - Menu management (KEEP AS IS)',
      '/api/kitchen - Kitchen display (KEEP AS IS)',
      '/api/pos/* - POS operations (KEEP AS IS)',
      '/api/orders - Order management (KEEP AS IS)',
      '/api/reservations - Reservations (KEEP AS IS)',
    ],
    rollback: 'Contact support if migration fails. Legacy routes work until v2.0.',
  });
});

export default router;
