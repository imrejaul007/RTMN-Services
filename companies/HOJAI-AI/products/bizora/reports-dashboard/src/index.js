const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = 4874;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage
const reports = new PersistentMap('reports', { serviceName: 'reports-dashboard' });
const dashboards = new PersistentMap('dashboards', { serviceName: 'reports-dashboard' });
const widgets = new PersistentMap('widgets', { serviceName: 'reports-dashboard' });
const scheduledReports = new PersistentMap('scheduled-reports', { serviceName: 'reports-dashboard' });
const exports = new PersistentMap('exports', { serviceName: 'reports-dashboard' });

// Initialize with sample dashboards
const sampleDashboards = [
  {
    id: 'dash-1',
    name: 'Sales Overview',
    description: 'Real-time sales metrics and KPIs',
    owner: 'sales-team',
    widgets: ['widget-1', 'widget-2', 'widget-3'],
    filters: ['dateRange', 'region', 'product'],
    sharing: { type: 'team', users: ['user-1', 'user-2'] },
    status: 'active',
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-06-15').toISOString()
  },
  {
    id: 'dash-2',
    name: 'Customer Success Metrics',
    description: 'NPS, churn, and customer health',
    owner: 'cs-team',
    widgets: ['widget-4', 'widget-5'],
    filters: ['dateRange', 'customerSegment'],
    sharing: { type: 'department' },
    status: 'active',
    createdAt: new Date('2025-02-01').toISOString(),
    updatedAt: new Date('2025-06-10').toISOString()
  },
  {
    id: 'dash-3',
    name: 'Financial Dashboard',
    description: 'Revenue, costs, and profitability',
    owner: 'finance-team',
    widgets: ['widget-6', 'widget-7', 'widget-8'],
    filters: ['dateRange', 'costCenter'],
    sharing: { type: 'restricted' },
    status: 'active',
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-06-18').toISOString()
  }
];

sampleDashboards.forEach(d => dashboards.set(d.id, d));

// Initialize with sample widgets
const sampleWidgets = [
  { id: 'widget-1', name: 'Revenue Trend', type: 'line', dataSource: 'sales', config: { metric: 'revenue', period: 'daily' } },
  { id: 'widget-2', name: 'Deals by Stage', type: 'funnel', dataSource: 'crm', config: { stage: 'all' } },
  { id: 'widget-3', name: 'Top Products', type: 'bar', dataSource: 'sales', config: { limit: 10 } },
  { id: 'widget-4', name: 'NPS Score', type: 'gauge', dataSource: 'nps', config: { min: 0, max: 100 } },
  { id: 'widget-5', name: 'Churn Rate', type: 'line', dataSource: 'churn', config: { period: 'monthly' } },
  { id: 'widget-6', name: 'Monthly Revenue', type: 'bar', dataSource: 'finance', config: { metric: 'revenue' } },
  { id: 'widget-7', name: 'Cost Breakdown', type: 'pie', dataSource: 'finance', config: { category: 'all' } },
  { id: 'widget-8', name: 'Profit Margin', type: 'line', dataSource: 'finance', config: { period: 'quarterly' } }
];

sampleWidgets.forEach(w => widgets.set(w.id, w));

// ==================== DASHBOARDS API ====================

// Get all dashboards
app.get('/api/dashboards', (req, res) => {
  const { owner, status } = req.query;
  
  let result = Array.from(dashboards.values());
  
  if (owner) result = result.filter(d => d.owner === owner);
  if (status) result = result.filter(d => d.status === status);
  
  res.json({ dashboards: result, total: result.length });
});

// Get single dashboard
app.get('/api/dashboards/:id', (req, res) => {
  const dashboard = dashboards.get(req.params.id);
  
  if (!dashboard) {
    return res.status(404).json({ error: 'Dashboard not found' });
  }
  
  // Get widgets for this dashboard
  const dashboardWidgets = dashboard.widgets.map(wId => widgets.get(wId)).filter(Boolean);
  
  res.json({ ...dashboard, widgetDetails: dashboardWidgets });
});

