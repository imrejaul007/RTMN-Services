/**
 * Content Strategist
 * Port: 4810
 *
 * Role: Content calendar, topic strategy, editorial planning, content ROI
 * Persona: Creative storyteller, data-driven marketer, audience advocate
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4810;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface ContentPiece {
  id: string;
  title: string;
  type: 'blog' | 'whitepaper' | 'case-study' | 'video' | 'infographic' | 'social' | 'email' | 'podcast';
  status: 'planned' | 'in-progress' | 'review' | 'published' | 'promoted';
  topic: string;
  targetAudience: string;
  goal: string;
  keywords: string[];
  publishDate?: Date;
  author?: string;
  estimatedReads?: number;
  actualReads?: number;
  engagement?: number;
}

interface ContentCalendar {
  week: string;
  pieces: {
    day: string;
    content: ContentPiece[];
  }[];
}

interface ContentCampaign {
  id: string;
  name: string;
  theme: string;
  startDate: Date;
  endDate: Date;
  pieces: ContentPiece[];
  budget: number;
  spent: number;
  metrics: {
    impressions: number;
    engagement: number;
    leads: number;
    conversions: number;
    roi: number;
  };
}

interface EditorialPlan {
  id: string;
  month: string;
  themes: { week: string; theme: string; topics: string[] }[];
  contentTypes: { type: string; count: number }[];
  goals: string[];
  targetMetrics: {
    traffic: number;
    leads: number;
    engagement: number;
  };
}

// KPI Metrics
const kpiMetrics = {
  piecesPublished: 0,
  totalViews: 0,
  avgEngagement: 0,
  leadsGenerated: 0,
  contentROI: 0,
  topPerforming: [] as string[]
};

// Content themes for different periods
const contentThemes: Record<string, string[]> = {
  'q2-2026': [
    'AI in Business Transformation',
    'Sales Automation Best Practices',
    'Customer Success Stories',
    'Product Updates & Features',
    'Industry Trends'
  ],
  'default': [
    'Getting Started with AI',
    'Advanced Features Deep Dive',
    'Customer Success Stories',
    'Industry Insights',
    'Tips & Tricks'
  ]
};

// Generate content ideas
function generateContentIdeas(
  theme: string,
  contentTypes: string[],
  count: number
): ContentPiece[] {
  const ideas: ContentPiece[] = [];

  const topicTemplates: Record<string, string[]> = {
    'AI in Business Transformation': [
      'How AI is Reshaping {industry} in 2026',
      '5 Ways AI Improves {metric} by {x}%',
      'The Future of Work: AI and Human Collaboration',
      'Case Study: {company} Achieves {result} with AI',
      'AI Implementation Checklist for {role}'
    ],
    'Sales Automation Best Practices': [
      '10 Sales Workflows to Automate Today',
      'How to Reduce Churn with Automated Outreach',
      'The Complete Guide to Sales Automation',
      'Top 5 Mistakes in Sales Automation (And How to Fix)',
      'Automation vs Personalization: Finding the Balance'
    ],
    'Customer Success Stories': [
      '{company}: 3x Revenue Growth in 12 Months',
      'How {company} Reduced Costs by {x}%',
      'From Startup to Scale: {company}\'s Journey',
      'The ROI of AI: {company}\'s Success Story',
      '{company} Migrates to Modern Stack'
    ]
  };

  const topics = topicTemplates[theme] || topicTemplates['default'];
  const typeMap: Record<string, string[]> = {
    'blog': ['Thought Leadership', 'How-To Guide', 'Listicle', 'Comparison', 'Opinion'],
    'video': ['Product Demo', 'Tutorial', 'Customer Interview', 'Webinar', 'Short Tips'],
    'whitepaper': ['Industry Report', 'Technical Deep Dive', 'Market Analysis', 'Research Report'],
    'case-study': ['Customer Success', 'ROI Analysis', 'Implementation Story', 'Before/After']
  };

  for (let i = 0; i < count; i++) {
    const type = contentTypes[i % contentTypes.length];
    const template = topics[i % topics.length];
    const typeVariants = typeMap[type] || ['Educational', 'Informative'];

    ideas.push({
      id: `content-${Date.now()}-${i}`,
      title: template.replace(/\{[a-z]+\}/gi, 'Enterprise'),
      type: type as ContentPiece['type'],
      status: 'planned',
      topic: theme,
      targetAudience: 'Mid-Market Decision Makers',
      goal: i % 3 === 0 ? 'Lead Generation' : i % 3 === 1 ? 'Brand Awareness' : 'Thought Leadership',
      keywords: [theme.toLowerCase(), 'AI', 'automation', 'enterprise'],
      estimatedReads: type === 'blog' ? 2000 : type === 'whitepaper' ? 500 : type === 'case-study' ? 1500 : 1000,
      author: ['Priya Sharma', 'Raj Kumar', 'Amit Patel'][i % 3]
    });
  }

  return ideas;
}

// Calculate content ROI
function calculateContentROI(piece: ContentPiece): {
  cost: number;
  revenue: number;
  roi: number;
  recommendations: string[];
} {
  const costByType: Record<string, number> = {
    'blog': 5000,
    'video': 25000,
    'whitepaper': 15000,
    'case-study': 10000,
    'infographic': 5000,
    'social': 500,
    'email': 1000,
    'podcast': 8000
  };

  const cost = costByType[piece.type] || 5000;
  const revenue = (piece.actualReads || piece.estimatedReads || 1000) * 0.05; // ₹0.05 per view as lead value
  const roi = ((revenue - cost) / cost) * 100;

  const recommendations: string[] = [];

  if (roi < 0) {
    recommendations.push('Repurpose content for other channels');
    recommendations.push('Increase promotion budget');
    recommendations.push('Consider updating for SEO');
  } else if (roi > 200) {
    recommendations.push('Scale similar content');
    recommendations.push('Increase promotion for high-performers');
    recommendations.push('Create content series');
  } else {
    recommendations.push('Optimize for better engagement');
    recommendations.push('Improve CTA placement');
  }

  return { cost, revenue, roi, recommendations };
}

// Generate content calendar
function generateCalendar(month: string, themes: string[]): ContentCalendar {
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
  const days = ['Monday', 'Wednesday', 'Friday'];

  const calendar: ContentCalendar = {
    week: month,
    pieces: []
  };

  weeks.forEach((week, weekIdx) => {
    const weekContent: { day: string; content: ContentPiece[] }[] = [];
    const theme = themes[weekIdx % themes.length];

    days.forEach((day, dayIdx) => {
      const types: ContentPiece['type'][] = ['blog', 'social', 'email'];
      const content = generateContentIdeas(
        theme,
        [types[dayIdx % types.length]],
        1
      );

      weekContent.push({
        day: `${day}, ${week}`,
        content
      });
    });

    calendar.pieces.push(...weekContent);
  });

  return calendar;
}

// Content audit
function performContentAudit(pieces: ContentPiece[]): {
  topPerformers: ContentPiece[];
  underperformers: ContentPiece[];
  contentGaps: string[];
  recommendations: string[];
} {
  const sorted = [...pieces].sort((a, b) =>
    (b.actualReads || b.estimatedReads || 0) - (a.actualReads || a.estimatedReads || 0)
  );

  const topPerformers = sorted.slice(0, Math.ceil(pieces.length * 0.2));
  const underperformers = sorted.slice(-Math.floor(pieces.length * 0.2));

  const contentGaps: string[] = [];
  const typeCount: Record<string, number> = {};

  pieces.forEach(p => {
    typeCount[p.type] = (typeCount[p.type] || 0) + 1;
  });

  if (!typeCount['video']) contentGaps.push('No video content');
  if (!typeCount['whitepaper']) contentGaps.push('No whitepapers');
  if (!typeCount['case-study']) contentGaps.push('Need more case studies');

  return {
    topPerformers,
    underperformers,
    contentGaps,
    recommendations: [
      'Create more content like top performers',
      'Audit and update underperforming content',
      'Fill identified content gaps',
      'Repurpose top content for other channels'
    ]
  };
}

// Create editorial plan
app.post('/api/editorial/plan', (req: Request, res: Response) => {
  const { month, focusAreas, goals, targetMetrics } = req.body;

  const themes = focusAreas || contentThemes['q2-2026'];

  const plan: EditorialPlan = {
    id: `plan-${Date.now()}`,
    month,
    themes: themes.map((theme, idx) => ({
      week: `Week ${idx + 1}`,
      theme,
      topics: generateContentIdeas(theme, ['blog', 'social'], 3).map(c => c.title)
    })),
    contentTypes: [
      { type: 'Blog Posts', count: 8 },
      { type: 'Social Posts', count: 20 },
      { type: 'Email Campaigns', count: 4 },
      { type: 'Videos', count: 2 },
      { type: 'Case Studies', count: 2 },
      { type: 'Whitepapers', count: 1 }
    ],
    goals: goals || ['Increase organic traffic by 25%', 'Generate 500 qualified leads', 'Improve engagement rate by 15%'],
    targetMetrics: targetMetrics || { traffic: 50000, leads: 500, engagement: 5 }
  };

  res.json({
    plan,
    calendar: generateCalendar(month, themes),
    estimatedWorkload: {
      blogPosts: 8,
      videos: 2,
      graphics: 15,
      emails: 4,
      totalHours: 120
    },
    budgetEstimate: {
      content: 150000,
      promotion: 75000,
      tools: 25000,
      total: 250000
    }
  });
});

// Generate content ideas
app.post('/api/content/ideas', (req: Request, res: Response) => {
  const { theme, contentTypes, count, targetAudience } = req.body;

  const ideas = generateContentIdeas(
    theme || 'AI in Business Transformation',
    contentTypes || ['blog', 'video', 'social'],
    count || 10
  );

  res.json({
    ideas,
    ideasByType: contentTypes?.reduce((acc: Record<string, number>, type: string) => {
      acc[type] = ideas.filter(i => i.type === type).length;
      return acc;
    }, {}),
    estimatedImpact: {
      totalReach: ideas.reduce((sum, i) => sum + (i.estimatedReads || 0), 0),
      estimatedLeads: ideas.length * 25,
      estimatedCost: ideas.reduce((sum, i) => {
        const costByType: Record<string, number> = { blog: 5000, video: 25000, whitepaper: 15000, social: 500, email: 1000 };
        return sum + (costByType[i.type] || 5000);
      }, 0)
    }
  });
});

// Content calendar view
app.get('/api/calendar/:month', (req: Request, res: Response) => {
  const { month } = req.params;
  const themes = contentThemes['q2-2026'];

  const calendar = generateCalendar(month, themes);

  res.json({
    calendar,
    summary: {
      totalPieces: calendar.pieces.reduce((sum, day) => sum + day.content.length, 0),
      byType: calendar.pieces.reduce((acc: Record<string, number>, day) => {
        day.content.forEach(c => {
          acc[c.type] = (acc[c.type] || 0) + 1;
        });
        return acc;
      }, {}),
      coverage: {
        monday: calendar.pieces.filter(p => p.day.includes('Monday')).length,
        wednesday: calendar.pieces.filter(p => p.day.includes('Wednesday')).length,
        friday: calendar.pieces.filter(p => p.day.includes('Friday')).length
      }
    }
  });
});

// Create content piece
app.post('/api/content', (req: Request, res: Response) => {
  const piece = req.body as ContentPiece;

  const newPiece: ContentPiece = {
    ...piece,
    id: piece.id || `content-${Date.now()}`,
    status: piece.status || 'planned'
  };

  res.json({
    content: newPiece,
    checklist: {
      seo: ['Keyword in title', 'Meta description', 'Internal links', 'Alt text for images'],
      quality: ['Proofread', 'Images included', 'CTA included', 'Links verified'],
      promotion: ['Social scheduled', 'Email prepared', 'Distribution list ready']
    },
    nextSteps: [
      'Assign to writer',
      'Set deadline',
      'Create brief',
      'Schedule review'
    ]
  });
});

// Update content status
app.patch('/api/content/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const content: ContentPiece = {
    id,
    title: 'Sample Content',
    type: 'blog',
    status: 'planned',
    topic: 'AI',
    targetAudience: 'Enterprise',
    goal: 'Lead Generation',
    keywords: ['AI', 'automation'],
    ...updates
  };

  if (content.status === 'published') {
    kpiMetrics.piecesPublished++;
  }

  res.json({
    content,
    history: [
      { date: new Date().toISOString(), action: 'Status updated', user: 'Content Strategist' }
    ]
  });
});

// Content performance report
app.post('/api/content/performance', (req: Request, res: Response) => {
  const { contentIds, dateRange } = req.body;

  const performance = {
    topContent: [
      { id: 'c1', title: 'How AI Improves Sales', views: 5000, engagement: 8.5, leads: 120 },
      { id: 'c2', title: 'Complete Guide to Automation', views: 4200, engagement: 7.2, leads: 95 },
      { id: 'c3', title: 'Customer Success Story', views: 3800, engagement: 9.1, leads: 150 },
      { id: 'c4', title: 'Product Feature Deep Dive', views: 2500, engagement: 5.5, leads: 45 },
      { id: 'c5', title: 'Industry Trends Report', views: 1800, engagement: 4.2, leads: 30 }
    ],
    byType: {
      blog: { avgViews: 3500, avgEngagement: 6.5, avgLeads: 85 },
      video: { avgViews: 4500, avgEngagement: 8.2, avgLeads: 95 },
      caseStudy: { avgViews: 2800, avgEngagement: 9.0, avgLeads: 140 },
      whitepaper: { avgViews: 1200, avgEngagement: 5.0, avgLeads: 180 }
    },
    byTopic: {
      'AI Automation': { views: 15000, engagement: 7.5, leads: 350 },
      'Product Updates': { views: 8000, engagement: 5.5, leads: 120 },
      'Customer Stories': { views: 12000, engagement: 8.5, leads: 400 },
      'Industry Insights': { views: 6000, engagement: 6.0, leads: 150 }
    },
    trends: {
      views: [10000, 12000, 15000, 18000, 22000],
      engagement: [5.5, 6.0, 6.5, 7.0, 7.5],
      leads: [200, 250, 300, 380, 450]
    }
  };

  res.json({
    performance,
    summary: {
      totalViews: 41000,
      totalLeads: 1020,
      avgEngagement: 7.2,
      topPerformingType: 'Case Study',
      topPerformingTopic: 'Customer Stories'
    },
    recommendations: [
      'Create more case studies (highest lead gen)',
      'Increase video content (high engagement)',
      'Double down on AI Automation topic',
      'Update and refresh older content'
    ]
  });
});

// Content audit
app.get('/api/audit', (req: Request, res: Response) => {
  const samplePieces: ContentPiece[] = [
    { id: 'c1', title: 'AI Guide', type: 'blog', status: 'published', topic: 'AI', targetAudience: 'Enterprise', goal: 'Leads', keywords: ['AI'], estimatedReads: 5000, actualReads: 5500, engagement: 8.5 },
    { id: 'c2', title: 'Automation Tips', type: 'blog', status: 'published', topic: 'Automation', targetAudience: 'SMB', goal: 'Leads', keywords: ['automation'], estimatedReads: 3000, actualReads: 2500, engagement: 5.2 },
    { id: 'c3', title: 'Success Story', type: 'case-study', status: 'published', topic: 'Customer', targetAudience: 'Enterprise', goal: 'Leads', keywords: ['case-study'], estimatedReads: 1500, actualReads: 1800, engagement: 9.1 },
    { id: 'c4', title: 'Product Demo', type: 'video', status: 'published', topic: 'Product', targetAudience: 'All', goal: 'Awareness', keywords: ['product'], estimatedReads: 4000, actualReads: 4500, engagement: 7.8 }
  ];

  const audit = performContentAudit(samplePieces);

  res.json({
    audit,
    health: {
      overallScore: 78,
      seoScore: 82,
      engagementScore: 75,
      freshnessScore: 70,
      varietyScore: 85
    },
    actionItems: [
      { priority: 'high', action: 'Update automation tips post', reason: 'Underperforming' },
      { priority: 'medium', action: 'Add more video content', reason: 'High engagement type' },
      { priority: 'medium', action: 'Refresh AI guide', reason: 'Opportunity to improve' }
    ]
  });
});

// SEO recommendations
app.get('/api/seo/recommendations', (req: Request, res: Response) => {
  res.json({
    keywordOpportunities: [
      { keyword: 'AI sales automation', volume: 15000, difficulty: 'medium', opportunity: 'high' },
      { keyword: 'CRM AI features', volume: 8000, difficulty: 'low', opportunity: 'very high' },
      { keyword: 'automation software India', volume: 12000, difficulty: 'medium', opportunity: 'high' },
      { keyword: 'enterprise AI solutions', volume: 5000, difficulty: 'high', opportunity: 'medium' }
    ],
    technicalSeo: [
      { issue: 'Page speed could be improved', impact: 'medium', pagesAffected: 12 },
      { issue: 'Missing meta descriptions', impact: 'low', pagesAffected: 5 },
      { issue: 'Duplicate H1 tags', impact: 'medium', pagesAffected: 3 }
    ],
    contentGaps: [
      'Comparison content (vs competitors)',
      'Pricing guides',
      'Implementation guides',
      'ROI calculators'
    ],
    linkBuilding: [
      'Guest posting opportunities',
      'Industry directory submissions',
      'Partner backlinks',
      'Resource page outreach'
    ]
  });
});

// Content ROI report
app.get('/api/content/roi', (req: Request, res: Response) => {
  const pieces: ContentPiece[] = [
    { id: 'c1', title: 'AI Guide', type: 'blog', status: 'published', topic: 'AI', targetAudience: 'Enterprise', goal: 'Leads', keywords: [], estimatedReads: 5000, actualReads: 5500 },
    { id: 'c2', title: 'Demo Video', type: 'video', status: 'published', topic: 'Product', targetAudience: 'All', goal: 'Awareness', keywords: [], estimatedReads: 4500, actualReads: 4200 },
    { id: 'c3', title: 'Whitepaper', type: 'whitepaper', status: 'published', topic: 'Industry', targetAudience: 'Enterprise', goal: 'Leads', keywords: [], estimatedReads: 1200, actualReads: 1100 }
  ];

  const roiData = pieces.map(p => ({
    piece: p,
    ...calculateContentROI(p)
  }));

  const totalROI = roiData.reduce((sum, r) => sum + r.roi, 0) / roiData.length;

  res.json({
    roiByPiece: roiData,
    summary: {
      totalInvestment: roiData.reduce((sum, r) => sum + r.cost, 0),
      totalReturn: roiData.reduce((sum, r) => sum + r.revenue, 0),
      avgROI: totalROI,
      bestPerformer: roiData.sort((a, b) => b.roi - a.roi)[0]
    },
    recommendations: [
      'Increase investment in whitepapers (highest lead value)',
      'Repurpose blog content into videos',
      'Create more case studies for direct ROI'
    ]
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'content-strategist',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Content Strategist running on port ${PORT}`);
  console.log('Role: Content calendar, topic strategy, editorial planning');
});

export default app;
