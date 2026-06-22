/**
 * Social Media Agent - Expert Employee
 * Port: 4777
 */

const express = require('express');
const app = express();
app.use(express.json({ limit: "10kb" }));
const PORT = 4777;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'social-agent', port: PORT });
});

app.post('/api/social/post', (req, res) => {
  const { topic, platform, tone } = req.body;
  const posts = {
    linkedin: `${topic}\n\nKey insight:\nQuality beats quantity every time.\n\nWhat's your take? 👇\n#Business #Growth`,
    instagram: `✨ ${topic}\n\nSave for later!\n\nFollow for more tips\n#Tips #Growth`,
    twitter: `On ${topic}:\n\nFocus on impact.\nResults follow.\n\n#Thread`
  };
  res.json({
    postId: `post_${Date.now()}`,
    platform,
    content: posts[platform] || posts.linkedin,
    hashtags: [`#${topic.replace(/\s/g, '')}`, '#Tips', '#Growth'],
    bestTime: '9 AM - 11 AM'
  });
});

app.post('/api/social/schedule', (req, res) => {
  const { postId, schedule } = req.body;
  res.json({ postId, scheduledFor: schedule, status: 'scheduled' });
});

app.listen(PORT, () => {
  console.log(`Social Media Agent running on port ${PORT}`);
});