// Create dashboard
app.post('/api/dashboards',requireAuth,  (req, res) => {
  const { name, description, owner, widgets: widgetIds, filters } = req.body;
  
  if (!name || !owner) {
    return res.status(400).json({ error: 'Name and owner are required' });
  }
  
  const dashboard = {
    id: `dash-${uuidv4().slice(0, 8)}`,
    name,
    description: description || '',
    owner,
    widgets: widgetIds || [],
    filters: filters || ['dateRange'],
    sharing: { type: 'private' },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  dashboards.set(dashboard.id, dashboard);
  
  res.status(201).json(dashboard);
});

// Update dashboard
app.put('/api/dashboards/:id',requireAuth,  (req, res) => {
  const dashboard = dashboards.get(req.params.id);
  
  if (!dashboard) {
    return res.status(404).json({ error: 'Dashboard not found' });
  }
  
  const fields = ['name', 'description', 'widgets', 'filters', 'sharing', 'status'];
  fields.forEach(field => {
    if (req.body[field] !== undefined) dashboard[field] = req.body[field];
  });
  
  dashboard.updatedAt = new Date().toISOString();
  
  res.json(dashboard);
});

// Delete dashboard
app.delete('/api/dashboards/:id',requireAuth,  (req, res) => {
  if (!dashboards.has(req.params.id)) {
    return res.status(404).json({ error: 'Dashboard not found' });
  }
  
  dashboards.delete(req.params.id);
  
  res.json({ message: 'Dashboard deleted successfully' });
});

// ==================== WIDGETS API ====================

// Get all widgets
app.get('/api/widgets', (req, res) => {
  const { type, dataSource } = req.query;
  
  let result = Array.from(widgets.values());
  
  if (type) result = result.filter(w => w.type === type);
  if (dataSource) result = result.filter(w => w.dataSource === dataSource);
  
  res.json({ widgets: result, total: result.length });
});

// Get widget data
app.get('/api/widgets/:id/data', (req, res) => {
  const widget = widgets.get(req.params.id);
  
  if (!widget) {
    return res.status(404).json({ error: 'Widget not found' });
  }
  
  // Generate sample data based on widget type
  const data = generateWidgetData(widget);
  
  res.json({
    widgetId: widget.id,
    name: widget.name,
    type: widget.type,
    data,
    generatedAt: new Date().toISOString()
  });
});

// Create widget
app.post('/api/widgets',requireAuth,  (req, res) => {
  const { name, type, dataSource, config } = req.body;
  
  if (!name || !type || !dataSource) {
    return res.status(400).json({ error: 'Name, type, and dataSource are required' });
  }
  
  const widget = {
    id: `widget-${uuidv4().slice(0, 8)}`,
    name,
    type,
    dataSource,
    config: config || {},
    createdAt: new Date().toISOString()
  };
  
  widgets.set(widget.id, widget);
  
  res.status(201).json(widget);
});

// ==================== REPORTS API ====================

// Get all reports
app.get('/api/reports', (req, res) => {
  const { type, owner, status } = req.query;
  
  let result = Array.from(reports.values());
  
  if (type) result = result.filter(r => r.type === type);
  if (owner) result = result.filter(r => r.owner === owner);
  if (status) result = result.filter(r => r.status === status);
  
  res.json({ reports: result, total: result.length });
});

// Generate report
app.post('/api/reports/generate',requireAuth,  (req, res) => {
  const { type, name, parameters, format } = req.body;
  
  if (!type || !name) {
    return res.status(400).json({ error: 'Type and name are required' });
  }
  
  const report = {
    id: `rpt-${uuidv4().slice(0, 8)}`,
    name,
    type,
    parameters: parameters || {},
    format: format || 'json',
    status: 'generating',
    progress: 0,
    data: null,
    error: null,
    generatedBy: 'system',
    generatedAt: null,
    createdAt: new Date().toISOString()
  };
  
  reports.set(report.id, report);
  
  // Simulate report generation
  let progress = 0;
  const interval = setInterval(() => {
    progress += 20;
    report.progress = progress;
    
    if (progress >= 100) {
      clearInterval(interval);
      report.status = 'completed';
      report.progress = 100;
      report.generatedAt = new Date().toISOString();
      report.data = generateReportData(type, parameters);
    }
  }, 200);
  
  res.status(201).json(report);
});

// Get report
app.get('/api/reports/:id', (req, res) => {
  const report = reports.get(req.params.id);
  
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  res.json(report);
});

// Download report
app.get('/api/reports/:id/download', (req, res) => {
  const report = reports.get(req.params.id);
  
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  if (report.status !== 'completed') {
    return res.status(400).json({ error: 'Report not ready for download' });
  }
  
  const { format } = req.query;
  
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${report.name}.csv"`);
    res.send(convertToCSV(report.data));
  } else {
    res.json(report.data);
  }
});

// ==================== SCHEDULED REPORTS API ====================

// Get scheduled reports
app.get('/api/scheduled', (req, res) => {
  const result = Array.from(scheduledReports.values());
  res.json({ scheduled: result, total: result.length });
});

// Schedule report
app.post('/api/scheduled',requireAuth,  (req, res) => {
  const { name, reportType, schedule, recipients, format } = req.body;
  
  if (!name || !reportType || !schedule) {
    return res.status(400).json({ error: 'Name, reportType, and schedule are required' });
  }
  
  const scheduled = {
    id: `sch-${uuidv4().slice(0, 8)}`,
    name,
    reportType,
    schedule,
    recipients: recipients || [],
    format: format || 'pdf',
    status: 'active',
    lastRun: null,
    nextRun: calculateNextRun(schedule),
    createdAt: new Date().toISOString()
  };
  
  scheduledReports.set(scheduled.id, scheduled);
  
  res.status(201).json(scheduled);
});

