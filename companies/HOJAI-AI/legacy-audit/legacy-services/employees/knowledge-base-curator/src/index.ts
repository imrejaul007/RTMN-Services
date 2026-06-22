/**
 * Knowledge Base Curator
 * Port: 4822
 *
 * Role: Write and update knowledge base articles, documentation, FAQs
 * Persona: Clear communicator, technical writer, helpful expert
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4822;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  tags: string[];
  content: string;
  excerpt: string;
  author: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  visibility: 'public' | 'internal' | 'hidden';
  metrics?: {
    views: number;
    helpful: number;
    notHelpful: number;
    searchRank: number;
  };
  relatedArticles: string[];
  lastUpdated: Date;
  version: number;
}

interface ArticleFeedback {
  id: string;
  articleId: string;
  helpful: boolean;
  comment?: string;
  customerId: string;
  timestamp: Date;
}

interface Category {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  icon?: string;
  articleCount: number;
  order: number;
}

// Category structure
const categories: Category[] = [
  { id: 'cat-1', name: 'Getting Started', description: 'Quick start guides and basic setup', articleCount: 12, order: 1 },
  { id: 'cat-2', name: 'Account & Billing', description: 'Manage your account and payments', articleCount: 8, order: 2 },
  { id: 'cat-3', name: 'Features & How-To', description: 'Learn about features and best practices', articleCount: 25, order: 3 },
  { id: 'cat-4', name: 'Integrations', description: 'Connect with other tools', articleCount: 15, order: 4 },
  { id: 'cat-5', name: 'Troubleshooting', description: 'Solutions to common problems', articleCount: 18, order: 5 },
  { id: 'cat-6', name: 'API & Developers', description: 'Technical documentation', articleCount: 10, order: 6 },
  { id: 'cat-7', name: 'Security & Privacy', description: 'Data security and compliance', articleCount: 6, order: 7 }
];

// Sample articles
const articles: Article[] = [
  {
    id: 'art-1',
    title: 'How to Set Up Your First Workflow',
    slug: 'setup-first-workflow',
    category: 'Getting Started',
    tags: ['workflow', 'setup', 'beginner', 'automation'],
    content: '# Setting Up Your First Workflow\n\nLearn how to create and configure your first automated workflow in just a few steps.\n\n## Prerequisites\n\n- A Hojai AI account\n- Basic understanding of your business process\n\n## Step 1: Access Workflow Builder\n\n1. Log in to your dashboard\n2. Click on "Workflows" in the sidebar\n3. Click "Create New Workflow"\n\n## Step 2: Define Your Trigger\n\nChoose what starts your workflow:\n- **New lead** - When a new contact is added\n- **Form submission** - When someone fills out a form\n- **Scheduled** - At a specific time or recurring\n\n## Step 3: Add Actions\n\nDrag and drop actions:\n- Send email\n- Update CRM\n- Create task\n- Add to list\n\n## Step 4: Test and Activate\n\n1. Click "Test" to run a sample\n2. Review the results\n3. Click "Activate" when ready\n\n## Tips\n\n- Start simple and iterate\n- Use descriptive names\n- Add filters to refine triggers',
    excerpt: 'Learn how to create your first automated workflow in Hojai AI with this step-by-step guide.',
    author: 'Documentation Team',
    status: 'published',
    visibility: 'public',
    metrics: { views: 5420, helpful: 312, notHelpful: 18, searchRank: 3 },
    relatedArticles: ['art-2', 'art-5', 'art-8'],
    lastUpdated: new Date('2026-05-15'),
    version: 3
  }
];

// Generate article structure
function generateArticleStructure(
  topic: string,
  type: 'how-to' | 'troubleshooting' | 'reference' | 'explanation'
): { outline: string[]; sections: { name: string; content: string }[] } {
  const templates: Record<string, { outline: string[]; sections: { name: string; content: string }[] }> = {
    'how-to': {
      outline: ['Overview', 'Prerequisites', 'Step-by-Step Instructions', 'Tips & Best Practices', 'Related Articles'],
      sections: [
        { name: 'Overview', content: 'What you will accomplish with this guide' },
        { name: 'Prerequisites', content: 'What you need before starting' },
        { name: 'Step-by-Step', content: 'Detailed instructions with screenshots' },
        { name: 'Tips', content: 'Best practices and common mistakes to avoid' }
      ]
    },
    'troubleshooting': {
      outline: ['Problem Description', 'Possible Causes', 'Solutions', 'If Issues Persist'],
      sections: [
        { name: 'Problem', content: 'Describe the issue in detail' },
        { name: 'Causes', content: 'List possible reasons for the problem' },
        { name: 'Solutions', content: 'Step-by-step fixes' },
        { name: 'Escalation', content: 'When to contact support' }
      ]
    },
    'reference': {
      outline: ['Overview', 'Available Options', 'Configuration', 'Examples'],
      sections: [
        { name: 'Overview', content: 'What this feature does' },
        { name: 'Options', content: 'All available settings' },
        { name: 'Configuration', content: 'How to configure' },
        { name: 'Examples', content: 'Real-world use cases' }
      ]
    },
    'explanation': {
      outline: ['Overview', 'Key Concepts', 'How It Works', 'Use Cases'],
      sections: [
        { name: 'Overview', content: 'Introduction to the concept' },
        { name: 'Concepts', content: 'Key terms and definitions' },
        { name: 'Mechanism', content: 'How it works under the hood' },
        { name: 'Use Cases', content: 'When and why to use' }
      ]
    }
  };

  return templates[type] || templates['how-to'];
}

// Analyze content gaps
function analyzeContentGaps(issues: { topic: string; frequency: number }[]): {
  missing: { topic: string; priority: 'high' | 'medium' | 'low'; suggestedTitle: string }[];
  outdated: { articleId: string; reason: string }[];
  improvement: { articleId: string; suggestions: string[] }[];
} {
  const missing: { topic: string; priority: 'high' | 'medium' | 'low'; suggestedTitle: string }[] = [];
  const outdated: { articleId: string; reason: string }[] = [];
  const improvement: { articleId: string; suggestions: string[] }[] = [];

  issues.forEach(issue => {
    missing.push({
      topic: issue.topic,
      priority: issue.frequency > 50 ? 'high' : issue.frequency > 20 ? 'medium' : 'low',
      suggestedTitle: `How to Fix ${issue.topic}`
    });
  });

  // Check for articles needing updates
  articles.forEach(article => {
    const daysSinceUpdate = (Date.now() - new Date(article.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 90) {
      outdated.push({ articleId: article.id, reason: `Not updated in ${Math.round(daysSinceUpdate)} days` });
    }

    if ((article.metrics?.helpful || 0) > 100 && (article.metrics?.notHelpful || 0) / (article.metrics?.helpful || 1) > 0.1) {
      improvement.push({
        articleId: article.id,
        suggestions: ['Consider restructuring content', 'Add more examples', 'Include step-by-step screenshots']
      });
    }
  });

  return { missing, outdated, improvement };
}

// Create article
app.post('/api/articles', (req: Request, res: Response) => {
  const { title, category, tags, content, visibility } = req.body;

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const article: Article = {
    id: `art-${Date.now()}`,
    title,
    slug,
    category,
    tags: tags || [],
    content,
    excerpt: content.substring(0, 160) + '...',
    author: 'Documentation Team',
    status: 'draft',
    visibility: visibility || 'public',
    metrics: { views: 0, helpful: 0, notHelpful: 0, searchRank: 0 },
    relatedArticles: [],
    lastUpdated: new Date(),
    version: 1
  };

  res.json({
    article,
    checklist: {
      content: ['Clear title', 'Introduction', 'Step-by-step', 'Examples', 'Summary'],
      seo: ['Meta description', 'Keywords', 'Internal links', 'Alt text'],
      quality: ['Grammar check', 'Screenshots', 'Code examples', 'Formatting']
    },
    suggestedRelated: articles.slice(0, 3)
  });
});

// Generate article outline
app.post('/api/articles/generate-outline', (req: Request, res: Response) => {
  const { topic, type, audience, tone } = req.body;

  const structure = generateArticleStructure(topic, type || 'how-to');

  res.json({
    topic,
    type,
    audience: audience || 'general users',
    tone: tone || 'helpful',
    outline: structure.outline,
    sections: structure.sections,
    estimatedLength: `${structure.outline.length * 300} - ${structure.outline.length * 500} words`,
    metadata: {
      suggestedTitle: topic,
      suggestedSlug: topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      suggestedTags: topic.toLowerCase().split(' ').slice(0, 5)
    }
  });
});

// Get articles
app.get('/api/articles', (req: Request, res: Response) => {
  const { category, status, search, sort } = req.query;

  let filteredArticles = [...articles];

  if (category) {
    filteredArticles = filteredArticles.filter(a => a.category === category);
  }
  if (status) {
    filteredArticles = filteredArticles.filter(a => a.status === status);
  }
  if (search) {
    const searchLower = (search as string).toLowerCase();
    filteredArticles = filteredArticles.filter(a =>
      a.title.toLowerCase().includes(searchLower) ||
      a.content.toLowerCase().includes(searchLower) ||
      a.tags.some(t => t.toLowerCase().includes(searchLower))
    );
  }

  // Sort
  if (sort === 'views') {
    filteredArticles.sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0));
  } else if (sort === 'recent') {
    filteredArticles.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  } else if (sort === 'helpful') {
    filteredArticles.sort((a, b) => {
      const aHelpRate = (a.metrics?.helpful || 0) / ((a.metrics?.helpful || 0) + (a.metrics?.notHelpful || 0));
      const bHelpRate = (b.metrics?.helpful || 0) / ((b.metrics?.helpful || 0) + (b.metrics?.notHelpful || 0));
      return bHelpRate - aHelpRate;
    });
  }

  res.json({
    articles: filteredArticles,
    summary: {
      total: filteredArticles.length,
      byStatus: {
        published: filteredArticles.filter(a => a.status === 'published').length,
        draft: filteredArticles.filter(a => a.status === 'draft').length,
        review: filteredArticles.filter(a => a.status === 'review').length
      }
    }
  });
});

// Get article by ID
app.get('/api/articles/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const article = articles.find(a => a.id === id);

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  res.json({
    article,
    related: articles.filter(a => a.id !== id && a.category === article.category).slice(0, 3),
    feedback: {
      helpfulRate: article.metrics ? Math.round(article.metrics.helpful / (article.metrics.helpful + article.metrics.notHelpful) * 100) : 0
    }
  });
});

// Update article
app.put('/api/articles/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const article = articles.find(a => a.id === id);

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  Object.assign(article, updates, {
    lastUpdated: new Date(),
    version: article.version + 1
  });

  res.json({
    article,
    message: 'Article updated successfully',
    notification: 'Consider notifying readers of the update'
  });
});

// Submit article for review
app.post('/api/articles/:id/review', (req: Request, res: Response) => {
  const { id } = req.params;

  const article = articles.find(a => a.id === id);

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  article.status = 'review';

  res.json({
    article,
    reviewers: ['doc-lead', 'product-manager', 'support-lead'],
    checklist: [
      'Technical accuracy',
      'Clear instructions',
      'Grammar and spelling',
      'SEO optimization',
      'Appropriate tone'
    ]
  });
});

// Publish article
app.post('/api/articles/:id/publish', (req: Request, res: Response) => {
  const { id } = req.params;

  const article = articles.find(a => a.id === id);

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  article.status = 'published';

  res.json({
    article,
    notifications: ['Article is now live', 'Added to relevant categories', 'Indexed for search'],
    shareLinks: {
      direct: `/help/articles/${article.slug}`,
      email: `/help/share/${article.id}`,
      social: `/help/social/${article.id}`
    }
  });
});

// Article analytics
app.get('/api/articles/:id/analytics', (req: Request, res: Response) => {
  const { id } = req.params;

  const article = articles.find(a => a.id === id) || articles[0];

  res.json({
    article: { id: article.id, title: article.title },
    metrics: {
      views: article.metrics?.views || 0,
      uniqueViews: Math.round((article.metrics?.views || 0) * 0.7),
      avgTimeOnPage: '4:30',
      bounceRate: 25,
      helpfulVotes: article.metrics?.helpful || 0,
      notHelpfulVotes: article.metrics?.notHelpful || 0,
      searchRank: article.metrics?.searchRank || 0
    },
    trends: {
      views: [420, 480, 520, 490, 542],
      helpfulRate: [85, 87, 88, 90, 92]
    },
    topSearchTerms: [
      { term: 'workflow setup', impressions: 1500, clicks: 450 },
      { term: 'automation guide', impressions: 1200, clicks: 320 },
      { term: 'get started', impressions: 800, clicks: 280 }
    ]
  });
});

// Content gap analysis
app.get('/api/gaps', (req: Request, res: Response) => {
  const issues = [
    { topic: 'API rate limits', frequency: 65 },
    { topic: 'SSO configuration', frequency: 45 },
    { topic: 'Data export formats', frequency: 38 },
    { topic: 'Webhook setup', frequency: 32 },
    { topic: 'Multi-user permissions', frequency: 28 }
  ];

  const gaps = analyzeContentGaps(issues);

  res.json({
    gaps,
    coverage: {
      totalArticles: articles.length,
      coverageScore: 78,
      categoryCoverage: categories.map(c => ({
        category: c.name,
        coverage: Math.round((c.articleCount / 20) * 100)
      }))
    },
    recommendations: [
      'Create articles for high-frequency topics',
      'Update articles older than 90 days',
      'Improve low-rated articles'
    ]
  });
});

// Search articles
app.post('/api/search', (req: Request, res: Response) => {
  const { query, filters } = req.body;

  const results = articles.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.content.toLowerCase().includes(query.toLowerCase()) ||
    a.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  ).map(a => ({
    article: a,
    relevance: a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0.5,
    matchedIn: a.title.toLowerCase().includes(query.toLowerCase()) ? 'title' : 'content'
  }));

  results.sort((a, b) => b.relevance - a.relevance);

  res.json({
    query,
    results: results.slice(0, 10),
    suggestions: [
      query.split(' ')[0] + ' guide',
      'how to ' + query,
      query + ' tutorial'
    ]
  });
});

// Process feedback
app.post('/api/articles/:id/feedback', (req: Request, res: Response) => {
  const { id } = req.params;
  const { helpful, comment } = req.body;

  const feedback: ArticleFeedback = {
    id: `fb-${Date.now()}`,
    articleId: id,
    helpful,
    comment,
    customerId: 'anonymous',
    timestamp: new Date()
  };

  const article = articles.find(a => a.id === id);
  if (article && article.metrics) {
    if (helpful) {
      article.metrics.helpful++;
    } else {
      article.metrics.notHelpful++;
    }
  }

  res.json({
    feedback,
    thankYou: 'Thank you for your feedback!',
    followUp: !helpful ? 'We\'ll work on improving this article.' : undefined
  });
});

// Get categories
app.get('/api/categories', (req: Request, res: Response) => {
  res.json({
    categories,
    popular: categories.slice(0, 3),
    newArticles: {
      'Getting Started': 2,
      'Features & How-To': 5,
      'Troubleshooting': 3
    }
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'knowledge-base-curator',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Knowledge Base Curator running on port ${PORT}`);
  console.log('Role: Write and maintain help articles, documentation');
});

export default app;
