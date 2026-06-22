/**
 * Brand Voice Guard
 * Port: 4814
 *
 * Role: Maintain brand consistency, voice, tone across all communications
 * Persona: Brand guardian, quality assurance, consistency expert
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4814;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface BrandGuideline {
  id: string;
  name: string;
  type: 'voice' | 'tone' | 'vocabulary' | 'style' | 'visual';
  rules: string[];
  examples: { correct: string; incorrect: string }[];
  lastUpdated: Date;
}

interface ContentReview {
  id: string;
  content: string;
  type: 'email' | 'social' | 'blog' | 'website' | 'ad' | 'sales';
  status: 'pending' | 'approved' | 'revision-needed' | 'rejected';
  score: number;
  issues: { type: string; severity: 'critical' | 'major' | 'minor'; message: string; suggestion: string }[];
  approvedBy?: string;
  reviewedAt?: Date;
}

interface BrandAudit {
  id: string;
  date: Date;
  content: { type: string; url: string; score: number }[];
  overallScore: number;
  violations: { category: string; count: number; examples: string[] }[];
  recommendations: string[];
}

// Brand guidelines database
const brandGuidelines: BrandGuideline[] = [
  {
    id: 'voice-1',
    name: 'Hojai AI Brand Voice',
    type: 'voice',
    rules: [
      'Confident but never arrogant',
      'Helpful and solution-oriented',
      'Professional but approachable',
      'Forward-thinking and innovative',
      'Clear and jargon-free'
    ],
    examples: [
      { correct: 'Hojai AI helps you automate workflows', incorrect: 'We are the best AI platform that will revolutionize your business' },
      { correct: 'Ready to get started?', incorrect: 'Are you interested in purchasing our product?' },
      { correct: 'Transform your sales process', incorrect: 'Our cutting-edge AI-powered SaaS solution optimizes your sales pipeline' }
    ],
    lastUpdated: new Date('2026-01-15')
  },
  {
    id: 'tone-1',
    name: 'Emotional Tone',
    type: 'tone',
    rules: [
      'Empathetic with customers',
      'Enthusiastic about product',
      'Professional in business contexts',
      'Urgent when addressing problems',
      'Calm and reassuring in crisis'
    ],
    examples: [
      { correct: 'We understand how frustrating this can be. Let\'s fix it together.', incorrect: 'This is a known issue that will be resolved.' },
      { correct: 'Excited to share our new feature!', incorrect: 'We have released a new feature update.' }
    ],
    lastUpdated: new Date('2026-02-20')
  },
  {
    id: 'vocab-1',
    name: 'Approved Vocabulary',
    type: 'vocabulary',
    rules: [
      'Use "you/your" instead of "customers"',
      'Use "we/us" instead of "Hojai AI team"',
      'Avoid jargon: "AI-powered" over "ML-driven"',
      'Use "help" instead of "enable"',
      'Use "easy" and "simple" sparingly'
    ],
    examples: [
      { correct: 'You can easily create a workflow', incorrect: 'The user can leverage our AI-powered automation capabilities' },
      { correct: 'We\'ll help you get started', incorrect: 'Our team will facilitate your onboarding journey' }
    ],
    lastUpdated: new Date('2026-03-10')
  },
  {
    id: 'style-1',
    name: 'Writing Style',
    type: 'style',
    rules: [
      'Keep sentences under 20 words',
      'Use active voice',
      'Front-load key information',
      'Break up long paragraphs',
      'Use bullet points for lists'
    ],
    examples: [
      { correct: 'Send your report now.', incorrect: 'The report should be sent by you at this time.' },
      { correct: 'Key features: Speed. Security. Support.', incorrect: 'Our platform offers a variety of key features including but not limited to speed, security, and support.' }
    ],
    lastUpdated: new Date('2026-04-05')
  }
];

// Voice attributes
const voiceAttributes = {
  personality: {
    primary: ['Innovative', 'Helpful', 'Confident', 'Clear'],
    secondary: ['Friendly', 'Professional', 'Forward-thinking'],
    avoid: ['Arrogant', 'Complex', 'Vague', 'Sales-y']
  },
  tone: {
    default: 'Friendly professional',
    sales: 'Confident and solution-focused',
    support: 'Empathetic and helpful',
    social: 'Engaging and conversational',
    technical: 'Clear and informative'
  },
  vocabulary: {
    use: ['automate', 'workflow', 'help', 'easy', 'simple', 'you', 'your', 'we', 'our', 'transform', 'boost', 'grow'],
    avoid: ['leverage', 'utilize', 'cutting-edge', 'revolutionary', 'game-changer', 'synergy', 'disrupt', 'robust', 'seamless', 'best-in-class']
  },
  grammar: {
    capitalization: 'Title case for headings, sentence case for body',
    punctuation: 'Avoid exclamation marks (!) except for welcome emails',
    numbers: 'Spell out one through nine, use numerals for 10+',
    contractions: 'Use them (we\'re, you\'re, it\'s)',
    ampersands: 'Avoid in formal content, OK in social'
  }
};

// Analyze content against brand guidelines
function analyzeContent(content: string, type: string): {
  score: number;
  issues: { type: string; severity: 'critical' | 'major' | 'minor'; message: string; suggestion: string }[];
  strengths: string[];
  recommendations: string[];
} {
  const issues: { type: string; severity: 'critical' | 'major' | 'minor'; message: string; suggestion: string }[] = [];
  const strengths: string[] = [];

  // Check for forbidden words
  const forbiddenWords = ['leverage', 'utilize', 'cutting-edge', 'revolutionary', 'game-changer', 'synergy', 'robust', 'seamless', 'best-in-class'];
  forbiddenWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(content)) {
      issues.push({
        type: 'vocabulary',
        severity: 'major',
        message: `Avoid using "${word}"`,
        suggestion: `Use simpler, clearer language. Example: "use" instead of "utilize"`
      });
    }
  });

  // Check sentence length
  const sentences = content.split(/[.!?]+/).filter(s => s.trim());
  sentences.forEach((sentence, i) => {
    const words = sentence.trim().split(/\s+/).length;
    if (words > 25) {
      issues.push({
        type: 'style',
        severity: 'minor',
        message: `Sentence ${i + 1} is too long (${words} words)`,
        suggestion: 'Break into shorter sentences for better readability'
      });
    }
  });

  // Check for passive voice indicators
  const passiveIndicators = ['was ', 'were ', 'been ', 'being '];
  passiveIndicators.forEach(indicator => {
    if (content.toLowerCase().includes(indicator)) {
      issues.push({
        type: 'style',
        severity: 'minor',
        message: 'Possible passive voice detected',
        suggestion: 'Convert to active voice for stronger impact'
      });
    }
  });

  // Check for contractions (should use them)
  const hasContractions = /we're|you're|it's|don't|won't|can't/i.test(content);
  if (!hasContractions && content.length > 200) {
    issues.push({
      type: 'style',
      severity: 'minor',
      message: 'Limited use of contractions',
      suggestion: 'Use contractions for a more conversational tone'
    });
  }

  // Check for exclamation marks
  const exclamationCount = (content.match(/!/g) || []).length;
  if (exclamationCount > 2) {
    issues.push({
      type: 'tone',
      severity: 'minor',
      message: `Found ${exclamationCount} exclamation marks`,
      suggestion: 'Limit exclamation marks to maintain professional tone (except welcome emails)'
    });
  }

  // Check for second person
  const hasYou = /\byou\b|\byour\b/i.test(content);
  if (hasYou) {
    strengths.push('Uses second person (you/your)');
  } else {
    issues.push({
      type: 'voice',
      severity: 'major',
      message: 'Content should address the reader directly',
      suggestion: 'Use "you" and "your" to connect with readers'
    });
  }

  // Calculate score
  const criticalIssues = issues.filter(i => i.severity === 'critical').length;
  const majorIssues = issues.filter(i => i.severity === 'major').length;
  const minorIssues = issues.filter(i => i.severity === 'minor').length;

  const score = Math.max(0, Math.min(100, 100 - (criticalIssues * 20) - (majorIssues * 10) - (minorIssues * 2)));

  return {
    score,
    issues,
    strengths,
    recommendations: [
      score < 70 ? 'Review all flagged issues before publishing' : score < 85 ? 'Address major issues for better consistency' : 'Minor polish recommended',
      'Run through readability checklist',
      'Get peer review for tone alignment'
    ]
  };
}

// Check visual branding
function checkVisualBranding(element: string, type: string): {
  compliant: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  const logoRules = [
    'Minimum clear space: 1x logo height',
    'Minimum size: 32px height for digital',
    'Colors must match brand palette exactly',
    'Never stretch, rotate, or add effects'
  ];

  const colorRules = [
    'Primary: #2563EB (Blue)',
    'Secondary: #10B981 (Green)',
    'Accent: #F59E0B (Amber)',
    'Neutrals: Grays only, no pure black'
  ];

  if (type === 'logo') {
    issues.push('Need clear space documentation');
    suggestions.push('Review logo guidelines for exact specifications');
  }

  return {
    compliant: issues.length === 0,
    issues,
    suggestions
  };
}

// Review content
app.post('/api/review', (req: Request, res: Response) => {
  const { content, type, author, context } = req.body;

  const review = analyzeContent(content, type);

  const contentReview: ContentReview = {
    id: `review-${Date.now()}`,
    content,
    type: type || 'general',
    status: review.score >= 85 ? 'approved' : review.score >= 60 ? 'revision-needed' : 'rejected',
    score: review.score,
    issues: review.issues
  };

  res.json({
    review: contentReview,
    analysis: {
      ...review,
      brandAlignment: {
        voice: review.issues.filter(i => i.type === 'voice').length === 0,
        tone: review.issues.filter(i => i.type === 'tone').length === 0,
        vocabulary: review.issues.filter(i => i.type === 'vocabulary').length === 0,
        style: review.issues.filter(i => i.type === 'style').length === 0
      }
    },
    suggestions: {
      quick: review.issues.filter(i => i.severity !== 'minor').slice(0, 3),
      detailed: review.issues
    }
  });
});

// Batch content review
app.post('/api/review/batch', (req: Request, res: Response) => {
  const { contents } = req.body;

  const results = contents.map((item: { content: string; type: string }) => ({
    ...item,
    ...analyzeContent(item.content, item.type)
  }));

  res.json({
    batchResults: results,
    summary: {
      total: results.length,
      approved: results.filter(r => r.score >= 85).length,
      revisionNeeded: results.filter(r => r.score >= 60 && r.score < 85).length,
      rejected: results.filter(r => r.score < 60).length,
      avgScore: Math.round(results.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / results.length)
    }
  });
});

// Get brand guidelines
app.get('/api/guidelines', (req: Request, res: Response) => {
  res.json({
    guidelines: brandGuidelines,
    quickReference: voiceAttributes
  });
});

// Get specific guideline
app.get('/api/guidelines/:type', (req: Request, res: Response) => {
  const { type } = req.params;

  const guideline = brandGuidelines.find(g => g.type === type);

  if (!guideline) {
    return res.status(404).json({ error: 'Guideline type not found' });
  }

  res.json({
    guideline,
    checklist: guideline.rules.map(rule => ({
      rule,
      checked: true
    })),
    examples: guideline.examples
  });
});

// Brand audit
app.post('/api/audit', (req: Request, res: Response) => {
  const { contentTypes, dateRange } = req.body;

  const audit: BrandAudit = {
    id: `audit-${Date.now()}`,
    date: new Date(),
    content: [
      { type: 'website', url: '/homepage', score: 88 },
      { type: 'website', url: '/features', score: 72 },
      { type: 'email', url: 'newsletter-may', score: 92 },
      { type: 'social', url: 'linkedin-post-1', score: 85 },
      { type: 'social', url: 'twitter-thread', score: 78 },
      { type: 'blog', url: '/blog/ai-guide', score: 82 }
    ],
    overallScore: 83,
    violations: [
      {
        category: 'Vocabulary',
        count: 15,
        examples: ['Used "leverage" 8 times', 'Used "seamless" 7 times']
      },
      {
        category: 'Style',
        count: 12,
        examples: ['Long sentences in blog', 'Passive voice in email']
      },
      {
        category: 'Tone',
        count: 5,
        examples: ['Too sales-y in ad copy']
      }
    ],
    recommendations: [
      'Create vocabulary cheat sheet for writers',
      'Set up automated brand check in CMS',
      'Schedule monthly brand audits',
      'Add brand guidelines to onboarding'
    ]
  };

  res.json({
    audit,
    trends: {
      scoreHistory: [75, 78, 82, 80, 83],
      commonIssues: [
        { issue: 'Passive voice', frequency: 12, trend: 'decreasing' },
        { issue: 'Complex vocabulary', frequency: 15, trend: 'stable' },
        { issue: 'Long sentences', frequency: 8, trend: 'improving' }
      ]
    }
  });
});

// Update guidelines
app.put('/api/guidelines/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const guideline = brandGuidelines.find(g => g.id === id);

  if (!guideline) {
    return res.status(404).json({ error: 'Guideline not found' });
  }

  Object.assign(guideline, updates, { lastUpdated: new Date() });

  res.json({
    guideline,
    message: 'Guideline updated successfully',
    notification: 'All teams should be notified of this change'
  });
});

// Generate style guide snippet
app.post('/api/style-guide', (req: Request, res: Response) => {
  const { purpose, length } = req.body;

  const styleGuide = `# ${purpose || 'Brand Style Guide'} Snippet

## Voice & Tone
- **Be human**: Write like you're talking to a friend, not a robot
- **Be helpful**: Always focus on how we solve customer problems
- **Be clear**: Use simple words. Short sentences. Active voice.

## Key Phrases
✅ **Say**: "Hojai helps you automate workflows"
❌ **Don't say**: "Leverage AI-powered automation capabilities"

## Common Mistakes
1. Using jargon (utilize, leverage, synergy)
2. Writing long, complex sentences
3. Being vague (great, excellent, amazing)
4. Writing about ourselves too much

## Grammar Tips
- Use contractions (we're, you're, it's)
- Second person: you/your
- Active voice: "We sent the report" not "The report was sent"
- Numbers: Spell out 1-9, use numerals for 10+

## Forbidden Words
- Leverage, utilize, synergy
- Cutting-edge, revolutionary, game-changer
- Seamless, robust, best-in-class
`;

  res.json({
    styleGuide,
    wordCount: styleGuide.split(/\s+/).length,
    estimatedReadTime: Math.ceil(styleGuide.split(/\s+/).length / 200) + ' min'
  });
});

// Competitor brand analysis
app.get('/api/competitor-analysis', (req: Request, res: Response) => {
  res.json({
    competitors: [
      {
        name: 'SalesForge',
        voice: 'Professional, technical, enterprise-focused',
        strengths: ['Strong technical content', 'Clear feature explanations'],
        weaknesses: ['Can be dry', 'Too corporate']
      },
      {
        name: 'Zoho',
        voice: 'Friendly, value-focused, SMB-oriented',
        strengths: ['Approachable tone', 'Value proposition clear'],
        weaknesses: ['Can lack depth', 'Sometimes too casual']
      },
      {
        name: 'Freshsales',
        voice: 'Modern, engaging, product-focused',
        strengths: ['Modern language', 'Good storytelling'],
        weaknesses: ['Can oversimplify', 'Repetitive messaging']
      }
    ],
    opportunities: [
      'Be the most human AI brand',
      'Focus on clarity over cleverness',
      'Build strongest customer voice'
    ]
  });
});

// Brand health dashboard
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    overallHealth: 85,
    metrics: {
      consistency: { score: 88, trend: 'up' },
      compliance: { score: 92, trend: 'stable' },
      awareness: { score: 75, trend: 'up' },
      sentiment: { score: 82, trend: 'up' }
    },
    recentReviews: {
      approved: 45,
      revisionNeeded: 12,
      rejected: 3
    },
    topViolations: [
      { issue: 'Passive voice', count: 18, severity: 'minor' },
      { issue: 'Complex vocabulary', count: 15, severity: 'major' },
      { issue: 'Missing CTA', count: 8, severity: 'major' }
    ],
    improvements: [
      { area: 'Email templates', progress: 85 },
      { area: 'Social posts', progress: 78 },
      { area: 'Website copy', progress: 72 },
      { area: 'Sales collateral', progress: 65 }
    ]
  });
});

// Training recommendations
app.get('/api/training', (req: Request, res: Response) => {
  res.json({
    modules: [
      { name: 'Brand Voice Fundamentals', duration: '30 min', status: 'required', completed: true },
      { name: 'Writing for Digital', duration: '45 min', status: 'required', completed: false },
      { name: 'Social Media Voice', duration: '20 min', status: 'recommended', completed: false },
      { name: 'Email Marketing Best Practices', duration: '30 min', status: 'recommended', completed: false }
    ],
    resources: [
      { type: 'guide', name: 'Brand Voice Guidelines', url: '/docs/brand-voice' },
      { type: 'checklist', name: 'Content Review Checklist', url: '/docs/content-checklist' },
      { type: 'examples', name: 'Good vs Bad Examples', url: '/docs/brand-examples' }
    ],
    quiz: {
      questions: 10,
      passingScore: 80,
      attemptsAllowed: 3
    }
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'brand-voice-guard',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Brand Voice Guard running on port ${PORT}`);
  console.log('Role: Maintain brand consistency across all communications');
});

export default app;
