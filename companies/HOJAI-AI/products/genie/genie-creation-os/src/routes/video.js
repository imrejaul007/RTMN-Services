const express = require('express');
const router = express.Router();

// In-memory video storage
const videoProjects = new Map();

// Video types
const videoTypes = [
  { id: 'short', name: 'Short Form (15-60s)', icon: '📱', platforms: ['TikTok', 'Instagram Reels', 'YouTube Shorts'] },
  { id: 'long', name: 'Long Form (5-30 min)', icon: '📺', platforms: ['YouTube', 'Vimeo'] },
  { id: 'tutorial', name: 'Tutorial/How-To', icon: '📚', platforms: ['YouTube', 'Courses'] },
  { id: 'promo', name: 'Promotional', icon: '📣', platforms: ['All'] },
  { id: 'social', name: 'Social Media', icon: '📤', platforms: ['Instagram', 'LinkedIn', 'Twitter'] }
];

// Create video project
router.post('/project', (req, res) => {
  const { userId, name, type, duration, topic } = req.body;

  if (!name || !type) {
    return res.status(400).json({
      success: false,
      error: 'name and type are required'
    });
  }

  const videoType = videoTypes.find(v => v.id === type) || videoTypes[0];

  const project = {
    id: `video-${Date.now()}`,
    userId,
    name,
    type: videoType,
    duration: duration || 60,
    topic: topic || '',
    scenes: [],
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!videoProjects.has(userId)) {
    videoProjects.set(userId, []);
  }
  videoProjects.get(userId).push(project);

  res.json({
    success: true,
    message: 'Video project created',
    data: project
  });
});

// Generate script
router.post('/script', (req, res) => {
  const { userId, projectId, topic, duration, style } = req.body;

  if (!topic) {
    return res.status(400).json({
      success: false,
      error: 'topic is required'
    });
  }

  const scenes = generateVideoScenes(topic, duration || 60, style || 'engaging');

  const script = {
    id: `script-${Date.now()}`,
    userId,
    projectId,
    topic,
    duration,
    scenes,
    totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0),
    estimatedViews: generateEstimatedViews(duration || 60, style || 'engaging'),
    metadata: {
      generatedAt: new Date().toISOString(),
      wordCount: scenes.reduce((sum, s) => sum + (s.content?.split(/\s+/).length || 0), 0)
    }
  };

  res.json({
    success: true,
    data: script
  });
});

// Add scene
router.post('/project/:projectId/scene', (req, res) => {
  const { projectId } = req.params;
  const { type, duration, content, visuals, audio } = req.body;

  let project = null;
  for (const userProjects of videoProjects.values()) {
    const found = userProjects.find(p => p.id === projectId);
    if (found) {
      project = found;
      break;
    }
  }

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  const scene = {
    id: `scene-${Date.now()}`,
    order: project.scenes.length + 1,
    type: type || 'narration',
    duration: duration || 5,
    content: content || '',
    visuals: visuals || [],
    audio: audio || {},
    voiceover: '',
    subtitles: ''
  };

  project.scenes.push(scene);
  project.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Scene added',
    data: scene
  });
});

// Render video
router.post('/project/:projectId/render', (req, res) => {
  const { projectId } = req.params;
  const { quality, format, resolution } = req.body;

  let project = null;
  for (const userProjects of videoProjects.values()) {
    const found = userProjects.find(p => p.id === projectId);
    if (found) {
      project = found;
      break;
    }
  }

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  project.status = 'rendering';
  project.renderSettings = {
    quality: quality || 'high',
    format: format || 'mp4',
    resolution: resolution || '1080p'
  };
  project.updatedAt = new Date().toISOString();

  // Simulate render completion
  const output = {
    url: `https://videos.genie/${project.id}.mp4`,
    thumbnail: `https://videos.genie/${project.id}_thumb.jpg`,
    format: format || 'mp4',
    resolution: resolution || '1080p',
    size: Math.round(Math.random() * 500 + 50) + 'MB',
    duration: project.scenes.reduce((sum, s) => sum + s.duration, 0)
  };

  project.status = 'completed';
  project.output = output;

  res.json({
    success: true,
    message: 'Video rendered successfully',
    data: {
      project: { id: project.id, status: project.status },
      output,
      estimatedUploadTime: Math.round(output.size.split('MB')[0] / 10) + ' seconds'
    }
  });
});

