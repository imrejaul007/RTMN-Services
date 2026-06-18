const express = require('express');
const router = express.Router();

// In-memory template storage
const userTemplates = new Map();

// Content templates
const contentTemplates = [
  {
    id: 'blog-intro',
    name: 'Blog Post Introduction',
    category: 'blog',
    description: 'Hook readers in the first 100 words',
    content: `**Opening Hook**

[Start with a surprising fact, question, or bold statement related to your topic]

**Context Setting**

[Briefly explain why this topic matters to your audience]

**Credibility Statement**

[Share why you're qualified to write about this]`,
    usage: 1200
  },
  {
    id: 'social-proof',
    name: 'Social Proof Template',
    category: 'social',
    description: 'Build trust with testimonials',
    content: `[Customer Name/Company]

"Insert powerful quote here about the transformation or result"

📊 [Specific metric or outcome]

This customer achieved [result] in [timeframe].`,
    usage: 850
  },
  {
    id: 'email-welcome',
    name: 'Welcome Email Sequence',
    category: 'email',
    description: 'First email in your onboarding sequence',
    content: `Subject: Welcome to [Brand Name]! 🎉

Hi [Name],

Thanks for joining [Brand Name]!

I'm [Your Name], and I'll be your guide on this journey.

Here's what happens next:

1. [First action item]
2. [Second action item]
3. [Value proposition]

[Personal touch or story]

Looking forward to helping you [benefit statement].

Best,
[Your Name]`,
    usage: 2100
  },
  {
    id: 'video-hook',
    name: 'Video Hook Formula',
    category: 'video',
    description: 'The first 3 seconds that grab attention',
    content: `HOOK (0-3 seconds):
"[Provocative statement about outcome]"

Example: "I'm about to show you exactly how to..."

TRANSITION (3-5 seconds):
"[Build anticipation]"

Example: "But first, let me explain why most people fail at this..."

BODY PREVIEW (5-10 seconds):
"[Overview of what's coming]"

Example: "By the end of this video, you'll know..."`,
    usage: 650
  }
];

// Design templates
const designTemplates = [
  {
    id: 'instagram-post',
    name: 'Instagram Post',
    category: 'social',
    dimensions: '1080x1080',
    elements: ['Bold headline', 'Supporting text', 'Brand colors', 'Logo/watermark'],
    tips: ['Use high contrast colors', 'Limit to 3 fonts max', 'Include CTA']
  },
  {
    id: 'youtube-thumbnail',
    name: 'YouTube Thumbnail',
    category: 'video',
    dimensions: '1280x720',
    elements: ['Expressive face', 'Bold text', 'High contrast background', 'Bright colors'],
    tips: ['Show emotion', 'Use arrows/circles', 'Make text readable at small size']
  },
  {
    id: 'linkedin-banner',
    name: 'LinkedIn Banner',
    category: 'professional',
    dimensions: '1584x396',
    elements: ['Professional image', 'Personal tagline', 'Contact info optional'],
    tips: ['Keep it professional', 'Show personality subtly', 'High-quality image']
  }
];

// Get template categories
router.get('/categories', (req, res) => {
  const categories = {
    content: ['blog', 'social', 'email', 'copy', 'article'],
    design: ['social', 'video', 'professional'],
    video: ['short', 'long', 'tutorial', 'promo']
  };

  res.json({
    success: true,
    data: categories
  });
});

// Get content templates
router.get('/content', (req, res) => {
  const { category } = req.query;

  let templates = contentTemplates;

  if (category) {
    templates = templates.filter(t => t.category === category);
  }

  templates.sort((a, b) => b.usage - a.usage);

  res.json({
    success: true,
    data: templates
  });
});

// Get design templates
router.get('/design', (req, res) => {
  const { category } = req.query;

  let templates = designTemplates;

  if (category) {
    templates = templates.filter(t => t.category === category);
  }

  res.json({
    success: true,
    data: templates
  });
});

// Get template by ID
router.get('/:templateId', (req, res) => {
  const { templateId } = req.params;

  let template = contentTemplates.find(t => t.id === templateId);

  if (!template) {
    template = designTemplates.find(t => t.id === templateId);
  }

  if (!template) {
    // Check user templates
    for (const userTemps of userTemplates.values()) {
      const found = userTemps.find(t => t.id === templateId);
      if (found) {
        template = found;
        break;
      }
    }
  }

  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found',
      available: [...contentTemplates.map(t => t.id), ...designTemplates.map(t => t.id)]
    });
  }

  res.json({
    success: true,
    data: template
  });
});

