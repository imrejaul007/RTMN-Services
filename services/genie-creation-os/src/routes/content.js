const express = require('express');
const router = express.Router();

// In-memory content storage
const contentLibrary = new Map();
const drafts = new Map();

// Content types
const contentTypes = [
  { id: 'blog', name: 'Blog Post', icon: '📝', minWords: 500 },
  { id: 'article', name: 'Article', icon: '📄', minWords: 1000 },
  { id: 'social', name: 'Social Media Post', icon: '📱', minWords: 50 },
  { id: 'email', name: 'Email', icon: '📧', minWords: 100 },
  { id: 'copy', name: 'Marketing Copy', icon: '📣', minWords: 100 },
  { id: 'script', name: 'Script/Screenplay', icon: '🎬', minWords: 1000 },
  { id: 'story', name: 'Story/Fiction', icon: '📖', minWords: 500 },
  { id: 'poem', name: 'Poem', icon: '🎭', minWords: 50 },
  { id: 'song', name: 'Song Lyrics', icon: '🎵', minWords: 100 },
  { id: 'speech', name: 'Speech', icon: '🎤', minWords: 500 }
];

// Writing styles
const writingStyles = [
  { id: 'professional', name: 'Professional', description: 'Formal, business-appropriate' },
  { id: 'casual', name: 'Casual', description: 'Relaxed, conversational' },
  { id: 'persuasive', name: 'Persuasive', description: 'Convincing, action-oriented' },
  { id: 'informative', name: 'Informative', description: 'Educational, factual' },
  { id: 'humorous', name: 'Humorous', description: 'Funny, witty' },
  { id: 'emotional', name: 'Emotional', description: 'Heartfelt, moving' },
  { id: 'technical', name: 'Technical', description: 'Detailed, specialized' },
  { id: 'creative', name: 'Creative', description: 'Artistic, imaginative' }
];

// Generate content
router.post('/generate', (req, res) => {
  const { userId, type, topic, audience, tone, length, keywords, outline } = req.body;

  if (!topic) {
    return res.status(400).json({
      success: false,
      error: 'topic is required'
    });
  }

  const contentType = contentTypes.find(t => t.id === type) || contentTypes[0];
  const wordCount = getWordCount(length || 'medium', contentType);
  const style = writingStyles.find(s => s.id === tone) || writingStyles[0];

  // Simulate content generation
  const content = generateMockContent(topic, contentType, audience, style, wordCount, keywords);

  const result = {
    id: `content-${Date.now()}`,
    userId,
    type: contentType.id,
    typeName: contentType.name,
    title: generateTitle(topic, contentType),
    content,
    metadata: {
      wordCount: content.split(/\s+/).length,
      readingTime: Math.ceil(content.split(/\s+/).length / 200),
      style: style.name,
      audience: audience || 'General',
      generatedAt: new Date().toISOString()
    },
    seoScore: Math.round(70 + Math.random() * 30),
    suggestions: generateContentSuggestions(content, keywords)
  };

  // Store in library
  if (!contentLibrary.has(userId)) {
    contentLibrary.set(userId, []);
  }
  contentLibrary.get(userId).push(result);

  res.json({
    success: true,
    data: result
  });
});

// Create draft
router.post('/draft', (req, res) => {
  const { userId, type, title, content, notes } = req.body;

  const draft = {
    id: `draft-${Date.now()}`,
    userId,
    type: type || 'blog',
    title: title || 'Untitled',
    content: content || '',
    notes: notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    wordCount: (content || '').split(/\s+/).filter(w => w).length
  };

  if (!drafts.has(userId)) {
    drafts.set(userId, []);
  }
  drafts.get(userId).push(draft);

  res.json({
    success: true,
    message: 'Draft created',
    data: draft
  });
});

// Update draft
router.put('/draft/:draftId', (req, res) => {
  const { draftId } = req.params;
  const { title, content, notes, status } = req.body;

  let draft = null;
  for (const userDrafts of drafts.values()) {
    const found = userDrafts.find(d => d.id === draftId);
    if (found) {
      draft = found;
      break;
    }
  }

  if (!draft) {
    return res.status(404).json({
      success: false,
      error: 'Draft not found'
    });
  }

  if (title !== undefined) draft.title = title;
  if (content !== undefined) {
    draft.content = content;
    draft.wordCount = content.split(/\s+/).filter(w => w).length;
  }
  if (notes !== undefined) draft.notes = notes;
  if (status !== undefined) draft.status = status;
  draft.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Draft updated',
    data: draft
  });
});

