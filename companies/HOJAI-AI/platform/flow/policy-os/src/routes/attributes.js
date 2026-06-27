/**
 * PolicyOS — ABAC v2 Attribute Discovery (Phase 2.1)
 *
 * Endpoints:
 *  - GET  /api/attributes              — list all attribute domains
 *  - GET  /api/attributes/:domain      — list attributes for a domain
 *  - GET  /api/attributes/values/:path — list known values for an attribute path
 */

export function registerAttributeRoutes(app, { customAuth }) {
  // ── Attribute Registry ─────────────────────────────────────────────────────

  const ATTRIBUTE_REGISTRY = {
    user: [
      { path: 'user.id', type: 'string', required: true, description: 'Unique user identifier', sources: ['corpid'] },
      { path: 'user.email', type: 'string', required: true, description: 'User email address', sources: ['corpid'] },
      { path: 'user.department', type: 'string', required: false, allowedValues: ['IT', 'Operations', 'Finance', 'Sales', 'HR', 'Marketing', 'Legal', 'Admin'], description: 'User department', sources: ['workforce-os'] },
      { path: 'user.role', type: 'string', required: true, description: 'User primary role', sources: ['rbac'] },
      { path: 'user.trustScore', type: 'number', required: false, description: 'Trust score (0-100)', sources: ['reputation-os'] },
      { path: 'user.attributes.vip', type: 'boolean', required: false, description: 'VIP flag', sources: ['crm'] },
      { path: 'user.attributes.location', type: 'string', required: false, description: 'User location', sources: ['crm'] },
    ],
    resource: [
      { path: 'resource.type', type: 'string', required: true, description: 'Resource type (document, payment, order, etc.)', sources: ['industry-os'] },
      { path: 'resource.id', type: 'string', required: true, description: 'Resource unique identifier', sources: ['industry-os'] },
      { path: 'resource.owner', type: 'string', required: false, description: 'Resource owner ID', sources: ['industry-os'] },
      { path: 'resource.sensitivity', type: 'string', required: false, allowedValues: ['public', 'internal', 'confidential', 'restricted'], description: 'Data sensitivity level', sources: ['data-os'] },
      { path: 'resource.classification', type: 'string', required: false, allowedValues: ['PII', 'PHI', 'PCI', 'public'], description: 'Data classification', sources: ['data-os'] },
    ],
    action: [
      { path: 'action.type', type: 'string', required: true, description: 'Action type (read, write, delete, execute, approve)', sources: ['policy-os'] },
      { path: 'action.method', type: 'string', required: false, description: 'HTTP method or operation name', sources: ['policy-os'] },
      { path: 'action.risk', type: 'string', required: false, allowedValues: ['low', 'medium', 'high', 'critical'], description: 'Inherent risk of the action', sources: ['policy-os'] },
    ],
    environment: [
      { path: 'environment.ip', type: 'string', required: false, description: 'Source IP address', sources: ['gateway'] },
      { path: 'environment.location', type: 'string', required: false, description: 'Geographic location', sources: ['gateway'] },
      { path: 'environment.time.hour', type: 'number', required: false, description: 'Hour of day (0-23)', sources: ['gateway'] },
      { path: 'environment.time.dayOfWeek', type: 'string', required: false, allowedValues: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], description: 'Day of week', sources: ['gateway'] },
      { path: 'environment.network.internal', type: 'boolean', required: false, description: 'True if request is from internal network', sources: ['gateway'] },
      { path: 'environment.context.trustedDevice', type: 'boolean', required: false, description: 'True if request is from a registered trusted device', sources: ['device-os'] },
    ],
    context: [
      { path: 'context.amount', type: 'number', required: false, description: 'Monetary amount involved in the transaction', sources: ['commerce-os'] },
      { path: 'context.currency', type: 'string', required: false, allowedValues: ['USD', 'INR', 'EUR', 'GBP', 'JPY'], description: 'Currency code', sources: ['commerce-os'] },
      { path: 'context.department', type: 'string', required: false, description: 'Department context for the operation', sources: ['workforce-os'] },
      { path: 'context.environment', type: 'string', required: false, allowedValues: ['production', 'staging', 'development'], description: 'Deployment environment', sources: ['cloud-os'] },
      { path: 'context.session.trusted', type: 'boolean', required: false, description: 'True if session is MFA-verified', sources: ['auth-os'] },
      { path: 'context.user.trustScore', type: 'number', required: false, description: 'User trust score at evaluation time', sources: ['reputation-os'] },
    ],
  };

  // ── Known values cache ─────────────────────────────────────────────────────

  const KNOWN_VALUES = {
    'user.department': ['IT', 'Operations', 'Finance', 'Sales', 'HR', 'Marketing', 'Legal', 'Admin'],
    'resource.sensitivity': ['public', 'internal', 'confidential', 'restricted'],
    'resource.classification': ['PII', 'PHI', 'PCI', 'public'],
    'action.type': ['read', 'write', 'delete', 'execute', 'approve', 'delegate', 'export', 'import'],
    'action.risk': ['low', 'medium', 'high', 'critical'],
    'environment.time.dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    'context.currency': ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'],
    'context.environment': ['production', 'staging', 'development', 'test'],
  };

  // ── Endpoints ─────────────────────────────────────────────────────────────

  // GET /api/attributes — list all domains
  app.get('/api/attributes', (req, res) => {
    const domains = Object.entries(ATTRIBUTE_REGISTRY).map(([name, attrs]) => ({
      name,
      count: attrs.length,
      attributes: attrs.map(({ path, type, required, description }) => ({ path, type, required, description })),
    }));
    res.json({ count: domains.length, domains });
  });

  // GET /api/attributes/:domain — list attributes for a specific domain
  app.get('/api/attributes/:domain', (req, res) => {
    const attrs = ATTRIBUTE_REGISTRY[req.params.domain];
    if (!attrs) {
      return res.status(404).json({ error: `Domain '${req.params.domain}' not found`, available: Object.keys(ATTRIBUTE_REGISTRY) });
    }
    res.json({ domain: req.params.domain, count: attrs.length, attributes: attrs });
  });

  // GET /api/attributes/values/:path — list known values for an attribute
  app.get('/api/attributes/values/:path', (req, res) => {
    const path = req.params.path;
    const values = KNOWN_VALUES[path];
    if (!values) {
      // Attribute exists but no predefined values
      const attr = Object.values(ATTRIBUTE_REGISTRY).flat().find((a) => a.path === path);
      if (!attr) {
        return res.status(404).json({ error: `Attribute path '${path}' not found in registry` });
      }
      return res.json({
        path,
        type: attr.type,
        allowedValues: attr.allowedValues || null,
        hasPredefinedValues: false,
        note: 'This attribute has no predefined enumeration',
      });
    }
    res.json({ path, hasPredefinedValues: true, values });
  });

  // GET /api/attributes/lookup/:path — resolve value at runtime
  app.get('/api/attributes/lookup/:path', customAuth, (req, res) => {
    const path = req.params.path;
    const attr = Object.values(ATTRIBUTE_REGISTRY).flat().find((a) => a.path === path);
    if (!attr) {
      return res.status(404).json({ error: `Attribute path '${path}' not found` });
    }
    res.json({
      path,
      type: attr.type,
      required: attr.required,
      allowedValues: attr.allowedValues || null,
      description: attr.description,
      sources: attr.sources,
    });
  });
}