// Use template (returns filled template)
router.post('/use/:templateId', (req, res) => {
  const { templateId } = req.params;
  const { variables } = req.body;

  let template = contentTemplates.find(t => t.id === templateId);

  if (!template) {
    template = designTemplates.find(t => t.id === templateId);
  }

  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found'
    });
  }

  // Replace variables in content
  let filledContent = template.content || '';
  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\[${key}\\]`, 'g');
      filledContent = filledContent.replace(regex, value);
    });
  }

  // Increment usage
  template.usage = (template.usage || 0) + 1;

  res.json({
    success: true,
    data: {
      template: { ...template },
      filledContent,
      variablesUsed: Object.keys(variables || {}),
      unfilledPlaceholders: filledContent.match(/\[.*?\]/g) || []
    }
  });
});

// Create custom template
router.post('/create', (req, res) => {
  const { userId, name, category, content, description, type } = req.body;

  if (!userId || !name) {
    return res.status(400).json({
      success: false,
      error: 'userId and name are required'
    });
  }

  const template = {
    id: `custom-${Date.now()}`,
    userId,
    name,
    category: category || 'custom',
    type: type || 'content',
    content: content || '',
    description: description || '',
    usage: 0,
    createdAt: new Date().toISOString()
  };

  if (!userTemplates.has(userId)) {
    userTemplates.set(userId, []);
  }
  userTemplates.get(userId).push(template);

  res.json({
    success: true,
    message: 'Template created',
    data: template
  });
});

// Get user templates
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;

  const templates = userTemplates.get(userId) || [];

  res.json({
    success: true,
    data: templates
  });
});

// Update user template
router.put('/user/:templateId', (req, res) => {
  const { templateId } = req.params;
  const { name, content, description } = req.body;

  let template = null;
  for (const userTemps of userTemplates.values()) {
    const found = userTemps.find(t => t.id === templateId);
    if (found) {
      template = found;
      break;
    }
  }

  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found'
    });
  }

  if (name !== undefined) template.name = name;
  if (content !== undefined) template.content = content;
  if (description !== undefined) template.description = description;
  template.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Template updated',
    data: template
  });
});

// Delete user template
router.delete('/user/:templateId', (req, res) => {
  const { templateId } = req.params;

  for (const [userId, userTemps] of userTemplates.entries()) {
    const index = userTemps.findIndex(t => t.id === templateId);
    if (index !== -1) {
      userTemps.splice(index, 1);
      res.json({ success: true, message: 'Template deleted' });
      return;
    }
  }

  res.status(404).json({ success: false, error: 'Template not found' });
});

// Get popular templates
router.get('/popular/all', (req, res) => {
  const { limit = 10 } = req.query;

  const popular = [...contentTemplates]
    .sort((a, b) => b.usage - a.usage)
    .slice(0, parseInt(limit));

  res.json({
    success: true,
    data: popular
  });
});

// Get template suggestions
router.post('/suggestions', (req, res) => {
  const { goal, platform, contentType } = req.body;

  const suggestions = [];

  // Based on goal
  if (goal === 'engagement') {
    suggestions.push(
      contentTemplates.find(t => t.id === 'social-proof'),
      designTemplates.find(t => t.id === 'instagram-post')
    );
  }

  if (goal === 'conversion') {
    suggestions.push(
      contentTemplates.find(t => t.id === 'email-welcome'),
      designTemplates.find(t => t.id === 'youtube-thumbnail')
    );
  }

  if (goal === 'awareness') {
    suggestions.push(
      contentTemplates.find(t => t.id === 'blog-intro'),
      contentTemplates.find(t => t.id === 'video-hook')
    );
  }

  // Based on platform
  if (platform === 'instagram') {
    suggestions.push(designTemplates.find(t => t.id === 'instagram-post'));
  }

  if (platform === 'youtube') {
    suggestions.push(
      designTemplates.find(t => t.id === 'youtube-thumbnail'),
      contentTemplates.find(t => t.id === 'video-hook')
    );
  }

  if (platform === 'linkedin') {
    suggestions.push(designTemplates.find(t => t.id === 'linkedin-banner'));
  }

  res.json({
    success: true,
    data: {
      suggestions: suggestions.filter(Boolean),
      basedOn: { goal, platform, contentType }
    }
  });
});

module.exports = router;