// ==================== EXPORT API ====================

// Export dashboard
app.post('/api/export',requireAuth,  (req, res) => {
  const { dashboardId, format } = req.body;
  
  if (!dashboardId) {
    return res.status(400).json({ error: 'Dashboard ID is required' });
  }
  
  const dashboard = dashboards.get(dashboardId);
  if (!dashboard) {
    return res.status(404).json({ error: 'Dashboard not found' });
  }
  
  const exportJob = {
    id: `exp-${uuidv4().slice(0, 8)}`,
    dashboardId,
    dashboardName: dashboard.name,
    format: format || 'pdf',
    status: 'preparing',
    downloadUrl: null,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
  
  exports.set(exportJob.id, exportJob);
  
  // Simulate export preparation
  setTimeout(() => {
    exportJob.status = 'ready';
    exportJob.downloadUrl = `/api/export/${exportJob.id}/file`;
  }, 1000);
  
  res.status(201).json(exportJob);
});

// Get export status
app.get('/api/export/:id', (req, res) => {
  const exportJob = exports.get(req.params.id);
  
  if (!exportJob) {
    return res.status(404).json({ error: 'Export not found' });
  }
  
  res.json(exportJob);
});

// ==================== HELPER FUNCTIONS ====================

function generateWidgetData(widget) {
  const now = new Date();
  const data = [];
  
  switch (widget.type) {
    case 'line':
      for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toISOString().split('T')[0],
          value: Math.round(Math.random() * 10000 + 5000)
        });
      }
      break;
    case 'bar':
      for (let i = 12; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        data.push({
          label: date.toLocaleString('default', { month: 'short' }),
          value: Math.round(Math.random() * 50000 + 10000)
        });
      }
      break;
    case 'pie':
      return [
        { label: 'Category A', value: 35 },
        { label: 'Category B', value: 28 },
        { label: 'Category C', value: 22 },
        { label: 'Category D', value: 15 }
      ];
    case 'gauge':
      return { value: Math.round(Math.random() * 30 + 60), min: 0, max: 100 };
    case 'funnel':
      return [
        { stage: 'Lead', count: 1000 },
        { stage: 'Qualified', count: 500 },
        { stage: 'Proposal', count: 200 },
        { stage: 'Negotiation', count: 80 },
        { stage: 'Closed', count: 40 }
      ];
    default:
      return [{ label: 'Sample', value: Math.round(Math.random() * 100) }];
  }
  
  return data;
}

function generateReportData(type, parameters) {
  const data = {
    summary: {
      generatedAt: new Date().toISOString(),
      period: parameters?.dateRange || 'Last 30 days'
    },
    metrics: {}
  };
  
  // Generate metrics based on report type
  const metricGenerators = {
    sales: () => ({ revenue: Math.round(Math.random() * 100000), deals: Math.round(Math.random() * 500), conversionRate: (Math.random() * 20 + 10).toFixed(1) }),
    finance: () => ({ revenue: Math.round(Math.random() * 500000), costs: Math.round(Math.random() * 300000), profit: Math.round(Math.random() * 200000) }),
    customer: () => ({ nps: Math.round(Math.random() * 30 + 60), churnRate: (Math.random() * 5 + 1).toFixed(1), satisfaction: (Math.random() * 2 + 3.5).toFixed(1) })
  };
  
  data.metrics = metricGenerators[type] ? metricGenerators[type]() : { value: Math.round(Math.random() * 1000) };
  
  return data;
}

function calculateNextRun(schedule) {
  const now = new Date();
  
  if (schedule.frequency === 'daily') {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(schedule.hour || 9, 0, 0, 0);
    return next.toISOString();
  }
  
  if (schedule.frequency === 'weekly') {
    const next = new Date(now);
    next.setDate(next.getDate() + (7 - next.getDay() + (schedule.dayOfWeek || 1)) % 7);
    next.setHours(schedule.hour || 9, 0, 0, 0);
    return next.toISOString();
  }
  
  if (schedule.frequency === 'monthly') {
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    next.setDate(schedule.dayOfMonth || 1);
    next.setHours(schedule.hour || 9, 0, 0, 0);
    return next.toISOString();
  }
  
  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

function convertToCSV(data) {
  if (!data) return '';
  
  const rows = [];
  
  if (data.metrics) {
    rows.push('Metric,Value');
    Object.entries(data.metrics).forEach(([key, value]) => {
      rows.push(`${key},${value}`);
    });
  }
  
  return rows.join('\n');
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'reports-dashboard',
    port: PORT,
    dashboards: dashboards.size,
    widgets: widgets.size,
    reports: reports.size
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log('📊 Reports Dashboard Service running on port ' + PORT);
  console.log('   Dashboards: ' + dashboards.size);
  console.log('   Widgets: ' + widgets.size);
});
installGracefulShutdown(server);