// Get drafts
router.get('/drafts/:userId', (req, res) => {
  const { userId } = req.params;
  const { status, type } = req.query;

  let userDrafts = drafts.get(userId) || [];

  if (status) {
    userDrafts = userDrafts.filter(d => d.status === status);
  }

  if (type) {
    userDrafts = userDrafts.filter(d => d.type === type);
  }

  userDrafts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  res.json({
    success: true,
    data: {
      drafts: userDrafts,
      count: userDrafts.length
    }
  });
});

// Delete draft
router.delete('/draft/:draftId', (req, res) => {
  const { draftId } = req.params;

  for (const [userId, userDrafts] of drafts.entries()) {
    const index = userDrafts.findIndex(d => d.id === draftId);
    if (index !== -1) {
      userDrafts.splice(index, 1);
      res.json({ success: true, message: 'Draft deleted' });
      return;
    }
  }

  res.status(404).json({ success: false, error: 'Draft not found' });
});

// Get content library
router.get('/library/:userId', (req, res) => {
  const { userId } = req.params;
  const { type, limit = 50 } = req.query;

  let library = contentLibrary.get(userId) || [];

  if (type) {
    library = library.filter(c => c.type === type);
  }

  library.sort((a, b) => new Date(b.metadata.generatedAt) - new Date(a.metadata.generatedAt));
  library = library.slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      items: library,
      count: library.length,
      totalWords: library.reduce((sum, c) => sum + c.metadata.wordCount, 0)
    }
  });
});

// Repurpose content
router.post('/repurpose', (req, res) => {
  const { userId, originalContent, targetTypes } = req.body;

  if (!originalContent || !targetTypes || !Array.isArray(targetTypes)) {
    return res.status(400).json({
      success: false,
      error: 'originalContent and targetTypes (array) are required'
    });
  }

  const repurposed = targetTypes.map(type => {
    const contentType = contentTypes.find(t => t.id === type);
    return {
      type: contentType?.id || type,
      typeName: contentType?.name || type,
      title: `Repurposed: ${originalContent.substring(0, 50)}...`,
      content: generateRepurposedContent(originalContent, type),
      metadata: {
        sourceType: 'repurposed',
        generatedAt: new Date().toISOString()
      }
    };
  });

  res.json({
    success: true,
    data: {
      original: originalContent.substring(0, 100) + '...',
      repurposed
    }
  });
});

// Improve content
router.post('/improve', (req, res) => {
  const { userId, content, focus } = req.body;

  if (!content) {
    return res.status(400).json({
      success: false,
      error: 'content is required'
    });
  }

  const improvements = {
    clarity: generateImprovement(content, 'clarity'),
    engagement: generateImprovement(content, 'engagement'),
    seo: generateImprovement(content, 'seo'),
    grammar: generateImprovement(content, 'grammar'),
    tone: generateImprovement(content, 'tone')
  };

  res.json({
    success: true,
    data: {
      originalLength: content.split(/\s+/).length,
      improvements,
      suggestedEdit: improvements[focu] || improvements.clarity
    }
  });
});

// Get content types
router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: contentTypes
  });
});

// Get writing styles
router.get('/styles', (req, res) => {
  res.json({
    success: true,
    data: writingStyles
  });
});

// Helper functions
function getWordCount(length, contentType) {
  const multipliers = {
    short: 0.5,
    medium: 1,
    long: 2,
    extended: 3
  };

  const baseWords = {
    social: 150,
    email: 300,
    blog: 800,
    article: 1500,
    copy: 500,
    script: 2000,
    story: 1500,
    poem: 100,
    song: 200,
    speech: 1200
  };

  return (baseWords[contentType.id] || 800) * (multipliers[length] || 1);
}

