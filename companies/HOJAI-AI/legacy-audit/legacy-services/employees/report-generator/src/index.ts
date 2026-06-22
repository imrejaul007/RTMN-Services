/**
 * Report Generator
 * Port: 4834
 *
 * Role: Auto-generate business reports, dashboards, analytics summaries
 * Persona: Data synthesizer, clear communicator, visual storyteller, insight discoverer
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4834;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface Report {
  id: string;
  name: string;
  type: 'executive' | 'operational' | 'financial' | 'sales' | 'marketing' | 'custom';
  description: string;
  schedule?: { frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'; nextRun: Date };
  sections: ReportSection[];
  createdAt: Date;
  lastGenerated?: Date;
}

interface ReportSection {
  id: string;
  title: string;
  type: 'metrics' | 'chart' | 'table' | 'narrative' | 'kpis';
  data: any;
  visualization?: 'bar' | 'line' | 'pie' | 'table' | 'scorecard';
}

interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  refreshInterval: number;
  lastRefresh?: Date;
}

interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'list' | 'gauge';
  data: any;
  size: 'small' | 'medium' | 'large';
}

// Report templates
const reportTemplates: Record<string, Report> = {
  'executive-summary': {
    id: 'template-1',
    name: 'Executive Summary',
    type: 'executive',
    description: 'High-level overview of company performance',
    sections: [],
    createdAt: new Date()
  },
  'sales-performance': {
    id: 'template-2',
    name: 'Sales Performance Report',
    type: 'sales',
    description: 'Detailed sales metrics and pipeline analysis',
    sections: [],
    createdAt: new Date()
  },
  'financial-summary': {
    id: 'template-3',
    name: 'Financial Summary',
    type: 'financial',
    description: 'Revenue, costs, and profitability overview',
    sections: [],
    createdAt: new Date()
  },
  'operations-dashboard': {
    id: 'template-4',
    name: 'Operations Dashboard',
    type: 'operational',
    description: 'Operational metrics and KPIs',
    sections: [],
    createdAt: new Date()
  }
};

// Dashboard templates
const dashboardTemplates: Record<string, Dashboard> = {
  'sales-dashboard': {
    id: 'dash-1',
    name: 'Sales Dashboard',
    widgets: [
      { id: 'w1', title: 'Revenue MTD', type: 'metric', data: { value: 4500000, change: 15 }, size: 'small' },
      { id: 'w2', title: 'Pipeline Value', type: 'metric', data: { value: 25000000, change: 8 }, size: 'small' },
      { id: 'w3', title: 'Win Rate', type: 'gauge', data: { value: 35, max: 100 }, size: 'small' },
      { id: 'w4', title: 'Deals Closing This Week', type: 'list', data: ['Deal A', 'Deal B', 'Deal C'], size: 'medium' },
      { id: 'w5', title: 'Revenue Trend', type: 'chart', data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'], values: [3.2, 3.5, 3.8, 4.1, 4.5] }, size: 'large' }
    ],
    refreshInterval: 300
  },
  'ops-dashboard': {
    id: 'dash-2',
    name: 'Operations Dashboard',
    widgets: [
      { id: 'w1', title: 'Tickets Open', type: 'metric', data: { value: 125, change: -5 }, size: 'small' },
      { id: 'w2', title: 'Avg Response Time', type: 'metric', data: { value: '2.5h', change: -12 }, size: 'small' },
      { id: 'w3', title: 'CSAT Score', type: 'gauge', data: { value: 87, max: 100 }, size: 'small' },
      { id: 'w4', title: 'Ticket Volume Trend', type: 'chart', data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], values: [45, 52, 38, 41, 35] }, size: 'large' }
    ],
    refreshInterval: 60
  }
};

// Generate report
function generateReport(templateId: string, params?: any): Report {
  const template = reportTemplates[templateId];

  if (!template) {
    return {
      id: `report-${Date.now()}`,
      name: 'Custom Report',
      type: 'custom',
      description: 'Custom generated report',
      sections: [],
      createdAt: new Date(),
      lastGenerated: new Date()
    };
  }

  const sections: ReportSection[] = [];

  if (template.type === 'executive' || template.type === 'sales') {
    sections.push({
      id: 's1',
      title: 'Key Metrics',
      type: 'kpis',
      data: {
        metrics: [
          { name: 'Revenue', value: '₹45,00,000', change: 15, trend: 'up' },
          { name: 'Customers', value: '1,250', change: 8, trend: 'up' },
          { name: 'Avg Deal Size', value: '₹2,50,000', change: -3, trend: 'down' },
          { name: 'Win Rate', value: '35%', change: 5, trend: 'up' }
        ]
      },
      visualization: 'scorecard'
    });

    sections.push({
      id: 's2',
      title: 'Performance Trend',
      type: 'chart',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
        datasets: [
          { name: 'Revenue', values: [8, 9, 10, 11, 12] },
          { name: 'Target', values: [10, 10, 10, 10, 10] }
        ]
      },
      visualization: 'line'
    });
  }

  if (template.type === 'financial') {
    sections.push({
      id: 's1',
      title: 'Financial Highlights',
      type: 'metrics',
      data: {
        revenue: { current: 4500000, previous: 3900000, change: 15 },
        costs: { current: 2800000, previous: 2500000, change: 12 },
        profit: { current: 1700000, previous: 1400000, change: 21 },
        margin: { current: 37.8, previous: 35.9, change: 1.9 }
      }
    });

    sections.push({
      id: 's2',
      title: 'Revenue Breakdown',
      type: 'chart',
      data: {
        labels: ['Product A', 'Product B', 'Product C', 'Services'],
        values: [40, 30, 20, 10]
      },
      visualization: 'pie'
    });
  }

  return {
    ...template,
    id: `report-${Date.now()}`,
    sections,
    lastGenerated: new Date()
  };
}

// Create report
app.post('/api/reports', (req: Request, res: Response) => {
  const { templateId, name, description, schedule, params } = req.body;

  const report = generateReport(templateId, params);
  if (name) report.name = name;
  if (description) report.description = description;
  if (schedule) {
    report.schedule = {
      frequency: schedule.frequency,
      nextRun: new Date(Date.now() + (schedule.frequency === 'daily' ? 24 : schedule.frequency === 'weekly' ? 7 : 30) * 60 * 60 * 1000)
    };
  }

  res.json({
    report,
    exportOptions: {
      formats: ['PDF', 'Excel', 'CSV', 'PowerPoint'],
      delivery: ['Download', 'Email', 'Schedule']
    }
  });
});

// Get report templates
app.get('/api/templates', (req: Request, res: Response) => {
  const { type } = req.query;

  let templates = Object.values(reportTemplates);
  if (type) {
    templates = templates.filter(t => t.type === type);
  }

  res.json({
    templates,
    categories: {
      executive: templates.filter(t => t.type === 'executive').length,
      sales: templates.filter(t => t.type === 'sales').length,
      financial: templates.filter(t => t.type === 'financial').length,
      operational: templates.filter(t => t.type === 'operational').length
    }
  });
});

// Get dashboard templates
app.get('/api/dashboards/templates', (req: Request, res: Response) => {
  res.json({
    templates: Object.values(dashboardTemplates)
  });
});

// Create custom dashboard
app.post('/api/dashboards', (req: Request, res: Response) => {
  const { name, widgets, refreshInterval } = req.body;

  const dashboard: Dashboard = {
    id: `dash-${Date.now()}`,
    name: name || 'Custom Dashboard',
    widgets: widgets || [],
    refreshInterval: refreshInterval || 300,
    lastRefresh: new Date()
  };

  res.json({
    dashboard,
    shareOptions: {
      shareable: true,
      embedCode: `<iframe src="/embed/dashboard/${dashboard.id}" width="100%" height="600"></iframe>`,
      publicUrl: `https://app.company.com/dashboard/${dashboard.id}`
    }
  });
});

// Get dashboard
app.get('/api/dashboards/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const dashboard = dashboardTemplates[id] || dashboardTemplates['sales-dashboard'];
  dashboard.lastRefresh = new Date();

  res.json({
    dashboard,
    refreshStatus: {
      lastRefresh: dashboard.lastRefresh,
      nextRefresh: new Date(Date.now() + dashboard.refreshInterval * 1000),
      status: 'healthy'
    }
  });
});

// Generate real-time metrics
app.get('/api/metrics/realtime', (req: Request, res: Response) => {
  res.json({
    timestamp: new Date(),
    metrics: {
      revenue: { value: 4589234, target: 5000000, progress: 91.8 },
      customers: { value: 1258, new: 45, churned: 12 },
      pipeline: { value: 24500000, stage: 'Q2', forecast: 28000000 },
      support: { open: 125, resolved: 89, avgTime: '2.3h' },
      marketing: { leads: 1850, mqls: 420, conversion: 22.7 }
    },
    alerts: [
      { type: 'warning', message: 'Support response time above target', metric: 'response_time' },
      { type: 'success', message: 'Revenue 15% ahead of last month', metric: 'revenue' }
    ]
  });
});

// Generate monthly report
app.get('/api/reports/monthly', (req: Request, res: Response) => {
  const report = {
    id: `monthly-${Date.now()}`,
    name: 'Monthly Performance Report',
    period: 'May 2026',
    generatedAt: new Date(),
    sections: [
      {
        title: 'Executive Summary',
        type: 'narrative',
        content: `May 2026 showed strong performance across all key metrics. Revenue grew 15% month-over-month to ₹45.9 lakhs, exceeding our target of ₹45 lakhs. Customer acquisition remained healthy with 45 new customers, while churn stayed low at under 1%. The sales pipeline is robust at ₹2.45 crores, positioning us well for Q2 targets.`
      },
      {
        title: 'Key Highlights',
        type: 'metrics',
        data: {
          highlights: [
            { metric: 'Revenue', value: '₹45.9L', change: '+15%', achievement: 102 },
            { metric: 'New Customers', value: '45', change: '+12%', achievement: 90 },
            { metric: 'Avg Deal Size', value: '₹2.5L', change: '+3%', achievement: 100 },
            { metric: 'Win Rate', value: '35%', change: '+5pp', achievement: 88 },
            { metric: 'NPS Score', value: '62', change: '+8', achievement: 95 }
          ]
        }
      },
      {
        title: 'Sales Funnel',
        type: 'chart',
        data: {
          stages: [
            { name: 'Leads', count: 1850 },
            { name: 'MQLs', count: 420 },
            { name: 'SQLs', count: 180 },
            { name: 'Opportunities', count: 85 },
            { name: 'Closed Won', count: 28 }
          ],
          conversionRates: [22.7, 42.9, 47.2, 32.9]
        },
        visualization: 'bar'
      },
      {
        title: 'Revenue by Product',
        type: 'chart',
        data: {
          segments: [
            { name: 'Product A', value: 1850000, percentage: 40 },
            { name: 'Product B', value: 1377000, percentage: 30 },
            { name: 'Product C', value: 918000, percentage: 20 },
            { name: 'Services', value: 459000, percentage: 10 }
          ]
        },
        visualization: 'pie'
      },
      {
        title: 'Customer Metrics',
        type: 'table',
        data: {
          headers: ['Metric', 'May', 'April', 'Change'],
          rows: [
            ['Total Customers', '1,258', '1,213', '+3.7%'],
            ['Active Users', '1,125', '1,082', '+4.0%'],
            ['MRR', '₹12.5L', '₹11.8L', '+5.9%'],
            ['Churn Rate', '0.8%', '0.9%', '-0.1pp'],
            ['NPS', '62', '54', '+8']
          ]
        }
      },
      {
        title: 'Team Performance',
        type: 'table',
        data: {
          headers: ['Team Member', 'Revenue', 'Target', 'Achievement'],
          rows: [
            ['Priya Sharma', '₹8.5L', '₹8L', '106%'],
            ['Raj Kumar', '₹7.2L', '₹8L', '90%'],
            ['Amit Patel', '₹9.1L', '₹8L', '114%'],
            ['Sunita Verma', '₹6.8L', '₹7L', '97%']
          ]
        }
      }
    ],
    outlook: {
      summary: 'Q2 is on track. Current trajectory suggests we will exceed quarterly targets.',
      risks: ['Sales cycle longer than expected', 'Competitive pressure on pricing'],
      opportunities: ['Enterprise deal pipeline strong', 'New product launch in pipeline']
    }
  };

  res.json({
    report,
    exportFormats: ['PDF', 'PPTX', 'HTML'],
    sharingOptions: ['Email', 'Slack', 'Download']
  });
});

// Generate quarterly report
app.get('/api/reports/quarterly', (req: Request, res: Response) => {
  const report = {
    id: `quarterly-${Date.now()}`,
    name: 'Q1 2026 Quarterly Report',
    period: 'Q1 2026 (Jan-Mar)',
    generatedAt: new Date(),
    summary: {
      revenue: { total: '₹1.32 Cr', target: '₹1.25 Cr', achievement: 106 },
      customers: { total: 135, new: 45, churned: 8, net: 37 },
      product: { activeProducts: 3, revenue: { productA: 52, productB: 30, productC: 18 } },
      team: { headcount: 15, hires: 3, attrition: 0 }
    },
    highlights: [
      'Revenue exceeded target by 6%',
      'Strongest quarter for new customer acquisition',
      'Product B showed 40% growth',
      'Team expanded by 3 hires',
      'Zero attrition during the quarter'
    ],
    recommendations: [
      'Invest more in Product B marketing',
      'Focus on enterprise segment',
      'Expand team in Q2',
      'Launch Product D in Q2'
    ]
  };

  res.json({
    report,
    sections: ['Revenue', 'Customers', 'Product', 'Team', 'Financials', 'Outlook']
  });
});

// Analytics summary
app.get('/api/analytics/summary', (req: Request, res: Response) => {
  res.json({
    period: 'Last 30 Days',
    generatedAt: new Date(),
    sections: [
      {
        title: 'Sales Analytics',
        metrics: {
          revenue: { value: 4500000, change: 15, trend: 'up' },
          deals: { closed: 28, avgSize: 160000, cycle: 45 },
          pipeline: { value: 25000000, velocity: 12 }
        }
      },
      {
        title: 'Marketing Analytics',
        metrics: {
          leads: { total: 1850, mql: 420, sql: 180 },
          conversion: { mqlToSql: 42, sqlToOpportunity: 47 },
          cost: { cac: 8500, ltv: 125000, ratio: 14.7 }
        }
      },
      {
        title: 'Customer Analytics',
        metrics: {
          nps: 62,
          satisfaction: 87,
          retention: 99,
          expansion: 125
        }
      },
      {
        title: 'Operations Analytics',
        metrics: {
          support: { tickets: 450, resolution: '94%', time: '2.3h' },
          uptime: 99.9,
          errors: { critical: 0, major: 2, minor: 15 }
        }
      }
    ],
    insights: [
      'Revenue growth accelerating - up 15% MoM',
      'Marketing CAC improved by 8%',
      'Support tickets down 12% from last month',
      'Customer LTV:CAC ratio above target of 12'
    ]
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'report-generator',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Report Generator running on port ${PORT}`);
  console.log('Role: Auto-generate business reports, dashboards, analytics');
});

export default app;
