/**
 * Writing Assistant - Expert Employee
 * Port: 4769
 */

const express = require('express');
const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = 4769;

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'writing-assistant', port: PORT });
});

// Email Writing
app.post('/api/write/email', (req, res) => {
  const { type, recipient, context } = req.body;
  const templates = {
    cold: 'Subject: Quick question\n\nHi,\n\nI noticed [context]. Would love to connect.\n\nBest',
    followup: 'Subject: Following up\n\nHi,\n\nJust wanted to check if you saw my previous message.\n\nBest',
    pitch: 'Subject: Game-changing solution\n\nHi,\n\n[context]\n\nWould you be open to a 15-min call?\n\nBest'
  };
  res.json({ email: templates[type] || templates.cold, tone: 'professional' });
});

// Blog Writing
app.post('/api/write/blog', (req, res) => {
  const { topic, keywords, length } = req.body;
  res.json({
    title: `The Ultimate Guide to ${topic}`,
    intro: `In this comprehensive guide, we'll explore everything you need to know about ${topic}.`,
    sections: [
      { heading: 'What is it?', content: '...' },
      { heading: 'Why it matters', content: '...' },
      { heading: 'How to get started', content: '...' }
    ],
    conclusion: 'Now you have all the tools to succeed.',
    meta: { title: topic, description: `Complete guide to ${topic}` }
  });
});

// Social Posts
app.post('/api/write/social', (req, res) => {
  const { platform, topic } = req.body;
  const posts = {
    linkedin: `🧵 ${topic}\n\nHere's what nobody tells you:\n\n1. Start before ready\n2. Learn in public\n3. Ship fast\n\nWhat's your #1 tip?\n\n#${topic.replace(/\s/g, '')}`,
    twitter: `${topic}:\n\nDo the hard work.\nBuild in public.\nLearn daily.\n\nThat's it.\n\n#Startups #Growth`,
    instagram: `✨ ${topic}\n\nSave this for later!\n\nDouble tap if you agree 👏\n\nFollow for more tips\n#${topic.replace(/\s/g, '')}`
  };
  res.json({ posts: posts[platform] || posts.linkedin });
});

// SOP Writing
app.post('/api/write/sop', (req, res) => {
  const { process, steps } = req.body;
  res.json({
    title: `SOP: ${process}`,
    purpose: 'Standard Operating Procedure',
    steps: steps || [
      { step: 1, action: 'Gather requirements', duration: '15 min' },
      { step: 2, action: 'Document process', duration: '30 min' },
      { step: 3, action: 'Review with team', duration: '20 min' },
      { step: 4, action: 'Implement & train', duration: '1 hour' }
    ],
    approvals: ['Manager', 'Quality Team']
  });
});

app.listen(PORT, () => {
  console.log(`Writing Assistant running on port ${PORT}`);
});