function generateTitle(topic, contentType) {
  const templates = {
    blog: [
      `The Ultimate Guide to ${topic}`,
      `${topic}: Everything You Need to Know`,
      `10 Ways ${topic} Can Transform Your Life`,
      `Why ${topic} Matters More Than You Think`,
      `How to Master ${topic} in 2026`
    ],
    article: [
      `A Deep Dive into ${topic}`,
      `Understanding ${topic}: An Analysis`,
      `The Complete ${topic} Handbook`,
      `${topic}: Trends and Insights`,
      `Expert Analysis: ${topic}`
    ],
    social: [
      `Here's what you need to know about ${topic}`,
      `${topic} is changing everything`,
      `Why I'm excited about ${topic}`,
      `Hot take: ${topic}`,
      `Thread: Everything about ${topic}`
    ],
    email: [
      `About ${topic}`,
      `Quick update on ${topic}`,
      `Your guide to ${topic}`,
      `Important: ${topic}`,
      `${topic} - What you missed`
    ],
    default: [`${topic} - A Comprehensive Overview`]
  };

  const titles = templates[contentType.id] || templates.default;
  return titles[Math.floor(Math.random() * titles.length)];
}

function generateMockContent(topic, contentType, audience, style, wordCount, keywords) {
  // Generate realistic placeholder content
  const paragraphs = Math.ceil(wordCount / 150);
  let content = '';

  const intro = `Introduction to ${topic}\n\n`;
  const body = `This comprehensive guide explores ${topic} in depth. Whether you're a beginner or an expert, you'll find valuable insights here.\n\n`;
  const tips = `Key takeaways:\n\n1. Understanding the fundamentals\n2. Practical applications\n3. Common pitfalls to avoid\n4. Advanced strategies\n\n`;
  const conclusion = `\n\nConclusion\n\n${topic} represents an important area that continues to evolve. Stay informed, keep learning, and don't hesitate to experiment with new approaches.\n`;

  content = intro + body + tips + conclusion;

  // Add keywords if provided
  if (keywords && keywords.length > 0) {
    const keywordParagraph = `\n\nRegarding ${keywords.slice(0, 3).join(', ')}, these elements play a crucial role in understanding ${topic}.\n`;
    content = content.replace('This comprehensive guide', keywordParagraph + 'This comprehensive guide');
  }

  return content;
}

function generateContentSuggestions(content, keywords) {
  const suggestions = [];
  const wordCount = content.split(/\s+/).length;

  if (wordCount < 300) {
    suggestions.push({ type: 'length', priority: 'medium', message: 'Consider expanding the content for better SEO performance' });
  }

  if (content.split('\n').length < 5) {
    suggestions.push({ type: 'formatting', priority: 'low', message: 'Add more headers and formatting for readability' });
  }

  if (!content.includes('?')) {
    suggestions.push({ type: 'engagement', priority: 'medium', message: 'Add questions to increase reader engagement' });
  }

  suggestions.push({ type: 'cta', priority: 'high', message: 'Include a clear call-to-action at the end' });
  suggestions.push({ type: 'images', priority: 'medium', message: 'Add relevant images to break up text' });

  return suggestions;
}

function generateRepurposedContent(original, targetType) {
  const templates = {
    social: `📣 ${original.substring(0, 280)}... [Thread continues in comments]`,
    blog: `In today's post, we're diving deep into: ${original.substring(0, 500)}...`,
    email: `Hi there,\n\nI wanted to share some thoughts on ${original.substring(0, 200)}...\n\nBest,\n[Your Name]`,
    script: `[SCENE 1]\n${original.substring(0, 500)}...\n\n[END SCENE]`
  };

  return templates[targetType] || original.substring(0, 500);
}

function generateImprovement(content, type) {
  const improvements = {
    clarity: 'Break down complex sentences. Use active voice. Add bullet points for key points.',
    engagement: 'Add rhetorical questions. Include storytelling elements. Use more actionable language.',
    seo: 'Add more headers (H2, H3). Include target keywords earlier. Add internal/external links.',
    grammar: 'Review for consistency in tense. Check for run-on sentences. Ensure proper punctuation.',
    tone: 'Adjust to match target audience. Balance professionalism with approachability.'
  };

  return {
    description: improvements[type] || 'General improvement suggestions',
    examples: [
      'Before: "The implementation was completed successfully."',
      'After: "We successfully implemented the solution."'
    ]
  };
}

module.exports = router;