// Get projects
router.get('/projects/:userId', (req, res) => {
  const { userId } = req.params;
  const { status } = req.query;

  let projects = videoProjects.get(userId) || [];

  if (status) {
    projects = projects.filter(p => p.status === status);
  }

  projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  res.json({
    success: true,
    data: {
      projects,
      count: projects.length
    }
  });
});

// Get video types
router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: videoTypes
  });
});

// Helper functions
function generateVideoScenes(topic, duration, style) {
  const scenes = [];
  const sceneCount = Math.ceil(duration / 5);

  const sceneTemplates = {
    hook: { duration: 3, template: `Have you ever wondered about ${topic}?` },
    intro: { duration: 5, template: `Today we're diving deep into ${topic}` },
    main: { duration: 10, template: `Let me share the key insights about ${topic}` },
    detail1: { duration: 8, template: `First, let's talk about the fundamentals of ${topic}` },
    detail2: { duration: 8, template: `Here's something most people don't know about ${topic}` },
    detail3: { duration: 8, template: `Another important aspect of ${topic}` },
    example: { duration: 10, template: `Let me show you a real example of ${topic}` },
    tips: { duration: 7, template: `Here are my top tips for ${topic}` },
    conclusion: { duration: 5, template: `To summarize what we learned about ${topic}` },
    cta: { duration: 3, template: `If you found this helpful, like and subscribe!` }
  };

  let remaining = duration;
  let sceneOrder = ['hook', 'intro'];

  if (duration >= 60) {
    sceneOrder.push('detail1', 'detail2', 'detail3', 'example');
  } else if (duration >= 30) {
    sceneOrder.push('detail1', 'detail2');
  }

  sceneOrder.push(...(duration >= 30 ? ['tips'] : []), 'conclusion', 'cta');

  let currentTime = 0;
  sceneOrder.forEach((sceneType, index) => {
    const template = sceneTemplates[sceneType];
    if (currentTime < duration) {
      scenes.push({
        id: `scene-${index}`,
        order: index + 1,
        type: sceneType,
        duration: Math.min(template.duration, duration - currentTime),
        content: template.template,
        visuals: generateVisuals(topic, sceneType),
        audio: { background: 'upbeat', voiceover: 'professional' }
      });
      currentTime += template.duration;
    }
  });

  return scenes;
}

function generateVisuals(topic, sceneType) {
  const visuals = {
    hook: ['question animation', 'emotional imagery'],
    intro: ['title card', 'topic imagery'],
    main: ['slides', 'B-roll footage'],
    detail1: ['infographic', 'diagrams'],
    detail2: ['surprising facts', 'animations'],
    detail3: ['examples', 'demonstrations'],
    example: ['screen recording', 'real footage'],
    tips: ['numbered list', 'icons'],
    conclusion: ['summary animation', 'recap'],
    cta: ['subscribe button', 'end card']
  };

  return visuals[sceneType] || ['stock footage'];
}

function generateEstimatedViews(duration, style) {
  const baseViews = {
    short: { low: 1000, high: 50000 },
    long: { low: 500, high: 100000 },
    tutorial: { low: 1000, high: 200000 },
    promo: { low: 500, high: 50000 },
    social: { low: 2000, high: 100000 }
  };

  const range = baseViews.short; // Default for any type

  if (style === 'viral') {
    return { estimated: range.high * 2, potential: 'viral' };
  } else if (style === 'engaging') {
    return { estimated: range.high, potential: 'high' };
  } else {
    return { estimated: range.low + (range.high - range.low) / 2, potential: 'average' };
  }
}

module.exports = router;