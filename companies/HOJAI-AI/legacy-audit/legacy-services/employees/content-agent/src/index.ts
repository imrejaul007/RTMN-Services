/**
 * Content Agent - Generate content for all channels
 * Port: 4766
 */

import express from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4766;

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'content-agent', port: PORT });
});

// Generate Blog Post
app.post('/api/content/blog', (req, res) => {
  const { topic, keywords, length } = req.body;

  res.json({
    title: `The Ultimate Guide to ${topic}`,
    content: `## Introduction\n\nThis comprehensive guide covers everything you need to know about ${topic}.\n\n## Key Points\n\n1. Understanding ${keywords?.[0] || 'the basics'}\n2. Best practices\n3. Common mistakes to avoid\n\n## Conclusion\n\nBy following these steps, you'll achieve better results.`,
    meta: {
      title: `Complete Guide to ${topic}`,
      description: `Learn everything about ${topic} with our expert guide.`
    },
    keywords: keywords || ['guide', topic],
    readingTime: '5 min read'
  });
});

// Generate Social Post
app.post('/api/content/social', (req, res) => {
  const { platform, topic, tone } = req.body;

  const templates = {
    instagram: {
      caption: `✨ ${topic}\n\nHere's what you need to know:\n\n→ Point 1\n→ Point 2\n→ Point 3\n\nSave this for later! 👇\n\n#${topic.replace(/\s/g, '')} #Tips #Guide`,
      hashtags: ['#Tips', '#Guide', '#HowTo']
    },
    linkedin: {
      caption: `I'm sharing my thoughts on ${topic}.\n\nAfter years of experience, here's what I've learned:\n\n1. Start with the basics\n2. Build consistency\n3. Measure everything\n\nWhat would you add? 👇`,
      hashtags: ['#Leadership', '#Strategy', '#Growth']
    },
    twitter: {
      caption: `🧵 On ${topic}:\n\nThe key insight:\n\nDo the hard work first.\n\nEverything else follows.\n\n#${topic.replace(/\s/g, '')}`,
      hashtags: ['#Thread', '#Tips']
    }
  };

  res.json(templates[platform] || templates.linkedin);
});

// Generate Email
app.post('/api/content/email', (req, res) => {
  const { type, customerName, offer } = req.body;

  const templates = {
    welcome: {
      subject: 'Welcome to the family! 🎉',
      body: `Hi ${customerName || 'there'},\n\nWelcome aboard! We're thrilled to have you.\n\nHere's what to expect:\n- Exclusive deals\n- Early access to new products\n- Special birthday rewards\n\nLet's get started!\n\nBest,\nThe Team`
    },
    offer: {
      subject: `Exclusive offer just for you, ${customerName || 'valued customer'}!`,
      body: `Hi ${customerName || 'there'},\n\n${offer || 'Special offer'} - just for you!\n\nUse code: SPECIAL20 for 20% off.\n\nValid for 48 hours only.\n\nShop now →`
    },
    abandoned: {
      subject: "You left something behind... 👀",
      body: `Hi ${customerName || 'there'},\n\nWe noticed you left without completing your order.\n\nNo worries - we're here when you're ready!\n\nYour cart is saved. Complete purchase in next 24h for 10% off.\n\nShop now →`
    }
  };

  res.json(templates[type] || templates.welcome);
});

// Generate Product Description
app.post('/api/content/product', (req, res) => {
  const { productName, features, category } = req.body;

  res.json({
    name: productName,
    shortDescription: `Premium ${category} designed for exceptional quality and performance.`,
    fullDescription: `Introducing our ${productName}.\n\nBuilt with precision and care, this ${category} delivers outstanding results.\n\n**What's Included:**\n${(features || ['Premium quality', 'Easy to use', '1-year warranty']).map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\n**Why Choose Us:**\n- 30-day money-back guarantee\n- Free shipping\n- 24/7 customer support`,
    highlights: features || ['Premium quality', 'Durable', 'Easy to use'],
    specifications: {
      category,
      warranty: '1 year',
      shipping: 'Free over ₹999'
    }
  });
});

// SEO Article
app.post('/api/content/seo', (req, res) => {
  const { keyword, searchIntent } = req.body;

  res.json({
    title: `${keyword} - Complete Guide [2026]`,
    metaDescription: `Learn everything about ${keyword}. Expert tips, strategies, and step-by-step guide. Updated for 2026.`,
    headings: [
      { level: 'H2', text: `What is ${keyword}?` },
      { level: 'H2', text: `Why ${keyword} Matters` },
      { level: 'H2', text: `How to Get Started` },
      { level: 'H2', text: `Common Mistakes to Avoid` },
      { level: 'H2', text: `Best Practices` }
    ],
    faqs: [
      { q: `What is ${keyword}?`, a: 'Detailed answer here...' },
      { q: `How to use ${keyword}?`, a: 'Follow these steps...' }
    ],
    wordCount: 2500
  });
});

// Video Script
app.post('/api/content/video', (req, res) => {
  const { topic, duration } = req.body;

  res.json({
    topic,
    duration: duration || '60 seconds',
    script: {
      hook: 'Are you making this common mistake?',
      intro: "Today we're discussing everything you need to know about " + topic,
      body: [
        'Point 1: The basics',
        'Point 2: The strategy',
        'Point 3: The results'
      ],
      cta: "If you found this helpful, smash that like button and follow for more!",
      outro: "Thanks for watching. See you in the next one!"
    },
    estimatedViews: 5000,
    engagementScore: 0.72
  });
});

app.listen(PORT, () => {
  console.log(`Content Agent running on port ${PORT}`);
});
